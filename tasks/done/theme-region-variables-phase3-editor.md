# Phase 3: Editor Region Variables

Add per-region background and foreground variables for the editor so themes can independently control editor colors without affecting card surfaces elsewhere.

## Tasks

- [x] Task 1: Add `editorBg`, `editorFg` to `UIColors` type + default theme + `app.css`
- [x] Task 2: Wire `EditorView.svelte` container BG to `bg-editor-bg`
- [x] Task 3: Wire `editor-theme.ts` CM background + caret to new vars
- [x] Task 4: Wire `EditorTabs.svelte` active tab BG to `bg-editor-bg`
- [x] Task 5: Verify — `pnpm check` + `pnpm vitest run` pass

## Notes

- Defaults match current `--card` / `--foreground` values — zero visual change.
- Part of 3-phase plan: Phase 1 (left sidebar) done. Phase 2 (right sidebar) done.
