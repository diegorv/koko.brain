# Issue 87 discovery

No `spec.md` in `.scratch/audit-2026-11-05/` (only PRD.md); the Issue text is the spec.

## Files that change

- `src/lib/app/AppOverlays.svelte:12` - `<Toaster richColors theme="dark" />` becomes `theme={appliedThemeStore.isDark ? 'dark' : 'light'}`; import `appliedThemeStore` from `#lib/core/settings/applied-theme.store.svelte.js`.
- `src/lib/core/markdown-editor/setup/editor-theme.ts:10-16,88` - `buildEditorTheme(..., paragraphSpacing, dark: boolean)`, `{ dark }`.
- `src/lib/core/markdown-editor/setup/editor-extensions.ts:51,166` - `CreateExtensionsOptions.dark`, passed to `buildEditorTheme`.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:111-129` (freshState `createExtensions`), `:227-229` (showTabState reconfigure), `:689-699` (theme `$effect`, dependency list gains `appliedThemeStore.isDark`).

## Plan (test-first)

1. `editor-theme.test.ts`: add `dark` arg to every call; new test `EditorState.create({ extensions: buildEditorTheme(..., false) }).facet(EditorView.darkTheme)` false / true. `editor-extensions.test.ts` `makeOptions` gains `dark: true`. Then change `editor-theme.ts` + `editor-extensions.ts`.
2. `MarkdownEditor.test.ts`: new describe, `render()`, `appliedThemeStore.setDark(false)`, `flushSync()`, `editorStore.editorView!.state.facet(EditorView.darkTheme)` false, then true. `_reset()` in beforeEach/afterEach. Then wire `MarkdownEditor.svelte`.
3. New `src/tests/lib/app/AppOverlays.test.ts` (jsdom): stub `window.matchMedia`, mount `AppOverlays`, `setDark(false)`, `toast('x')`, flush, assert `[data-sonner-toaster]` `data-sonner-theme="light"`; `setDark(true)` -> `"dark"`. Then change `AppOverlays.svelte`.

## Prior art

- Mount pattern: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` `render()`; `src/tests/lib/app/SettingsPanel.test.ts` (ResizeObserver / animate stubs for jsdom).
- `matchMedia` stub: `src/tests/lib/app/EditorView.test.ts`.

## Risks

- `AppOverlays` mounts SettingsPanel, QuickSwitcher, CommandPalette, pickers, FileHistoryDialog; all closed by default, but some may need jsdom stubs or Tauri mocks at import. Add only the stubs the run asks for.
- Sonner renders `[data-sonner-toaster]` only while a toast exists (`Toaster.svelte:395`); the toast must be fired before asserting, and its timers may need `toast.dismiss()` in cleanup.
- The editor theme reconfigure fires `reconfigured`, rebuilding decorations; adding one primitive dependency (`isDark` only changes on a real theme-mode switch) adds no extra reconfigures on unrelated settings writes.
- installed svelte-sonner is 1.2.2 (Issue says 1.2.1); `theme` prop handling (`Toaster.svelte:268-271`) is the same.

## Defaults taken

- `MarkdownEditor.svelte` reads `appliedThemeStore.isDark` directly (a primitive `$state` getter), no extra `$derived`.
- Grep for hardcoded `dark` flags on `EditorView.theme` in `src/lib`: only `editor-theme.ts:88`; `extensions/live-preview/styles.ts:83` has no options argument.
