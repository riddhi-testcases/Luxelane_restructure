# Luxe Lane

A responsive luxury e-commerce storefront built with React, TypeScript, Redux Toolkit, and FastAPI.

## Features

- Browse, filter, and sort products by category
- Product details, reviews, cart, and wishlist
- Persistent cart, wishlist, and theme preferences
- Responsive storefront, login, and informational pages
- FastAPI product catalog API

## Requirements

- Node.js 18+
- Python 3.10+

## Run locally

Install the frontend dependencies:

```powershell
npm install
```

Install the API dependencies:

```powershell
python -m pip install -r backend/requirements.txt
```

Start the FastAPI server from the project root:

```powershell
npm run api
```

In another terminal, start the React app:

```powershell
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:8000`. Set `VITE_API_URL` to the API origin when running the frontend without that proxy. The API health check is at `/api/health`; the catalog is available at `/api/products`.

The login flow remains a frontend demo: `jane@example.com` / `password123` can be used to sign in.
