# Quickstart: Backend Replacement (Parity Migration)

How to start the NestJS backend with one command and check that it behaves like the current service. Paths are relative to the repository root.

## Prerequisites

- Node.js 24 LTS (`node -v` ≥ 22; the reference runtime is 24).
- npm.
- For the parity check only: JDK 21 and Maven, to run the current Spring service from `backend/`.

## 1. One-time: place the database copy

The new service never works on the original file. Copy it once:

```bash
mkdir -p backend-nest/data
cp backend/data/roombook.db backend-nest/data/roombook.db
```

The default location is `backend-nest/data/roombook.db`. Another path can be set with `ROOMBOOK_DB_PATH`.

If the copy is missing, the service stops at start-up with the expected path and this command. It does not create an empty database.

## 2. Start the backend (one command)

```bash
npm --prefix backend-nest start
```

The `start` script installs nothing and runs a build first (`prestart`), then starts the service on port 8080, the port in the contract's `servers` entry. At start-up the service:

1. opens the database file without creating it;
2. checks that versions 1–4 are recorded as successful in `flyway_schema_history` (no write);
3. applies any pending migration V5+ only if one exists;
4. listens on `http://localhost:8080`.

Expected console line: `RoomBook backend listening on http://localhost:8080 (db: …/backend-nest/data/roombook.db)`.

For the first run, install dependencies once:

```bash
npm --prefix backend-nest ci
```

## 3. Smoke checks

With the service running:

| Check | Command | Expected |
|-------|---------|----------|
| Health | `curl -i http://localhost:8080/api/health` | `200`, body `status` UP, `database` UP, `time` present |
| Room list | `curl -s http://localhost:8080/api/rooms` | 6 rooms (Aurora … Fjord), each with `equipment` and `active` |
| Duplicate room | `curl -i -X POST http://localhost:8080/api/rooms -H "Content-Type: application/json" -d "{\"name\":\"aurora \",\"capacity\":3}"` | `409`, `application/problem+json` |
| Unknown room | `curl -i http://localhost:8080/api/rooms/999/availability?date=2026-12-07` | `404`, `application/problem+json` |

The original database file must be unchanged after these checks (compare its SHA-256 before and after).

## 4. Run the tests

```bash
npm --prefix backend-nest test            # unit, startup and contract tests (Jest)
npm --prefix backend-nest run test:contract  # contract tests only
```

Expected outcome: all suites pass. The contract suite proves that:

- `specs/001-project-setup/contracts/openapi.yaml` matches its recorded SHA-256;
- every operation returns its documented status codes with the documented content types;
- request and response bodies validate against the contract schemas.

Booking-rule boundaries (for example, a 59-minute versus 60-minute cancellation, a booking ending at 20:15, a 4 h 15 min duration) are covered by unit tests that use a fixed Clock.

## 5. Parity check against the current service

This is the acceptance evidence for "no visible change" (spec SC-001, SC-003).

1. Make two identical copies of the database, one for each service.
2. Start the current service on port 8080 with its copy (see `backend/`; it uses `backend/data/roombook.db` by default, so point it to the first copy).
3. Start the new service on another port with the second copy:

   ```bash
   ROOMBOOK_DB_PATH=<path-to-second-copy> PORT=8081 npm --prefix backend-nest start
   ```

4. Replay the recorded requests against both services and compare:

   ```bash
   npm --prefix backend-nest run parity -- --left http://localhost:8080 --right http://localhost:8081
   ```

Expected outcome: all requests in `backend-nest/parity/recorded-requests.json` (at least 50) show identical status, content type and body. Any difference is printed with the request and the first differing field.

The new service runs with `ROOMBOOK_CLOCK_FIXED_AT` set during the parity run only; the recorded requests are written so that they do not depend on the current time (see research.md, R-007).

## 6. Cutover (later, not part of this quickstart)

Removing `backend/` and renaming `backend-nest/` to `backend/` is not part of this feature (spec FR-021) and is not in the tasks. It is a separate change that needs an explicit decision by the owner. Until then both folders coexist and must never share a database file.

## Troubleshooting

| Symptom | Cause | Action |
|---------|-------|--------|
| Start-up stops with "database file not found" | Step 1 not done | Run the copy command |
| Start-up stops with "schema versions 1–4 not recorded as successful" | The file is not a copy of the current database | Replace the copy with a fresh copy of `backend/data/roombook.db` |
| `503` on `/api/health` | Database file read-only or locked | Check file permissions; another process may hold the file |
| Port in use | Another service on 8080 | Stop it or set `PORT` |
