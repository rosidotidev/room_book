# Quickstart: Rooms Screens

## Run

```bash
cd backend && ./mvnw spring-boot:run     # http://localhost:8080
cd frontend && npm install && npm start  # http://localhost:4200 (proxy to /api)
```

## Validate

1. Open `http://localhost:4200`: it redirects to `/rooms` and shows the six demo rooms with name, capacity and equipment.
2. Set a minimum capacity and choose an equipment item: the list narrows about 300 ms after the last change; "Clear filters" restores it; impossible filters show "No rooms match".
3. Open the Admin screen from the navigation: add a room, then try the same name again: the message appears next to the name field and the entered data stays.
4. Edit a room (capacity, equipment) and see the change in the list.
5. Deactivate a room: a confirmation appears first; afterwards the room is greyed with an "Inactive" label; activate it again.
6. Resize or emulate 360, 768 and 1280 px: bottom navigation and single column, top bar with two columns, side navigation with a wider grid; no horizontal scrolling.
7. Keyboard only: Tab reaches every action and the focus ring is visible; touch targets are at least 44 px.
8. Stop the backend: the list shows a readable error with Retry.
9. Tests: `cd frontend && npm test -- --watch=false`.
10. Contract unchanged: compare `sha256sum specs/001-project-setup/contracts/openapi.yaml` with `specs/003-rooms-ui/contract-baseline.sha256`.

Contract note: [contracts/README.md](contracts/README.md). View models: [data-model.md](data-model.md).
