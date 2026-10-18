# Contrast of the booking screens (WCAG 2.1 AA)

Computed from the semantic aliases in `frontend/src/styles/tokens.css`, which point to the palette already checked in `specs/003-rooms-ui/contrast.md`. Normal text needs 4.5:1.

| Pair | Foreground | Background | Ratio | Result |
|------|------------|------------|-------|--------|
| Free row label on free background | `slot-free-ink` #44546a | `slot-free-bg` #ffffff | 7.71:1 | AA pass |
| Free row label on hover background | `slot-free-ink` #44546a | `color-accent-soft` #dff3f4 | 6.71:1 | AA pass |
| Booked block label and title | `slot-booked-ink` #0b1f3a | `slot-booked-bg` #dff3f4 | 14.37:1 | AA pass |
| Own ("Yours") block label and title | `slot-own-ink` #ffffff | `slot-own-bg` #0a7c86 | 4.95:1 | AA pass |
| Cancelled booking text | `slot-cancelled-ink` #4b5563 | `slot-cancelled-bg` #eceef2 | 6.51:1 | AA pass |
| Past row label | `slot-past-ink` #44546a | `slot-past-bg` #e8ecf3 | 6.51:1 | AA pass |
| Confirmed status text on a card | `color-success` #15803d | `color-surface` #ffffff | 5.02:1 | AA pass |
| Reason for a disabled Cancel | `color-ink-muted` #44546a | `color-surface` #ffffff | 7.71:1 | AA pass |
| Selected day in the date strip | `color-accent-contrast` #ffffff | `color-accent` #0a7c86 | 4.95:1 | AA pass |
| Date strip day text | `color-ink` #0b1f3a | `color-surface` #ffffff | 16.52:1 | AA pass |

Result: 10/10 pairs meet 4.5:1.
