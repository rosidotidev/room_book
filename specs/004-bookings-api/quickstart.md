# Quickstart: Room Bookings

Start the backend: `cd backend && ./mvnw spring-boot:run`. Times below use the office zone offset; pick a future weekday.

## Validate

1. `POST /api/bookings` with `{"roomId":1,"title":"Planning","organizer":"Ana","start":"<weekday>T10:00:00+02:00","end":"<weekday>T11:00:00+02:00"}` returns `201`, `Location` and the booking (`CONFIRMED`).
2. The same slot again returns `409` as `application/problem+json` naming the clash; `11:00-12:00` the same day on the same room returns `201` (back-to-back); the same time on room 2 returns `201`.
3. Rule violations return `400` with the rule in the message: start `07:45`, end `20:15`, a Saturday, `10:10`, a 5-hour booking, end before start, a start in the past, a booking crossing midnight.
4. An unknown room returns `404`; after `PATCH /api/rooms/1/active {"active":false}` booking room 1 returns `422`.
5. `GET /api/rooms/1/availability?date=<weekday>` lists the confirmed bookings ordered by start; an empty day returns `[]`; a bad date returns `400`.
6. `GET /api/bookings?organizer=%20ana%20` lists Ana's bookings (confirmed and cancelled); an unknown organizer returns `[]`.
7. `DELETE /api/bookings/{id}` for a booking more than an hour away returns `200` with `CANCELLED`; the slot is free again; deleting twice returns `200`; a booking starting in less than an hour returns `409`; an unknown id returns `404`.
8. Book room 2 in the future and deactivate it: the `PATCH` result lists the booking in `futureBookings`, and the booking is still `CONFIRMED`.
9. `cd backend && ./mvnw test` runs contract tests per status code, the rule tests with a fixed clock and the 50-thread concurrency test.

Contract: [contracts/README.md](contracts/README.md). Data: [data-model.md](data-model.md).
