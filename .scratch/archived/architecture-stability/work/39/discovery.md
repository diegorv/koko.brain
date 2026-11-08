# Issue 39 discovery

No `spec.md` for architecture-stability. Pattern from `work/38` (golden fixture shared by both suites).

## Re-check after 3d656180

- Unquoted list item `_related_to:\n  - [[Carol]]`: Rust `project_value` (`src-tauri/src/vault/parsing.rs:739-752`)
  projects a seq holding one seq holding one scalar to `"[[Carol]]"`, so `extract_wikilink_targets`
  gives `["Carol"]`. TS `convertToProperty` (`src/lib/features/properties/properties.logic.ts:43-54`)
  JSON-stringifies the nested array item to `'[["Carol"]]'`, and `parseWikilinks` then reads the target
  `"Carol"` (with quotes). Same for `related: [[A]]` (TS list `['["A"]']`, Rust string `"[[A]]"`). Still diverges.
- Null `type:`: Rust keeps `_type: null` (`extract_is_a` -> None, `project_note_record` at
  `src-tauri/src/commands/vault.rs:745-747` writes nothing). TS `convertToProperty` maps null to `''`
  (ADR 0029 canonical coercion). Still diverges.

## Rules picked

1. Unquoted wikilink: Rust's parser rule, applied in TS `convertToProperty`: a value or list item that is
   a one-item list holding one scalar `X` reads as the string `"[[X]]"`. The Properties panel then shows
   what the user typed instead of `[["X"]]`; `collection.logic.ts` needs no change.
2. Null `_type`: `""` on both sides (ADR 0029 reads `key:` as `""`; TS cannot tell `type:` from `type: ""`
   after the parse). Rust `project_note_record` writes `""` when frontmatter `_type` is null.

## Files that change

- `src/lib/features/properties/properties.logic.ts:43-54` `convertToProperty` (rule 1).
- `src-tauri/src/commands/vault.rs:745-747` `project_note_record` (rule 2).
- `src-tauri/tests/fixtures/note-record-projection.json`: becomes `cases[]`; each case has `injected`
  (keys the projection adds/rewrites vs that side's parse) and/or `record` (final values of listed keys).
  The null-type case uses only `record`: the parsed baselines differ (null vs `""`), so `injected` differs.
- `src-tauri/tests/vault_file_ops_test.rs:385-405` and
  `src/tests/lib/features/collection/collection.service.test.ts:338-362`: iterate the cases.
- `src/tests/lib/features/properties/properties.logic.test.ts`: unit tests for rule 1.

## Risks / defaults

- Inner scalar that YAML types (`[[2024]]`, `[[true]]`): TS uses `String(value)`; Rust uses the source text.
  Differs only on spellings YAML re-formats (`[[007]]`, `[[1e3]]`). Inner null (`[[~]]`) is left as before.
- Every `parseFrontmatterProperties` consumer sees the new string; `detectLossyFrontmatter` still reports
  `nested` for these shapes, so the guarded writers keep refusing them.
