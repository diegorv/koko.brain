# Make `_type` the canonical frontmatter key (drop `is_a` / `is a`)

Align the document-type field with the rest of the system-metadata convention
(ADR-0027): the canonical stored key becomes `_type` (like `_organized`,
`_favorite`, `_icon`), the bare `type` stays as an input alias (`type` ->
`_type`, mirroring `organized` -> `_organized`), and the legacy `is_a` / `is a`
aliases are dropped entirely.

## Decisions (confirmed with user)

- **Drop `is_a` / `is a`** — no longer recognised on the frontmatter side nor as
  a filter identifier.
- **Keep bare `type` as an alias** -> `_type` so existing vaults (`type: X`) and
  all `type == "..."` filters keep working; on disk `type:` round-trips to
  `_type:` (ADR-0029).
- **Do NOT rename the internal field** — Rust `NoteEntry.is_a` / serialized
  `isA` stay; only the frontmatter key they READ changes to `_type`. The 6 TS
  consumers (`type-definitions/*`, `file-icons/icon-resolver`) are untouched.
- `type` is already hidden from the properties panel (`PropertiesView.svelte:94`
  filters `p.key !== 'type'`) — retarget that filter to `_type`. No UI regression.

## Known user-facing consequences (accepted)

- QueryJS `page.type` becomes `page._type` (buildKBPage spreads `record.properties`
  onto the page root; the stored key is now `_type`, like `_organized`).
- Notes still using `is_a:` lose their type until re-keyed to `type:` / `_type:`.

## Tasks

- [x] Task 1: Implement `_type` canonical across Rust + TS (code + all tests).
  - Rust: `aliases.rs` (drop is_a/is a, add `type` -> `_type`), `entry.rs`
    (`extract_is_a` reads `_type`; SYSTEM_KEYS `type` -> `_type`; doc comments),
    `commands/vault.rs` (inject `properties["_type"]`).
  - Rust tests: `aliases.rs`, `entry.rs`, `parsing.rs`, `vault_file_ops_test.rs`.
  - TS: `frontmatter-aliases.ts` (drop is_a/is a, add `type` -> `_type`),
    `evaluator.ts` (`IDENTIFIER_ALIASES = { type: '_type' }`, `isTypeIdentifier`
    checks `_type`, comments), `PropertiesView.svelte:94` filter -> `_type`.
  - TS tests: `frontmatter-aliases.test.ts`, `evaluator.test.ts`.
  - Verify: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` +
    `pnpm vitest run`. Commit.
- [x] Task 2: Update docs + example vault.
  - ADR-0027 (reclassify `type` -> `_type` system metadata), ADR-0026, ADR-0029.
  - `help/documentation/25-types-and-relationships.md`, `12-collection.md`,
    `docs/specs/frontmatter-canonical-form.md`, QueryJS doc (`page.type` -> `page._type`).
  - `help/examples/type-definitions-features/` (README wording, `meeting-weekly-standup.md`
    uses `is_a: Meeting` -> `type: Meeting`).
  - Verify: `pnpm check`. Commit.

## Notes

- Property reverse index does NOT exclude `_`-prefixed keys (`index.rs:269`), so
  `_type` stays queryable via `query_notes_by_property`.
- No TS code outside the evaluator resolves `properties.get('type')` — sort /
  group-by / display all route through the evaluator's `canonicalPropertyName`.
