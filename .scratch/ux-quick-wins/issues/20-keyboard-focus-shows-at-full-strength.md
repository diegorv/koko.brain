# 20: Keyboard focus shows at full strength; spinners and pulses respect Reduce motion

**Origin:** design review 2026-11-17, proposals P23 (primitives and base rule), P171 (base rule), prototype `.scratch/design-review/prototypes/color-contrast-theming.html` (focus ring at `:217`), research `.scratch/ux-quick-wins/research/verdict-color.md` (ticket Q3), `verdict-feedback-b.md` (ticket QB6) and `breakdown.md` (old ticket 10).

**What to build:** class and CSS changes in the shared primitives and `app.css`; no logic.

1. **Button ring.** `src/lib/components/ui/button/button.svelte:7`: `focus-visible:ring-ring/50` plus `focus-visible:ring-[3px]` become `focus-visible:ring-2 focus-visible:ring-ring`. No ring offset: `ring-offset-background` paints the sidebar colour on popovers and dialogs. `:12` the destructive variant's `focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40` become `focus-visible:ring-destructive`.
2. **Dialog close button.** `src/lib/components/ui/dialog/dialog-content.svelte:38`: `focus:ring-ring` and `focus:ring-2` become `focus-visible:` variants, so the ring no longer shows on open and on mouse focus. The close button's existing offset classes and `focus:outline-hidden` stay.
3. **Base outline.** `src/app.css:495` `outline-ring/50` in `@layer base` becomes `outline-ring`, so raw buttons (no focus class of their own) show the full ring.
4. **Reduced motion.** One unlayered `@media (prefers-reduced-motion: reduce)` block in `app.css` (outside every `@layer`, so it beats the layered utilities whatever their specificity): `.animate-pulse { animation: none; }` and `.animate-spin { animation-duration: 1.5s; }`, with a comment that unlabelled spinners must still read as busy. The only existing rule, `EventCalendarView.svelte:284`, is untouched.
5. **Two ring strengths for a while.** Inputs, selects, switches, scroll-area (`scroll-area.svelte:32`, a deliberately faint 4 px ring), `aria-invalid` rings and the feature-file copies of the Button recipe keep their classes, so the app shows two ring strengths until those folders land. Say so in the commit body.

Not in this ticket: a `--focus-ring` token and utility, the feature-site sweep (`AppShell.svelte:191` and `SettingsPanel.svelte:137` are mvp-claude files, and pins such as `AppShell.test.ts:397-398`, `Rail.test.ts:55`, `TasksView.test.ts:860`, `MyPeopleSection.test.ts:243` stay on `ring-ring/50`), `aria-invalid` rings, rings on `outline-none` inputs, the Settings `fly` transition and JS smooth scroll (`EventTimeGrid.svelte:233`, `PropertiesPanel.svelte:69`).

**Size:** S

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus `bash scripts/e2e.sh focus-ring.spec.ts`.

- [x] Failing test first (new `src/tests/lib/focus-ring-styles.test.ts`, a source scan in the style of `chrome-type-scale.test.ts`): `button.svelte`, `dialog-content.svelte` and `app.css` contain no `ring-ring/NN` or `ring-destructive/NN` on a `focus-visible:` variant, no `focus:ring`, and no `outline-ring/NN` in the base layer. Its self-test: `focus-visible:ring-ring/50` and `dark:focus-visible:ring-destructive/40` match; `focus-visible:ring-ring`, `ring-offset-2` and `aria-invalid:ring-destructive/20` do not.
- [x] The dialog close button's class has `focus-visible:ring-2` and no `focus:ring-2` (extend `src/tests/lib/components/ui/dialog/dialog-content.test.ts`).
- [x] Failing test first (new `src/tests/lib/reduced-motion-css.test.ts`): `app.css` has an unlayered `prefers-reduced-motion: reduce` block that names `.animate-pulse` and `.animate-spin`.
- [x] `e2e/specs/focus-ring.spec.ts`: the raw-button probe (`:49`) and `ringToken()` (`:173`) move to `var(--ring)` at full strength on purpose; the folder-row checks (`:84,:92`) keep a 50% probe under its own name because `FilesNavigator.svelte` still uses `ring-ring/50`; the first test (`:10-35`, a dialog focused as a whole) stays green.
- [x] If a spec can reach the Rail busy dot (`Rail.svelte:399`) or a spinner, `page.emulateMedia({ reducedMotion: 'reduce' })` gives `animation-name: none` for the dot and the slowed duration for the spinner; otherwise the commit body records a macOS Reduce motion check. A source scan proves the rule exists, not that it applies.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P23.** "Add one `--focus-ring` token at 100% opacity ... Replace the `/50` and `/20` rings and the `focus:` variants." Validation: keep, the token is S and the call-site sweep is closer to M. Taken: the Button, the dialog close button and the base outline; `ring` is the theme primary lifted to 4.5:1 on the editor (`theme-builder.logic.ts:186,237`), so full opacity needs no new token.
- **P171.** "A base `prefers-reduced-motion` CSS block for spin, pulse and smooth scroll." Taken: spin and pulse. Svelte transitions and smooth scroll are not taken.

## Problem

`ring/50` measures 1.9 to 2.6:1 on borderless targets and the destructive `/20` ring 1.2 to 1.3:1, so keyboard focus on ghost and default buttons is hard to see. The dialog close button uses `focus:`, so it rings the moment a dialog opens. The only reduced-motion rule is in `EventCalendarView`, so pulses and spinners ignore the OS setting.

## Evidence

Checked at 085b23c5d.

- `button.svelte:7` base classes, `:12` destructive; `dialog-content.svelte:38` close button; `app.css:495` `outline-ring/50` in `@layer base` (opens at `:493`).
- `prefers-reduced-motion` appears once in `src` (`EventCalendarView.svelte:284`); `animate-spin` and `animate-pulse` appear in about a dozen components (`Rail.svelte:399` is the pulse). No test or E2E depends on animation timing, and Playwright's default is `no-preference`.
- Inputs, selects and switches already draw a full-opacity `focus-visible:border-ring` (`input.svelte:29,44`, `select-trigger.svelte:22`, `switch.svelte:18`); the borderless case is the Button, where `border-ring` paints nothing on ghost and default variants.
- `focus-ring.spec.ts:49` (raw-button probe), `:84,:92` (folder rows), `:169-177` (`ringToken()`).

## Sequence with

- 40 (Default theme: darker tab strip) is blocked by this ticket and edits `app.css`; one at a time.
- shell-sidebars-ux 34 (pane band utility) adds an `@utility pane-band` near `app.css:151`; it is not in the shared-file list, so rebase, never run in parallel.
- tasks-view-ux owns the ring sites in `TasksView.svelte` and `TaskLists.svelte`; mvp-claude owns `AppShell.svelte` and `SettingsPanel.svelte`. Pins on `ring-ring/50` in their tests stay green because those files are outside this scan.
- 23 (File History) opens the dialog that `focus-ring.spec.ts:10-35` uses; the spec relies only on the "File History: Welcome.md" heading and one focused element.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 20.1 (old 10.1) reduced-motion treatment: spinners slow to 1.5 s, pulses stop; flip in review if wanted.

- 2026-11-18, branch `issue/20-keyboard-focus-shows-at-full-strength`: focus-visible rings use the full-strength `--ring` token (button, dialog content and close button, base `outline-ring`); an unlayered `prefers-reduced-motion: reduce` block stops `.animate-pulse` and slows `.animate-spin`; E2E focus-ring and Reduce motion specs updated. Review round 1 APPROVED (fixes: reduced-motion test doc comment points at the vault-mods E2E test; `topLevelBlocks` notes its quoted-string/`url()` limit; E2E pointer corrected), round 2 APPROVED with no findings. Tests: `pnpm check` exit 0; targeted vitest files exit 0; full suite at fedf78512: 659 files, 17609 passed, 56 skipped, 1 todo, exit=0.
