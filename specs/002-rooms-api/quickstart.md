# Quickstart: Rooms Catalog

## Prerequisites

Same as the project setup ([quickstart](../001-project-setup/quickstart.md)). Start the backend: `cd backend && ./mvnw spring-boot:run`.

## Validate

1. `GET http://localhost:8080/api/rooms` returns six demo rooms ordered by name, including their equipment and `active: true`.
2. `GET /api/rooms?minCapacity=10` returns only rooms with capacity 10 or more; `GET /api/rooms?equipment=PROJECTOR` matches ignoring case; combining both applies both.
3. `POST /api/rooms` with `{"name":"Gamma","capacity":5,"equipment":["Whiteboard"]}` returns `201`, a `Location` header and the room (active).
4. Repeating step 3 with `"name":"  gamma "` returns `409` as `application/problem+json`.
5. `POST /api/rooms` with `"capacity":0` returns `400` naming the capacity.
6. `PUT /api/rooms/{id}` changes name, capacity and equipment (`200`); renaming to another room's name returns `409`; an unknown id returns `404`.
7. `PATCH /api/rooms/{id}/active` with `{"active":false}` returns `200` with the room and `"futureBookings": []`; the room is still listed, inactive. Unknown id returns `404`.
8. Restart the backend: the demo rooms are not duplicated.
9. `cd backend && ./mvnw test` runs the contract tests (every endpoint and status code against the contract) and the service tests.

Contract: [contracts/README.md](contracts/README.md). Data: [data-model.md](data-model.md).
