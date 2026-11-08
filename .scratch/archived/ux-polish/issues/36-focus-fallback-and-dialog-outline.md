# 36: Focus falls back to the theme ring color, and dialogs do not draw a focus box around themselves

**What to build:** Two plumbing fixes for focus:
1. The base layer in `src/app.css` (about line 380, `* { @apply border-border; }`) sets no outline color, so any focusable element without its own focus style (144 raw `<button>`s in 55 files per `work/states.md`) gets the browser's default focus ring color instead of the theme's `--ring`. Change the rule to `@apply border-border outline-ring/50;`, as upstream shadcn-svelte's Tailwind v4 base layer does.
2. `src/lib/components/ui/dialog/dialog-content.svelte:30` has no outline utility on `DialogPrimitive.Content`. When a dialog has no tabbable child, bits-ui focuses the content element, and the whole dialog gets a focus ring on top of its border (File History, `src/lib/features/file-history/FileHistoryDialog.svelte:55-57`, seen in `references/ux-polish-2026-11-04/screens/default/12-cmd-view-file-history.png` and the Lavender capture). Add `outline-none` to the Content class string. The built-in close button keeps its own focus style.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `./scripts/e2e.sh e2e/specs/focus-ring.spec.ts e2e/specs/command-palette.spec.ts e2e/specs/settings.spec.ts e2e/specs/editor.spec.ts`.

- [x] Failing first: a new `e2e/specs/focus-ring.spec.ts` opens File History through the command palette (open a note, `openCommandPalette`, type `View File History`, Enter) and asserts `getComputedStyle` of `[data-slot="dialog-content"]` has `outlineStyle` `none` while it is the focused element. Run it on the current code and see it fail
- [x] Failing first: the same spec focuses by keyboard a raw button with no focus class of its own (the Settings close button `button[aria-label="Close settings"]`, `src/lib/app/SettingsPanel.svelte:124-130`), first asserts `el.matches(':focus-visible')` so the test proves its own precondition, then asserts its computed `outlineColor` equals the computed `color` of a probe element styled `color: color-mix(in oklab, var(--ring) 50%, transparent)` (created in `page.evaluate`), and that `outlineStyle` is not `none`. Run it before the `app.css` change and see it fail
- [x] `src/app.css` base `*` rule reads `@apply border-border outline-ring/50;`; nothing else in the base layer changes
- [x] `dialog-content.svelte` Content class gains `outline-none` and nothing else; the close button classes are unchanged
- [x] The editor shows no new focus outline (CodeMirror's theme sets `outline: none` itself, `src/lib/core/markdown-editor/setup/editor-theme.ts`); `e2e/specs/editor.spec.ts` stays green
- [x] The commit carries the E2E spec, so no `Test-Exempt` trailer is needed

## Notes

- **Source:** review summary item 2 and section 4 row 1; `work/states.md` P2 and R2; `work/shadow.md` P10; `work/overlays.md` P7 (focus-ring part only).
- **Not verified, owner to check in `pnpm tauri dev`:** whether WKWebView tints its `outline-style: auto` focus ring with `outline-color`. Chromium does, which is what the E2E proves. If WebKit keeps system blue for `auto` rings, the explicit `focus-visible:ring-*` recipes in Issue 37 are what removes it on the chrome controls.
- **Out of scope:** File History's missing close X and duplicated title (overlay anatomy work); the meta-bind `hsl(var(--primary))` focus fix (`live-preview/styles.ts:683-684,766-767,788`); reveal-on-focus for hover-only controls such as the inactive-tab close button (`src/lib/core/markdown-editor/EditorTabs.svelte:70`).
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/36-focus-fallback-and-dialog-outline`: `src/app.css` base `*` rule gains `outline-ring/50`; `dialog-content.svelte` Content gains `outline-none`; new `e2e/specs/focus-ring.spec.ts`. Review round 1 APPROVED with a finding (dialog test lacked a `:focus-visible` precondition), fixed in `ad8f66543`; review round 2 APPROVED, no findings. Tests: `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts` 2 passed; `pnpm check` 0 errors; full suite run 1 had one unrelated beforeAll timeout in `src/tests/help/queryjs-contract.test.ts` (passed 133/133 alone), run 2 exit 0 (493 files, 11717 tests passed) and `pnpm build` passed.
