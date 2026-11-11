VERDICT: APPROVED

Re-review round 2 of the fixes after `323bc24a5` (the commit that added `review.md`): `git diff 323bc24a5..HEAD` is a16fb6745 only, which changes three help docs and the review's "## Resolution". No source or test file changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `src/lib/app/lifecycle/app-lifecycle.service.ts:519` starts `executePendingAction()`, and the `setTimeout` at `:531-546` starts `autoOpenDailyNote()` and `startModsHost(vaultPath)` in the same timer. The new bullet in `07-events-and-reactivity.md:433` and the table row at `:454` say notes created while the vault opens are usually missed and that mods should check in `onload`; `28-mods.md:201` and `13-api-reference.md:110` say the same. "Usually" fits a race whose outcome depends on IO timing. Docs only, no lifecycle change, as the finding asked. |
| 2 | minor | resolved | `deep-link.service.ts:270-286` (prepend) and `:288-304` (append) fall through to the create branch when the file is missing; without `silent` that reaches `openOrCreateNote` at `:338-344`, which reports. With `silent` it takes the silent write at `:324-336`, covered by the "`silent` or `overwrite`" row. The row at `07-events-and-reactivity.md:446` now matches the code. |
| 3 | minor | rejection stands | `help/examples/mods/kokobrain-mod.d.ts` must match the mod-core contract (`src/tests/help/mods-types.test.ts`), so it cannot change in this repo. Deferred to a mods-repo follow-up for the main session to file. |
| 4 | nit | rejection stands | The `onNoteSaved` table row is existing text outside this Issue's diff; deferral to a follow-up is what the finding proposed. |
| 5 | nit | rejection stands | Process note about Issue checklists; nothing to change on the branch. |

## Acceptance criteria

## Notes on criteria

The Issue file has no `- [ ]` checklist, and `review.md` marks no criterion not met, so the checklist above is empty. The fixes touch only the "Docs state which creators are covered" shape item, which is still met: the three docs agree on the covered creators and now also on the vault-open case.

## Findings

1. **nit**, `.scratch/mods-power/work/08/review-2.md`: `relay review-lint` exits 1 with `relay: no acceptance criteria in .scratch/mods-power/issues/08-on-note-created.md`, because the Issue has no acceptance-criteria checklist (same cause as round 1 finding 5). Fix: none on this branch; deliver notes it.

## Checks run by the reviewer

- `pnpm check`: exit 0 (0 errors, 0 warnings).
- `pnpm vitest run src/tests/scripts/sync-wiki-docs.test.ts src/tests/help/mods-example.test.ts src/tests/help/mods-types.test.ts src/tests/lib/plugins/mods/mod-note-created.test.ts`: exit 0, 4 files, 33 tests passed. The full suite is deliver's to run.
- Regressions and scope: the fix commit changes only the three help docs named in findings 1 and 2 plus the review's Resolution. No test weakened or deleted, no layer baseline change, no em-dashes in the new text.
