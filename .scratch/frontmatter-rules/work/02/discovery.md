# Discovery: Issue 02, rule consequences in Settings

No `spec.md`; `PRD.md` holds the Decisions. Builds on `work/01` (types, `sanitizeRuleProperties`, `findMatchingRules`).

## Files that change

- `src/lib/features/auto-move/AutoMoveRuleRow.svelte`: filter input keeps a writable `$derived` draft (validation and count on input, `onupdate` on `change`); 300 ms debounce feeds "Matches N notes now" from `collectionStore.propertyIndex` + `vaultStore.path`; "Then" area: "Move to folder" (existing destination input + legacy icon button, placeholder "Empty: do not move"), "Set properties" rows (key with `<datalist>` from `getAllKnownProperties` minus `file.*`, value editor, mode `<select>`, remove), "Add property"; "does nothing" hint styled like the expression error.
- Value editor per row: boolean-only keys (`_organized`, `_archived`, `_favorite`, canonicalized) and boolean values get a checkbox; a "Text / Yes/no" `<select>` switches other rows; `_icon` opens a second `IconPicker` and saves `pack:name`; `_color` / `_title_color` open it with no current icon so `onColorsChange` (and `onSelect`'s color arg) sets the value; numbers and lists render a disabled input ("edit in JSON").
- `src/lib/features/auto-move/AutoMoveSection.svelte:55`: `enabled: false`.
- `src/lib/features/auto-move/auto-move.logic.ts`: `countMatchingNotes(expression, index, vaultPath)` (same `findMatchingRules` matcher, skips `.view` records, 0 for blank); `ownedProperties` reads `sanitizeRuleProperties(rule.properties)` so an unfinished Settings row (blank key, `todoist_project`) is never written.
- `help/documentation/22-auto-move.md`: Settings flow section.

## Plan (test-first)

1. `src/tests/fixtures/AutoMoveRuleRowHarness.svelte` holds the rule in `$state` and applies `onupdate`, like `FilterRow.svelte.test.ts` does with `$state` props (the Acceptance names `AutoMoveRuleRow.test.ts`, a non-rune file).
2. Row tests: add/type/always (Acceptance 1), remove, edit value, `_archived` checkbox, `_icon` picker (Lucide + search, as `IconPicker.test.ts`), filter commits on change only, match count (real `collectionStore`), hint.
3. New `AutoMoveSection.test.ts`: "Add rule" creates a disabled rule in the real `autoMoveStore`.
4. Logic tests: `countMatchingNotes`, `ownedProperties` ignoring invalid entries.

## Risks

- The store is not sanitized between Settings edits; the `ownedProperties` guard covers it at evaluation.
- A committed key with an empty value on an enabled rule is live (writes `''`); new rules start disabled, which is the PRD's guard.
- `_color` row through IconPicker shows the icon grid too; picking an icon only takes its color. Extraction of the color block left out (allowed, not required).

## Defaults taken

- Changing a key to a boolean-only key turns a non-boolean value into `false`; "Yes/no" starts at `false`, "Text" at `''`.
- Name and destination inputs keep committing on input (the Issue names filter, key and value only).
- Match count skips `.view` records (they are not notes and Auto Move never acts on them).
