# Feature Specification: Room Bookings

**Feature Branch**: `004-bookings-api`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Let employees book meeting rooms without double bookings. A booking has a room, a title, the organizer's name, a start and an end time. Two bookings on the same room cannot overlap, but one may start exactly when another ends. Bookings are allowed from 08:00 to 20:00, Monday to Friday, on 15-minute boundaries, last at most 4 hours and cannot be in the past. A booking can be cancelled until one hour before it starts; cancelling frees the slot and keeps the history. A deactivated room cannot be booked, and deactivating a room reports its future bookings without deleting them. Employees can see what is booked on a room for a given day and can list the bookings of an organizer."

## Clarifications

### Session 2026-10-18

- Q: Which time zone applies? → A: A single office time zone, Europe/Rome by default and configurable; times in the interface carry their UTC offset, and hours, weekdays and 15-minute boundaries are evaluated in the office time zone.
- Q: Can a booking span midnight? → A: No; start and end must fall on the same office-local day, within 08:00-20:00.
- Q: Can a booking that already started or ended be cancelled? → A: No; it is refused under the one-hour rule.
- Q: What does "in the past" mean for a booking in progress? → A: The start must not be before the current moment; a booking starting exactly now is accepted, a booking whose start has already passed is refused.
- Q: Is cancellation allowed at exactly one hour before the start? → A: Yes; it is allowed when at least 60 minutes remain before the start and refused when fewer remain.
- Q: What are the limits on title and organizer? → A: Both are required, trimmed, and at most 100 characters; organizers are matched ignoring letter case and surrounding spaces.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Book a room without double bookings (Priority: P1)

An employee books a room for a time slot with a title and their name, and the system refuses anything that clashes or breaks the booking rules.

**Why this priority**: Preventing double bookings is the reason the product exists.

**Independent Test**: Book a free slot, try to overlap it, try back-to-back, and try each rule violation.

**Acceptance Scenarios**:

1. **Given** a free slot, **When** an employee books it with room, title, organizer, start and end, **Then** the booking is confirmed and shown.
2. **Given** a confirmed booking from 10:00 to 11:00, **When** another booking overlaps it on the same room, **Then** it is refused with an explanation naming the clash.
3. **Given** a confirmed booking from 10:00 to 11:00, **When** another starts at 11:00 (or ends at 10:00) on the same room, **Then** it is accepted.
4. **Given** the same time on a different room, **When** an employee books it, **Then** it is accepted.
5. **Given** a start or end outside 08:00-20:00, on a Saturday or Sunday, or not on a 15-minute boundary, **When** an employee books, **Then** it is refused with an explanation of the rule.
6. **Given** a duration over 4 hours, an end not after the start, or a start in the past, **When** an employee books, **Then** it is refused with an explanation of the rule.
7. **Given** two employees book the same slot at the same moment, **When** both requests arrive, **Then** exactly one is confirmed and the other is refused as a clash.
8. **Given** a deactivated room, **When** an employee books it, **Then** it is refused because the room is not available.
9. **Given** an unknown room, **When** an employee books it, **Then** a clear "room not found" error is returned.

---

### User Story 2 - See what is booked on a room for a day (Priority: P1)

An employee looks at one room for one day and sees the confirmed bookings.

**Why this priority**: Employees need to see free time before booking.

**Independent Test**: Create bookings on different days and rooms; read one room-day.

**Acceptance Scenarios**:

1. **Given** bookings on a room, **When** an employee asks for a day, **Then** only that day's confirmed bookings for that room are shown, ordered by start time.
2. **Given** a day with no bookings, **When** asked, **Then** an empty list is returned, not an error.
3. **Given** a cancelled booking, **When** the day is shown, **Then** it is not listed (the slot is free).
4. **Given** an unknown room or an invalid date, **When** asked, **Then** a clear error is returned.

---

### User Story 3 - List an organizer's bookings (Priority: P2)

An employee enters a name and sees all bookings made under it, including cancelled ones.

**Why this priority**: Employees need to find their own bookings to manage them.

**Independent Test**: Create and cancel bookings for two organizers; list one.

**Acceptance Scenarios**:

1. **Given** bookings by several organizers, **When** a name is given, **Then** only that organizer's bookings are shown, with their status (confirmed or cancelled), ordered by start time.
2. **Given** a name that differs only by letter case or surrounding spaces, **When** listed, **Then** it matches the same organizer.
3. **Given** an organizer with no bookings, **When** listed, **Then** an empty list is returned.

---

### User Story 4 - Cancel a booking (Priority: P1)

An employee cancels a booking; the slot becomes free and the history is kept.

**Why this priority**: Plans change; unused slots must be released.

**Independent Test**: Cancel early enough, cancel too late, cancel twice.

**Acceptance Scenarios**:

1. **Given** a confirmed booking starting in more than one hour, **When** it is cancelled, **Then** its status becomes cancelled, it stays in the history and its slot can be booked again.
2. **Given** a booking starting in one hour or less, **When** it is cancelled, **Then** the request is refused with an explanation of the one-hour rule.
3. **Given** an already cancelled booking, **When** it is cancelled again, **Then** the request is accepted without change.
4. **Given** an unknown booking, **When** it is cancelled, **Then** a clear "booking not found" error is returned.

---

### User Story 5 - Deactivating a room reports its future bookings (Priority: P2)

When an administrator deactivates a room, the result lists the room's future confirmed bookings, which are kept.

**Why this priority**: Administrators must know who is affected; nothing may be deleted.

**Independent Test**: Book a room in the future, deactivate it, read the report.

**Acceptance Scenarios**:

1. **Given** a room with future confirmed bookings, **When** it is deactivated, **Then** the result lists those bookings and they are not deleted or cancelled.
2. **Given** a room with only past or cancelled bookings, **When** it is deactivated, **Then** the list is empty.
3. **Given** a deactivated room, **When** it is activated again, **Then** its kept bookings remain valid.

---

### Edge Cases

- Time zone: all times belong to one office time zone (Europe/Rome by default).
- A booking that would cross midnight.
- Cancelling a booking that has already started or ended.
- A booking that starts exactly now, or is in progress, when "past" is checked.
- Title or organizer missing, blank or very long.
- A booking made at the moment the room is being deactivated.
- A date far in the future.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A booking MUST have a room, a title, the organizer's name, a start, an end and a status (confirmed or cancelled).
- **FR-002**: Employees MUST be able to create a booking; new bookings are confirmed.
- **FR-003**: Two confirmed bookings on the same room MUST NOT overlap; a booking may start exactly when another ends.
- **FR-004**: Bookings MUST start and end between 08:00 and 20:00 office time, Monday to Friday, on 15-minute boundaries, on the same local day (no booking crosses midnight).
- **FR-005**: A booking MUST last at most 4 hours, MUST end after it starts and MUST NOT start before the current moment (starting exactly now is accepted).
- **FR-006**: Two simultaneous requests for the same slot MUST result in exactly one confirmed booking.
- **FR-007**: A deactivated room MUST NOT be bookable.
- **FR-008**: Employees MUST be able to see the confirmed bookings of one room for one day, ordered by start time.
- **FR-009**: Employees MUST be able to list the bookings of an organizer, including cancelled ones, ordered by start time.
- **FR-010**: A booking MUST be cancellable only while at least 60 minutes remain before it starts (exactly 60 is allowed; a booking already started or ended cannot be cancelled); cancelling sets the status to cancelled, keeps the booking and frees the slot.
- **FR-011**: Deactivating a room MUST report the room's future confirmed bookings and MUST NOT delete or cancel them.
- **FR-015**: Title and organizer MUST be present, trimmed and at most 100 characters each; organizers are matched ignoring letter case and surrounding spaces.
- **FR-012**: Rejections MUST explain the cause in plain language (which rule, which clash).
- **FR-013**: All time-dependent rules MUST use the application's replaceable time source so tests are deterministic.
- **FR-014**: The booking operations and their error responses MUST be described in the published API contract before they are implemented; the existing room operations MUST keep working.

### Key Entities

- **Booking**: room, title, organizer, start, end, status (confirmed or cancelled), creation moment.
- **Room**: as in the rooms catalog; a deactivated room cannot be booked.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With 50 simultaneous requests for the same slot, exactly one is confirmed.
- **SC-002**: Every business rule (overlap, back-to-back, hours, weekdays, boundaries, duration, past, cancellation window, deactivated room) is covered by an automated test with a fixed clock.
- **SC-003**: 100% of rejected requests return the common error format with a message naming the rule or clash.
- **SC-004**: Listing a room-day or an organizer's bookings returns in under 1 second with 10,000 bookings in the system.
- **SC-005**: The existing rooms behavior passes its tests unchanged.

## Assumptions

- There is no authentication; the organizer is free text (constitution VIII).
- The booking rules are applied by the backend; clients may pre-check but the backend decides.
- The rooms catalog exists and its contract is extended, not replaced.
- Recurring bookings, notifications and external calendars are out of scope.
- No frontend changes are part of this feature.
