# Feature Specification: Project Setup

**Feature Branch**: `001-project-setup`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Set up the RoomBook project foundation so that every later feature can be built on it. A developer who clones the repository must be able to start the backend and the frontend with one command each, see the frontend reach the backend, and see the backend read from and write to its database. The backend exposes a health check. Errors follow one consistent format. The API contract is published as a single document and is the reference for both sides. No business behavior is included."

## Clarifications

### Session 2026-10-18

- Q: How is the app started (local scripts or containers)? → A: Local scripts/commands; no containers required.
- Q: Where does the database file live? → A: A single local file in a `data` folder inside the backend area, ignored by version control.
- Q: What must the health check report? → A: Overall status (UP/DOWN), database status (UP/DOWN) proven by a read and a write round-trip, and the current time from the replaceable time source.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start the system with one command per side (Priority: P1)

A developer clones the repository and starts the backend with one command and the frontend with one command, without manual configuration or manual database setup.

**Why this priority**: Without a runnable system no later feature can be built or verified.

**Independent Test**: On a fresh clone with the prerequisites installed, run the backend command and the frontend command; both report that they are running.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** the developer runs the backend start command, **Then** the backend starts and its database is created and prepared automatically.
2. **Given** a fresh clone, **When** the developer runs the frontend start command, **Then** the application opens in a browser.
3. **Given** the backend was started before, **When** it is restarted, **Then** existing data is preserved.

---

### User Story 2 - See the frontend reach the backend and the database (Priority: P1)

The developer opens the frontend and sees a status area showing that the backend answered and that its database can be read and written.

**Why this priority**: It proves the end-to-end connectivity that is the purpose of the foundation.

**Independent Test**: With both sides running, open the frontend and see a healthy status; stop the backend and see an unhealthy status with a readable message.

**Acceptance Scenarios**:

1. **Given** both sides are running, **When** the frontend loads, **Then** it shows the backend as healthy, including the database status.
2. **Given** the backend is stopped, **When** the frontend loads, **Then** it shows a readable "backend unreachable" message instead of failing silently.
3. **Given** the backend is running, **When** a health check is requested, **Then** the answer reports the overall status and the database status.

---

### User Story 3 - Consistent errors (Priority: P2)

Whenever the backend rejects a request (unknown address, malformed input, unexpected failure), the response follows one consistent error format with a status, a title and a human-readable detail.

**Why this priority**: Every later feature relies on one error shape to show readable messages.

**Independent Test**: Request an unknown address and send a malformed request; both return the same error format.

**Acceptance Scenarios**:

1. **Given** the backend is running, **When** an unknown address is requested, **Then** the error follows the common format with a "not found" status.
2. **Given** an unexpected internal failure, **When** it occurs, **Then** the response uses the same format and exposes no internal details.

---

### User Story 4 - One published API contract (Priority: P2)

The API contract is a single published document that is the reference for both sides; the frontend uses a client derived from it and the backend is verified against it automatically.

**Why this priority**: Later features are built contract-first.

**Independent Test**: Run the contract verification; it passes for the health check and fails if a response deviates from the document.

**Acceptance Scenarios**:

1. **Given** the contract document, **When** the contract verification runs, **Then** the health check response is validated against it.
2. **Given** a change to the contract, **When** the frontend client is regenerated, **Then** the client reflects the change.

---

### Edge Cases

- The database file or its folder does not exist at first start: it is created automatically.
- The database cannot be written: the health check reports the database as unavailable with a readable reason.
- The backend is started on a port already in use: a clear message is shown.
- The frontend is opened while the backend is down: a readable message appears and nothing crashes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain separate areas for the backend, the frontend and the specifications.
- **FR-002**: A developer MUST be able to start the backend with one command and the frontend with one command, using local scripts; containers MUST NOT be required.
- **FR-003**: The backend MUST expose a health check reporting the overall status (UP/DOWN), the database status (UP/DOWN, proven by a read and a write round-trip) and the current time from the replaceable time source.
- **FR-016**: The database MUST be a single local file in a `data` folder inside the backend area, excluded from version control.
- **FR-004**: The backend MUST create its database on first start and apply versioned schema changes on every start; the schema is empty at this stage.
- **FR-005**: The system MUST provide a mechanism to load demo seed data; no seed data is required yet.
- **FR-006**: All backend errors MUST follow one consistent error format and MUST NOT expose internal details.
- **FR-007**: The API contract MUST be a single document, the reference for both frontend and backend.
- **FR-008**: During development the frontend MUST reach the backend without manual cross-origin configuration.
- **FR-009**: The frontend MUST show the backend health status and a readable message when the backend is unreachable.
- **FR-010**: The frontend client for the API MUST be generated from the contract document.
- **FR-011**: The backend MUST be verified against the contract by an automated check.
- **FR-012**: Time-dependent logic MUST obtain the current time from a replaceable time source so tests are deterministic.
- **FR-013**: The frontend MUST provide an application shell with navigation, ready to host later screens.
- **FR-014**: No business behavior (rooms, bookings) is included.
- **FR-015**: A quickstart MUST document prerequisites and commands.

### Key Entities

- **Health report**: overall status, database status, timestamp.
- **Error**: status, title, detail, instance (common format).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with the prerequisites installed has both sides running within 10 minutes of cloning, following the quickstart only.
- **SC-002**: 100% of backend error responses use the common error format.
- **SC-003**: The health status is visible in the frontend within 2 seconds of loading when the backend is up.
- **SC-004**: The automated contract verification and the automated tests of both sides pass on a fresh clone.

## Assumptions

- The prerequisites (JDK, Node.js, Python, Git) are installed by the developer.
- A single local environment is targeted; no production deployment is part of this feature.
- Authentication is out of scope (see constitution).
- The database is a single local file.
