# Quickstart: Booking Screens

## Run

```bash
cd backend && ./mvnw spring-boot:run     # http://localhost:8080
cd frontend && npm install && npm start  # http://localhost:4200 (proxy to /api)
```

## Validate (end-to-end happy path)

1. Open `http://localhost:4200`: it lands on Availability with the first active room and today (the next Monday when today is a weekend).
2. The day shows 08:00-20:00 in 15-minute rows; free rows are buttons, an empty day says "No bookings today — be the first to book".
3. Select a free row: the form opens with room, date, start and end (one hour, stopping before an occupied row). Enter a title and your name and submit: the form closes and the booking appears in the day view without a reload.
4. Try the same period again: a plain-language message ("The room is already booked from 10:00 to 11:00 ...") appears next to the form and every value is kept.
5. Open My bookings: your name is pre-filled; the booking is listed with status Confirmed; Cancel is enabled when at least 60 minutes remain.
6. Cancel it: it stays listed as Cancelled (label and icon) and the period is free again in the day view.
7. A booking starting in less than an hour shows Cancel disabled with the reason.
8. 360 px: vertical agenda, date strip, bottom navigation, full-screen form. 768 px: timeline with a room selector and a dialog. 1280 px: several rooms side by side and a side panel. No horizontal scrolling.
9. Keyboard only: every row, block, button and field is reachable with a visible focus; the form can be submitted with Enter.
10. Tests: `cd frontend && npm test -- --watch=false`.
11. Contract unchanged: `sha256sum specs/001-project-setup/contracts/openapi.yaml` equals the content of `specs/005-bookings-ui/contract-baseline.sha256`.

Contract note: [contracts/README.md](contracts/README.md). View models: [data-model.md](data-model.md).

## Recorded verification (2026-10-18, real backend through the dev proxy)

End-to-end happy path, run in the browser at 768 px (timeline) against the running backend:

1. Selecting the free row "10:00 in Aurora" opened the dialog pre-filled with room Aurora, 2026-10-19, 10:00-11:00.
2. Title and name entered and submitted: the dialog closed and the booking appeared in the day view as "Yours" without a reload; the name was remembered.
3. Booking 10:30-11:30 on the same room was refused with "The room is already booked from 10:00 to 11:00 on Mon 19 Oct."; the form stayed open with every value kept.
4. My bookings listed the booking as Confirmed with Cancel enabled; cancelling kept it in the list as Cancelled (label and icon) and the backend returned `CANCELLED`.
5. The day view showed 10:00 free again.

Layouts checked with same-origin iframes of the exact width (screenshots could not be captured: the browser tool timed out on this machine, so the checks read the DOM and computed styles): 360 px agenda with date strip and bottom navigation; 768 px timeline with room selector and date input; 1280 px grid with six rooms and side navigation; My bookings as one-column cards, two-column cards and a table. No horizontal scrolling at any width; no interactive control smaller than 44 px. Keyboard: arrow keys move between free rows, a visible focus ring, Enter opens the side panel with focus inside, Escape closes it and returns the focus to the row. Contrast: see `contrast.md` (10 of 10 pairs pass).

Not exercised live: the disabled Cancel inside the 60-minute window (the real clock was a Sunday, so no booking could start within an hour); it is covered by component and helper tests with fixed instants.
