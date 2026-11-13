VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a new case in `e2e/specs/settings.spec.ts` opens Settings (`Mod+Comma`), reads the bounding boxes of `[role="dialog"][aria-label="Settings"]` and `[data-status-bar]`, and asserts the dialog's bottom edge is at or above the status bar's top edge (within 0.5px). Run it on the current code (with only the `data-status-bar` attribute added) and see it fail by about 8px — `e2e/specs/settings.spec.ts:11-23` opens Settings with `pressShortcut(page, 'Mod+Comma')`, reads both bounding boxes and asserts `panelBox.y + panelBox.height <= barBox.y + 0.5`. The rebased test-only commit d4570c45a changes only the spec and adds `data-status-bar` to `StatusBar.svelte` (checked with `git diff main --stat -- src e2e` at that commit). I checked it out detached and ran `bash scripts/e2e.sh e2e/specs/settings.spec.ts`: exit 1, 1 failed / 4 passed, `Expected: <= 688.5`, `Received: 696` (8px over).
- [met] After the change the case passes and the rest of `settings.spec.ts` stays green — on branch HEAD 94cca9e26, `bash scripts/e2e.sh e2e/specs/settings.spec.ts` gave exit 0, 5 passed (the new case at line 11 included).
- [met] The status bar still renders 32px tall (no visual change to it) — `--status-bar-height: 2rem` (`src/app.css:187`) and `StatusBar.svelte:9` uses `h-(--status-bar-height)`. No code in `src/` sets a root font-size (the only `html` rule, `src/app.css:423`, sets height only), and the inline root variables set by `theme.service.ts:16` / `settings.service.ts:281` never include `--status-bar-height` (a grep for it finds only `app.css:187` and the two components). The E2E case asserts `barBox.height` toBeCloseTo(32, 0), and it passed on HEAD.
- [met] No other `24px` or `32px` literal for the status bar remains in `SettingsPanel.svelte` or `StatusBar.svelte` — `grep -nE "24px|32px|h-\[|h-8|bottom-6"` over both files finds nothing (exit 1). `SettingsPanel.svelte:116` now reads `bottom: var(--status-bar-height); width: 820px; max-width: 80vw;`, so width and max-width are unchanged as the Issue asks.

## Findings

None. I looked for, and did not find:

- A second `[data-status-bar]` element (Playwright strict mode would throw): `StatusBar` is mounted once, at `src/lib/app/AppShell.svelte:297`.
- A theme or preset overriding the variable, or a root font-size change that would move `2rem` off 32px (see the third criterion).
- Tailwind support for the `h-(--var)` shorthand: the project is on Tailwind `^4.3.3` (`package.json:103`), the form is already used in `components/ui/select/select-content.svelte:38`, and the E2E case measured the bar at 32px with the class applied.
- Scope creep: the diff touches `src/app.css`, the two components, the E2E spec and the work records only. No import edge is added, `layer-baseline.json`, `BASELINE_SIZE` and the composition roots are untouched, nothing under `src-tauri/` changed, and the new lines use tabs.
- The earlier review's two nits are resolved on HEAD: the case now also asserts `>= barBox.y - 0.5` (`e2e/specs/settings.spec.ts:21`), and the `app.css:186` comment describes the value instead of naming its readers.

## Checks run by the reviewer

- Typecheck: `taskpolicy -c background pnpm check`: exit 0, 216 files, 0 errors, 0 warnings.
- Vitest, 10 files, exit 0, 98 tests passed: `src/tests/lib/app/SettingsPanel.test.ts`, `src/tests/lib/core/settings/settings-headings.test.ts`, the app.css-parsing tests (`radius-scale`, `chrome-type-scale`, `core/settings/theme-css-contract`, `features/event-calendar/event-color-tokens`, `features/properties/PropertyField`, `utils/font-stacks`, `utils/text-roles`) and `architecture/layer-rules`.
- E2E: `e2e/specs/settings.spec.ts` red on d4570c45a (1 failed, 8px over) and green on 94cca9e26 (5 passed).
- My test verdict rests on: the E2E spec `e2e/specs/settings.spec.ts` (the only test of the layout, since jsdom computes no layout) and the ten vitest files above. `StatusBar.svelte` has no unit test file.
- The full suite (`pnpm vitest run` + `pnpm build`) is deliver's to run and was not run here.
