# Feature Specification: Booking Screens

**Feature Branch**: `005-bookings-ui`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Let employees see when a meeting room is free and book it from the browser. They pick a room and a date and see a day view from 08:00 to 20:00 in 15-minute steps, with booked periods showing the booking title. They can start a booking by selecting a free period or from a button, fill in title, organizer, start and end, and submit. If the system refuses the booking, the message explains why in plain language and the entered data is kept. Employees can enter their name to see their own bookings and cancel the ones that are more than one hour away; cancelled bookings stay visible as cancelled. The day view refreshes after a booking is created or cancelled. The screens adapt to the device: on a phone the day is a vertical agenda for one room with a date strip, and the booking form is full-screen; on a tablet the layout is a timeline with a bottom sheet or dialog; on a desktop several rooms are shown side by side in a wide grid with the booking form in a side panel. Free, booked, own and cancelled periods are distinguishable by label or icon as well as by color. The look matches the rest of the application: professional and corporate."

## Clarifications

### Session 2026-10-18

- Q: Which room and date does the day view show on first load? → A: The first active room in alphabetical order and today's date; when today is not a working day, the next Monday. Only active rooms are offered, since the others cannot be booked.
- Q: What happens when a selection spans an occupied period? → A: Only the free part up to the occupied period is selected; the occupied period is never included.
- Q: How is the organizer name remembered between visits? → A: It is stored on the device (in the browser) when a booking is made or a name is entered, and pre-filled in the booking form and in My bookings; it is never sent anywhere except as the organizer of a booking or as the name to look up.
- Q: Exactly when is Cancel enabled? → A: When at least 60 minutes remain before the start (exactly 60 is enabled), matching the booking rules of the system; otherwise it is disabled with an explanation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See when a room is free (Priority: P1)

An employee picks a room and a date and sees the day from 08:00 to 20:00 in 15-minute steps, with booked periods showing their title and free periods clearly offered.

**Why this priority**: Seeing free time is the first step to booking.

**Independent Test**: Open the day view for a room that has some bookings and check free and booked periods.

**Acceptance Scenarios**:

1. **Given** a room with bookings that day, **When** the employee opens the day view, **Then** the day is shown from 08:00 to 20:00 in 15-minute steps with each booked period labelled by its title and free periods marked as free.
2. **Given** a day with no bookings, **When** the employee opens the day view, **Then** a message such as "No bookings today — be the first to book" is shown together with the free day.
3. **Given** a weekend date, **When** the employee opens the day view, **Then** the day shows that bookings are only possible Monday to Friday.
4. **Given** the employee changes the room or the date, **When** the new day loads, **Then** the view shows that room and day.
5. **Given** the system is unreachable, **When** the day view loads, **Then** a readable message with a way to retry is shown.

---

### User Story 2 - Book a room from the day view (Priority: P1)

An employee starts a booking by selecting a free period or from a button, fills in title, organizer, start and end, and submits.

**Why this priority**: Booking is the purpose of the product.

**Independent Test**: Select a free period, fill the form, submit, and see the new booking in the day view.

**Acceptance Scenarios**:

1. **Given** a free period, **When** the employee selects it, **Then** the booking form opens with room, date and the selected start and end filled in.
2. **Given** the booking button, **When** the employee uses it, **Then** the form opens with the current room and date and empty times.
3. **Given** valid details, **When** the employee submits, **Then** the booking is created, the form closes and the day view shows the new booking without a manual refresh.
4. **Given** the system refuses the booking (for example the room is already booked from 10:00 to 11:30), **When** the employee submits, **Then** a plain-language message explains why next to the form and every entered value is kept.
5. **Given** obviously invalid input (missing title, end before start), **When** the employee submits, **Then** the form points out the problem before sending, and the system remains the authority.
6. **Given** the organizer name was used before, **When** the form opens, **Then** the name is already filled in.
7. **Given** a selection that spans an occupied period, **When** the employee tries to select it, **Then** only the free part up to the occupied period is selected.

---

### User Story 3 - See and cancel my bookings (Priority: P1)

An employee types their name and sees their bookings, and cancels those that are more than one hour away.

**Why this priority**: Employees must release rooms they no longer need.

**Independent Test**: Enter a name, cancel a distant booking, and see it marked as cancelled.

**Acceptance Scenarios**:

1. **Given** a name with bookings, **When** the employee enters it, **Then** their bookings are listed with room, date, time, title and status.
2. **Given** a booking starting in more than one hour, **When** the list is shown, **Then** Cancel is enabled.
3. **Given** a booking starting in an hour or less, or already started, **When** the list is shown, **Then** Cancel is disabled and a short explanation says why.
4. **Given** the employee cancels a booking, **When** the system confirms, **Then** the booking stays in the list marked as cancelled, with a label and an icon, and the day view frees the period.
5. **Given** a name with no bookings, **When** it is entered, **Then** a friendly empty message is shown.
6. **Given** the system refuses the cancellation, **When** the employee cancels, **Then** a plain-language message is shown and the list stays as it was.

---

### User Story 4 - Use it comfortably on any device (Priority: P2)

Employees use the screens on a phone, a tablet or a desktop with touch or keyboard.

**Why this priority**: Employees book from wherever they are.

**Independent Test**: Open the screens at phone, tablet and desktop widths and book and cancel with touch only and with keyboard only.

**Acceptance Scenarios**:

1. **Given** a phone-sized screen, **When** the day view opens, **Then** it is a vertical agenda for one room with time labels down the side and a date strip to change day, and the form is full-screen.
2. **Given** a tablet-sized screen, **When** the day view opens, **Then** it is a vertical timeline for one room with a room selector at the top, and the form opens in a bottom sheet or dialog; My bookings uses two columns.
3. **Given** a desktop-sized screen, **When** the day view opens, **Then** several rooms are shown side by side with time on one axis, and the form opens in a side panel next to the grid; My bookings is a table with a status column.
4. **Given** any screen size, **When** the employee uses only the keyboard, **Then** every period, action and form field is reachable with a visible focus.
5. **Given** any screen size, **When** the employee uses touch, **Then** every control is comfortably tappable.

---

### Edge Cases

- A selection that crosses an occupied period.
- A booking just created by someone else for the same period: the system refuses and the message says so.
- A very long booking title in a booked block: shown truncated, with the full detail on tap or hover.
- Periods outside 08:00-20:00 are never offered.
- A past period on today's date is shown as unavailable.
- The user prefers reduced motion: the day view refreshes without animation.
- The list of the employee's bookings contains many items.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a day view for a chosen room and date, from 08:00 to 20:00 in 15-minute steps; on first load it shows the first active room and today (or the next Monday when today is not a working day), and only active rooms are offered.
- **FR-002**: Booked periods MUST show the booking title; free periods MUST be selectable; the employee's own and cancelled periods MUST be distinguishable.
- **FR-003**: Free, booked, own and cancelled periods MUST differ by label or icon as well as by color.
- **FR-004**: A booking MUST be startable by selecting a free period or from a button.
- **FR-005**: The booking form MUST ask for room, date, start, end, title and organizer.
- **FR-006**: When the system refuses a booking, a plain-language explanation MUST be shown next to the form and every entered value MUST be kept.
- **FR-007**: The screens MAY pre-check obvious input errors, but the system remains the authority on the booking rules.
- **FR-008**: The day view MUST refresh after a booking is created or cancelled.
- **FR-009**: An employee MUST be able to enter their name and see their bookings, including cancelled ones.
- **FR-010**: Cancel MUST be enabled only when at least 60 minutes remain before the start (exactly 60 included), otherwise disabled with an explanation; cancelled bookings MUST stay visible as cancelled.
- **FR-011**: On a phone the day view MUST be a vertical agenda for one room with a date strip, and the form full-screen.
- **FR-012**: On a tablet the day view MUST be a vertical timeline for one room with a room selector, and the form a bottom sheet or dialog.
- **FR-013**: On a desktop the day view MUST show several rooms side by side, and the form a side panel.
- **FR-014**: Every action MUST be reachable by touch and by keyboard with a visible focus, and controls MUST be at least 44 pixels.
- **FR-015**: The screens MUST reuse the existing look: colors, typeface, spacing, shapes and navigation of the application, and MUST NOT introduce new colors or fonts.
- **FR-016**: Empty states MUST use the same friendly tone as the rest of the application.
- **FR-018**: A selection of free periods MUST stop at the first occupied period, and the organizer name MUST be remembered on the device and pre-filled.
- **FR-017**: This feature MUST NOT change the API contract; if the screens seem to need something the contract does not offer, that is reported as a finding.

### Key Entities

- **Booking**: room, title, organizer, start, end, status (confirmed or cancelled).
- **Day view**: a room, a date and the bookings of that day.
- **Organizer name**: the free-text name the employee types; remembered for convenience on the device.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employee books a free room in under 1 minute from opening the day view.
- **SC-002**: After a booking or cancellation the day view shows the change within 2 seconds, without a manual refresh.
- **SC-003**: Every screen is fully usable at 360, 768 and 1280 pixel widths without horizontal scrolling.
- **SC-004**: 100% of refused bookings show a plain-language message next to the form and keep the entered data.
- **SC-005**: Every interactive control is at least 44 pixels in its smaller dimension and text meets AA contrast.

## Assumptions

- There is no authentication; the organizer is a free-text name (constitution VIII).
- The booking and room interfaces are fixed; this feature only consumes them.
- The shared look and navigation from the rooms screens exist and are reused.
- All times are in the office time zone; the interface already returns them with the office offset.
- The employee's name is remembered on the device for convenience only.
