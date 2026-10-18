# Feature Specification: Rooms Catalog

**Feature Branch**: `002-rooms-api`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Let office staff browse the meeting rooms and let an administrator manage them. A room has a unique name, a capacity greater than zero, a list of equipment (for example projector, video conferencing, whiteboard) and an active flag. Users can list rooms and filter by minimum capacity and by equipment. An administrator can create a room, edit it, and activate or deactivate it. Deactivating a room never deletes data. Creating a room with an existing name is rejected with a clear error. The system starts with a small set of demo rooms."

## Clarifications

### Session 2026-10-18

- Q: Is equipment matching case-insensitive? → A: Yes; items are compared ignoring letter case and surrounding spaces.
- Q: Can a room be renamed to the name of another room? → A: No; it is rejected as a duplicate. Saving a room under its own current name is allowed.
- Q: Are inactive rooms returned by default? → A: Yes; the list always includes inactive rooms, each marked with its active state, and no filter hides them.
- Q: How are room names compared for uniqueness? → A: Ignoring letter case and surrounding spaces; names are stored trimmed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and filter rooms (Priority: P1)

Office staff list the meeting rooms and narrow the list by a minimum capacity and by a piece of equipment.

**Why this priority**: Finding a suitable room is the entry point for everything else.

**Independent Test**: With the demo rooms present, list all rooms, then filter by minimum capacity and by equipment, and check the results.

**Acceptance Scenarios**:

1. **Given** the demo rooms exist, **When** staff list rooms without filters, **Then** every room is returned with name, capacity, equipment and active flag.
2. **Given** rooms of different sizes, **When** staff filter by a minimum capacity, **Then** only rooms with at least that capacity are returned.
3. **Given** rooms with different equipment, **When** staff filter by an equipment item, **Then** only rooms offering that item are returned.
4. **Given** both filters are provided, **When** staff list rooms, **Then** only rooms satisfying both are returned.
5. **Given** a filter matching nothing, **When** staff list rooms, **Then** an empty list is returned, not an error.

---

### User Story 2 - Create and edit a room (Priority: P1)

An administrator adds a new room and edits an existing one (name, capacity, equipment).

**Why this priority**: Without managed rooms the catalog cannot reflect the office.

**Independent Test**: Create a room, then edit its capacity and equipment, and list rooms to see the changes.

**Acceptance Scenarios**:

1. **Given** valid details, **When** the administrator creates a room, **Then** it exists, is active by default and appears in the list.
2. **Given** a room, **When** the administrator edits its details, **Then** the new details are shown and the room keeps its identity.
3. **Given** a name already used by another room, **When** the administrator creates a room with it, **Then** the request is rejected with a clear "name already exists" error and nothing is created.
4. **Given** a capacity of zero or less, or a missing name, **When** the administrator saves a room, **Then** the request is rejected with an error explaining which detail is invalid.
5. **Given** an unknown room, **When** the administrator edits it, **Then** a clear "room not found" error is returned.

---

### User Story 3 - Activate and deactivate a room (Priority: P2)

An administrator takes a room out of service or brings it back, without losing any data.

**Why this priority**: Rooms close for maintenance; the catalog must reflect it without deleting history.

**Independent Test**: Deactivate a room, confirm it is still listed as inactive with its details; reactivate it.

**Acceptance Scenarios**:

1. **Given** an active room, **When** the administrator deactivates it, **Then** it remains in the catalog with its details, marked inactive.
2. **Given** an inactive room, **When** the administrator activates it, **Then** it is marked active again.
3. **Given** a room that will have future bookings in a later feature, **When** it is deactivated, **Then** the response reports those future bookings; until bookings exist the report is empty.
4. **Given** an unknown room, **When** the administrator changes its active state, **Then** a clear "room not found" error is returned.

---

### User Story 4 - Start with demo rooms (Priority: P3)

A new installation starts with a small set of realistic demo rooms so the catalog is not empty.

**Why this priority**: Makes the system demonstrable immediately.

**Independent Test**: Start on an empty database and list the rooms.

**Acceptance Scenarios**:

1. **Given** a fresh installation, **When** the system starts, **Then** between five and six demo rooms exist with varied capacities and equipment.
2. **Given** the system was started before, **When** it restarts, **Then** the demo rooms are not duplicated.

---

### Edge Cases

- A name that differs from an existing one only by letter case or surrounding spaces is treated as a duplicate.
- Equipment given as an empty list: the room simply has no equipment.
- A very large capacity or a very long name: rejected with a clear message when beyond reasonable limits.
- Deactivating a room that is already inactive (and activating one already active): accepted without change, not an error.
- Renaming a room to the name of another room is rejected as a duplicate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A room MUST have a unique name, a capacity greater than zero, a list of equipment items and an active flag.
- **FR-002**: Users MUST be able to list rooms; each entry shows name, capacity, equipment and active state.
- **FR-003**: Users MUST be able to filter the list by a minimum capacity and by an equipment item, alone or combined; equipment is matched ignoring letter case and surrounding spaces, and the list includes inactive rooms, each marked with its active state.
- **FR-004**: An administrator MUST be able to create a room; new rooms are active.
- **FR-005**: An administrator MUST be able to edit a room's name, capacity and equipment.
- **FR-006**: An administrator MUST be able to activate and deactivate a room.
- **FR-007**: Deactivating a room MUST NOT delete the room or any related data.
- **FR-008**: Creating a room, or renaming one, to a name already used by another room (ignoring letter case and surrounding spaces) MUST be rejected with a clear error; a room saved under its own current name is accepted.
- **FR-009**: Invalid input (missing name, capacity not greater than zero) MUST be rejected with an error identifying the invalid detail.
- **FR-010**: Requests for an unknown room MUST return a clear "not found" error.
- **FR-011**: The result of a deactivation MUST include the list of the room's future bookings; the list is empty until bookings exist.
- **FR-012**: On first start the system MUST provide five to six demo rooms, without duplicating them on later starts.
- **FR-013**: The room endpoints and their error responses MUST be described in the published API contract before they are implemented.

### Key Entities

- **Room**: unique name, capacity (whole number greater than zero), equipment (list of text items), active flag.
- **Deactivation result**: the room plus the list of its future bookings (empty for now).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Listing and filtering returns results in under 1 second with up to 500 rooms.
- **SC-002**: 100% of rejected requests (duplicate name, invalid input, unknown room) return the common error format with a message that names the cause.
- **SC-003**: A fresh installation lists at least five rooms without any manual step.
- **SC-004**: Every documented response of the four room operations is checked automatically against the published contract.

## Assumptions

- There is no authentication; "administrator" actions are available to any caller (constitution VIII).
- Capacity is a whole number of people.
- The existing foundation (health check, error format, migrations, contract) from the project setup is reused.
- Bookings do not exist yet; the future-bookings report is always empty in this feature.
- No frontend changes are part of this feature.
