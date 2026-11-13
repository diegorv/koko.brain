VERDICT: APPROVED

# Re-review round 2: Issue 13, one row set for a `.view`

Fix range: `a90cf3f67..HEAD` (one commit, `91233c3f3`). It changes only `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts` (+22 lines) and the review file's `## Resolution`. No app code changed, no test removed or weakened.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | The editor's `.view` rows follow the rail's rule (entries from `typeDefinitionsStore.entries`), which the Issue's owner decision makes the reference. The reviewer marked it "no change required". Changing the rail's entries source is outside this Issue. |
| 2 | nit | resolved | The new test "orders by each VIEW_SORTS mode, not by the title fallback" (`type-sidebar.logic.test.ts:678-698`) asserts that `VIEW_SORTS` holds exactly the five modes in `expected`, and runs each through `getNotesForViewPaths` (which goes through `sortNotes` / `buildSecondaryComparator`, `type-sidebar.logic.ts:209-229`). The fixture gives three notes whose expected orders differ from the title fallback `A, B, C` for every non-title mode (B,A,C / B,C,A / C,A,B / A,C,B). So a `VIEW_SORTS` mode with no comparator case would fall to title order and fail. A mode added to `VIEW_SORTS` but not to `expected` fails the set equality. One gap remains: a comparator case added without a `VIEW_SORTS` entry is still reported as ignored. That is the safe direction, and the case is visible in the same file. |
| 3 | nit | rejection stands | `registerAppPorts()` runs at boot, before any editor mounts. The reviewer said no change was needed. |

## Acceptance criteria re-checked

- [met] A `_sort` that is not one of `modified`, `created`, `modified-asc`, `created-asc`, `title` (an unknown string or a non-string) adds an ignored-key note through Issue 10's reserved-key table and orders by the default (logic test on the helper and on `viewNavigatorRows`) — `VIEW_SORTS` / `isViewSort` / the `_sort` row in `RESERVED_KEY_RULES` (`type-sidebar.logic.ts:371-386`) are unchanged since round 1. The new test also checks that the five listed modes are exactly `VIEW_SORTS`, and that each gives its own order. `type-sidebar.logic.test.ts` passes (152 tests).

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`: exit 0, 152 passed.
- Not run: the full suite, `pnpm build` and the E2E specs. Deliver runs the suite and the build.

## Findings

None open or new.
