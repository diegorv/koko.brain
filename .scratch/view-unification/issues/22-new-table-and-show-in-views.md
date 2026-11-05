# 22: New table, and Show in Views

**What to build:** Tables become `.view` files.

**New table.** The Files navigator's New Collection item (`FilesNavigator.svelte:87`) becomes **New table**. `createCollectionFile` (`collection.service.ts:12-25`) keeps its name and writes `Untitled.view` (`Untitled 1.view` when taken):

```yaml
_visible: false
_open_in_editor: true
views:
  - type: table
    name: All
```

Call `vaultStore.requestPromptIndexRefresh()` **before** the write, as `createView` does (`type-definitions.service.ts:272`). Otherwise the file shows in Views until its entry lands, because a view with no entry counts as visible (`type-sidebar.logic.ts:376`). The flow is otherwise the same: no dialog, picks the folder, opens the table. `createFile` already skips the search tables for non-Markdown (`fs.service.ts:215`).

**Show in Views.** A row item on a `.view` with `_visible: false` removes `_visible` and `_open_in_editor`, through `rewriteViewFile` (Issue 03), so the row appears in Views. It rewrites the YAML, so comments are not kept, like the other view writers.

**Blocked by:** 03, 12, 13, 14, 15, 17, 18, 20, 21

**Status:** ready-for-agent

**Gate:** both, for the Rust test below: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`. Then `bash scripts/e2e.sh` for the new spec.

- [ ] Failing tests first:
  - `FilesNavigator.menu.test.ts:226` and siblings: New table writes `Untitled.view` with both keys through `create_note` (real `createFile`, `invoke` mocked).
  - Rust: `update_note_in_index_inner` indexes that body, with `_visible: false` and `_open_in_editor: true` in frontmatter.
  - Show in Views: after the click, the file has neither key, and the row is in Views.
- [ ] `rail-shell.spec.ts`: New table opens a rendered table, there is no row in Views, and the Files row is present.
- [ ] `e2e/mocks/vault-index.ts:44,96-98` gains a raw-YAML branch mirroring `parse_frontmatter_raw_yaml`. Without it the mock parses no frontmatter for a `.view`, the Views row appears, and the spec fails. Do not weaken the spec to pass: the Rust test is the real proof, and the spec proves the UI against the mock.
- [ ] `help/documentation/02-file-explorer.md`, `12-collection.md` and `25-types-and-relationships.md` describe New table and Show in Views.

## Notes

- **Known effect:** hidden tables keep their names taken (`lens.logic.ts:640`), so New view "People" is refused while a hidden `People.view` exists. This is documented behavior, and will happen more often.
- **Accepted:** a new note appears in a table after the entries refresh (see Issue 11).
- `_rail` ignores `_visible` (`lens.logic.ts:223`), so a `_rail: true` table still pins.
- **Size:** M.
