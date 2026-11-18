VERDICT: APPROVED

Reviewed `git diff main...HEAD` (dfb32cd47, 7cbe9f6d2, fb17c7964) in the worktree. Source change is confined to `src/routes/composer/+page.svelte`, test change to `src/tests/routes/composer-page.test.ts`, as the Issue asks.

## Acceptance criteria

- [met] Failing test first, `src/tests/routes/composer-page.test.ts`: the default hint is `Esc hides (draft kept) · ⌘↩ saves` and neither error hint contains "cancels". The pins at `:107-108` (`ERROR_TEXT`, `UNKNOWN_TEXT`), `:271` and `:429` are updated on purpose to the new strings. — `DEFAULT_HINT`/`ERROR_TEXT`/`UNKNOWN_TEXT` at test `:107-109` carry the exact Issue strings; old pins at `:271`/`:429` now use `DEFAULT_HINT` (`:377`, `:535`); new tests "says Esc hides and keeps the draft" (`:234`) and "does not say cancels in either error hint" (`:239`, covers the throw path and the 3 s timeout path). Page `:252`, `:254`, `:258` match the Issue copy character for character; the comment at `:137-138` is reworded. Test-first order is visible in the commit split (copy commit then Saving commit, each with its tests); I did not replay the red runs.
- [met] With `mockSubmit('silent')` (no result arrives), after Cmd+Enter the hint reads `Saving...`; after `resultHandler()` reports `ok: true` it no longer reads "Saving..." during the flash; after a failed or unconfirmed result it reads the matching error hint, and a retry shows "Saving..." again. — Tests at `:257` (Saving..., then default hint while `.saved` is on), `:283` (`ok: false` result → `ERROR_TEXT`, retry → `Saving...`, no alert), `:300` (timeout → `UNKNOWN_TEXT`, retry → `Saving...`). Page `:255` `{:else if saving && !saved}` after both error branches. My mutation probes: condition changed to `saving` fails the `:257` test; `saving` reverted to a plain `let` also fails it. File restored, worktree clean.
- [met] Mount or summon with a stored draft behaves as today: no "Draft restored" text, no Discard button (a guard against scope creep into ticket 45), and `SAVE_FLASH_MS` is still 180 (the saved-flash tests at `:321-351` stay unchanged and green). — Test at `:318` covers mount and Esc + summon with a stored draft: text restored, no "Draft restored", no "Discard", no `button`, default hint. `SAVE_FLASH_MS = 180` unchanged at page `:12`; the diff does not touch the saved-flash tests, and the `:257` test pins no dismiss at 179 ms and dismiss at 180 ms. No draft, Discard or hold code in the diff.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` in the worktree: exit 0, 0 errors, 0 warnings. `pnpm vitest run src/tests/routes/composer-page.test.ts`: exit 0, 37/37 passed. The full suite is deliver's to run.

## Findings

1. nit, `src/routes/composer/+page.svelte:256`: "Saving..." is a plain `.hint` with no live region, so a screen reader hears nothing while a save waits (the error hints are `role="alert"`). The Issue names no role, and discovery.md records this as a deliberate default. No change needed for this Issue. If wanted later, `aria-live="polite"` on the hint container would announce it without the noise of an alert.
2. nit, `src/tests/routes/composer-page.test.ts`: no test pins that a summon while a save still waits shows the default hint rather than "Saving..." (`resetForShow` clears `saving` at page `:183`). The logic did not change and the path is correct by reading, so this is only a coverage gap. Optional: assert `hint().textContent` is `DEFAULT_HINT` after `summon()` in the existing late-reject test.

## Checks run by this review

- Typecheck: `pnpm check`, exit 0.
- Tests: `src/tests/routes/composer-page.test.ts` (the only test file of the changed page, and the only file that pins the changed strings; repo search of src, e2e, help, docs and src-tauri/src found no other pin). My test verdict rests on this file only.
- Mutation probes (temporary, reverted with `git checkout`): `saving && !saved` → `saving`, and `$state(false)` → plain `false`. Both make the `:257` test fail.
- Scope: no Rust, DTO, store, draft key, `withoutWritten`, Esc or Cmd+Enter change; no layer-baseline or composition-root change.
- Correctness by reading: `saved = false` (`:146`) and `saving = false` (`:151`) run in the same task with no await between them, so no "Saving..." frame shows after the flash. A retry clears `saveProblem` (`:104`) before `saving = true` (`:111`). Empty-text dismiss never sets `saving`.

## Resolution

1. Rejected for this Issue: the reviewer agrees no change is needed. discovery.md records the plain hint as a deliberate default and the Issue names no role; `aria-live="polite"` stays a possible later change.
2. Fixed: the late-reject test in `src/tests/routes/composer-page.test.ts` now asserts the hint reads `Saving...` while the first save waits and `DEFAULT_HINT` right after `summon()`. File passes 37/37; `pnpm check` exit 0.
