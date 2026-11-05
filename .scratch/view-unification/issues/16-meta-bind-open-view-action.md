# 16: A meta-bind button can open a view

**What to build:** Issue 15 makes a view unreachable by wikilink, so a note needs another way to open one. The owner chose a new button action:

````markdown
```meta-bind-button
label: Projetos
action:
  type: openView
  path: _system/views/Projects.view
```
````

- **`path`:** vault-relative. Refuse a path that leaves the vault or does not end in `.view`, with the existing inline error widget, for example `Invalid button: openView needs a .view path`.
- **What opens:** the same as a click on the view's row in the menu. It respects `_open_in_editor`: a hidden table opens in the editor, and an ordinary view fills the note list. It works for a `_visible: false` view, which has no row. Reuse the path the rail takes (`onPickView`, `AppShell.svelte:231`) and `getViewOpensInEditor`.
- **Missing file:** show a clear error message and stop the button's remaining actions, like an `open` action with a bad link. Do not create anything.
- **Rename:** references are not rewritten. The error above is how the user finds out.

`core/` cannot import `features/` (ADR-0003), and the widget lives under `core/markdown-editor/`. Register the behavior through the existing port or facet pattern and wire it in `app/boot.ts`, as other editor hosts do. Check `layer-rules.test.ts` adds no new violation.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first:
  - Parser (`parsers/meta-bind-button.ts`): `openView` with a path is valid. No path, a non-`.view` path and a `../` path give the inline error.
  - Widget, with real stores: clicking a button for a view with `_open_in_editor: true` opens the tab. Clicking one for an ordinary view picks it, and the note list shows its rows.
  - Missing file: an error message, no file created, and later actions in `actions:` do not run.
- [ ] Unknown fields keep the behavior documented in `help/documentation/24-meta-bind.md`.
- [ ] `24-meta-bind.md` documents the action, in the same section as `open` and `createNote`.

## Notes

- Interactive widget elements must `stopPropagation` on `mousedown` (CLAUDE.md, Performance rule 11). The button already does; keep it for this action.
- A view picked this way while another rail item is active: follow what `onPickView` does, and check that the Types navigator state stays consistent.
- **Size:** M.
