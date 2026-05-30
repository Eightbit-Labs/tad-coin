# Copilot Instructions for `tad-coin`

## Build, lint, and test commands

Run commands from the repository root unless noted.

| Area | Command | Notes |
|---|---|---|
| Frontend dev server | `npm run dev` | Vite app |
| Frontend build | `npm run build` | Runs `tsc -b` and Vite production build |
| Frontend lint | `npm run lint` | ESLint for `*.ts` / `*.tsx` |
| Backend dev server | `cd src\server && npm run dev` | `tsx watch src/index.ts` |
| Backend build | `cd src\server && npm run build` | TypeScript compile to `dist/` |
| Backend start (built) | `cd src\server && npm start` | Runs `dist/index.js` |

There is currently no automated test runner configured (no `test` script in root or `src/server/package.json`), so there is no single-test command yet.

## High-level architecture

- The repo is split into:
  - **Frontend SPA** (`src/`, React + Vite + React Router)
  - **Backend API** (`src/server/`, Express + MongoDB)
- Frontend routes are defined in `src/main.tsx`: `/` (landing/auth), `/dashboard` (mining + balance + notifications), `/logs` (live mining log window), `/transfer` (transfer flow window).
- `src/api.ts` centralizes API base URL (`VITE_API_URL` fallback to `http://localhost:3001`) and bearer auth header creation.
- Blockchain mining work is done in the browser worker (`src/blockchain/miningWorker.ts`) and streamed to the logs window via `BroadcastChannel('mining-logs')`.
- Canonical chain state lives on the backend in MongoDB (`blocks` collection). Client submits mined blocks to `/api/chain/submit`; server validates and persists, then credits miner rewards.
- Transfers are atomic backend transactions in `/api/transfer`:
  - debit sender balance
  - credit recipient balance
  - append a mined transfer block containing JSON transfer metadata
- DB bootstrap (`src/server/src/db.ts`) seeds genesis block if chain is empty and creates unique indexes for `blocks.index`, `balances.username`, and `users.username`.

## Key conventions in this codebase

- **Hashing parity between client and server is required.** `src/server/src/blockchain/hash.ts` explicitly notes server hashing must match the client’s SHA-256 input construction.
- **Proof-of-work difficulty is fixed at 7 zeros** in backend validation (`src/server/src/blockchain/blockchain.ts`) and frontend mining UX (`src/dashboard/dashboard.tsx`).
- **Backend is source of truth for validity and balances.** Client can mine locally, but acceptance/reward only happens after `/api/chain/submit` validation against latest persisted block.
- **Auth pattern:** JWT bearer token in `localStorage`; frontend always uses `authHeaders()` for protected endpoints; backend protected routes use `requireAuth` and then read `(req as AuthedRequest).user`.
- **Route organization is domain-based** under `src/server/src/routes` (`auth`, `chain`, `users`, `transfer`) and all are mounted under `/api/*` from `src/server/src/index.ts`.
- **User-facing polling cadence is intentional:** leaderboard refreshes every 30s on landing page; transfer notifications poll every 5s in dashboard.

