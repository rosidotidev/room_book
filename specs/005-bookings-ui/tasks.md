---

description: "Task list for Booking Screens"
---

# Tasks: Booking Screens

**Input**: Design documents from `/specs/005-bookings-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md; the bookings and rooms API running on `http://localhost:8080`

**Tests**: Component tests (grid rendering, form error display, My bookings rules), helper tests, an end-to-end happy path against the real backend, and layout verification at 360, 768 and 1280 px.

## Format: `[ID] [P?] [Story] Description`

Paths are relative to the repository root. `APP` = `frontend/src/app/`, `STY` = `frontend/src/styles/`.

## Phase 1: Setup

- [X] T001 Confirm the contract baseline: `specs/005-bookings-ui/contract-baseline.sha256` equals `sha256sum specs/001-project-setup/contracts/openapi.yaml`, and `npm run generate:api` in `frontend/` produces a `BookingsService` with `createBooking`, `cancelBooking`, `getRoomAvailability` and `listBookingsByOrganizer` (FR-017)

---

## Phase 2: Foundational (blocking)

- [X] T002 [P] Create `APP/shared/office-time.ts`: constant `OFFICE_ZONE = 'Europe/Rome'`; `toOfficeIso(date, time)` returning an ISO string with the office offset for that day; `officeParts(iso)` returning `{date, time}` from a returned string; `nowInOffice(now)` returning `{date, time}` via `Intl`; `isWorkingDay(date)`; `nextWorkingDay(date)`; `canCancel(startIso, now)` true when at least 60 minutes remain (exactly 60 included); every function takes "now" as an argument (FR-001, FR-010)
- [X] T003 [P] Test `APP/shared/office-time.spec.ts` with fixed instants: summer and winter offsets, the daylight-saving change day, weekend detection, next working day from Saturday and Sunday, `canCancel` at 61, 60, 59 minutes, already started (FR-010)
- [X] T004 [P] Create `APP/shared/organizer-store.ts`: read, write and clear the remembered name in `localStorage`, every access in try/catch so the page works without storage; `matches(name, organizer)` ignoring case and surrounding spaces (FR-018)
- [X] T005 [P] Create `APP/shared/responsive-dialog.ts`: `responsiveDialogConfig(breakpoints)` returning full screen below 600 px, a centered dialog from 600 to 1024 px, and a right-anchored side panel above 1024 px; make `APP/rooms/room-admin.page.ts` use it (FR-011, FR-012, FR-013)
- [X] T006 Add semantic aliases for the slot states to `STY/tokens.css` that point to existing tokens only: free = surface, booked = accent-soft, own = accent, cancelled = inactive-soft, past = surface-sunken; no new color value (FR-003, FR-015)
- [X] T007 Create `APP/bookings/bookings.facade.ts`: `activeRooms()` (rooms with `active` true, sorted by name), `day(roomId, date)`, `days(roomIds, date)` for the grid, `create(input)`, `cancel(id)`, `byOrganizer(name)`; errors pass through the shared problem message (FR-001, FR-009)
- [X] T008 Update `APP/layout/shell.component.ts` navigation with "Availability" (`/availability`) and "My bookings" (`/my-bookings`) next to Rooms and Admin (four entries must still fit the bottom bar at 360 px with 44 px targets), and `APP/app.routes.ts` with the two routes and `/` redirecting to `/availability` (FR-014)
- [X] T009 [P] Add the icons needed for the states (free, booked, own, cancelled, check, calendar, person) to `APP/shared/icon.component.ts` (FR-003)

**Checkpoint**: Helpers, tokens, facade, routes and navigation ready.

---

## Phase 3: User Story 1 - See when a room is free (P1) MVP

**Goal**: The day view in its three layouts with states, labels and empty states.

**Independent Test**: Open `/availability` for a room with bookings, then for an empty day and a weekend.

- [X] T010 [P] [US1] Component test `APP/bookings/day-view.component.spec.ts`: 48 rows from 08:00 to 19:45; a booking spans its rows and shows its title with the full detail in its accessible name; free rows are buttons named "Free 10:15"; own bookings carry the label "Yours"; past rows of today and every row of a weekend are not selectable; the layouts `agenda`, `timeline` and `grid` render one room, one room and several rooms side by side; the empty-day message "No bookings today — be the first to book" and the weekend message (FR-001, FR-002, FR-003, FR-016)
- [X] T011 [US1] Create `APP/bookings/day-view.component.ts`: a vertical time axis of 48 rows of at least 44 px, booked blocks spanning their rows with the title truncated by an ellipsis, free-row buttons, own and past states, labels and icons for every state, the three layouts chosen by an input; all colors from tokens; fade-in on refresh using `--motion-fast`; keyboard: Up and Down arrows move the focus between the free rows of the same column while Tab keeps working, Enter or Space selects (FR-001, FR-002, FR-003, FR-014, FR-015)
- [X] T012 [P] [US1] Create `APP/bookings/date-strip.component.ts`: the working days of the selected week as 44 px buttons with previous and next week buttons, used on phones (FR-011)
- [X] T013 [US1] Create `APP/bookings/availability.page.ts`: first active room and today (or the next Monday) on load; a room selector and a date input with previous and next day on tablet and desktop, the date strip and a room selector on phones; the grid layout above 1024 px loads every active room; breakpoints through `BreakpointObserver` at 600 and 1024 px; loading, empty day, weekend and error with retry; no periodic refresh: the day reloads after a creation or cancellation, a change of room or date and on Retry, and nothing reloads in the background while the form is open (FR-001, FR-008, FR-011, FR-012, FR-013)

---

## Phase 4: User Story 2 - Book a room from the day view (P1)

**Goal**: Start a booking from a free row or a button, with refusals shown next to the form and data kept.

**Independent Test**: Select a free row, submit, see the booking; submit the same period again and read the refusal.

- [X] T014 [P] [US2] Component test `APP/bookings/booking-form.component.spec.ts`: values pre-filled from a selection; a selection stops at the next occupied row and at 20:00; title and organizer required and at most 100 characters; end after start; at most 4 hours; not in the past; a server refusal (409, 400, 422, unreachable) is shown with the shared message and every value is kept; the remembered organizer name pre-fills and is saved on success (FR-005, FR-006, FR-007, FR-018)
- [X] T015 [US2] Create `APP/bookings/booking-form.component.ts` and its dialog wrapper: reactive form with room, date, start and end selects in 15-minute steps (start 08:00-19:45, end 08:15-20:00), title and organizer; pre-checks mirroring the rules; submission through the facade with `toOfficeIso`; refusals above the actions through `ProblemMessageComponent`; data kept on every failure (FR-005, FR-006, FR-007)
- [X] T016 [US2] Wire selection and the button in `APP/bookings/availability.page.ts`: a tap on a free row opens the form with start = that row and end = start + 60 minutes capped at the next occupied row and at 20:00; a "Book a room" button opens it with the current room and date and empty times; the dialog layout comes from `responsiveDialogConfig`; after success the day view reloads without a manual refresh (FR-004, FR-008, FR-018)

---

## Phase 5: User Story 3 - See and cancel my bookings (P1)

**Goal**: A remembered name, the list with statuses, and cancellation with its rules.

**Independent Test**: Enter a name, cancel a distant booking, see it as cancelled.

- [X] T017 [P] [US3] Component test `APP/bookings/my-bookings.page.spec.ts`: the list shows room, date, time, title and status with a label and an icon; Cancel is enabled at 61 and 60 minutes and disabled at 59 minutes with the reason "Starts in less than an hour", and for a started booking with "Already started"; cancelling keeps the booking listed as Cancelled; a refused cancellation shows a message and leaves the list unchanged; the empty message for a name without bookings and for no name; the name is remembered (FR-009, FR-010)
- [X] T018 [US3] Create `APP/bookings/my-bookings.page.ts`: name field remembered through the store; list as cards in one column on phones and two columns on tablets and as a table with a status column on desktops; Cancel button with the explanation when disabled; cancelled bookings stay visible; loading, empty and error with retry (FR-009, FR-010, FR-011, FR-012, FR-013)

---

## Phase 6: User Story 4 - Comfortable on any device (P2)

- [X] T019 [US4] Audit for hard-coded colors, font sizes, spacing, radius or shadows in `APP/bookings/` and `APP/shared/` and replace them with tokens (FR-015, constitution X)
- [X] T020 [US4] Verify keyboard-only operation (rows, blocks, selectors, form fields, Enter to submit, dialog focus trap and returned focus) and the 44 px size of every interactive control in the running app (FR-014, SC-005)
- [X] T021 [US4] Verify the layouts at 360, 768 and 1280 px in the running app through same-origin iframes of the exact width, with screenshots: agenda with date strip and full-screen form, timeline with room selector and dialog, several rooms with side panel, My bookings as cards and as table; no horizontal scrolling (FR-011, FR-012, FR-013, SC-003)
- [X] T022 [US4] Compute the WCAG 2.1 AA contrast of the slot state pairs (free, booked, own, cancelled, past, labels) and extend `specs/003-rooms-ui/contrast.md` or add `specs/005-bookings-ui/contrast.md` with the ratios (FR-003, SC-005)

---

## Phase 7: Polish & Cross-Cutting

- [X] T023 Run the end-to-end happy path against the real backend in the browser: create a booking from a free row, see it in the day view, see it in My bookings, cancel it, see the period free again; record the result in `specs/005-bookings-ui/quickstart.md` (SC-001, SC-002)
- [X] T024 Update tests of earlier features affected by the shell navigation and routes change, then run `npm test -- --watch=false` and `npx ng build` in `frontend/` and the backend suite to confirm nothing regresses
- [X] T025 Confirm the contract is unchanged: `sha256sum specs/001-project-setup/contracts/openapi.yaml` equals `specs/005-bookings-ui/contract-baseline.sha256` (FR-017)

---

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> US1 -> US2 -> US3; US4 verification after the screens exist; Polish last.
- T002 before T003 and T007; T006 before T011; T008 after the pages exist as route targets (routes may be added with placeholders and completed per story).
- Within a story: component test, then components, then the page.

## Parallel Opportunities

- T002, T004, T005, T009 together; T010 and T014 and T017 can be written ahead of their components.

## Implementation Strategy

MVP = Setup + Foundational + US1 (the day view); then booking, My bookings, device verification and polish.

## Phase 8: Convergence

- [X] T026 Add component tests `frontend/src/app/bookings/availability.page.spec.ts` with a fixed clock and a stubbed `BreakpointObserver`: first load shows the first active room by name and today or the next Monday; the layout is agenda below 600 px, timeline between and grid above 1024 px, and the grid loads every active room; selecting a free row opens the form with the selection; after a saved booking the day reloads without a manual refresh; the empty-rooms message and the error with Retry, per FR-001, FR-004, FR-008, FR-011, FR-012, FR-013 (partial)
- [X] T027 Add tests `frontend/src/app/bookings/date-strip.component.spec.ts` (Monday to Friday of the selected week, the selected day marked, previous and next week) and `frontend/src/app/shared/responsive-dialog.spec.ts` (full screen below 600 px, centered dialog between, side panel above 1024 px), per FR-011 (partial)
