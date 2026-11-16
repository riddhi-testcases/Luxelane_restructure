import json
import os
import sqlite3
from pathlib import Path

from .seed_data import PRODUCTS

DATABASE_PATH = Path(
    os.getenv(
        "LUXE_LANE_DB",
        str(Path(__file__).with_name("luxe_lane.sqlite3")),
    )
)


def connect_database() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=30, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    connection = connect_database()
    try:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL CHECK (price >= 0),
                price_inr INTEGER NOT NULL CHECK (price_inr >= 0),
                images_json TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                tags_json TEXT NOT NULL,
                rating REAL NOT NULL CHECK (rating >= 0 AND rating <= 5),
                review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
                is_new INTEGER NOT NULL DEFAULT 0,
                is_featured INTEGER NOT NULL DEFAULT 0,
                in_stock INTEGER NOT NULL DEFAULT 1,
                discount REAL
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                total REAL NOT NULL CHECK (total >= 0),
                shipping_name TEXT NOT NULL,
                shipping_address TEXT NOT NULL,
                shipping_city TEXT NOT NULL,
                shipping_postal_code TEXT NOT NULL,
                shipping_country TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                unit_price REAL NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0)
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                details_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );
            """
        )

        product_count = connection.execute(
            "SELECT COUNT(*) AS count FROM products"
        ).fetchone()["count"]
        if product_count == 0:
            connection.executemany(
                """
                INSERT INTO products (
                    id, name, price, price_inr, images_json, description,
                    category, tags_json, rating, review_count, is_new,
                    is_featured, in_stock, discount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        product["id"],
                        product["name"],
                        product["price"],
                        product["priceInr"],
                        json.dumps(product["images"]),
                        product["description"],
                        product["category"],
                        json.dumps(product["tags"]),
                        product["rating"],
                        product["reviewCount"],
                        int(product.get("isNew", False)),
                        int(product.get("isFeatured", False)),
                        int(product.get("inStock", True)),
                        product.get("discount"),
                    )
                    for product in PRODUCTS
                ],
            )
        connection.commit()
    finally:
        connection.close()
