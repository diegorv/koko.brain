VERDICT: APPROVED

Re-review round 2 of the fixes in 6ac22920a (`git diff caed51eaf..HEAD`): `src/lib/core/settings/sections/UpdateSection.svelte` (one line removed) and `src/tests/lib/core/settings/UpdateSection.download.test.ts` (one assertion scoped), plus the Resolution in `review.md`.

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit: unreachable `bytes <= 0 -> '?'` branch of `formatBytes` | resolved | The branch is gone (`UpdateSection.svelte:122-125`). The only caller is `:285`, inside `{#if totalBytes > 0}` (`:284`); no other file references `formatBytes`. The JSDoc above it (`:116-121`) says nothing about `?`, so it stays accurate. |
| 2 | nit: unknown-size "no ?" assertion checked the whole section | resolved | `UpdateSection.download.test.ts:131-133` now reads `bar.parentElement`, the `flex w-48 flex-col` wrapper (`UpdateSection.svelte:282`) that holds both the status span and the bar, so the "Downloading v9.9.10..." assertion still proves the row text renders and the `?` check now covers exactly that row. Not weakened: the old version would only catch a `?` in the same row plus unrelated ones. |

## Acceptance criteria re-checked

- [met] A download-progress case: `Started{contentLength: 1000}` then `Progress{chunkLength: 500}` gives a progressbar named "Download of update v<version>" with `aria-valuenow="50"`; `contentLength: null` gives no "?" and no `aria-valuenow`. — Known-size test unchanged by the fix; the unknown-size test still asserts the aria-label, no `aria-valuenow`, and no `?` in the downloading row (`UpdateSection.download.test.ts:128-133`). `pnpm vitest run` on the five UpdateSection test files: 38 tests, exit 0.
- [not met] Manual in `pnpm tauri dev`: a Settings description and the version can be selected and copied; rail and tabs cannot; the Root project row has no overlap at 1440 px. — Still not run; jsdom has no layout or selection. Needs the owner. The fixes do not touch it.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (237 files, 0 errors, 0 warnings). Targeted vitest on the test files of the changed code (`UpdateSection.download`, `.layout`, `.restart`, `.changelog`, `.channel`): exit 0. The full suite is deliver's to run.

## Findings

No open or new findings. The fixes touch only the two lines the review named; no regression, no deleted or weakened test, no scope creep, no layer-baseline change.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/core/settings/UpdateSection.download.test.ts src/tests/lib/core/settings/UpdateSection.layout.test.ts src/tests/lib/core/settings/UpdateSection.restart.test.ts src/tests/lib/core/settings/UpdateSection.changelog.test.ts src/tests/lib/core/settings/UpdateSection.channel.test.ts`: 5 files, 38 tests, exit 0.
