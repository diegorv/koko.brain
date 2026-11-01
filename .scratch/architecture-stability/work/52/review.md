VERDICT: APPROVED

## Acceptance criteria

- [met] No `queryjs-features/…` or `templates/…` key remains in `NO_EXAMPLE_DATA` — `src/tests/help/queryjs-contract.test.ts:108-117` now holds only the four `triada/` entries, which the Issue puts out of scope. The diff removes 27 keys: 15 `queryjs-features/__system/queryjs/*` scripts, `dashboard.md` #3/#4/#7, and 9 `templates/*` blocks. That matches the Issue's "27 runs".
- [met] Each of those runs has a snapshot that differs from its empty-vault run — Once a run is off the lists, it takes the `else expect(result.text).not.toBe(empty.text)` branch (`queryjs-contract.test.ts`, the `describe.each` body). `pnpm vitest run src/tests/help/queryjs-contract.test.ts` passes. The regenerated snapshots show real data, not a different empty message: the radar datasets for W7, February and Q1 2026 with averages tables, the project cards and progress bars (60 / 10), the `#to-list` task groups (the 7-day window keeps only `daily-2026-02-14`), the shortlist meeting links, and the One on One row in the Daily template's meeting list. Nothing is reported obsolete.

## Checks run by the reviewer

- `pnpm check`: exit 0 (212 files, 0 errors, 0 warnings).
- `pnpm vitest run src/tests/help src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts`: exit 0, 8 files, 271 tests. My test verdict rests on these: `queryjs-contract.test.ts` and `queryjs-features-scoping.test.ts`, which the diff changes; `examples-scoping`, `queryjs-globals`, `templates-script-paths` and `type-definitions-views`, which read `help/examples`; and `pipeline-dom` and `invariants-harness`, which also read help/examples. I did not run the full suite or `pnpm build`; deliver runs them. Nothing under `src-tauri/` changed, so cargo test does not apply.
- Scope: the diff touches only `help/examples/queryjs-features/` data and scripts, two test files plus the snapshot, and `work/52/discovery.md`. There is no app code (no Test-Exempt needed), no `ledger.md` edit and no layer-baseline change. The worktree is clean.
- Script-vs-note decision: fixing the scripts (`type/project`, `type/meeting`) matches the other example queries (`meeting-list.js:14` uses `whereTag('type/meeting')`). The `queryjs-features-scoping.test.ts` change adds `type/project` to the decoy notes. This keeps the scoping test meaningful: without it, the project scripts would render their empty message and the "inside-note" assertion would fail. It does not weaken the test.

## Findings

1. minor — `help/examples/queryjs-features/__system/queryjs/vault-overview-cards.js:7-8`: the script has the same `whereTag('project')` / `whereTag('meeting')` mismatch. The regenerated snapshot for `dashboard.md #1` and `vault-overview-cards` still pins "0 Projects / 0 Meetings", while `dashboard.md #3` on the same page lists two projects. It was not on the Issue's list (its other counts already differ from the empty run), so it does not block. Fix: open a follow-up Issue to switch these two calls to `type/project` / `type/meeting` and regenerate the snapshot.
2. nit — `src/tests/help/queryjs-contract.test.ts:177-184`: `TEMPLATE_VARIABLES` copies the output of `buildOneOnOneVariables` by hand. The comment says it mirrors that function, but a rename there would not reach this test. Fix: optionally build it with `buildOneOnOneVariables(dayjs('2026-02-15T10:00:00'), 'Ana', settings)`, using a periodic setting with folder `''` and daily format `'[Daily Note]'`, so the test follows the real variable names.
3. nit — `help/examples/queryjs-features/project-garden.md:21`: the `#to-list` heading tag also becomes a page tag. The project card subtitle now reads "area/pessoal · to-list" (`project-status-cards` snapshot). This is harmless and matches what a real vault would show. Fix: none required; optionally filter `to-list` in the subtitle or accept it.

## Resolution

1. Fixed in this Issue instead of a follow-up: the change is two calls and one snapshot pair. `vault-overview-cards.js:7-8` now uses `whereTag('type/project')` / `whereTag('type/meeting')`; `dashboard.md #1` and `vault-overview-cards` snapshots now read "2 Projects / 3 Meetings".
2. Fixed: `TEMPLATE_VARIABLES` is built with `buildOneOnOneVariables(dayjs('2026-02-15T10:00:00'), 'Ana', …)` with folder `''` and daily format `'[Daily Note]'`. The One on One and Daily template snapshots did not change.
3. Rejected (no change): the reviewer marks it as needing no fix. A heading tag counting as a page tag is how the app indexes tags, so the subtitle shows what a real vault shows; filtering `to-list` in the script would be example-specific special-casing.
