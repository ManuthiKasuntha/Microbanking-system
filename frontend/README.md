# Microbanking System — Frontend

React 19 + TypeScript client for the B-Trust Microbanking System, built with [Vite](https://vite.dev).
See the [project README](../README.md) for the full setup.

## Setup

```bash
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev
```

Vite only exposes env variables prefixed with `VITE_`; read them with `import.meta.env.VITE_...`.
Restart the dev server after changing `.env`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server at http://localhost:3000 (`npm start` is an alias) |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript only |
| `npm test` / `npm run test:run` | Vitest in watch mode / single run |

## Structure

- `src/api/client.ts`: Axios defaults (base URL, bearer token, session-expiry handling) and `getErrorMessage`
- `src/utils/validation.ts`: form rules shared by every screen, mirroring the backend and database rules
- `src/utils/notify.ts`: `toast.success/error/info` and `confirmAction()` usable from any component
- `src/components/ui/`: `Toaster`, `ConfirmDialog`, `ErrorBoundary`
- `src/components/Dashboard.tsx`: role-based layout; each section is lazy-loaded as its own chunk
