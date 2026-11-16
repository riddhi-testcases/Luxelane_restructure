import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .database import connect_database, initialize_database

PASSWORD_ITERATIONS = 310_000
SESSION_DAYS = 30


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Luxe Lane API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProductPayload(APIModel):
    name: str = Field(min_length=1, max_length=160)
    price: float = Field(ge=0)
    priceInr: int = Field(ge=0)
    images: list[str] = Field(min_length=1)
    description: str = Field(min_length=1, max_length=4000)
    category: str = Field(min_length=1, max_length=100)
    tags: list[str] = Field(default_factory=list)
    rating: float = Field(ge=0, le=5)
    reviewCount: int = Field(default=0, ge=0)
    isNew: bool = False
    isFeatured: bool = False
    inStock: bool = True
    discount: float | None = Field(default=None, ge=0, le=100)


class RegisterRequest(APIModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(APIModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class UserResponse(APIModel):
    id: str
    username: str


class AuthResponse(APIModel):
    user: UserResponse


class OrderItemRequest(APIModel):
    productId: str
    quantity: int = Field(ge=1, le=99)


class ShippingAddress(APIModel):
    fullName: str = Field(min_length=1, max_length=120)
    addressLine: str = Field(min_length=1, max_length=240)
    city: str = Field(min_length=1, max_length=120)
    postalCode: str = Field(min_length=1, max_length=32)
    country: str = Field(min_length=1, max_length=120)


class OrderRequest(APIModel):
    items: list[OrderItemRequest] = Field(min_length=1)
    shippingAddress: ShippingAddress


def get_db():
    connection = connect_database()
    try:
        yield connection
    finally:
        connection.close()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def public_user(user: sqlite3.Row) -> dict[str, str]:
    return {"id": user["id"], "username": user["username"]}


def product_from_row(row: sqlite3.Row) -> dict[str, Any]:
    product: dict[str, Any] = {
        "id": row["id"],
        "name": row["name"],
        "price": row["price"],
        "priceInr": row["price_inr"],
        "images": json.loads(row["images_json"]),
        "description": row["description"],
        "category": row["category"],
        "tags": json.loads(row["tags_json"]),
        "rating": row["rating"],
        "reviewCount": row["review_count"],
        "isNew": bool(row["is_new"]),
        "isFeatured": bool(row["is_featured"]),
        "inStock": bool(row["in_stock"]),
    }
    if row["discount"] is not None:
        product["discount"] = row["discount"]
    return product


def get_product_or_404(connection: sqlite3.Connection, product_id: str) -> sqlite3.Row:
    product = connection.execute(
        "SELECT * FROM products WHERE id = ?", (product_id,)
    ).fetchone()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def record_activity(
    connection: sqlite3.Connection,
    user_id: str,
    event_type: str,
    details: dict[str, Any] | None = None,
) -> None:
    connection.execute(
        """
        INSERT INTO activity_logs (user_id, event_type, details_json, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            user_id,
            event_type,
            json.dumps(details or {}),
            utc_now().isoformat(),
        ),
    )


def create_session(connection: sqlite3.Connection, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = (utc_now() + timedelta(days=SESSION_DAYS)).isoformat()
    connection.execute(
        """
        INSERT INTO user_sessions (token_hash, user_id, expires_at)
        VALUES (?, ?, ?)
        """,
        (token_hash, user_id, expires_at),
    )
    return token


def get_current_user(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
    connection: sqlite3.Connection = Depends(get_db),
) -> dict[str, str]:
    token = access_token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in to continue")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = connection.execute(
        """
        SELECT users.id, users.username
        FROM user_sessions
        JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > ?
        """,
        (token_hash, utc_now().isoformat()),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Session expired; please sign in again")
    return {"id": row["id"], "username": row["username"], "token_hash": token_hash}


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        path="/api",
    )


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    expected_token = os.getenv("ADMIN_API_TOKEN")
    if not expected_token:
        raise HTTPException(
            status_code=503,
            detail="Product changes are disabled until ADMIN_API_TOKEN is configured",
        )
    if not x_admin_token or not hmac.compare_digest(x_admin_token, expected_token):
        raise HTTPException(status_code=403, detail="An admin token is required")


def password_digest(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )


def build_order(connection: sqlite3.Connection, order_id: str) -> dict[str, Any]:
    order = connection.execute(
        "SELECT * FROM orders WHERE id = ?", (order_id,)
    ).fetchone()
    items = connection.execute(
        """
        SELECT product_id, product_name, unit_price, quantity
        FROM order_items WHERE order_id = ? ORDER BY id
        """,
        (order_id,),
    ).fetchall()
    return {
        "id": order["id"],
        "status": order["status"],
        "createdAt": order["created_at"],
        "total": order["total"],
        "shippingAddress": {
            "fullName": order["shipping_name"],
            "addressLine": order["shipping_address"],
            "city": order["shipping_city"],
            "postalCode": order["shipping_postal_code"],
            "country": order["shipping_country"],
        },
        "items": [
            {
                "productId": item["product_id"],
                "name": item["product_name"],
                "unitPrice": item["unit_price"],
                "quantity": item["quantity"],
                "lineTotal": item["unit_price"] * item["quantity"],
            }
            for item in items
        ],
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/products")
def list_products(connection: sqlite3.Connection = Depends(get_db)) -> list[dict[str, Any]]:
    rows = connection.execute("SELECT * FROM products ORDER BY rowid").fetchall()
    return [product_from_row(row) for row in rows]


@app.get("/api/products/{product_id}")
def get_product(
    product_id: str,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    return product_from_row(get_product_or_404(connection, product_id))


@app.post(
    "/api/products",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_product(
    payload: ProductPayload,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    product_id = str(uuid.uuid4())
    try:
        connection.execute(
            """
            INSERT INTO products (
                id, name, price, price_inr, images_json, description, category,
                tags_json, rating, review_count, is_new, is_featured, in_stock, discount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                product_id,
                payload.name,
                payload.price,
                payload.priceInr,
                json.dumps(payload.images),
                payload.description,
                payload.category,
                json.dumps(payload.tags),
                payload.rating,
                payload.reviewCount,
                int(payload.isNew),
                int(payload.isFeatured),
                int(payload.inStock),
                payload.discount,
            ),
        )
        connection.commit()
    except sqlite3.IntegrityError as error:
        connection.rollback()
        raise HTTPException(status_code=409, detail="Unable to create product") from error
    return product_from_row(get_product_or_404(connection, product_id))


@app.put(
    "/api/products/{product_id}",
    dependencies=[Depends(require_admin)],
)
def update_product(
    product_id: str,
    payload: ProductPayload,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    get_product_or_404(connection, product_id)
    connection.execute(
        """
        UPDATE products
        SET name = ?, price = ?, price_inr = ?, images_json = ?, description = ?,
            category = ?, tags_json = ?, rating = ?, review_count = ?, is_new = ?,
            is_featured = ?, in_stock = ?, discount = ?
        WHERE id = ?
        """,
        (
            payload.name,
            payload.price,
            payload.priceInr,
            json.dumps(payload.images),
            payload.description,
            payload.category,
            json.dumps(payload.tags),
            payload.rating,
            payload.reviewCount,
            int(payload.isNew),
            int(payload.isFeatured),
            int(payload.inStock),
            payload.discount,
            product_id,
        ),
    )
    connection.commit()
    return product_from_row(get_product_or_404(connection, product_id))


@app.delete(
    "/api/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_product(
    product_id: str,
    connection: sqlite3.Connection = Depends(get_db),
) -> Response:
    get_product_or_404(connection, product_id)
    connection.execute("DELETE FROM products WHERE id = ?", (product_id,))
    connection.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post(
    "/api/auth/register",
    status_code=status.HTTP_201_CREATED,
    response_model=AuthResponse,
)
def register(
    payload: RegisterRequest,
    response: Response,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    username = payload.username.strip()
    if not re.fullmatch(r"[A-Za-z0-9_.-]{3,32}", username):
        raise HTTPException(
            status_code=422,
            detail="Username must be 3-32 letters, numbers, dots, underscores, or hyphens",
        )

    salt = secrets.token_bytes(16)
    user_id = str(uuid.uuid4())
    try:
        connection.execute(
            """
            INSERT INTO users (id, username, password_hash, password_salt, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                username,
                password_digest(payload.password, salt).hex(),
                salt.hex(),
                utc_now().isoformat(),
            ),
        )
    except sqlite3.IntegrityError as error:
        connection.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken") from error

    token = create_session(connection, user_id)
    record_activity(connection, user_id, "account_registered")
    connection.commit()
    set_auth_cookie(response, token)
    return {"user": {"id": user_id, "username": username}}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    user = connection.execute(
        "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
        (payload.username.strip(),),
    ).fetchone()
    password_matches = False
    if user is not None:
        expected = bytes.fromhex(user["password_hash"])
        salt = bytes.fromhex(user["password_salt"])
        password_matches = hmac.compare_digest(password_digest(payload.password, salt), expected)
    else:
        password_digest(payload.password, b"luxe-lane-invalid-user")

    if user is None or not password_matches:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_session(connection, user["id"])
    record_activity(connection, user["id"], "signed_in")
    connection.commit()
    set_auth_cookie(response, token)
    return {"user": public_user(user)}


@app.get("/api/auth/me", response_model=UserResponse)
def get_my_account(
    user: dict[str, str] = Depends(get_current_user),
) -> dict[str, str]:
    return {"id": user["id"], "username": user["username"]}


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    connection: sqlite3.Connection = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> Response:
    record_activity(connection, user["id"], "signed_out")
    connection.execute(
        "DELETE FROM user_sessions WHERE token_hash = ?", (user["token_hash"],)
    )
    connection.commit()
    response.delete_cookie(key="access_token", path="/api", httponly=True, samesite="lax")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderRequest,
    connection: sqlite3.Connection = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> dict[str, Any]:
    quantities: dict[str, int] = {}
    for item in payload.items:
        quantities[item.productId] = quantities.get(item.productId, 0) + item.quantity

    connection.execute("BEGIN IMMEDIATE")
    order_lines: list[tuple[str, str, float, int]] = []
    total = 0.0
    for product_id, quantity in quantities.items():
        product = get_product_or_404(connection, product_id)
        if not product["in_stock"]:
            raise HTTPException(
                status_code=409,
                detail=f"{product['name']} is currently out of stock",
            )
        unit_price = product["price"]
        order_lines.append((product_id, product["name"], unit_price, quantity))
        total += unit_price * quantity

    order_id = str(uuid.uuid4())
    created_at = utc_now().isoformat()
    address = payload.shippingAddress

    connection.execute(
        """
        INSERT INTO orders (
            id, user_id, status, created_at, total, shipping_name,
            shipping_address, shipping_city, shipping_postal_code, shipping_country
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            order_id,
            user["id"],
            "placed",
            created_at,
            round(total, 2),
            address.fullName,
            address.addressLine,
            address.city,
            address.postalCode,
            address.country,
        ),
    )
    connection.executemany(
        """
        INSERT INTO order_items (
            order_id, product_id, product_name, unit_price, quantity
        ) VALUES (?, ?, ?, ?, ?)
        """,
        [
            (order_id, product_id, name, price, quantity)
            for product_id, name, price, quantity in order_lines
        ],
    )
    record_activity(
        connection,
        user["id"],
        "order_placed",
        {"orderId": order_id, "total": round(total, 2)},
    )
    connection.commit()

    return build_order(connection, order_id)


@app.get("/api/orders/me")
def list_my_orders(
    connection: sqlite3.Connection = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    orders = connection.execute(
        "SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    return [build_order(connection, order["id"]) for order in orders]


@app.get("/api/users/me/activity")
def list_my_activity(
    connection: sqlite3.Connection = Depends(get_db),
    user: dict[str, str] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT event_type, details_json, created_at
        FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC
        """,
        (user["id"],),
    ).fetchall()
    return [
        {
            "event": row["event_type"],
            "details": json.loads(row["details_json"]),
            "createdAt": row["created_at"],
        }
        for row in rows
    ]
