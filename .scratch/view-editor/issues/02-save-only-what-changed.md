# 02: Edit view saves only what the user changed

**What to build:** the shared model every section uses: a draft read from the file, a patch of the fields the user changed, and a writer that applies the patch without re-serializing the file. This Issue moves Name and Filters onto it; 03 and 05 to 07 add their fields.

**New pure module** `src/lib/features/type-definitions/view-dialog.logic.ts` (no framework imports):
- `readViewDialogDraft(raw, definition, fileName)` returns one `Field<T> = { state: 'absent' | 'set' | 'ignored'; value: T | null; note?: string }` per field.
  - Root keys are folded with `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts`), in file order, the last one winning, as Rust does (`src-tauri/src/vault/aliases.rs`).
  - The state comes from the readers in `type-sidebar.logic.ts:337-481` (`getViewLabel`, `getViewSort`, ...), applied to a frontmatter-shaped record of the folded values. `RESERVED_KEY_RULES` checks only the kind of value and covers 7 keys, so use `ignoredKeyNotes` for wording only.
- `buildViewDialogPatch(loaded, draft)` keeps only fields whose value changed. Filters compare with `canonicalToolbarValue` (`type-note-list.logic.ts:153-156`), so adding a row and removing it again is no change.
- `applyViewDialogPatch(yaml, patch, viewIndex)`:
  - Empty patch: returns the input string unchanged.
  - Works on `parseDocument(yaml)` and returns `doc.toString({ lineWidth: 0 })` (PRD default D2), so comments, key order and untouched values stay.
  - A set writes the canonical key and deletes its aliases. A clear deletes the canonical key and its aliases. Aliases of untouched fields stay.
  - Returns `{ ok: false, error }` when the YAML does not parse or the view at `viewIndex` is not a map, as `updateViewEditYaml` does today (`yaml-parser.ts:286-310`).

**Name and Filters on the patch:**
- The name is validated only when touched or for New view (PRD default D9).
- One view: `views[0].name` changes only when it equalled the old effective label (owner decision of 2026-11-06). Several views: only `_sidebar_label` is written; no view is renamed and `_rail_view` is not written.
- An absent `_sidebar_label` with an unchanged name writes nothing.
- Filters: only a touched section is written (`filterGroupsToFilter`); empty groups delete the key.

**Load from the write base:** add `readViewBase(path)` to `type-definitions.service.ts`, returning a dirty tab's buffer else the disk bytes (the same rule as `:387-388`). Read the label from those bytes, not from the Types row (`TypesNavigator.svelte:150`, which can lag 2 to 10 s). The dialog takes the path; the label prop goes.

**Replace** `ViewEdit` and `updateViewEditYaml` (`yaml-parser.ts:264-330`); `editView` (`type-definitions.service.ts:541-549`) is their only caller in `src/lib`. `editView(path, patch)` keeps `promptIndexRefresh`. Keep `type-definitions.service.ts` changes to signatures and `readViewBase`: it is a hotspot (`docs/HOTSPOTS.md`).

**Blocked by:** 01

**Status:** ready-for-agent

The touched-only save is an owner decision of 2026-11-06 (PRD § Owner decisions).

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, `src/tests/lib/features/type-definitions/view-dialog.logic.test.ts` (new):
  - Each field's absent, set and ignored state for the label; the alias last-wins rule (`sidebar_label` after `_sidebar_label`).
  - An empty patch returns the identical string.
  - Untouched filters that the panel round trip changes survive a label change byte for byte: `due == date('2026-01-05')`, `done != true`, `x > '10'` and `{and: []}`.
  - A set drops `sidebar_label` and `sidebar label`; a clear deletes every spelling.
  - A head comment and an inline comment survive a label change (D2).
  - One view named `All`, no `_sidebar_label`, label changed: `name` stays `All`. One view whose `name` equals the label: `name` follows.
  - Several views: only `_sidebar_label` changes; `_rail_view` and every `name` stay.
- [ ] `src/tests/lib/features/collection/yaml-parser.test.ts:956-1150`: the `updateViewEditYaml` tests move to the new module. The multi-view rename tests (around :988 and :1093) take the new expectation. This is a behavior change the owner approved (2026-11-05 for several views, 2026-11-06 for the one-view rule), not a weakened test.
- [ ] `src/tests/lib/features/type-definitions/edit-view.service.test.ts`:
  - With a dirty `.view` tab in the real `editorStore`, `readViewBase` returns the buffer.
  - An unchanged save writes nothing: the mocked write is not called.
- [ ] `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`:
  - Opening a file with one view named `All` and no `_sidebar_label`, then Save, leaves the content unchanged.
  - A file whose label another view also shows opens with Save enabled until the name is touched.
- [ ] `help/documentation/25-types-and-relationships.md:177` (Edit view) and the multi-view sentences around :487 describe the new rule. ADR-0027 gets an amendment line for the multi-view name rule.

## Notes

- Mocks: only `invoke` and the plugin-fs calls, as `edit-view.service.test.ts` and `rewrite-view-file.service.test.ts` do. Never mock `collectionStore`, `typeDefinitionsStore`, `fsStore`, `editorStore` or a `.logic.ts`.
- Not verified: whether `waitForTabSave` flushes a pending autosave debounce or only waits for a save in flight (`type-definitions.service.ts:383`). The dirty-buffer test covers the base either way.
- Research: `research/synthesis-modal.md` § 1 (R1, R2, R3, R4, R12) and § 2.
- **Size:** M.
