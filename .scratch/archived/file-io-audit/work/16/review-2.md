VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `takeItem` (`kanban.logic.ts:338-359`) carries only the leading run of `CONTINUATION_RE` lines and hands the rest to the previous card or the lane / archive head. moveItem (both branches), archiveItem, archiveCompletedItems (last to first) and restoreItem use it; removeItem uses it without carry, the same behavior as before. The new `describe('card actions leave raw lines in place')` covers scenarios (a), (b) and (c) from round 1. My own probes, in a throwaway test file I deleted afterwards: a CRLF move of the card above `### Sub` writes `## A\r\n\r\n### Sub\r\n- [ ] b\r\n...`. archiveCompletedItems with every card checked leaves `prose a\n### Sub` in the lane, and on reopen the lanes are `[A, B]` and the archive holds `[a, b, c]`. Restoring the middle archive card leaves `prose1` and `## X` in the archive. An archive then restore keeps the indented `  da` with the card. removeItem keeps `### Sub` above `b`. restoreItem on a board with no archiveLayout builds the default layout and keeps `prose`. |
| 2 | minor | resolved | `extractSettingsBlock` (`:125-140`) moves `open` to each later opener and closes only on a non-opener `%%` line. The test 'an unclosed settings block stays a raw line and later setting changes stick' runs two setViewMode rounds and checks the exact output each time. |
| 3 | minor | resolved | `SETTINGS_OPEN_RE` is anchored at column 0 (`:20`). The test 'an indented settings opener (inside a code fence) is a raw line' toggles a card and checks the output byte for byte. |
| 4 | minor | resolved | `frontmatterEnd` (`:89-102`) returns -1 at a card line. It also returns -1 when lane headings and blank lines are the only lines before the fence, or when the fence opens the archive. Two tests cover the YAML-comment case (addItem lands outside the frontmatter) and the case of a rule on line 0, an empty lane, then the archive. The residual case the fix step reported is real but loses no bytes: my probe on `---\n## A\nprose\n---\n\n## B\n\n- [ ] b\n` shows lanes `[B]` and a byte-exact round trip (nit 1 below). |
| 5 | nit | resolved | When serializeKanbanBoard drops an archive that had gap lines, it now pushes `''` (`:285-287`). The test 'emptying the archive by restore keeps the trailing newline' asserts the exact output. |

## Acceptance criteria re-checked

- [met] Prose, `### Sub` headings, indented lines and other task states (`- [/]`, `- [-]`, `* [ ]`) typed in source mode survive a board action in place (repro case 'keeps prose, sub-headings, indented lines and other task states') — the repro case passes. Moves, archive and restore now leave non-indented raw lines in place (`takeItem`, new tests), so this now covers card moves as well as toggles.
- [met] A board with a leading frontmatter block keeps the block byte for byte and its lanes stay lanes after a board action (repro case 'a board with frontmatter keeps the frontmatter and its lanes') — the repro case and the frontmatter logic tests pass, including the new `## ` YAML-comment case, where addItem writes the card into lane A.
- [met] A round-trip property test: parse then serialize of any board the app wrote, plus arbitrary unrecognized lines between lanes and cards, returns the input unchanged — the 'lossless round trip' property test still passes after the frontmatterEnd and extractSettingsBlock changes (264/264 in `src/tests/lib/plugins/kanban/`).
- [met] A `---` line between two lanes survives a card action, and the lanes and cards after it stay lanes and cards (none move to the archive) — the new test 'moving a card with a raw "---" after it above a lane titled "Archive"' reopens to lanes `[A, B, Archive, C]` with an empty archive. Card actions now carry only indented lines, so no card action can put a raw `---` in front of another lane.
- [met] A board whose `%% kanban:settings` block holds malformed JSON keeps that block byte for byte after a card action (or the action refuses to write) — 'keeps a malformed settings block byte for byte after a card action' still passes after the extractSettingsBlock rewrite.
- [met] A `### Sub` line inside a lane survives a card action, and the cards that followed it still follow it — the tests for a move to another lane, a same-lane reorder, a reorder of a later card, archive and archive-completed all assert that `b` still follows `### Sub`. My CRLF move probe agrees.

## Findings

1. **nit** `src/lib/plugins/kanban/kanban.logic.ts:89-102` (frontmatterEnd). A file with `---` on line 0, then a lane heading, a prose line and a lone `---`, with no card between them, is now read as frontmatter. That lane does not show on the board, but its bytes survive (probe: lanes `[B]`, byte-exact round trip). The fix step disclosed this. Fix: accept it, or record it in discovery.md.
2. **nit** `src/lib/plugins/kanban/kanban.logic.ts:336`. The takeItem JSDoc sentence "The cards after it so still follow those lines." is ungrammatical. Fix: "So the cards after it still follow those lines."
3. **minor** (pre-existing, outside the fixes) `src/lib/plugins/kanban/kanban.logic.ts` lane actions. A raw `---` at the end of a lane can still form the archive pattern after removeLane, moveLane, renaming a lane to `Archive`, or addLane('Archive') after such a lane. Also, restoreItem to a lane id that does not exist still drops the card. The fix step disclosed both. Neither is a card action, so the criteria are not affected. Fix: file a follow-up `.scratch` Issue.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings (212 files).
- `pnpm vitest run src/tests/lib/plugins/kanban/`: exit 0, 7 files, 264 tests passed.
- Probes: a throwaway vitest file under `src/tests/tmp-probe/`, deleted afterwards. The worktree is clean apart from this file.
- Diff `bb8590ad..HEAD`: it touches only `kanban.logic.ts`, `kanban.types.ts` (one comment), `kanban.logic.test.ts` and `work/16/review.md`. No test was weakened: the one changed assertion ('moving a card carries only its indented continuation lines') now checks the round-1 model, and its input has an extra prose line. No `src-tauri/` change, and the layer baseline is untouched.
- Not run: the full suite and `pnpm build` (deliver's to run), and the kanban E2E spec.

## Resolution

1. nit (frontmatterEnd residual case): accepted and recorded in `work/16/discovery.md`. No bytes are lost; the lane is only hidden from the board.
2. nit (takeItem JSDoc): fixed, the sentence now reads "So the cards after it still follow those lines."
3. minor (lane actions and restoreItem to a missing lane, pre-existing): filed as `.scratch/file-io-audit/issues/56-kanban-lane-actions-archive-pattern.md`.
