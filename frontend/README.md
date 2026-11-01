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

| Folder | Contents |
|--------|----------|
| `src/app/` | Router and app shell |
| `src/api/` | `http.ts` (axios instance: base URL, bearer token, session-expiry handling, `getErrorMessage`) and `index.ts` (one API object per backend domain; the only place URLs appear) |
| `src/features/<domain>/` | Screens for one domain: `auth`, `dashboard`, `customers`, `accounts`, `transactions`, `fixed-deposits`, `employees`, `branches`, `reports`, `interest` |
| `src/features/auth/session.ts` | Reading and writing the stored login (token + user) |
| `src/components/` | Shared UI: `Toaster`, `ConfirmDialog`, `ErrorBoundary`, `Footer` |
| `src/hooks/` | `usePersistentState`: state that survives a reload (saved tabs, sidebar) |
| `src/utils/` | `validation.ts` (form rules mirroring the backend and database), `format.ts` (currency/date), `notify.ts` (toasts and `confirmAction()`) |

Import shared code with the `@/` alias, e.g. `import { formatCurrency } from '@/utils/format'`.
The dashboard lazy-loads each section as its own chunk.
