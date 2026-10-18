# Implementation Plan: Booking Screens

**Branch**: `005-bookings-ui` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-bookings-ui/spec.md`

## Summary

Add the booking screens on the fixed contract: an adaptive day view (agenda below 600 px, timeline from 600 to 1024 px, multi-room grid above 1024 px), a booking form that opens from a free row or a button, and My bookings with cancellation rules. The existing app shell, tokens, Material theme, shared message component and generated client are reused; no new colors or fonts. Decisions in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript (Angular 22, standalone components, signals)

**Primary Dependencies**: Angular Material and CDK (already installed), the generated API client

**Storage**: N/A on the server; the organizer name in the browser's local storage

**Testing**: Vitest component tests; end-to-end happy path against the real backend with the browser tool; layout checks at 360, 768 and 1280 px

**Target Platform**: Modern browsers on phone, tablet and desktop

**Project Type**: web application (frontend only in this feature)

**Performance Goals**: the day view shows a change within 2 s of a booking or cancellation (SC-002)

**Constraints**: `openapi.yaml` unchanged; same breakpoints 600 and 1024 px; touch targets >= 44 px; WCAG 2.1 AA; tokens only

**Scale/Scope**: 2 routes, about 9 components and 2 small services

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. API-First | PASS | Contract untouched and named as a constraint; hash baseline recorded; client regenerated |
| II. Contract tests | N/A | No endpoints added |
| III. Rules in service layer | PASS | The UI only pre-checks obvious errors; the backend decides and its refusals are displayed |
| IV. Deterministic time | PASS | Office-time helpers take "now" as an argument, so tests use fixed instants |
| V. Migrations | N/A | No database change |
| VI. Problem+JSON | PASS | Shared message component presents refusals |
| VII. Monorepo layout | PASS | Changes under `frontend/` and `specs/` |
| VIII. No authentication | PASS | Organizer is a remembered name |
| IX. Responsive, mobile-first | PASS | Three layouts at the same breakpoints, 44 px targets, verified at 360/768/1280 px |
| X. Single design system | PASS | State styling uses semantic aliases of existing tokens only |
| XI. Accessibility | PASS | Labels and icons for every state, keyboard operable rows, visible focus, AA contrast |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-bookings-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contract-baseline.sha256
├── contracts/README.md
├── checklists/
└── tasks.md                 # created by /speckit-tasks
```

### Source Code (repository root)

```text
frontend/src/
├── styles/tokens.css                        # + semantic aliases for slot states
└── app/
    ├── app.routes.ts                        # + /availability, /my-bookings
    ├── layout/shell.component.ts            # + navigation entries
    ├── shared/
    │   ├── office-time.ts                   # office-zone conversions, canCancel
    │   ├── organizer-store.ts               # remembered name
    │   └── responsive-dialog.ts             # dialog configuration per breakpoint
    └── bookings/
        ├── bookings.facade.ts               # wraps BookingsService and active rooms
        ├── day-view.component.ts            # agenda / timeline / grid
        ├── date-strip.component.ts          # phone date strip
        ├── availability.page.ts             # selectors, day view, form launch
        ├── booking-form.component.ts        # form and dialog wrapper
        ├── my-bookings.page.ts              # name, cards or table, cancel
        └── *.spec.ts                        # component and helper tests
```

**Structure Decision**: A `bookings` feature folder next to `rooms`, reusing `layout` and `shared`; the three layouts share one day-view component so rows, states and labels are identical.
