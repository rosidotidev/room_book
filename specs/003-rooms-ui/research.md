# Research: Rooms Screens

| Topic | Decision | Rationale | Alternatives considered |
|-------|----------|-----------|-------------------------|
| Contract | Fixed. Consumed through the generated client; baseline SHA-256 of `openapi.yaml` stored in `contract-baseline.sha256` and compared at the end (the repository has no commits to diff against) | FR-015, spec constraint | Editing the contract (forbidden) |
| UI library | Angular Material 22 (same major as Angular) with a custom theme | Requested; accessible components out of the box | Plain CSS only; another UI kit |
| Design tokens | CSS custom properties in `frontend/src/styles/tokens.css` (extending the F00 file): ink/navy, one accent (teal), neutrals, status colors, typography scale, 8 px spacing, radius, elevation. Material system variables (`--mat-sys-*`) are assigned from these tokens, so components never hard-code values | Constitution X | Sass variables (not runtime-themable) |
| Palette and contrast | Ink `#0b1f3a` on white 16:1; accent teal `#0a7c86` with white text 5:1 (AA); status text colors chosen to reach at least 4.5:1 on white; inactive uses grey text plus an "Inactive" label and icon | Constitution XI | Coral/magenta accent (lower contrast with white) |
| Typeface | Inter (self-hosted through the `@fontsource/inter` package), fallback system sans | One modern typeface, no runtime third-party request | Google Fonts link (external call) |
| Breakpoints | `BreakpointObserver` with 600 and 1024 px; CSS media queries for pure layout | Constitution IX, spec FR-009..011 | Container queries |
| App shell | One shell component: bottom nav below 600 px, top bar between 600 and 1024 px, side nav above 1024 px; links Rooms and Admin | Spec FR-009..011, FR-016 | Separate shells per device |
| Routes | `/rooms` (list) and `/rooms/admin` (administration); `/` redirects to `/rooms`; the F00 status component moves to a status area in the shell footer | Plan input | Keep status as home |
| Filters | Reactive form; minimum capacity number input and equipment `mat-select` built from the equipment items found in the loaded rooms; both debounced 300 ms and sent to the API; "Clear filters" action. On phones the filters sit in a collapsible panel | Clarifications | Client-side filtering (the API already filters) |
| Admin form | Reactive form with required name (max 100), capacity 1-1000, equipment chips (max 20 items of max 50); client pre-checks mirror the contract; server errors are mapped next to the field (name conflict -> name field; 400 detail -> form error) while keeping the data. Phone: full-screen route view; tablet/desktop: `MatDialog` (desktop side panel is a dialog anchored right) | Spec FR-004, FR-007, FR-011 | Inline editing |
| Deactivation | Confirmation dialog; it first calls the API to deactivate only after confirming. Because the warning is returned by the same call that deactivates, the dialog states that future bookings (if any) are reported after the change and the result dialog lists them; with no bookings yet the list is empty | The contract returns bookings only in the PATCH result and is fixed | A pre-check endpoint (would change the contract: reported as a finding) |
| Error display | Shared `ProblemMessageComponent` (extends the F00 `problemMessage` helper) with `role="alert"`, icon and text | Plan input, constitution VI | Snack bars only (disappear, not next to the form) |
| Inactive rooms | Greyed card plus "Inactive" label and an icon | FR-003, FR-014 | Color only |
| Tests | Vitest component tests for list filtering (debounce, filter calls, empty states) and admin form validation (client rules and mapped server errors); verification of layouts at 360, 768 and 1280 px with real browser screenshots through the browser tool | Plan input | End-to-end suite (belongs to F04) |

## Open items

None.
