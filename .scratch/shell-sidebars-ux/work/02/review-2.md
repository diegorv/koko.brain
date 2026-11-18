VERDICT: APPROVED

# Re-review round 2: Issue 02, calmer status bar

Fixes reviewed: `git diff adaa968d1..HEAD` (8386a905d, `e2e/specs/word-count.spec.ts` only; fcb78379f edits the review file).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `e2e/specs/word-count.spec.ts:44-46` opens the note through `openMarkdownFile(page, 'Note.md', ..., { todoist: { syncEnabled: true } })` (`e2e/fixtures/live-preview.ts:46`); the shallow override is safe because `settings.service.ts:165` spreads `DEFAULT_SETTINGS.todoist` under the loaded object. `:53` asserts `[data-todoist-sync-status]` (`TodoistSyncStatus.svelte:22`) is visible before measuring. The injected `data-test-chip` node is gone. |
| 2 | minor | resolved | `:62-65` `measure()` takes the slot width, the gap from the Todoist item's right edge to the slot, and the gap from the slot's right edge to `.word-count-stats` (`WordCount.svelte:33`); `:78-82` compares Modified and post-autosave against Saved for all three. Both gaps are independent of the word count's width, so the Saved to Modified flip is now covered for position too. |

## Acceptance criteria re-checked

- [met] Failing E2E first (`e2e/specs/word-count.spec.ts` or `editor.spec.ts`): with a note open, `[data-status-bar]` is 24 (plus or minus 0.5) px tall; `[data-save-status]` keeps the same `x` and `width` while Saved, after typing (Modified) and after the autosave (`expect.poll` over the 2 s debounce, `editor.service.ts:276-279`). If the E2E vault can show Todoist sync's status item before it, run once with it; otherwise say so in the PR. — Height check at `:57-59`; width and both slot-edge gaps compared across Saved, Modified and after the autosave (`expect.poll`, 6 s timeout, `:75`); runs with Todoist sync's status item before the slot. `bash scripts/e2e.sh e2e/specs/word-count.spec.ts`: 4 passed, exit 0 (run by me). The "x" is checked as the gaps either side of the slot, since the right-aligned group legitimately shifts with the word count; that is the movement the Issue means.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: 0 errors, 0 warnings, 234 files, exit 0. `src/tests/lib/core/status-bar/SaveStatus.test.ts`: 6/6, exit 0. The fixes change no unit-tested code; the full suite is deliver's to run.

## Findings

None open or new.

## Other checks

- No test weakened: the height, width and position assertions are all still present, and position now covers all three states instead of only Modified vs autosave.
- Scope: the fix touches only the E2E spec and the review file. No source, layer-baseline or src-tauri change.
- The test switched from the `vaultPage` fixture to `page` with `openMarkdownFile`, which seeds its own vault; the other three Word count cases are unchanged.
- Not run by me: a mutation probe of the new case (the fix step reports a single-label `SaveStatus.svelte` fails it on width, 67.53 vs 82.45 px); the width assertion is the same one round 1 probed.
