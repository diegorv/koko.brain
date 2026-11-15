VERDICT: APPROVED

Re-review round 2 of the fix commit acc2f3f2e (`git diff 4923b224c..HEAD`) against `.scratch/preview-channel/work/01/review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `UpdateSection.channel.test.ts` adds an `it.each` that renders a preview build set to Nightly and to Stable, clicks the "Releases page" button and asserts `openUrl` gets `.../releases/tag/nightly` and `.../releases/latest`. The handler (`UpdateSection.svelte:332`, `openUrl(RELEASES_URL[target])`) is synchronous, so the assertion after `click()` is sound. Passes. |
| 2 | minor | rejection stands | Not a code fix: `docs/RELEASE-CHANNELS.md` is outside Issue 01's Files. Issue 02 now lists it in Files and has a criterion to describe Preview and replace the one-way update rule. The deferral is tracked. |
| 3 | nit | resolved | `vite.config.js:19` now reads "only nightly and preview builds read it", which matches `resolveVersion`. |
| 4 | nit | resolved | `src/app.d.ts:7-9` use colons; `UpdateSection.svelte:19` uses a full stop. Remaining em-dashes in `UpdateSection.svelte` (lines 81, 96, 221) are on lines this branch did not add. |
| 5 | nit | resolved | `afterEach` restores `__BUILD_INFO__` to `PREVIEW_BUILD_INFO`; the in-body restore is gone. |
| 6 | nit | rejection stands | ADR wording is accurate; confirming the "Options considered" rationale is the owner's call, not a code change. |

## Acceptance criteria re-checked

- [met] `ReleaseChannel` is `'stable' | 'nightly' | 'preview'`, `updates.channel` parses `preview`, and a fresh preview build defaults to it (`getBuildChannel`). Any label helper in `app-channel.ts` covers it. — The fix only reworded the JSDoc of `src/app.d.ts`; the `'stable' | 'nightly' | 'preview'` union is unchanged. `pnpm check` exit 0.
- [met] Downgrade: the in-app downgrade appears whenever the installed build's channel ranks above the chosen one (preview > nightly > stable), with the chosen channel's name in the button and the confirm text ("Install Nightly (downgrade)" on a preview build set to Nightly; "Install Stable (downgrade)" on a preview or nightly build set to Stable), and calls `checkForUpdates({ allowDowngrades: true, forceChannel: <chosen> })`. The nightly -> stable case keeps its current text and behaviour. Component tests for the three cases and for the cases where it must not show. — The fix added Releases page tests and moved the `__BUILD_INFO__` restore into `afterEach`; no existing assertion was removed or weakened (diff adds lines only, apart from the moved restore). `UpdateSection.channel.test.ts` passes.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/core/settings/UpdateSection.channel.test.ts`, `UpdateSection.layout.test.ts`, `UpdateSection.restart.test.ts`, `UpdateSection.changelog.test.ts` (all under `src/tests/lib/core/settings/`) and `src/tests/lib/utils/build-info.test.ts`: exit 0, 69 passed. The full suite is deliver's to run.
- No regressions or scope creep: the fix touches `src/app.d.ts` (comment), `UpdateSection.svelte` (comment), the channel test file, `vite.config.js` (comment) and the workflow's own `.scratch` records. No layer baseline change.

## Findings

None open or new.
