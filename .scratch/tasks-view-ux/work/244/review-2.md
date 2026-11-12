VERDICT: APPROVED

# Re-review (round 2): Issue 244

Fix diff reviewed: `git diff cb0ed15f5..HEAD` (6d5e443a7, fdc40bcbb, bc1858a42). Only `tasks.service.test.ts`, the `vault.store.svelte.ts` JSDoc and the review file changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | major | resolved | The fake checks `unchangedNext` before its stale comparison and answers `{ stale: false, updateResult: unchanged }` (`tasks.service.test.ts:1150`); `beforeEach` resets it (1180). The "an unchanged result" case sets it (1222) and still asserts `requestedAtCall === true` and `takePromptIndexRefresh() === false`. My own probe: changing `tasks.service.ts:245` to `if (result.stale) vaultStore.takePromptIndexRefresh();` fails exactly that case (1 failed, 78 passed); reverted with `git checkout`. The stale and thrown cases are unchanged. |
| 2 | nit | rejection stands | No change asked; the e2e spec is untouched by the fixes and the timeout sits on the first snapshot-dependent assertion. |
| 3 | nit | resolved | `vault.store.svelte.ts:38-42` rewrapped, comment only. |

## Acceptance criteria re-checked

- [met] Prompt refresh placement, without the listener: inside the `toggle_task_status` mock, record `vaultStore.takePromptIndexRefresh()` and call `vaultStore.requestPromptIndexRefresh()` again afterwards, so the probe does not consume the flag; the recorded value is `true`. In `task-toggle-dirty-buffer.test.ts`, also record the flag inside the `writeTextFile` mock (the preflight save); it is `false` there. After a `stale` result, a `changed: false` result and a thrown call, `vaultStore.takePromptIndexRefresh()` returns `false`. Asserting `takePromptIndexRefresh()` only after a successful `toggleTask` proves nothing. — The unchanged case now reaches `stale: false, changed: false`; all three clear cases pass and the mutation probe on the `changed` half of the clear fails the unchanged case. The `true` probe in the toggle mock and the dirty-buffer `false` probe are unchanged from round 1.

## Findings

None open or new. The fixes weaken no test: the removed comment described the old arrange step, and no assertion was dropped.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/tasks.service.test.ts src/tests/lib/core/vault/`: exit 0, 10 files, 162 tests passed. The full suite is left to deliver.
- Mutation probe above, reverted; worktree clean.
