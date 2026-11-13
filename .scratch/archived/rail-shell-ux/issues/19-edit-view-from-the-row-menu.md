# 19: Edit view from the view row's menu

**What to build:** The view row's menu in the Types navigator gets "Edit view". It opens the same dialog as New view, titled "Edit view", prefilled with the view's label and filters, with the button "Save". The first view's own filters show under "This view"; a view that also has top-level filters shows them under "All views", so nothing in the view is hidden. Saving rewrites only the label (`_sidebar_label` and the first view's name) and the two filter places; the `.view` filename and the values of every other key stay as they are. The row and the note list update to the new label and filters. A save failure shows inline with the dialog kept open, as in create.

The rewrite is a new pure updater next to `updateCollectionYaml` in `src/lib/features/collection/yaml-parser.ts` (that updater has no label or view-name field, and `renameView` only covers the name), for example:

```ts
updateViewEditYaml(yaml: string, edit: { label: string; filters?: CollectionFilter | string; viewFilters?: CollectionFilter | string }): { ok: true; yaml: string } | { ok: false; error: string }
```

It returns an error, never the input unchanged, when the YAML does not parse or has no `views[0]`. A service function in `type-definitions.service.ts` reads the file, applies it, and writes through the same write step as `updateViewQuery` (the note-change owner call and recent-save mark from Issue 02, then `refreshViewDefinition(path)`), then calls `vaultStore.requestPromptIndexRefresh()`. It rejects on any failure.

**Blocked by:** 02, 04, 17, 18

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus the rail-shell E2E spec via `bash scripts/e2e.sh`.

- [x] Prefill: the label (the one the row shows, so a view without `_sidebar_label` prefills the filename, as `getViewLabel` does), the first view's filters and, when present, the top-level filters load into the dialog's two sections. In Edit the "All views" section is shown only when the view had top-level filters when the dialog opened; New view still shows only "This view" (component test, real filter logic)
- [x] Prefill reads the file fresh (`refreshViewDefinition`), not the cached parse. A `.view` that does not parse opens with the parse error in a `role="alert"` element and Save disabled, and nothing is written (component test)
- [x] A view whose filter nests an object in a list (`and: [ "expr", { or: [ ... ] } ]`) prefills without losing it, and Save with only a name change writes the nested object back as an object, not as a JSON-text expression (logic test: `parseFilterToGroups`, then `filterGroupsToFilter`, then the updater, all real)
- [x] Save rewrites `_sidebar_label`, the first view's name and the two filter places, and keeps every other key as values: `_icon`, `_color`, `_sort`, `_order`, `_open_in_editor`, the view's sort, columns and limit, and any other views (logic test, real YAML updater)
- [x] Clearing all rows of a section on Save removes that filter key instead of writing an empty one (logic test)
- [x] The updater returns an error, not the input, for YAML that does not parse and for a file with no `views[0]`; the service then rejects and writes nothing (logic test plus service test, plugin-fs mocked)
- [x] Service: Save writes once, refreshes the parse cache so `getCachedViewDefinition(path)` returns the new filters with no further disk read (real `view-parse-cache` module, not mocked), sends the bytes through the note-change owner as Issue 02's writers do (`update_note_in_index` invoked with the path; `areAllRecentSaves([path])` true with the real `editor.hooks`), and leaves `vaultStore.takePromptIndexRefresh()` true (service test, plugin-fs and `invoke` mocked at the Tauri boundary, real stores)
- [x] The label written by Save resolves through `getViewLabel` from an entry whose frontmatter is the saved YAML's parsed top level (logic test; the E2E cannot prove the row label, see Notes)
- [x] The duplicate-label check is Issue 17's `validateViewName`, with `existingLabels` built from the view rows other than the edited view's own row (matched by path), so saving with the same name, or a case change of it, is allowed while another view's label is still refused (logic test)
- [x] The filename never changes: open tabs on the view and a saved Types pick of it keep resolving after a rename (component test, real stores)
- [x] Save failure keeps the dialog open with the reason in a `role="alert"` element; the dialog cannot be closed while saving (component test)
- [x] E2E: open a view's row menu, Edit view, change the name and a filter, Save; the dialog closes; the saved `.view` (read through `window.__e2e.fs.readFile`, the spec's `savedFile` helper) holds the new `_sidebar_label`, the new first view name and the new filter; after picking another row and then the view's row again, the note list shows the new matches. The row label is not asserted in the E2E (see Notes)
- [x] Help: `help/documentation/25-types-and-relationships.md`, the "**A view:**" list under "### Types Navigator Context Menu", lists Edit view among the view row's menu actions

## Notes

- **Why Issue 04 first:** nested filter objects must load in a form that round-trips, or a hand-written nested filter would be rewritten as JSON text on Save. Issue 04 loads a nested object as an editable raw row that carries the object and writes it back unchanged while its text is not edited; the nested-filter criterion above relies on that.
- **Why Issues 02 and 17:** Issue 02 gives the `.view` writers the owner call and recent-save mark that Save reuses; without it the row and the note list catch up only at the watcher's full rebuild. Issue 17 adds the view-name check this Issue reuses, and the prompt index refresh on create. Issue 18 (the dialog's filter section and its hide flag for "All views") already depends on 17.

- **Owner decisions (2026-11-04):** Edit view is part of this feature; renaming changes the label only, never the filename (no path change, so tabs, saved picks and links are untouched); nested filters are fixed first (Issue 04) rather than shown as read-only.
- **Main-session decisions:**
  - Save always writes `_sidebar_label` and the first view's name to the dialog's name, so a view that had no `_sidebar_label` gains one.
  - The "All views" section's visibility is decided when the dialog opens and does not change while it is open; Edit cannot add top-level filters to a view that has none (the note list's Filter panel still can).
  - Save does not pick the edited view or change the note list's lens.
- **Row label and note list after Save:** the row label comes from the index (`typeDefinitionsStore.entriesByPath`), so it updates at the next `vault-index-updated` refresh, which the prompt refresh request makes immediate. The note list re-runs a shown view when the type-definition entries change, and then reads the refreshed parse cache.
- **E2E mock gap:** the E2E vault-index mock (`e2e/mocks/vault-index.ts`) indexes only `.md` / `.markdown` files and emits no `vault-index-updated` for a `.view` update, so in E2E a view row always shows its filename and the note list does not re-run on its own after Save. That is why the E2E re-picks the row and checks the saved bytes; the label and the live refresh are proven in unit tests. Extending the mock is out of scope, as in Issue 17.
- **Owner decision (2026-11-04, accepted limit):** comment loss is accepted in this delivery. Save re-serialises the whole YAML, like every `.view` writer, so comments and formatting in the file are dropped (review F13 / I15, `file-io-audit/32` second section). An open, clean editor tab on the `.view` reloads through the watcher (`reloadExternallyChangedTabs` runs before the self-save skip); a dirty one keeps its content and its next autosave overwrites the Save (also `file-io-audit/32`).
- **Help overlap:** Issue 26 sweeps the same help page after this lands; this Issue only adds the menu entry and the dialog's Edit behaviour.
- **Size:** M.
- **Type scale (typography-hierarchy, done 2026-11-04):** the chrome uses the text-role tokens in `src/app.css` (`text-label` 11px, `text-meta` 12px, `text-row` 14px, `text-title` 15px semibold, and the `section-label` utility for section headers, sentence case). New or changed UI in this Issue uses those roles, never `text-[Npx]`; line numbers traced above in files that delivery touched may have moved, so trust the code over the citation.

## Comments

- 2026-11-04, branch `issue/19-edit-view-from-the-row-menu`: Edit view in the view row's menu. `updateViewEditYaml` rewrites `_sidebar_label`, the first view's name and both filter places, keeping every other key; `editView` writes once, refreshes the parse cache and routes through the note-change owner; `ViewDialog` gains an Edit mode prefilled from a fresh read. Review fixes: a prefilled invalid name shows its error at once; a new `_sidebar_label` goes first in the file. Tests: pnpm check 0 errors; targeted vitest 27 files, 933 passed; full suite at 993ff3f32 exit=0 (475 files, 11219 passed, 1 skipped, 1 todo). Reviews: round 1 APPROVED (2 findings, fixed), round 2 APPROVED (no findings).
