# Issue 20 discovery: full-strength focus ring, reduced-motion spin and pulse

No `spec.md` in `.scratch/ux-quick-wins/` (README.md only); the Issue file is the spec.

## Files that change

- `src/lib/components/ui/button/button.svelte:7` base: `focus-visible:ring-ring/50` and `focus-visible:ring-[3px]` become `focus-visible:ring-2 focus-visible:ring-ring`; `:12` destructive: `focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40` become `focus-visible:ring-destructive`. `aria-invalid:*` classes stay.
- `src/lib/components/ui/dialog/dialog-content.svelte:38` close button: `focus:ring-ring`, `focus:ring-2` become `focus-visible:ring-ring`, `focus-visible:ring-2`; `ring-offset-background`, `focus:ring-offset-2`, `focus:outline-hidden` stay.
- `src/app.css:495` base `outline-ring/50` becomes `outline-ring`; one unlayered `@media (prefers-reduced-motion: reduce)` block after the `@layer base` block (ends `:509`): `.animate-pulse { animation: none; }`, `.animate-spin { animation-duration: 1.5s; }`.
- `e2e/specs/focus-ring.spec.ts`: `ringToken()` (`:169-177`) resolves `var(--ring)` at full strength and the raw-button test (`:47-57`) uses it; a new `halfRingToken()` keeps the 50% probe for the folder-row checks (`:83-90`), because `FilesNavigator.svelte` still uses `ring-ring/50`.
- `e2e/specs/vault-mods.spec.ts`: the hello mod gains a `wait` action that holds a `ctx.ui.loading` dialog, so one test reaches the real Rail busy dot and the loading-dialog spinner (`ModDialogHost.svelte:112`). Under `page.emulateMedia({ reducedMotion: 'reduce' })` the dot computes `animation-name: none` and the spinner `spin 1.5s`; under `no-preference` first they read `pulse` / `spin 1s` (precondition, so the test cannot pass with no rule).

## Tests (test-first)

- New `src/tests/lib/focus-ring-styles.test.ts`, a source scan in the style of `src/tests/lib/chrome-type-scale.test.ts`: the three files hold no faint `focus-visible:` ring (`ring-ring/NN`, `ring-destructive/NN`), no `focus:ring-<width|colour>`, and no `outline-ring/NN` inside `@layer base`. Self-test of the faint-ring regex per the Issue's examples.
- `src/tests/lib/components/ui/dialog/dialog-content.test.ts`: the close button's classList has `focus-visible:ring-2`, `focus-visible:ring-ring` and no `focus:ring-2` / `focus:ring-ring`.
- New `src/tests/lib/reduced-motion-css.test.ts`: `app.css` has a `@media (prefers-reduced-motion: reduce)` block at brace depth 0 (not inside any `@layer`) whose body names `.animate-pulse` and `.animate-spin`.

## Risks

- The Rail busy dot (`Rail.svelte:399`) shows only while a vault mod action runs; `vault-mods.spec.ts` already runs mods, so the test lives there. It proves the rule in Chromium for those two sites; the other spinners use the same unprefixed `animate-spin` class (grep), and macOS WebKit was not checked by hand.
- Other tests pinning `ring-ring/50` (`AppShell.test.ts`, `Rail.test.ts`, `TasksView.test.ts`, `MyPeopleSection.test.ts`) read feature files outside this change; grep for `ring-[3px]`, `focus:ring-2`, `ring-ring/50` and `outline-ring/50` in `src/tests` to find any pin on the changed primitives.
- Two ring strengths in the app until the feature-site sweep (Issue item 5); stated in the commit body.

## Defaults taken

- "No `focus:ring`" reads as `focus:ring-<width or colour>`: `focus:ring-offset-2` stays, as the Issue keeps the close button's offset classes and its self-test says `ring-offset-2` does not match.
- Reduced motion: spinners slow to 1.5 s, pulses stop (Issue default 20.1).
