# Implementation Plan: Rooms Screens

**Branch**: `003-rooms-ui` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-rooms-ui/spec.md`

## Summary

Build the first real frontend feature on the fixed rooms contract and create the shared design system reused by the bookings screens: design tokens, an Angular Material theme built on them, a responsive app shell (bottom, top and side navigation at 600 and 1024 px), the room list with debounced filters, the room administration form, a shared problem+json message component and a deactivation confirmation. Decisions in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript (Angular 22, standalone components, signals), Node.js LTS

**Primary Dependencies**: Angular Material and CDK 22, `@fontsource/inter`, the generated API client (`frontend/src/app/api/`)

**Storage**: N/A (backend only)

**Testing**: Vitest through `ng test` (component tests); browser verification at 360, 768 and 1280 px

**Target Platform**: Modern browsers on phone, tablet and desktop

**Project Type**: web application (frontend only in this feature)

**Performance Goals**: filters respond within the 300 ms debounce plus one API round trip; list usable immediately

**Constraints**: `openapi.yaml` must not change; mobile-first CSS; touch targets >= 44 px; WCAG 2.1 AA; no hard-coded colors, fonts or spacing in components

**Scale/Scope**: 2 routes, about 8 components, 1 theme

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. API-First | PASS | Contract untouched, client generated from it, hash baseline recorded |
| II. Contract tests | N/A | No endpoints added |
| III. Rules in service layer | PASS | UI only pre-checks obvious input errors; the backend stays the authority and its errors are displayed |
| IV. Deterministic time | PASS | No time logic except the debounce, which is tested with fake timers |
| V. Migrations | N/A | No database change |
| VI. Problem+JSON | PASS | Shared component presents problem+json readably |
| VII. Monorepo layout | PASS | Changes only under `frontend/` and `specs/` |
| VIII. No authentication | PASS | Admin screen open |
| IX. Responsive, mobile-first | PASS | Breakpoints 600 and 1024 px, 44 px targets, verified at 360/768/1280 px |
| X. Single design system | PASS | Tokens defined once; Material mapped to tokens |
| XI. Accessibility | PASS | AA contrast, keyboard, visible focus, label plus icon for state |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-rooms-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contract-baseline.sha256
├── contracts/README.md
├── checklists/
└── tasks.md                # created by /speckit-tasks
```

### Source Code (repository root)

```text
frontend/src/
├── styles.css                              # imports tokens and theme
├── styles/
│   ├── tokens.css                          # design tokens (extended)
│   └── theme.scss                          # Angular Material theme driven by tokens
└── app/
    ├── app.routes.ts                       # /rooms, /rooms/admin, redirect from /
    ├── layout/
    │   ├── shell.component.ts              # responsive app shell (bottom/top/side navigation)
    │   └── page.component.ts               # page header and content width
    ├── shared/
    │   ├── problem-message.ts              # existing helper
    │   └── problem-message.component.ts    # shared error display
    └── rooms/
        ├── rooms.facade.ts                 # wraps the generated RoomsService
        ├── room-list.page.ts               # list, filters, cards
        ├── room-filters.component.ts       # debounced filters, collapsible on phones
        ├── room-card.component.ts          # card with active/inactive state
        ├── room-admin.page.ts              # administration list with actions
        ├── room-form.component.ts          # add/edit form (full screen / dialog)
        ├── deactivate-dialog.component.ts  # confirmation and warning
        └── *.spec.ts                       # component tests
```

**Structure Decision**: Feature folders under `frontend/src/app/` with the shell and shared pieces in `layout/` and `shared/`, so the bookings screens can reuse them.
