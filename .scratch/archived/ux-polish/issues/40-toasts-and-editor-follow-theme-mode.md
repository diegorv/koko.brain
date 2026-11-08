# 40: Toasts and the editor's CodeMirror base follow the theme mode

**What to build:** `src/lib/app/AppOverlays.svelte:12` pins `<Toaster richColors theme="dark" />`, so Lavender Haze gets near-black toasts, and `src/lib/core/markdown-editor/setup/editor-theme.ts:78` registers the editor theme with `{ dark: true }` for every theme. Bind both to `appliedThemeStore.isDark` from Issue 39:
- `AppOverlays.svelte`: `theme={appliedThemeStore.isDark ? 'dark' : 'light'}`, keep `richColors`. svelte-sonner 1.2.1 accepts `'light' | 'dark' | 'system'` (`node_modules/svelte-sonner/dist/types.d.ts:152`) and applies a changed prop in its own `$effect` (`dist/Toaster.svelte:268-271`).
- `buildEditorTheme` (`editor-theme.ts:10-16`) gains a required last parameter `dark: boolean`, passed as `EditorView.theme(..., { dark })`.
- Callers: `CreateExtensionsOptions` in `setup/editor-extensions.ts` (about line 55) gets a `dark` field used at about line 166; `MarkdownEditor.svelte` passes it in its `createExtensions` call (about line 102), in the tab-state reconfigure (about line 219) and in the settings `$effect` (about lines 586-596), whose dependency list gains `appliedThemeStore.isDark`, so switching between Default and Lavender reconfigures the compartment live.

**Blocked by:** 39

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, `src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts`: `EditorState.create({ extensions: buildEditorTheme(..., false) }).facet(EditorView.darkTheme)` is false, and true for `true`. The existing calls in that file and `makeOptions` in `editor-extensions.test.ts` pass the new argument.
- [ ] A test that already mounts the editor (`MarkdownEditor.test.ts` or `editor-host.test.ts`) asserts the mounted view's `EditorView.darkTheme` facet turns false after `appliedThemeStore.setDark(false)` and a flush, and true again after `setDark(true)`, with the real store.
- [ ] New `src/tests/lib/app/AppOverlays.test.ts` (jsdom): mounts `AppOverlays`, stubs `window.matchMedia` (jsdom has none and Sonner calls it), calls `appliedThemeStore.setDark(false)`, fires `toast('x')` from `svelte-sonner`, and asserts `[data-sonner-toaster]` has `data-sonner-theme="light"`; after `setDark(true)` it is `"dark"`.
- [ ] No other `EditorView.theme` call in `src/lib` carries a hardcoded `dark` flag (grep result in the commit body).

## Notes

- **Source:** review-2026-11-04.md section 3 rows 68 (theme part only) and 114; `work/shadow.md` P9; `work/color.md` H2.
- **Out of scope:** dropping `richColors` and styling toasts with popover tokens (elevation work), mermaid (already reads `--editor-bg`).
- **Layer:** `app/` and `core/markdown-editor` import a `core/settings` store; allowed.
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/87-toasts-editor-s-codemirror-base-follow-theme.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
