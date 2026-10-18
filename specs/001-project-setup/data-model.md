# Data Model: Project Setup

No business entities exist yet (FR-014). The schema is empty apart from the migration history table owned by the migration tool and one technical scratch table used by the health check.

## Persistent

| Table | Purpose | Columns |
|-------|---------|---------|
| `flyway_schema_history` | Managed by Flyway | (tool-owned) |
| `health_probe` | Scratch table for the health check write/read round trip | `id INTEGER PRIMARY KEY`, `checked_at TEXT NOT NULL` |

The health check inserts a row, reads it back, then deletes it inside one transaction; the table is always empty at rest.

## API shapes (see `contracts/openapi.yaml`)

### HealthReport
| Field | Type | Rules |
|-------|------|-------|
| `status` | `UP` \| `DOWN` | `DOWN` if any component is down |
| `database` | `UP` \| `DOWN` | `UP` only if write and read round trip succeed |
| `time` | ISO-8601 instant | from the injected `Clock` |

### Problem (error)
| Field | Type | Rules |
|-------|------|-------|
| `type` | string (URI) | `about:blank` by default |
| `title` | string | HTTP reason phrase or short summary |
| `status` | integer | HTTP status |
| `detail` | string | human-readable; never contains stack traces or internals |
| `instance` | string | request path |

Served with `Content-Type: application/problem+json`.
