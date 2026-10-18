# Research: Project Setup

All Technical Context unknowns are resolved below.

## Decisions

| Topic | Decision | Rationale | Alternatives considered |
|-------|----------|-----------|-------------------------|
| Build tool (backend) | Maven via the Maven Wrapper (`mvnw`), committed to the repo | Maven is not installed on the dev machine; the wrapper gives "one command" start with no prerequisite beyond JDK 21 | System Maven (extra prerequisite); Gradle (not requested) |
| Persistence access | Spring Data JDBC / `JdbcTemplate` with `org.xerial:sqlite-jdbc` | Thin, explicit SQL, no ORM dialect problems with SQLite | JPA/Hibernate (SQLite dialect is community-maintained, heavier) |
| Migrations | Flyway (`flyway-core`), scripts in `db/migration`; seed data in a separate versioned folder `db/seed`, enabled by the Spring profile `seed` (`application-seed.yml` adds the location) | Satisfies constitution V; seed mechanism present but empty | Liquibase; ad-hoc `schema.sql` (forbidden) |
| Database file | `backend/data/roombook.db`, created on first start; `backend/data/` git-ignored | FR-016 | In-memory (loses data) |
| Contract | Hand-written `openapi.yaml` (OpenAPI 3.0.3) at `specs/001-project-setup/contracts/openapi.yaml`; later features extend this same file | Constitution I: contract is written before code; springdoc would invert the direction | springdoc generated from code |
| Contract tests | `MockMvc`/`@SpringBootTest` with `com.atlassian.oai:swagger-request-validator-mockmvc` validating every response against the contract | Validates status codes and schemas automatically, per constitution II | Hand-written schema assertions; Pact |
| Error format | RFC 7807 `application/problem+json` through Spring `ProblemDetail` + `@RestControllerAdvice`; generic detail for 5xx | Constitution VI, FR-006 | Custom error envelope |
| Clock | A `Clock` bean (`Clock.systemDefaultZone()`), injected wherever time is needed; tests override with `Clock.fixed` | Constitution IV, FR-012 | `Instant.now()` calls (forbidden) |
| Health | Custom `GET /api/health` returning `{status, database, time}`; database check writes and reads a row in a dedicated `health_probe` scratch table created via migration V1, or a temp table inside a transaction | FR-003 asks for a real read and write round trip | Spring Actuator `/health` (no write proof, not in contract) |
| Frontend | Angular (latest stable CLI), standalone components, routing, Angular Material later (F02) | Requested | NgModules |
| API client | `openapi-generator-cli` (npm devDependency) with the `typescript-angular` generator, output in `frontend/src/app/api/` (generated, git-ignored, produced by `npm run generate:api`) | Constitution I and FR-010; requires JDK, already a prerequisite | `ng-openapi-gen` (also fine); hand-written client (forbidden) |
| Dev proxy | `frontend/proxy.conf.json` forwarding `/api` to `http://localhost:8080` | FR-008 | CORS configuration |
| Frontend tests | Vitest (jsdom) via `ng test` | Jasmine/Karma was requested, but the current Angular CLI ships Vitest as the default runner (Karma is deprecated); Vitest keeps a Jasmine/Jest-style API with no browser needed. Deviation accepted | Jasmine/Karma (extra setup, needs Chrome); Jest |
| One command per side | Backend: `./mvnw spring-boot:run` from `backend/`. Frontend: `npm start` from `frontend/` (runs client generation, then `ng serve` with proxy) | FR-002 | Root orchestrating scripts |
| Port conflict | Spring Boot's default failure message for port-in-use is kept; documented in quickstart | Edge case in spec | Auto-pick port (breaks proxy) |

## Open items

None.
