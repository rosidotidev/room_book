# Contract

This feature does not change the API contract. It consumes
[`specs/001-project-setup/contracts/openapi.yaml`](../../001-project-setup/contracts/openapi.yaml)
as extended by the bookings API, through the generated client (`BookingsService`, `RoomsService`).

Integrity check (no commits to diff against): the SHA-256 of the contract at the start of this feature is stored in
[`../contract-baseline.sha256`](../contract-baseline.sha256) and must equal the current hash at the end.

Findings reported instead of changed (see `research.md`): the office time zone is not exposed by the contract (a frontend constant is used), and cancelled bookings are only available through the organizer listing.
