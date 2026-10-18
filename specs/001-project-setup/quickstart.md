# Quickstart: Project Setup

## Prerequisites

- JDK 21 (`java -version`), Node.js LTS with npm, Git. Python 3.11+ and `uv` only for Spec Kit itself.
- Maven is NOT required: the repository ships the Maven Wrapper.

## Run

```bash
# Terminal 1 - backend (http://localhost:8080)
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# Terminal 2 - frontend (http://localhost:4200)
cd frontend
npm install                     # first time only
npm start                       # generates the API client from the contract, then serves with the /api proxy
```

## Validate

1. `GET http://localhost:8080/api/health` returns `200` with `{"status":"UP","database":"UP","time":"..."}`.
2. `backend/data/roombook.db` exists after the first start; restarting keeps it.
3. Open `http://localhost:4200`: the shell shows the backend and database as UP.
4. Stop the backend and reload the frontend: a readable "backend unreachable" message appears.
5. `GET http://localhost:8080/api/unknown` returns `404` with `Content-Type: application/problem+json`.
6. Tests: `cd backend && ./mvnw test` (includes contract tests against `contracts/openapi.yaml`); `cd frontend && npm test -- --watch=false` (Vitest; regenerates the API client first).

## Notes

- A port already in use makes the backend stop with Spring Boot's explicit message; free the port or change `server.port`.
- Contract: [contracts/openapi.yaml](contracts/openapi.yaml). Data shapes: [data-model.md](data-model.md).
