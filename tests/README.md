# Integration tests — CodeCrowds

This folder contains integration tests that exercise the main API flows.

- `tests/testUtils.js` — test helper (starts the app, exposes `sequelize`)
- `tests/users.test.js` — register / login / /me
- `tests/services.test.js` — create / list / get / update / delete service
- `tests/messages.test.js` — send & fetch messages (inbox & thread)
- `tests/ratings.test.js` — rating workflow (free vs paid)

---

## Prerequisites

- **Node.js 20** (the project `engines` require Node 20).  
  Install with `nvm`, `fnm`, or your system package manager if needed.

- **Postgres** for local tests. Tests call `sequelize.sync({ force: true })` and rely on the DB specified by your `.env` or environment variables.
  - Use the split DB vars in `.env.example` (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME), **or**
  - Set `DATABASE_URL` (recommended in production/CI).

- `cross-env` is used in `package.json` for cross-platform `NODE_ENV=test` (already included if you followed earlier steps).

---

## Quickstart — run tests locally

1. Make sure your DB is running (local Postgres or Docker). Example Docker command:

   ```powershell
   docker run --rm -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres -p 5432:5432 postgres:14
   ```
