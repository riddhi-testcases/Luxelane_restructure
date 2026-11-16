import os
import sys
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import database
from app.main import app


class StoreAPIIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_database_path = database.DATABASE_PATH
        self.original_admin_token = os.environ.get("ADMIN_API_TOKEN")
        database.DATABASE_PATH = Path(self.temp_dir.name) / "test.sqlite3"
        os.environ["ADMIN_API_TOKEN"] = "test-admin-token"
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        database.DATABASE_PATH = self.original_database_path
        if self.original_admin_token is None:
            os.environ.pop("ADMIN_API_TOKEN", None)
        else:
            os.environ["ADMIN_API_TOKEN"] = self.original_admin_token
        self.temp_dir.cleanup()

    def test_product_create_read_update_delete_requires_admin_token(self) -> None:
        payload = {
            "name": "Test Product",
            "price": 10,
            "priceInr": 800,
            "images": ["https://example.test/image.jpg"],
            "description": "A test product",
            "category": "Test",
            "tags": ["test"],
            "rating": 4.5,
            "reviewCount": 0,
            "isNew": False,
            "isFeatured": False,
            "inStock": True,
        }

        self.assertEqual(self.client.post("/api/products", json=payload).status_code, 403)
        created = self.client.post(
            "/api/products",
            json=payload,
            headers={"X-Admin-Token": "test-admin-token"},
        )
        self.assertEqual(created.status_code, 201)
        product_id = created.json()["id"]
        self.assertEqual(
            self.client.get(f"/api/products/{product_id}").json()["name"],
            "Test Product",
        )

        payload["name"] = "Updated Test Product"
        updated = self.client.put(
            f"/api/products/{product_id}",
            json=payload,
            headers={"X-Admin-Token": "test-admin-token"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Updated Test Product")

        deleted = self.client.delete(
            f"/api/products/{product_id}",
            headers={"X-Admin-Token": "test-admin-token"},
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/products/{product_id}").status_code, 404)

    def test_user_checkout_order_history_and_activity(self) -> None:
        registered = self.client.post(
            "/api/auth/register",
            json={"username": "luxe_tester", "password": "safePassword123"},
        )
        self.assertEqual(registered.status_code, 201)
        self.assertIn("httponly", registered.headers["set-cookie"].lower())
        self.assertNotIn("token", registered.json())
        connection = database.connect_database()
        try:
            user_row = connection.execute(
                "SELECT password_hash FROM users WHERE username = ?",
                ("luxe_tester",),
            ).fetchone()
        finally:
            connection.close()
        self.assertNotEqual(user_row["password_hash"], "safePassword123")
        self.assertEqual(
            self.client.post(
                "/api/auth/register",
                json={"username": "LUXE_TESTER", "password": "safePassword123"},
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/login",
                json={"username": "luxe_tester", "password": "incorrect-password"},
            ).status_code,
            401,
        )

        login = self.client.post(
            "/api/auth/login",
            json={"username": "LUXE_TESTER", "password": "safePassword123"},
        )
        self.assertEqual(login.status_code, 200)
        checkout = self.client.post(
            "/api/orders",
            json={
                "items": [{"productId": "1", "quantity": 2}],
                "shippingAddress": {
                    "fullName": "Test Customer",
                    "addressLine": "1 Test Street",
                    "city": "Test City",
                    "postalCode": "12345",
                    "country": "Testland",
                },
            },
        )
        self.assertEqual(checkout.status_code, 201)
        self.assertEqual(checkout.json()["total"], 5799.98)
        self.assertEqual(
            self.client.get("/api/orders/me").json()[0]["items"][0]["name"],
            "Diamond Tennis Bracelet",
        )

        events = {
            item["event"]
            for item in self.client.get("/api/users/me/activity").json()
        }
        self.assertTrue({"account_registered", "signed_in", "order_placed"} <= events)

        out_of_stock = self.client.post(
            "/api/orders",
            json={
                "items": [{"productId": "4", "quantity": 1}],
                "shippingAddress": {
                    "fullName": "Test Customer",
                    "addressLine": "1 Test Street",
                    "city": "Test City",
                    "postalCode": "12345",
                    "country": "Testland",
                },
            },
        )
        self.assertEqual(out_of_stock.status_code, 409)

        self.assertEqual(self.client.post("/api/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)


if __name__ == "__main__":
    unittest.main()
