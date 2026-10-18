# Data Model: Booking Screens

No new persisted data on the server. The UI uses the generated client types of the fixed contract (`Booking`, `BookingInput`, `Room`).

## View models

| Model | Fields | Rules |
|-------|--------|-------|
| `DaySelection` | `roomId`, `date` (`YYYY-MM-DD`, office day) | First load: first active room by name, today or the next Monday when today is not a working day |
| `Slot` | `time` (`HH:mm`), `state`: `free`, `booked`, `past`, `closed` | 48 rows from 08:00 to 19:45; `past` for rows before now on today's date; all `closed` on weekends |
| `Block` | `booking`, `startRow`, `endRow`, `own` | Spans its rows; `own` when the organizer equals the remembered name ignoring case and spaces |
| `FreeSelection` | `start`, `end` | `start` = tapped row, `end` = start + 60 minutes, capped at the next booked row and at 20:00 |
| `BookingFormValue` | `roomId`, `date`, `start`, `end`, `title`, `organizer` | title and organizer required, at most 100 characters; end after start; at most 4 hours; not before now; not a weekend; start 08:00-19:45 and end 08:15-20:00 in 15-minute steps |
| `MyBookingRow` | `booking`, `canCancel`, `reason` | `canCancel` when status is CONFIRMED and at least 60 minutes remain before the start; `reason` is "Starts in less than an hour" or "Already started" otherwise |
| `RememberedOrganizer` | `name` | Stored in the browser on this device only |

## States

- Day view: loading, ready, empty day ("No bookings today — be the first to book"), weekend ("Bookings are only possible Monday to Friday"), error with retry.
- Booking form: pristine, invalid, submitting, rejected (data kept), saved.
- My bookings: no name, loading, list, empty, error with retry.
