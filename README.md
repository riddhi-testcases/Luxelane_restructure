# Luxe Lane

A responsive e-commerce storefront built with React, TypeScript, Redux Toolkit, FastAPI, and SQLite.

## Features

- Browse, filter, and sort products loaded from the SQLite catalog
- Product details, reviews, cart, and wishlist
- Username/password registration and sign-in
- Checkout that records orders without online payment
- Persistent, per-user order history and account activity
- Product create/read/update/delete API; write operations require an admin token
- Persistent cart, wishlist, and theme preferences in the browser

## Requirements

- Node.js 18+
- Python 3.10+

## Run locally

Run commands from the directory containing both `package.json` and `backend\requirements.txt`. If PowerShell starts in the outer download folder, enter the nested project first:

```powershell
cd .\Luxe-Lane-E-Commerce-Website-main
Test-Path .\package.json
Test-Path .\backend\requirements.txt
```

Both `Test-Path` commands should return `True`.

From the project root, install the frontend dependencies:

```powershell
npm install
```

Install the API dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

To enable product creation, update, and deletion, set an admin token in the PowerShell terminal that will run the API:

```powershell
$env:ADMIN_API_TOKEN = "choose-a-long-random-local-token"
```

Start FastAPI:

```powershell
npm run api
```

The backend runs at `http://localhost:8000`. In another terminal at the project root, start the React app:

```powershell
npm run dev
```

The frontend runs at `http://localhost:3000`. Vite is configured to fail rather than silently choose another port if port 3000 is already in use.

The SQLite database is created automatically at `backend\app\luxe_lane.sqlite3`. On the first run, the existing six products are inserted into the database from `backend\app\seed_data.py`. The seed file is only used to initialize an empty catalog; product reads and writes use SQLite.

Vite proxies `/api` requests to `http://localhost:8000`. FastAPI's interactive API documentation is available at `http://localhost:8000/docs`.

## API overview

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/{product_id}`
- `POST /api/products` — requires the `X-Admin-Token` header
- `PUT /api/products/{product_id}` — requires the `X-Admin-Token` header
- `DELETE /api/products/{product_id}` — requires the `X-Admin-Token` header
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` — requires a bearer token
- `POST /api/auth/logout` — requires a bearer token
- `POST /api/orders` — requires a bearer token
- `GET /api/orders/me` — requires a bearer token
- `GET /api/users/me/activity` — requires a bearer token

Users register with a unique username and password of at least eight characters. Passwords are salted and hashed before they are stored. Sessions expire after 30 days and are held in an HttpOnly cookie; set `AUTH_COOKIE_SECURE=true` when serving the API over HTTPS. Orders are created from current database prices and retain product-name/price snapshots for order history. Checkout records an order but does not charge a payment method.

For product writes, open `/docs`, select an endpoint, set the `X-Admin-Token` header to the same value as `ADMIN_API_TOKEN`, and submit the product data. The frontend storefront does not include an admin product-management screen.

## Run backend tests

```powershell
python -m pip install -r backend\requirements-test.txt
python -m unittest discover -s backend\tests -v
```
