# Implementation Plan: Project Setup

**Branch**: `001-project-setup` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-project-setup/spec.md`

## Summary

Create the runnable foundation: a Spring Boot backend with a health endpoint, `problem+json` error handling and an injectable `Clock`; a SQLite database file created and migrated by Flyway at startup; an Angular shell with routing, a generated typed client and a dev proxy; and a hand-written `openapi.yaml` that is the contract for both sides, enforced by contract tests. No business behavior. Decisions in [research.md](research.md).

## Technical Context

**Language/Version**: Java 21 (backend), TypeScript with current Angular CLI on Node.js LTS (frontend)

**Primary Dependencies**: Spring Boot 3, Spring JDBC, sqlite-jdbc, Flyway, swagger-request-validator (tests); Angular standalone, openapi-generator-cli (`typescript-angular`)

**Storage**: SQLite single file `backend/data/roombook.db`, Flyway migrations

**Testing**: JUnit 5 + MockMvc contract tests validating against `openapi.yaml`; Vitest (Angular CLI default runner) for the frontend

**Target Platform**: Developer workstation (Windows/macOS/Linux), modern browsers

**Project Type**: web application (backend + frontend monorepo)

**Performance Goals**: Health status visible in the frontend within 2 s (SC-003)

**Constraints**: One start command per side; no containers; no CORS config (dev proxy); no internal details in errors

**Scale/Scope**: Single local environment; one endpoint, one frontend page

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. API-First | PASS | `contracts/openapi.yaml` written in this plan phase; client generated from it |
| II. Contract tests | PASS | Every endpoint (health, 404, 500 path) validated against the contract |
| III. Rules in service layer | PASS | Health logic in a service; controller only maps HTTP |
| IV. Deterministic time | PASS | `Clock` bean, fixed clock in tests |
| V. Versioned migrations | PASS | Flyway V1 creates `health_probe`; seed folder prepared |
| VI. Problem+JSON | PASS | `@RestControllerAdvice` with `ProblemDetail` |
| VII. Monorepo layout | PASS | `backend/`, `frontend/`, `specs/` |
| VIII. No authentication | PASS | None |
| IX-XI. UI principles | PASS (scope-limited) | Shell is minimal, mobile-first, tokens file seeded as CSS custom properties; full design system arrives in F02 |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-setup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── mvnw, mvnw.cmd, .mvn/
├── pom.xml
├── data/                          # git-ignored, holds roombook.db
├── src/main/java/com/roombook/
│   ├── RoomBookApplication.java
│   ├── config/ClockConfig.java
│   ├── config/DataDirectoryInitializer.java
│   ├── api/HealthController.java
│   ├── api/ApiExceptionHandler.java
│   ├── service/HealthService.java
│   └── repository/HealthProbeRepository.java
├── src/main/resources/
│   ├── application.yml            # datasource, flyway, seed location property
│   └── db/migration/V1__health_probe.sql
│   └── db/seed/                   # empty, loaded when enabled
└── src/test/java/com/roombook/
    ├── contract/HealthContractTest.java
    ├── contract/ErrorContractTest.java
    ├── contract/ContractHarnessTest.java
    ├── contract/FailingTestController.java
    ├── startup/DatabaseStartupTest.java
    ├── startup/SeedMechanismTest.java
    └── service/HealthServiceTest.java

frontend/
├── package.json                   # scripts: generate:api, start, test
├── proxy.conf.json
├── src/app/
│   ├── api/                       # generated client (git-ignored)
│   ├── app.routes.ts, app.config.ts
│   ├── layout/shell (app shell)
│   └── health/health-status component + service wrapper
├── src/styles/tokens.css          # initial design tokens
└── src/**/*.spec.ts

specs/                             # Spec Kit artifacts and the contract
```

**Structure Decision**: Web application monorepo as mandated by constitution VII; the contract lives under `specs/001-project-setup/contracts/` and is extended in place by later features.
