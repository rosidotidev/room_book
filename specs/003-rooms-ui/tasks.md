---

description: "Task list for Rooms Screens"
---

# Tasks: Rooms Screens

**Input**: Design documents from `/specs/003-rooms-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md; the rooms API running on `http://localhost:8080`

**Tests**: Component tests are included (plan: list filtering and admin form validation) plus layout verification at 360, 768 and 1280 px.

## Format: `[ID] [P?] [Story] Description`

Paths are relative to the repository root. `APP` = `frontend/src/app/`, `STY` = `frontend/src/styles/`.

## Phase 1: Setup

- [X] T001 Record the contract baseline: confirm `specs/003-rooms-ui/contract-baseline.sha256` equals `sha256sum specs/001-project-setup/contracts/openapi.yaml` before any change (FR-015)
- [X] T002 Install Angular Material and CDK 22 and `@fontsource/inter` in `frontend/package.json` (FR-013)

---

## Phase 2: Foundational - design system, shell, shared pieces (blocking)

- [X] T003 Extend `STY/tokens.css` with the full token set: ink/navy and neutral scale, one teal accent with AA-contrast pairs, status colors (success, warning, danger, inactive), typography scale (caption, body, title, display), 8 px spacing scale, radius 8-12 px, elevation levels, 44 px touch target, content max width (FR-013)
- [X] T004 Create `STY/theme.scss`: Angular Material theme with `mat.theme` and the Material system variables (`--mat-sys-*`) assigned from the tokens so that no component hard-codes a color, font or spacing; Inter loaded through `@fontsource/inter`; import both in `frontend/src/styles.css` and `frontend/angular.json` (FR-013)
- [X] T005 Create `APP/layout/shell.component.ts` (replace the F00 shell): below 600 px a bottom navigation bar, from 600 to 1024 px a top bar, above 1024 px a side navigation; links "Rooms" (`/rooms`) and "Admin" (`/rooms/admin`); each target at least 44 px; skip-to-content link; visible focus; the F00 health status moves to the shell footer (FR-009, FR-010, FR-011, FR-012, FR-016)
- [X] T006 [P] Create `APP/layout/page.component.ts`: page title area and content max width reused by every screen (FR-013)
- [X] T007 [P] Extend `APP/shared/problem-message.ts` and create `APP/shared/problem-message.component.ts`: shared error display with `role="alert"`, an icon and the readable text from a problem+json response, never color alone (FR-007, FR-008, FR-014)
- [X] T008 Create `APP/rooms/rooms.facade.ts` wrapping the generated rooms service (`listRooms`, `createRoom`, `updateRoom`, `setRoomActive`) and translating HTTP errors into view errors with a `FieldError` mapping (409 to the name field; a detail naming `capacity`, `name` or `equipment` to that field; otherwise form level) (FR-007)
- [X] T009 Update `APP/app.routes.ts`: `/` redirects to `/rooms`; `/rooms` (list) and `/rooms/admin` (administration) with titles

**Checkpoint**: Shell, tokens, theme and facade ready.

---

## Phase 3: User Story 1 - Browse and filter rooms (P1) MVP

**Goal**: A room list with name, capacity, equipment, debounced filters, inactive styling and empty states.

**Independent Test**: Open `/rooms` with the demo rooms and use each filter.

- [X] T010 [P] [US1] Component test `APP/rooms/room-list.page.spec.ts`: the list shows name, capacity and equipment; setting capacity or equipment calls the facade once, 300 ms after the last change (fake timers); "Clear filters" resets; the empty states "No rooms yet" and "No rooms match" with their actions; an inactive room shows the "Inactive" label; a failing load shows an error with Retry (FR-001, FR-002, FR-003, FR-016)
- [X] T011 [US1] Create `APP/rooms/room-card.component.ts`: name, capacity, equipment chips; inactive state greyed with the text label "Inactive" and an icon (FR-001, FR-003, FR-014)
- [X] T012 [US1] Create `APP/rooms/room-filters.component.ts`: minimum capacity number input and equipment select built from the items present in an unfiltered load of the whole catalog (so choosing an item never shrinks the choices), debounced 300 ms, "Clear filters"; on phones inside a collapsible panel showing the number of active filters when collapsed; horizontal bar from 600 px (FR-002, FR-009, FR-010)
- [X] T013 [US1] Create `APP/rooms/room-list.page.ts`: loading state, list, empty states, error with Retry using the shared problem message; layout one column below 600 px, two columns from 600 px, three or four columns above 1024 px (FR-001, FR-009, FR-010, FR-011, FR-016)

---

## Phase 4: User Story 2 - Add and edit a room (P1)

**Goal**: An administration screen with a validated add and edit form that shows server rejections next to the form.

**Independent Test**: Add a room, repeat its name, edit it.

- [X] T014 [P] [US2] Component test `APP/rooms/room-form.component.spec.ts`: name required and at most 100 characters, capacity whole number 1-1000, at most 20 equipment items of at most 50 characters; Save disabled or blocked while invalid with messages next to the fields; a 409 from the facade shows the message under the name field and keeps the data; an unreachable error shows a form-level message and keeps the data (FR-004, FR-007)
- [X] T015 [US2] Create `APP/rooms/room-form.component.ts`: reactive form (name, capacity, equipment chips) with client pre-checks mirroring the contract, field-level and form-level messages using the shared problem component, data kept on rejection, labels and `aria-describedby` for errors (FR-004, FR-007, FR-008, FR-012)
- [X] T016 [US2] Create `APP/rooms/room-admin.page.ts`: list of rooms with Add, Edit and activate/deactivate actions; the form opens full screen on phones (route view) and in a dialog (right-anchored on desktop) from 600 px; on success the list refreshes (FR-004, FR-009, FR-010, FR-011)

---

## Phase 5: User Story 3 - Activate and deactivate a room (P2)

**Goal**: Deactivation with a confirmation and any warning the system returns; reactivation.

**Independent Test**: Deactivate after confirming, see it inactive, reactivate.

- [X] T017 [P] [US3] Component test `APP/rooms/deactivate-dialog.component.spec.ts` and a page-level test: deactivation asks for confirmation first and does nothing on Cancel; on Confirm the facade is called; when the result lists future bookings they are shown as a warning, with an empty list nothing is shown; reactivation needs no confirmation (FR-005, FR-006)
- [X] T018 [US3] Create `APP/rooms/deactivate-dialog.component.ts`: confirmation text, Confirm and Cancel; after confirming, the result view lists the system's future-bookings warning when present (the contract returns it only with the result of the change, reported as a finding in research.md) (FR-005, FR-006)
- [X] T019 [US3] Wire activate/deactivate in `APP/rooms/room-admin.page.ts`: confirm, call `setRoomActive`, refresh the list, show errors with the shared message (FR-005)

---

## Phase 6: User Story 4 - Comfortable on any device (P2)

**Goal**: Layouts, touch and keyboard behave as specified at the three widths.

- [X] T020 [US4] Audit the components for hard-coded colors, font sizes, spacing, radius or shadows and replace them with tokens: search `frontend/src/app/` for hex colors, `px` font sizes and `box-shadow` literals (FR-013, constitution X)
- [X] T021 [US4] Verify keyboard-only operation of every action and a visible focus ring, dialog focus trap with focus returned to the trigger, and 44 px minimum size of every interactive control, by inspecting the running app (FR-012, SC-004)
- [X] T022 [US4] Verify layouts at 360, 768 and 1280 px against the running app with screenshots from the browser tool, or from headless Chrome when the tool is unavailable: list, filters, administration, form and dialog; no horizontal scrolling at any width (FR-009, FR-010, FR-011, SC-003)
- [X] T023 [US4] Verify WCAG 2.1 AA contrast of text and controls on the token palette by computing the ratios of every foreground/background token pair in use and recording them in `specs/003-rooms-ui/contrast.md` (FR-014, SC-004)

---

## Phase 7: Polish & Cross-Cutting

- [X] T024 Update the F00 tests that referenced the old shell and routes (`APP/app.spec.ts`, health component spec) so the whole suite passes: `npm test -- --watch=false` in `frontend/`
- [X] T025 Run the quickstart `specs/003-rooms-ui/quickstart.md` against the real backend through the dev proxy
- [X] T026 Confirm the contract is unchanged: `sha256sum specs/001-project-setup/contracts/openapi.yaml` equals the content of `specs/003-rooms-ui/contract-baseline.sha256` (FR-015)

---

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> US1 -> US2 -> US3; US4 verification after the screens exist; Polish last.
- T003 -> T004 -> T005; T008 before any page; US2 builds on the admin page, US3 extends it.
- Within a story: component test, then components, then the page.

## Parallel Opportunities

- T006 and T007 together; T010 and T014 and T017 can be written ahead of their components.

## Implementation Strategy

MVP = Setup + Foundational + US1 (the list with filters); then US2, US3, then the device verification and polish.

## Phase 8: Convergence

- [X] T027 Add tests in `frontend/src/app/rooms/room-form.component.spec.ts` for the equipment items: adding trims and ignores case-insensitive duplicates, removing works, more than 20 items and an item over 50 characters are refused with a message next to the field, and the items are sent on save, per FR-004 and FR-007 (partial)
- [X] T028 Add tests in `frontend/src/app/rooms/room-filters.component.spec.ts` for the collapsible phone panel: the Filters button toggles `aria-expanded`, the number of active filters is shown, and Clear filters resets the form, per FR-009 (partial)
