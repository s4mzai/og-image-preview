# OG Image Preview

A minimal editorial web utility to fetch Open Graph metadata and generate a beautiful social preview card.

## Project Structure

- `/backend`: Express.js server that securely fetches and parses OG metadata.
- `/frontend`: React application (Vite) that presents the data in an elegant UI.

## Getting Started

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:3000`.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`. It uses a Vite proxy to communicate with the backend during local development.

## Production Deployment

When building the frontend for production, you must set the `VITE_API_URL` environment variable to point to your deployed backend.

```bash
cd frontend
VITE_API_URL=https://api.yourdomain.com npm run build
```

See `frontend/.env.example` for details.

## Documentation

- `PRODUCT.md`: Core product positioning and principles.
- `design.md`: Visual and UI implementation specifications.
