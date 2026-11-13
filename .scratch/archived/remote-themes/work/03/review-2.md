VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `parseThemeCatalog` (`src/lib/core/settings/theme-package.logic.ts:152-168`) keeps a `seenIds` set across both `package` and `too-new` entries and pushes `<id>: duplicate id` for later ones. `theme-package.logic.test.ts` "keeps the first entry of an id and skips later ones, too-new entries included" covers package-after-package and too-new-after-package; `AppearanceSection.test.ts` "skips an entry that repeats an id and still renders the rest" mounts the section with duplicates and asserts 2 rendered rows. Both pass. |
| 2 | minor | resolved | `fetchThemeCatalog` (`theme-catalog.service.ts:20-36`) races `readCatalog(signal)` against a 15 s timer that aborts the controller and rejects; `clearTimeout` in `finally`. The race attaches a handler to the losing `readCatalog` promise, so its later AbortError is not an unhandled rejection. Service tests cover a stalled request (signal aborted) and a stalled body. The component's existing catch turns the rejection into the error state with Retry. |
| 3 | minor | resolved | Both the per-entry skip log (`theme-catalog.service.ts:43`) and the load-failure log (`AppearanceSection.svelte:46`) use `debug()`. The service test asserts the reason reaches `console.log` under debug mode and that neither `console.error` nor `captureSentryException` (the import `debug.ts:5` uses) is called; the component error-state test asserts `console.error` is not called. |
| 4 | minor (optional) | rejection stands | `loadAppearance` (`theme-package.logic.ts:231-244`) maps over `base.themes` so an installed theme keeps its list position, and a saved package that fails `parseThemePackage` is dropped while its saved colors remain in `themes` as a user theme. Removing the copy would lose both. The trade-off is now stated in ADR-0035 Consequences. |
| 5 | nit | resolved | JSDoc on `catalogEntries` at `AppearanceSection.svelte:33`. |
| 6 | nit | resolved | ADR-0035 Decision names `KokoBrain Default` and `Lavender Haze`. |

## Acceptance criteria re-checked

- [met] Every package from the index is validated (schemaVersion known, slug id, semver version, palette and overrides through Issue 01's validator); an invalid entry is skipped and logged, the rest of the catalog still shows. A `schemaVersion` above the app's shows the entry as "Requires a newer KokoBrain" with no Install button. — Field checks unchanged in `parseThemePackage`; a duplicate id is now skipped with a reason instead of crashing the keyed each (`theme-package.logic.ts:152-168`, component test renders the remaining rows including the too-new one with "Requires a newer KokoBrain"); skipped reasons are logged via `debug()` (service test). The full suite is deliver's to run.
- [met] Tests: catalog service with only the HTTP plugin mocked (happy path, network error, invalid JSON, invalid entry skipped, too-new schemaVersion), the appearance store state after install / uninstall / reload, and a component test that asserts the rendered catalog states (Install, Installed, Built-in, error). — `theme-catalog.service.test.ts` still has all five cases plus timeout cases; its added `sentry.service.js` mock only lets the test assert Sentry is not called (a side-effect service, allowed by docs/TESTING.md), the HTTP plugin remains the only boundary mocked for behavior. No test was weakened: the invalid-entry test now asserts more (debug log, no console.error, no Sentry). `AppearanceSection.test.ts` still asserts Install, Installed, Built-in, too-new and error states. Targeted run passed; the full suite is deliver's to run.
- [met] An ADR records the decision: themes besides the two built-ins come from the public repo, the package format and its `schemaVersion`, why the source palette is stored instead of expanded tokens, and the trust boundary (color-only values, scoped HTTP permission). — `docs/adr/0035-remote-theme-catalog.md` Decision now names the two built-ins; Consequences explains the expanded copy.
- [met] Installed themes are stored as packages (source, not expanded colors) and built with the theme builder when the appearance settings load, so a token added to the app later is derived for them. — Unchanged by the fixes; `loadAppearance` still rebuilds from `installed` and discards the saved colors under that name; the retained expanded copy is a documented fallback (finding 4).

## Findings

No open or new findings.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/settings/ src/tests/lib/architecture/`: exit 0, 33 files, 584 tests passed.
- `git diff 19169983..HEAD` outside `.scratch` touches only the theme catalog service, `theme-package.logic.ts`, `AppearanceSection.svelte`, their tests and ADR-0035: no scope creep, no baseline entry, `BASELINE_SIZE` unchanged, no composition root.
- Not run: the full suite, `pnpm build` and `cargo test` (src-tauri/ unchanged by the fixes; deliver runs the suite). The timeout is verified only against the mocked plugin, not a real stalled connection.
