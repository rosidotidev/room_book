# Feature Specification: Rooms Screens

**Feature Branch**: `003-rooms-ui`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Give office staff a screen to browse the meeting rooms and give an administrator a screen to manage them. The room list shows name, capacity and equipment for each room, can be filtered by minimum capacity and by equipment, and shows inactive rooms in a visibly different way. The administrator can add a room, edit a room and activate or deactivate it; before deactivating, the screen shows any warning the system returns. When the system rejects an action (for example a duplicate room name), the user sees a clear message next to the form. The screens adapt to the device: on a phone the content is a single column with a bottom navigation bar and full-screen forms, on a tablet it uses a two-column layout, and on a desktop it uses a side navigation and a wider grid or table. Every action is reachable by touch and by keyboard. The look is professional and corporate, in the style of a modern marketing agency: clean, confident, with plenty of white space, one strong accent color and a single modern typeface. Inactive rooms are marked with a label as well as a different color."

## Clarifications

### Session 2026-10-18

- Q: Is the administration screen visible to everyone? → A: Yes; there is no authentication, so it is reachable from the main navigation by anyone.
- Q: What do the empty states show? → A: With no rooms at all, a message "No rooms yet" and an "Add room" action; with filters that match nothing, "No rooms match" and a "Clear filters" action.
- Q: How do filters behave while the user types? → A: They apply automatically about 300 ms after the last change, with no "Apply" button; equipment is chosen from the list of items present in the catalog.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and filter rooms (Priority: P1)

Office staff open the room list, see every room with name, capacity and equipment, and narrow it by minimum capacity and by equipment.

**Why this priority**: Finding a room is the first thing staff do and the base for booking later.

**Independent Test**: Open the list with the demo rooms, apply each filter and both together, and check what remains.

**Acceptance Scenarios**:

1. **Given** rooms exist, **When** staff open the list, **Then** each room shows its name, capacity and equipment.
2. **Given** the list, **When** staff set a minimum capacity, **Then** only rooms with at least that capacity remain.
3. **Given** the list, **When** staff choose an equipment item, **Then** only rooms offering it remain.
4. **Given** an inactive room, **When** it appears in the list, **Then** it is greyed out and carries a visible "Inactive" label.
5. **Given** filters that match nothing, **When** the list updates, **Then** a friendly "no rooms match" message is shown with a way to clear the filters.

---

### User Story 2 - Add and edit a room (Priority: P1)

An administrator adds a room and edits an existing one through a form.

**Why this priority**: Without it the catalog cannot be kept current.

**Independent Test**: Add a room, edit it, and see the changes in the list.

**Acceptance Scenarios**:

1. **Given** the administrator opens the form, **When** they enter valid details and save, **Then** the room appears in the list.
2. **Given** an existing room, **When** the administrator opens it for editing and saves changes, **Then** the list shows the new details.
3. **Given** a name that already exists, **When** the administrator saves, **Then** a clear message next to the name field explains that the name is taken and the entered data is kept.
4. **Given** invalid details (missing name, capacity below one), **When** the administrator saves, **Then** a message next to the offending field explains what to fix.
5. **Given** the system is unreachable, **When** the administrator saves, **Then** a readable message is shown and the entered data is kept.

---

### User Story 3 - Activate and deactivate a room (Priority: P2)

An administrator takes a room out of service or brings it back.

**Why this priority**: Rooms close for maintenance and the catalog must reflect it.

**Independent Test**: Deactivate a room after confirming, see it marked inactive, then reactivate it.

**Acceptance Scenarios**:

1. **Given** an active room, **When** the administrator chooses to deactivate it, **Then** a confirmation appears before anything changes.
2. **Given** the system reports future bookings for the room, **When** the deactivation completes, **Then** the result shows those bookings as a warning (the system reports them only together with the result of the change, so the confirmation itself cannot list them).
3. **Given** the administrator confirms, **When** the change succeeds, **Then** the room is shown as inactive.
4. **Given** an inactive room, **When** the administrator activates it, **Then** the room is shown as active again.

---

### User Story 4 - Use the app comfortably on any device (Priority: P2)

Staff and administrators use the screens on a phone, a tablet or a desktop browser, with touch or keyboard.

**Why this priority**: Staff pick rooms from wherever they are.

**Independent Test**: Open the screens at phone, tablet and desktop widths and complete the main tasks with touch only and with keyboard only.

**Acceptance Scenarios**:

1. **Given** a phone-sized screen, **When** the list opens, **Then** content is in one column with a bottom navigation bar, filters sit in a collapsible panel and forms use the full screen.
2. **Given** a tablet-sized screen, **When** the list opens, **Then** rooms show in two columns with navigation at the top and filters in a horizontal bar.
3. **Given** a desktop-sized screen, **When** the list opens, **Then** navigation is on the side and rooms show in a wider grid, with the form in a side panel or dialog.
4. **Given** any screen size, **When** a user relies on keyboard only, **Then** every action is reachable and the focused element is clearly visible.
5. **Given** any screen size, **When** a user relies on touch, **Then** every control is comfortably tappable.

---

### Edge Cases

- No rooms at all: a friendly empty state invites the administrator to add the first room.
- A very long room name or many equipment items: text wraps or truncates without breaking the layout.
- The system is unreachable when the list loads: a readable message with a way to retry.
- Another administrator renames a room between loading and saving: the rejection message is shown next to the form.
- A user prefers reduced motion or a high-contrast need: no essential information depends on animation or on color alone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a room list screen showing name, capacity and equipment for every room.
- **FR-002**: The room list MUST be filterable by minimum capacity and by equipment, alone or combined; filters apply automatically about 300 ms after the last change and equipment is chosen from the items present in the catalog.
- **FR-003**: Inactive rooms MUST be visibly different and MUST carry a text label as well as a different color.
- **FR-004**: The system MUST provide a room administration screen to add a room and edit a room.
- **FR-016**: The administration screen MUST be reachable from the main navigation by everyone, and the empty states MUST read "No rooms yet" with an "Add room" action and "No rooms match" with a "Clear filters" action.
- **FR-005**: The administrator MUST be able to activate and deactivate a room; deactivation MUST ask for confirmation first.
- **FR-006**: The screen MUST show any warning the system returns on deactivation, including future bookings, as soon as the system returns it (together with the result of the change; a warning before the change would need an interface that does not exist yet and is reported as a finding).
- **FR-007**: When the system rejects an action, a clear message MUST appear next to the form and the entered data MUST be kept.
- **FR-008**: All messages MUST be short, direct and free of technical jargon.
- **FR-009**: On a phone the screens MUST use a single column, a bottom navigation bar, a collapsible filter panel and full-screen forms.
- **FR-010**: On a tablet the screens MUST use a two-column room layout, top navigation and a horizontal filter bar.
- **FR-011**: On a desktop the screens MUST use side navigation, a wider grid or table, and a side panel or dialog for the form.
- **FR-012**: Every action MUST be reachable by touch and by keyboard, with a clearly visible focus indicator.
- **FR-013**: The look MUST follow one shared design system (one accent color, one typeface, consistent spacing, corners and shadows) that later screens reuse.
- **FR-014**: State MUST never be conveyed by color alone.
- **FR-015**: This feature MUST NOT change the API contract.

### Key Entities

- **Room** (as defined by the rooms catalog): name, capacity, equipment, active state.
- **Warning**: a message returned by the system when deactivating a room, including its future bookings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user finds a room matching capacity and equipment in under 15 seconds from opening the list.
- **SC-002**: An administrator adds a room in under 1 minute.
- **SC-003**: Every screen is fully usable at 360, 768 and 1280 pixel widths without horizontal scrolling.
- **SC-004**: Every interactive control is at least 44 pixels in its smaller dimension and text meets AA contrast.
- **SC-005**: 100% of rejected actions show a message next to the form that names the cause.

## Assumptions

- There is no authentication: the administration screen is visible to everyone (constitution VIII).
- The rooms catalog interface already exists and is fixed.
- The application is a responsive web app; installable app behavior is out of scope.
- Dark mode is optional and out of scope unless added later.
- Bookings do not exist yet, so deactivation warnings are empty for now.
