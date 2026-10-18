# Contrast (WCAG 2.1 AA)

Computed from `frontend/src/styles/tokens.css` (relative luminance). Normal text needs 4.5:1; UI components and large text 3:1.

| Pair | Foreground | Background | Ratio | Result |
|------|------------|------------|-------|--------|
| Body text on cards | `color-ink` #0b1f3a | `color-surface` #ffffff | 16.52:1 | AA pass |
| Body text on page background | `color-ink` #0b1f3a | `color-surface-alt` #f3f5f9 | 15.13:1 | AA pass |
| Secondary text on cards | `color-ink-muted` #44546a | `color-surface` #ffffff | 7.71:1 | AA pass |
| Secondary text on page background | `color-ink-muted` #44546a | `color-surface-alt` #f3f5f9 | 7.07:1 | AA pass |
| Navigation text on ink | `color-on-ink` #ffffff | `color-ink` #0b1f3a | 16.52:1 | AA pass |
| Primary button label | `color-accent-contrast` #ffffff | `color-accent` #0a7c86 | 4.95:1 | AA pass |
| Active bottom-nav label | `color-accent-strong` #075f67 | `color-surface` #ffffff | 7.39:1 | AA pass |
| Accent used as text/outline on white | `color-accent` #0a7c86 | `color-surface` #ffffff | 4.95:1 | AA pass |
| Equipment chip text | `color-ink` #0b1f3a | `color-accent-soft` #dff3f4 | 14.37:1 | AA pass |
| Inactive card text | `color-inactive` #4b5563 | `color-inactive-soft` #eceef2 | 6.51:1 | AA pass |
| Inactive equipment chip text | `color-inactive` #4b5563 | `color-surface-sunken` #e8ecf3 | 6.38:1 | AA pass |
| Error message | `color-danger` #b91c1c | `color-danger-soft` #fdecec | 5.66:1 | AA pass |
| Warning message | `color-warning` #92400e | `color-warning-soft` #fdf1e3 | 6.37:1 | AA pass |
| Success text | `color-success` #15803d | `color-surface` #ffffff | 5.02:1 | AA pass |

Result: 14/14 pairs meet 4.5:1.
