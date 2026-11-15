import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Luxe Lane API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCTS_PATH = Path(__file__).with_name("products.json")


def load_products() -> list[dict[str, Any]]:
    with PRODUCTS_PATH.open(encoding="utf-8") as products_file:
        return json.load(products_file)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/products")
def list_products() -> list[dict[str, Any]]:
    return load_products()


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> dict[str, Any]:
    product = next((item for item in load_products() if item["id"] == product_id), None)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
