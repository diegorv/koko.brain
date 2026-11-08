# 87: Toasts and the editor's CodeMirror base follow the theme mode

**Migrated from:** `.scratch/ux-polish/issues/40-toasts-and-editor-follow-theme-mode.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. Its blocker 39 is done, and it matters only on a light theme.

**Audit check at `5f8003d67`:** still_present (polish, low). src/lib/app/AppOverlays.svelte:12 still has <Toaster richColors theme="dark" />. src/lib/core/markdown-editor/setup/editor-theme.ts:88 still registers EditorView.theme(..., { dark: true }) for every theme. The dependency is delivered: appliedThemeStore.isDark exists (src/lib/core/settings/applied-theme.store.svelte.ts) and theme.service.ts:30-34 sets it on every apply (commit 46e619786, Issue 39). So a light theme (Lavender Haze, built-in) gets dark toasts and a dark CodeMirror base. Dark toasts stay readable and the editor theme overrides most colors, so impact is small.

**Stale in the text below:** editor-theme.ts line is 88, not 78. Blocker 39 is done, so the Issue is unblocked. Matters only if the owner runs a light theme.

**What to build:** `src/lib/app/AppOverlays.svelte:12` pins `<Toaster richColors theme="dark" />`, so Lavender Haze gets near-black toasts, and `src/lib/core/markdown-editor/setup/editor-theme.ts:78` registers the editor theme with `{ dark: true }` for every theme. Bind both to `appliedThemeStore.isDark` from Issue 39:
- `AppOverlays.svelte`: `theme={appliedThemeStore.isDark ? 'dark' : 'light'}`, keep `richColors`. svelte-sonner 1.2.1 accepts `'light' | 'dark' | 'system'` (`node_modules/svelte-sonner/dist/types.d.ts:152`) and applies a changed prop in its own `$effect` (`dist/Toaster.svelte:268-271`).
- `buildEditorTheme` (`editor-theme.ts:10-16`) gains a required last parameter `dark: boolean`, passed as `EditorView.theme(..., { dark })`.
- Callers: `CreateExtensionsOptions` in `setup/editor-extensions.ts` (about line 55) gets a `dark` field used at about line 166; `MarkdownEditor.svelte` passes it in its `createExtensions` call (about line 102), in the tab-state reconfigure (about line 219) and in the settings `$effect` (about lines 586-596), whose dependency list gains `appliedThemeStore.isDark`, so switching between Default and Lavender reconfigures the compartment live.

**Blocked by:** none

**Status:** resolved

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, `src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts`: `EditorState.create({ extensions: buildEditorTheme(..., false) }).facet(EditorView.darkTheme)` is false, and true for `true`. The existing calls in that file and `makeOptions` in `editor-extensions.test.ts` pass the new argument.
- [x] A test that already mounts the editor (`MarkdownEditor.test.ts` or `editor-host.test.ts`) asserts the mounted view's `EditorView.darkTheme` facet turns false after `appliedThemeStore.setDark(false)` and a flush, and true again after `setDark(true)`, with the real store.
- [x] New `src/tests/lib/app/AppOverlays.test.ts` (jsdom): mounts `AppOverlays`, stubs `window.matchMedia` (jsdom has none and Sonner calls it), calls `appliedThemeStore.setDark(false)`, fires `toast('x')` from `svelte-sonner`, and asserts `[data-sonner-toaster]` has `data-sonner-theme="light"`; after `setDark(true)` it is `"dark"`.
- [x] No other `EditorView.theme` call in `src/lib` carries a hardcoded `dark` flag (grep result in the commit body).

## Notes

- **Source:** review-2026-11-04.md section 3 rows 68 (theme part only) and 114; `work/shadow.md` P9; `work/color.md` H2.
- **Out of scope:** dropping `richColors` and styling toasts with popover tokens (elevation work), mermaid (already reads `--editor-bg`).
- **Layer:** `app/` and `core/markdown-editor` import a `core/settings` store; allowed.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/40-toasts-and-editor-follow-theme-mode.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: delivered from `issue/87-toasts-editor-s-codemirror-base-follow-theme`. CodeMirror base theme `dark` flag and Sonner toaster theme now follow `appliedThemeStore`. Full suite: 548 files, 13009 passed, 1 skipped, 1 todo; build passed. Review round 1: APPROVED (no findings).
