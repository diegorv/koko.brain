VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first, `src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts`: `EditorState.create({ extensions: buildEditorTheme(..., false) }).facet(EditorView.darkTheme)` is false, and true for `true`. The existing calls in that file and `makeOptions` in `editor-extensions.test.ts` pass the new argument. — editor-theme.test.ts `describe('dark flag')` builds `EditorState.create({ extensions: buildEditorTheme('Menlo', 16, 1.6, 0, 0, dark) }).facet(EditorView.darkTheme)` and expects false/true; every existing call now passes a sixth `true`; `makeOptions` in editor-extensions.test.ts:26 has `dark: true`, plus a test that the facet follows the option. `buildEditorTheme` (editor-theme.ts:12-19) takes a required `dark: boolean` and passes `{ dark }` at line 91. Both files pass.
- [met] A test that already mounts the editor (`MarkdownEditor.test.ts` or `editor-host.test.ts`) asserts the mounted view's `EditorView.darkTheme` facet turns false after `appliedThemeStore.setDark(false)` and a flush, and true again after `setDark(true)`, with the real store. — MarkdownEditor.test.ts `theme mode` > "switches the CodeMirror base theme with the applied theme mode" uses the real `appliedThemeStore` and `flushSync`, reading `editorStore.editorView!.state.facet(EditorView.darkTheme)`. Mutation probe: reading `isDark` inside `untrack` in the theme `$effect` (MarkdownEditor.svelte:699) makes it fail with "expected true to be false"; restored afterwards. Two more tests cover a revisited tab and a first-visit tab.
- [met] New `src/tests/lib/app/AppOverlays.test.ts` (jsdom): mounts `AppOverlays`, stubs `window.matchMedia` (jsdom has none and Sonner calls it), calls `appliedThemeStore.setDark(false)`, fires `toast('x')` from `svelte-sonner`, and asserts `[data-sonner-toaster]` has `data-sonner-theme="light"`; after `setDark(true)` it is `"dark"`. — The file exists with `// @vitest-environment jsdom`, a `matchMedia` stub, `setDark(false)`, `toast('x')`, and asserts on `[data-sonner-toaster]`'s `data-sonner-theme` ("light", then "dark"). Mutation probe: restoring `theme="dark"` in AppOverlays.svelte makes it fail with "expected 'dark' to be 'light'"; restored afterwards. AppOverlays.svelte:13 is `<Toaster richColors theme={appliedThemeStore.isDark ? 'dark' : 'light'} />`, `richColors` kept.
- [met] No other `EditorView.theme` call in `src/lib` carries a hardcoded `dark` flag (grep result in the commit body). — My grep of `src/lib` and `src/routes` finds `EditorView.theme(` only at editor-theme.ts:20 (`{ dark }`) and live-preview/styles.ts:83 (no options); no `dark: true` / `dark: false` left. Commit 10ddd9802's body records the grep result.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 221 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run` on src/tests/lib/app/AppOverlays.test.ts, src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts, src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts, src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts and src/tests/lib/architecture/: exit 0, 13 files, 161 tests passed. The test verdict rests on these files and on the two mutation probes above.
- The full suite and `pnpm build` (the Issue's Gate line) are deliver's to run.
- Worktree clean after the probes (`git status --short` empty).

## Correctness notes

- All three new reads of `appliedThemeStore.isDark` in MarkdownEditor.svelte are safe. `freshState` and `showTabState` run inside `untrack` or `onMount` (lines 404, 453, 513), so the tab-switch effect gains no theme dependency. The theme `$effect` tracks `isDark` on purpose. `setDark` with an unchanged value does not notify, because `$state` compares values. So `theme.service.ts` calling it on every apply reconfigures the compartment (and rebuilds decorations) only when the mode really flips.
- Layer: `app/` and `core/markdown-editor` import a `core/settings` store, which is allowed. The layer baseline is unchanged and the architecture tests pass.
- No scope creep: the diff touches only the files the Issue names, their tests, and the work/87 discovery note.

## Findings

None.
