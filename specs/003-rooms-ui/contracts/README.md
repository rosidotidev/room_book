# Contract

This feature does not change the API contract. It consumes
[`specs/001-project-setup/contracts/openapi.yaml`](../../001-project-setup/contracts/openapi.yaml)
through the generated client.

Integrity check (no commits exist to diff against): the SHA-256 of the contract at the start of this feature is stored in
[`../contract-baseline.sha256`](../contract-baseline.sha256) and must equal the current hash at the end.

If the UI seems to need something the contract does not offer, that is reported as a finding, not changed here.
