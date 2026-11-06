VERDICT: APPROVED

Review of `git diff main...HEAD` on `issue/14-ctx-ui-dialogs` (6 commits, 3c7865b13..cd6a6b921).

## Acceptance criteria

- [met] Failing tests first: — every sub-item has a test in the branch (evidence for each in the next section), and all of them pass in this review's run. The builder says the token freeze test failed against the old `app.css`. The red runs of the other tests can only be taken from the build report.

## Evidence per sub-item

- Dialog store: queue order, one open at a time, settle values per kind, closing every dialog of one mod at its unload. — `src/tests/lib/plugins/mods/mod-dialogs.store.test.ts`: "shows one dialog at a time; the others wait in call order" (:33), "answering the current dialog settles it and shows the next one" (:42), the four "dismiss settles with the cancel value of each kind" cases (:60-84), and "closeForMod settles every open and queued dialog of that mod as cancelled and keeps the others'" (:106). The `current` and `dialogs` getters are asserted throughout.
- `ModDialogHost` component tests: alert dismiss; confirm Enter / Esc / buttons and `destructive` styling; prompt single line (Enter, Esc gives `null`, IME Enter ignored) and multiline (Cmd+Enter); loading shows the label and closes when the task settles, Cancel aborts the signal; the mod name caption. — `src/tests/lib/plugins/mods/ModDialogHost.test.ts`: alert OK and Esc (:108, :119); confirm Enter, Enter in the body, Enter on Cancel, Esc, buttons, destructive and default styling (:138-195); prompt Enter, Esc gives null, Cancel/OK, IME Enter (:199-244); multiline Enter vs Cmd+Enter, including Cmd+Enter during composition (:246); loading label and spinner, no close button, Esc ignored, closes on resolve and on reject, Cancel aborts (:277-325); caption (:97). Also covered: the queue (:328) and stacking over the picker's run view (:346).
- `ctx.theme`: `current` returns every contract token with the value set on the document element and the right `mode`; `onChange` fires after a theme change with the new values, its disposer and unload stop it, a throwing callback does not stop another mod's. — `src/tests/lib/plugins/mods/mod-theme.test.ts`: current with all 20 tokens set on `document.documentElement` and mode light (:130) and dark (:141); onChange after `applyTheme(LAVENDER_HAZE_THEME)` with the new popover and primary values, not at subscription (:146); the disposer (:162); unloading alpha leaves beta firing (:174); a throwing callback goes to `debug('MOD:alpha', ...)` and beta still fires (:187).
- Token freeze test against `src/app.css`. — `mod-theme.test.ts:118` pins `MOD_THEME_TOKENS` to the 20-entry list. `:122` checks each variable in the `:root` and `.dark` blocks of `src/app.css`. `src/app.css:149` and `:210` add `--card-foreground`, with the same values as `--popover-foreground` in each block.
- Host: a mod unloaded with a confirm open resolves it `false` and leaves no dialog; `ctx.ui` and `ctx.theme` calls after stop throw; argument validation messages. — `src/tests/lib/plugins/mods/mods-host.service.test.ts`, `describe('ctx.ui')`: "a mod unloaded with a confirm open resolves it false and leaves no dialog of its own", "every ctx.ui call rejects after stop" (with `Mod "alpha" is unloaded`), "ctx.theme throws after stop", and "bad arguments reject with the mod id and open no dialog" (title, confirmLabel, value, label and task messages). `ctx.ui` rejects where the Issue says "throw"; see finding 2.
- Contract freeze test updated. — `src/tests/lib/plugins/mods/mod-api-contract.test.ts`: `ui` and `theme` in `CONTEXT_PUBLIC`, plus `satisfies` maps for `ModUiV1`, the four option types, `ModThemeV1`, `ModThemeStateV1` and `ModThemeColorsV1`, and runtime key checks on a real `ctx.ui`, `ctx.theme` and `ctx.theme.current.colors`.
- E2E: a mod action that confirms, prompts for a title and creates a note with it; assert the dialogs' text and the created note. — `e2e/specs/vault-mods.spec.ts`, "a mod action confirms, prompts for a title and creates a note with it". It checks the confirm's caption, title, confirm label and focus, presses Enter, then checks the prompt's caption, label and placeholder. After it fills and submits the title, it checks the editor text and the fs dump `# Moonshot\n`. This review ran `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: 10 passed.

## Findings

1. **minor** `src/lib/plugins/mods/mod-theme.svelte.ts:48-60`: `watchModTheme` drops the effect's first run with a `first` flag. That first run happens at the next flush, not when the mod subscribes. So a theme change between `onChange(cb)` and that flush is taken as the baseline and never reported. A probe proves it: `watchModTheme(cb); appliedThemeStore.bumpRevision(); flushSync();` calls `cb` 0 times, where 1 is expected (a temporary test file, deleted afterwards). The docs' own pattern `paint(ctx.theme.current); ctx.theme.onChange(paint)` then stays on the old colors until the next theme change. Today the risk is small, because `applyLoadedSettings` runs before `startModsHost` (`app-lifecycle.service.ts:535` runs in a `setTimeout`). Fix: when subscribing, read `revision` and `isDark` untracked, and call `onChange` when the effect sees different values (instead of skipping the first run). Add the probe above as a test.
2. **nit** `src/lib/plugins/mods/mods-host.service.ts:130-174`: the `ctx.ui` functions are `async`, so bad arguments and calls after unload reject instead of throwing synchronously. The Issue says "throw" and compares them to `addAction`, which throws synchronously. This matches `ctx.vault`, `discovery.md` records it, and `28-mods.md` says "reject". A mod that calls without `await` gets an unhandled rejection instead of an exception. No code change is needed. The Issue text could be noted as resolved this way.
3. **nit** `src/app.css:149,210` / `src/lib/core/settings/theme.types.ts`: themes cannot set `cardForeground` (`UIColors` has no key for it). So `ctx.theme.current.colors.cardForeground` and `var(--card-foreground)` always use the stylesheet's light or dark default, even under a custom theme. `26-theming.md` says so. Possible follow-up: add `cardForeground` to the theme types.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/mods src/tests/lib/app/AppOverlays.test.ts src/tests/help/mods-example.test.ts src/tests/lib/architecture`: 26 files, 411 tests, all pass. This covers every test file the diff adds or changes, plus the layer rules (the baseline is untouched and BASELINE_SIZE is not raised).
- The tests that read `src/app.css` or the theme service: `radius-scale`, `chrome-type-scale`, `pane-toolbar`, `settings-text`, `theme-css-contract`, `PropertyField`, `text-roles`, `font-stacks`, `event-color-tokens`, `theme.service`. 10 files, 121 tests, all pass.
- `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`: 10 passed.
- The full `pnpm vitest run` and `pnpm build` were not run: deliver runs them.

## Scope and spec

- No scope creep. Every changed file is one the Issue names (the contract, the store, the host, `ModDialogHost`, `AppOverlays`, `app.css`, `28-mods.md`, `26-theming.md`, tests, E2E) or the Issue's work record.
- Owner decision: there are only the four dialogs, with no `modal` or `form` API. The esbuild IIFE recipe matches the loader: `EXPORT_DEFAULT` in `mods.logic.ts:141` rewrites the footer line `export default __mod.default;`.
- Adding `--card-foreground` changes no existing UI: no `--color-card-foreground` mapping exists in `@theme`, and nothing outside the mods contract reads the variable.
- Not verified: the dialogs in the real Tauri app (focus restore after closing over the run view, Esc layering). This review saw them only through jsdom and Playwright.

## Resolution

1. Fixed. `watchModTheme` reads `revision` and `isDark` untracked at subscription and calls `onChange` only when the effect sees different values, so a change before the first flush is reported. Test: `mod-theme.test.ts` "onChange reports a theme change made after subscribing but before the next flush" (fails on the old code).
2. No code change, as the review says: `ctx.ui` rejects like `ctx.vault`; `discovery.md` and `28-mods.md` record it.
3. Not changed in this Issue: adding `cardForeground` to the theme types is outside its scope, and `26-theming.md` documents the current behavior. Left as a possible follow-up.
