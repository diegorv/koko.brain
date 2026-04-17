# File Explorer — Performance on Large Folders

Opening a folder with hundreds of markdown files (e.g. `Reading list/2026/04-Apr`
with 630 items) freezes the UI. Root cause: every `FileTreeItem` eagerly mounts
an `IconPicker` (which runs `loadIcons()` as a `$effect` on mount) and a per-row
set of absolutely-positioned indentation divs. For 630 rows this means 630 eager
icon-pack loads and thousands of extra DOM nodes.

## Tasks

### Phase 1 — Lazy-mount + CSS indentation (quick wins)

- [x] Task 1: Lazy-mount `IconPicker` inside `FileTreeItem.svelte` via `{#if iconPickerOpen}` so the dialog (and its `loadIcons` effect) only mounts when the user opens the picker for that row.
- [x] Task 2: Replace the per-row `{#each Array(depth)}` indentation-line divs with a CSS gradient driven by `--depth`, removing N absolutely-positioned divs per row.

### Phase 2 — (deferred, not in this session)

- Hoist `ContextMenu` to a single shared instance at `FileExplorer.svelte` level.
- Virtualize the file tree list for very large directories.

## Notes

- `.svelte` component changes are exempt from vitest coverage per `docs/TESTING.md`. E2E `file-explorer.spec.ts` is the regression gate for these tasks.
- Task 2 does not justify extracting a `.logic.ts` file — the CSS expression is trivial.
- Keep the visual appearance of the indentation lines identical (same color, same 1px width at the same offsets).
