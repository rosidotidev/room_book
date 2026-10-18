---

description: "Task list for Project Setup"
---

# Tasks: Project Setup

**Input**: Design documents from `/specs/001-project-setup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Included. Constitution II makes contract tests mandatory for every endpoint, and the plan lists unit and component tests.

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to
- Paths are relative to the repository root

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create the monorepo skeleton: `backend/`, `frontend/` and a root `.gitignore` ignoring `backend/data/`, `backend/target/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/src/app/api/` (FR-001, FR-016)
- [X] T002 Create the Spring Boot 3 / Java 21 Maven project with the Maven Wrapper in `backend/pom.xml`, `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/`, with dependencies: spring-boot-starter-web, spring-boot-starter-jdbc, sqlite-jdbc, flyway-core, spring-boot-starter-test, swagger-request-validator-mockmvc
- [X] T003 [P] Create the Angular standalone project with routing and Jasmine/Karma in `frontend/` (package.json scripts `generate:api`, `start`, `test`)
- [X] T004 [P] Add `openapi-generator-cli` as a devDependency and configure the `typescript-angular` generator reading `specs/001-project-setup/contracts/openapi.yaml` and writing to `frontend/src/app/api/` in `frontend/package.json` and `frontend/openapitools.json` (FR-010)

---

## Phase 2: Foundational (Blocking Prerequisites)

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Configure datasource and Flyway in `backend/src/main/resources/application.yml`: SQLite file `./data/roombook.db`, Flyway locations `classpath:db/migration` plus optional `classpath:db/seed` enabled by property `roombook.seed.enabled` (FR-004, FR-005, FR-016)
- [X] T006 Ensure the `backend/data/` folder is created before the datasource opens, in `backend/src/main/java/com/roombook/config/DataDirectoryInitializer.java` (FR-004)
- [X] T007 Create the injectable `Clock` bean in `backend/src/main/java/com/roombook/config/ClockConfig.java` (FR-012)
- [X] T008 Create migration `backend/src/main/resources/db/migration/V1__health_probe.sql` creating table `health_probe` (`id INTEGER PRIMARY KEY`, `checked_at TEXT NOT NULL`) and the empty folder `backend/src/main/resources/db/seed/` with a `.gitkeep` (FR-004, FR-005)
- [X] T009 Create the Spring Boot entry point `backend/src/main/java/com/roombook/RoomBookApplication.java`
- [X] T010 Create the contract-test harness base class in `backend/src/test/java/com/roombook/contract/ContractTestBase.java`: `@SpringBootTest` + `MockMvc`, a fixed `Clock` test configuration, an isolated temporary SQLite file, and an OpenAPI validator loading `specs/001-project-setup/contracts/openapi.yaml`; error responses for addresses not declared in the contract are validated against the `Problem` schema only, because an undeclared path has no operation to match (FR-011)

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Start the system with one command per side (Priority: P1) MVP

**Goal**: Backend and frontend each start with one command; database created and migrated automatically; data survives restarts.

**Independent Test**: On a fresh clone run `./mvnw spring-boot:run` in `backend/` and `npm start` in `frontend/`; both run and `backend/data/roombook.db` exists.

- [X] T011 [P] [US1] Integration test that a missing `data` folder and database file are created and migrations applied, and that a second start on the same file preserves existing data, in `backend/src/test/java/com/roombook/startup/DatabaseStartupTest.java` (FR-004, US1 scenario 3)
- [X] T012 [US1] Make `./mvnw spring-boot:run` work from `backend/` with no extra configuration and verify the database file is created at `backend/data/roombook.db` (FR-002, FR-004)
- [X] T013 [US1] Make `npm start` in `frontend/` run `generate:api` then `ng serve --proxy-config proxy.conf.json` in `frontend/package.json` (FR-002, FR-010)
- [X] T014 [P] [US1] Create the dev proxy forwarding `/api` to `http://localhost:8080` in `frontend/proxy.conf.json` (FR-008)
- [X] T015 [P] [US1] Create the application shell with navigation and routes in `frontend/src/app/layout/shell.component.ts`, `frontend/src/app/app.routes.ts`, `frontend/src/app/app.config.ts` (FR-013)
- [X] T016 [P] [US1] Create the initial design tokens as CSS custom properties in `frontend/src/styles/tokens.css` and import them in `frontend/src/styles.css`, mobile-first with breakpoints at 600 and 1024 px (constitution IX, X)

**Checkpoint**: Both sides start and the shell opens.

---

## Phase 4: User Story 2 - See the frontend reach the backend and the database (Priority: P1)

**Goal**: A health endpoint proves a database write and read, and the frontend displays it.

**Independent Test**: With both sides running, the frontend shows UP/UP; with the backend stopped it shows a readable "backend unreachable" message.

- [X] T017 [P] [US2] Contract test for `GET /api/health` 200 response against `contracts/openapi.yaml` in `backend/src/test/java/com/roombook/contract/HealthContractTest.java` (FR-003, FR-011)
- [X] T018 [P] [US2] Contract test for `GET /api/health` 503 when the database is unavailable in `backend/src/test/java/com/roombook/contract/HealthContractTest.java` (FR-003)
- [X] T019 [P] [US2] Unit test of `HealthService` with a fixed `Clock`: reports `time` from the clock, DOWN on repository failure, in `backend/src/test/java/com/roombook/service/HealthServiceTest.java` (FR-003, FR-012)
- [X] T020 [P] [US2] Create `HealthProbeRepository` performing insert, read-back and delete in one transaction on `health_probe` in `backend/src/main/java/com/roombook/repository/HealthProbeRepository.java`
- [X] T021 [US2] Create `HealthService` returning `status`, `database` and `time` from the injected `Clock` in `backend/src/main/java/com/roombook/service/HealthService.java` (FR-003, FR-012)
- [X] T022 [US2] Create `HealthController` for `GET /api/health` returning 200, or 503 when the database is DOWN, in `backend/src/main/java/com/roombook/api/HealthController.java`
- [X] T023 [P] [US2] Component test for the health status component: healthy, database down and unreachable states, in `frontend/src/app/health/health-status.component.spec.ts` (FR-009)
- [X] T024 [US2] Create the health status component using the generated client and show a readable "backend unreachable" message on network failure in `frontend/src/app/health/health-status.component.ts`, displayed in the shell (FR-009)

**Checkpoint**: End-to-end connectivity visible.

---

## Phase 5: User Story 3 - Consistent errors (Priority: P2)

**Goal**: Every backend error is `application/problem+json` with no internal details.

**Independent Test**: Request an unknown address and send a malformed request; both return the Problem shape.

- [X] T025 [P] [US3] Contract test: unknown path returns 404 `application/problem+json` matching `Problem`, and an unsupported method returns the same format, in `backend/src/test/java/com/roombook/contract/ErrorContractTest.java` (FR-006)
- [X] T026 [P] [US3] Contract test: a forced unexpected failure (raised by a test-only controller in `backend/src/test/java/com/roombook/contract/FailingTestController.java`) returns 500 `problem+json` whose `detail` contains no stack trace or exception class name, in `backend/src/test/java/com/roombook/contract/ErrorContractTest.java` (FR-006)
- [X] T027 [US3] Create `ApiExceptionHandler` (`@RestControllerAdvice`, `ProblemDetail`, generic detail for 5xx, `instance` = request path) in `backend/src/main/java/com/roombook/api/ApiExceptionHandler.java` and enable `spring.mvc.problemdetails.enabled` and `throw-exception-if-no-handler-found` in `backend/src/main/resources/application.yml` (FR-006)
- [X] T028 [P] [US3] Create a shared error-display helper turning a Problem response into a readable message in `frontend/src/app/shared/problem-message.ts` with a spec in `frontend/src/app/shared/problem-message.spec.ts`

---

## Phase 6: User Story 4 - One published API contract (Priority: P2)

**Goal**: The contract is the single reference; the client is generated from it and the backend is verified against it.

**Independent Test**: The contract tests pass for the health check and fail on a deviating response.

- [X] T029 [US4] Validate `specs/001-project-setup/contracts/openapi.yaml` is a valid OpenAPI 3.0 document and that `npm run generate:api` produces a client containing `getHealth` (FR-007, FR-010)
- [X] T030 [US4] Add a negative harness test proving that a response deviating from the contract fails validation, in `backend/src/test/java/com/roombook/contract/ContractHarnessTest.java` (FR-011)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T031 [P] Add the seed-data mechanism test: enabling `roombook.seed.enabled` with an empty seed folder starts cleanly, in `backend/src/test/java/com/roombook/startup/SeedMechanismTest.java` (FR-005)
- [X] T032 [P] Write a root `README.md` pointing to `specs/001-project-setup/quickstart.md` with prerequisites and the two start commands (FR-015)
- [X] T033 Run the full quickstart validation: `./mvnw test`, `npm test -- --watch=false --browsers=ChromeHeadless`, manual start of both sides, health visible, 404 returns problem+json (SC-001 to SC-004)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → user stories → Polish.
- US1 and US2 (both P1) follow Phase 2; US2 needs the shell from T015. US3 and US4 depend only on Phase 2 and can run after or in parallel with US2.
- Within a story: tests before implementation, repository before service before controller.

## Parallel Opportunities

- T003 and T004 with T002; T014, T015, T016 together; T017–T020 together; T025, T026, T028 together.

## Implementation Strategy

MVP = Phase 1 + 2 + US1, then US2 for visible end-to-end proof, then US3 and US4, then polish.

## Phase 8: Convergence

- [X] T034 Validate the error response bodies in `backend/src/test/java/com/roombook/contract/ErrorContractTest.java` against the `Problem` schema read from `specs/001-project-setup/contracts/openapi.yaml` instead of only asserting individual fields per Constitution II (partial)
- [X] T035 Make every documented status code of `/api/health` in `specs/001-project-setup/contracts/openapi.yaml` verified by a contract test: either add a test for the 500 response or remove the unreachable 500 from the contract per Constitution II (partial)
- [X] T036 Remove or use the unreferenced `NotFound` and `BadRequest` response components in `specs/001-project-setup/contracts/openapi.yaml` per plan: contracts (unrequested)
