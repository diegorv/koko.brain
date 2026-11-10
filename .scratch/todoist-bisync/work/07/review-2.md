VERDICT: APPROVED

# Issue 07 re-review, round 2

Range: `git diff 13a1e45d8..HEAD` (5064e771f, 8f4cbe4cd, 35478d253).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `pull.logic.ts:432` skips on `hasSignifier(item.content)`, checked before `assertSingleLine` and the round-trip log, so ordering inside `contentRoundTripProblem` no longer matters. `hasSignifier` (`task-line.logic.ts:338-342`) is the same regex `contentRoundTripProblem` used, now shared. Tests: `pull.logic.test.ts` "skips content holding a signifier even when another round-trip problem comes first" covers both probe cases (`Fix #12 📅 2020-01-01`, `A\n⛔ b`), asserting no insert and two `content-skipped` entries; `task-line.logic.test.ts` `hasSignifier` tests every signifier behind a `#` and a newline, plus a negative case. |
| 2 | minor | rejection stands | The criterion reads "A pending close is dropped when the remote `due` moved since the base" with no recurring qualifier, and `completion.logic.ts:173` implements exactly that. Narrowing it changes user-visible behavior against the written criterion, so it is the owner's call; the case and the one-line change are recorded in review.md "## Resolution" item 2. Not a blocker. |
| 3 | nit | resolved | `completion.logic.ts:187-189` logs `pending-dropped` when a pending command is cleared with no replacement, unless the close was dropped (already `close-dropped`) or Todoist's `checked` matches the command's effect. Traced the cases: pending close + line reopened + Todoist open logs it; pending close applied to a non-recurring item (both closed) does not; pending close applied to a recurring item (rolled, due moved) goes through `close-dropped` and is not logged twice. Test "logs a pending command cleared because the line no longer wants it". |
| 4 | nit | resolved | `planAck` (`completion.logic.ts:289`) moves `remote_base.due` only when `newDue` is written, matching `planCompletion` (`:203`). Test "leaves the remote due base alone when no 📅 is written" (non-recurring, closed, due changed: base keeps the old due, no `dueDate` in the patch). Existing recurring ack tests still pass, so the roll still moves the base. |

## Acceptance criteria re-checked

- [met] A pending close is dropped when the remote `due` moved since the base. After an ack, an incremental pull rewrites the line (recurring: open + new `📅`). — Drop unchanged at `completion.logic.ts:173-177`; the `planAck` change only keeps the remote due base when no `📅` is written, the recurring rewrite path (`newDue` set) still moves both bases. Tests in `completion.logic.test.ts` and `sync-now.service.test.ts` pass.
- [met] Pull hardening, from a security review of Issue 06's merged `pull.logic.ts` (verified on main at `12fefe60a`), each with a failing test first: — The remaining gap (signifier behind another round-trip problem) is closed by `hasSignifier` at `pull.logic.ts:432`, with tests for both probe inputs; the fix report states they failed before the fix, consistent with the old `contentProblem === 'signifier'` check, which returns `hash`/`newline` first for those inputs. The other hardening items are unchanged since round 1.
- [met] Gate: frontend, or Both if IPC changes. — No `src-tauri/` or contract changes in the fixes. `pnpm check` exit 0; targeted vitest exit 0 (35 files, 613 tests). The full suite is deliver's to run.

## Findings

None open beyond previous finding 2, which stays an owner decision (minor, not blocking).

## Checks run by the reviewer

- `pnpm check`: exit 0, 227 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync src/tests/lib/app/commands.todoist.test.ts src/tests/lib/architecture src/tests/lib/features/tasks`: exit 0, 35 files, 613 tests passed.
- The fixes only add tests; no test was deleted, skipped or weakened. No scope creep: the three source files changed are the ones the findings named. Layer baseline untouched.
- Not run: the full suite (deliver's step); `cargo test` (no `src-tauri/` changes).

## Resolution

1. **Rejected, owner call (unchanged from review.md Resolution item 2).** The drop on any remote `due` move is what the Issue's criterion and design rule 6 state, with no recurring qualifier; the reviewer agrees it matches the written criterion. Narrowing it to recurring items changes user-visible behavior and needs the owner's decision. If the owner picks the recurring-only rule, the change is an `isRecurring` condition on `dueMoved` at `completion.logic.ts:173` plus one test. No code changed in deliver.
