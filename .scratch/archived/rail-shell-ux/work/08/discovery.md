# Issue 08 discovery: a missing `_organized` reads as organized in the action bar

No `spec.md` exists for rail-shell-ux; the Issue's Notes carry the decisions.

## Files that change

- `src/lib/features/properties/lifecycle.logic.ts:10-11` (`getLifecycleState`) and
  `:21-24` (`isOrganized` + JSDoc): only a boolean `false` is not organized; a
  missing key or a non-boolean value is organized. `_archived: true` still wins.
  Mirrors `entry.rs:246-249` (`.as_bool().unwrap_or(true)`).
- `src/lib/features/note-action-bar/note-action-bar.logic.ts:15`: JSDoc of
  `ActionBarState.organized`.
- `src-tauri/src/vault/entry.rs:193`: doc comment of `organized`; `cargo test`
  regenerates `src/lib/contracts/generated/NoteEntry.ts:87`.
- `lifecycle.service.ts` and `NoteActionBar.svelte` need no edit (both go
  through `isOrganized`). Keys are canonicalized by `parseFrontmatterProperties`
  (`canonicalizeKey`), so the `organized:` alias reads like Rust's.

## Tests

- `src/tests/lib/features/properties/lifecycle.logic.test.ts`: new table (no key,
  `true`, `false`, `yes`, `_archived: true` alone) parsed with
  `parseFrontmatterProperties`, expected values copied from
  `entry.rs from_content_lifecycle_flags_*`; plus `isInboxEntry(entryV2(...))`
  agreement per row with `organized`/`archived` set explicitly. Update `:18-21`,
  `:51-53`, `:60-62` with a one-line comment each.
- `lifecycle.service.test.ts:203-209`, `:221-237`; `NoteActionBar.test.ts:194-212`,
  `:286-295`; `note-action-bar.logic.test.ts:32`, `:41`: flip to the new reading,
  one-line comment each, none deleted.

## Plan

1. Failing test table (red) -> commit with the logic fix (green).
2. Update the locked assertions in the other test files.
3. Rust doc comment + regenerated binding (cargo test).
4. Confirm help 12:394, 13:167, 25:248/253 still match (no edit expected).

## Risks / defaults

- A note archived without `_organized` now gets `_organized: false` on Cmd+E
  (it read as organized). It stays archived (`toggleOrganized` keeps `_archived`).
- Inbox membership after the click comes from the Rust index; not exercised in
  vitest (Issue says so).
