# Data Model: Rooms Screens

No new persisted data. The UI uses the generated client types of the fixed contract.

## View models

| Model | Fields | Rules |
|-------|--------|-------|
| `RoomFilter` | `minCapacity: number or null`, `equipment: string or null` | `minCapacity` whole number >= 1 when set; both optional; applied 300 ms after the last change |
| `RoomForm` | `name`, `capacity`, `equipment[]` | name required, 1-100 characters after trimming; capacity whole number 1-1000; at most 20 equipment items of 1-50 characters |
| `FieldError` | `field: name or capacity or equipment or form`, `message` | Mapped from the Problem `detail`: a conflict (409) goes to `name`, otherwise the field named in the message, otherwise `form` |

## States

- List: loading, loaded, empty (no rooms at all), empty (no match), error (with retry).
- Room card: active, inactive (greyed, label "Inactive" and icon).
- Form: pristine, invalid, submitting, rejected (data kept), saved.
