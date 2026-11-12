# Critique of the 2026-11-12 synthesis (final prioritized plan)

Adversarial read at HEAD `635b4af36`. Read-only: nothing was run. (F) = read in code, Issue files, reports or git at HEAD. (I) = inference.

## Verdict

The synthesis's facts mostly hold. Its ranking and run order have five real defects:

1. Its chain order buries 068, the most-used views bug, behind two needs-info Issues.
2. It keeps 004 -> 015 even though its own refuter recommends the reverse.
3. It adds a core rename hook to 004 for a corner case.
4. It overrates 014.
5. It says "no new decision needed" for Issues whose acceptance criteria it weakens.

**Keep:** 003 at rank 1, the 010-before-067 fix, the 010 split, the 061 split, the 094 deferral and the "nothing fully fixed" verdict.

**Change:** the items below.

## High

### H1. 068 is held hostage by 010 and 067, which both need an owner answer

- **Facts (F):**
  - 068 is `Blocked by: 067` (`issues/068-*.md:9`). 067 is `Blocked by: 010` (`067-*.md:10`).
  - The synthesis sets 010 and 067 to needs-info until Q2 and Q3 are answered.
  - refute-068 says the blocker is "only file overlap ... There is no logic dependency. If 067 stalls on 010, 068 can go first" (`refute-068.md:105-108`). The two compose, because `compareForSort` already treats `undefined` as null.
  - dossier-068 rates the frequency "moderate". The rail Sort dropdown writes `sort: X DESC` (`dossier-068.md:28-29`; `list-view-sort.logic.ts:28`).
  - The synthesis's own table ranks 068 (9th) above 010 (15th) and 067 (16th), yet chains it after both. 047 (`Blocked by 068`) inherits the same stall.
- **Change:**
  - Set 068 `Blocked by: none` through `relay ledger`. Add refute-068's series note to the Issue.
  - Run 068 first in the views chain: `068 -> 009 -> 070 -> 010 -> 067 -> 012 -> 047`.
  - If Q2 is "no", 067 needs its blocker dropped too. Name that fallback in Q3.

### H2. Run 015 before 004, and drop 004's rename leg (ask the owner)

- **Order facts (F):**
  - 015's blocker is a same-code series: "the two edit the same code" (`015-*.md:36`).
  - refute-004 S6: "Running 015 first would make 004 smaller (only the flush call before 015's save), and 015 has more daily impact" (`refute-004.md:49`).
  - The synthesis ranks 015 (3rd) above 004 (4th), yet runs 004 first. It then has 015 delete 004's interim save (015 edits, Notes).
  - That is extra code that exists only to be removed.
- **Rename-leg facts (F):**
  - The leg hooks `updateTabAfterRenameOrMove` in core `link-updater.service.ts`. It covers only a programmatic rename inside 300 ms of a canvas keystroke.
  - Auto-organize acts at least `debounceMs` after a save (`auto-organize.service.ts:225-237`).
  - Whether any owner mod renames an open canvas is unverified (`refute-004.md:55,64`).
  - The owner's "no core changes for corner cases" rule fits this case exactly.
  - The leg is also the only reason 077 is `Blocked by 004`, and the reason for the 004/077 overlap on `link-updater.service.ts`.
- **Change:**
  - Slot 1: `015 -> 004 -> 028 -> 043 -> 077`. Set 015 Blocked by none and 004 Blocked by 015, through `relay ledger`.
  - In 004, put the flush just before 015's save in `closeTab`.
  - Ask the owner to move criterion 2 (the rename case) to Notes as a known limit. That changes an acceptance criterion, so it needs the owner's OK.
  - If the owner agrees, drop 077's 004 blocker.
- **Also in 004 (F):** the synthesis says "A flusher that throws is logged and does not stop the close". That drops the edit silently, against CLAUDE.md "Services ... never silently swallow". A throwing flusher should keep the tab open, or fall through to 015's failed-save prompt.

### H3. "No new decision is needed for 003" is wrong

The synthesis changes 003's acceptance criteria and its runtime behavior beyond the 2026-11-06 owner decision (`003-*.md:15`):

- **Criterion 3 (the Rust test of the Reopen decision) is replaced by "No Rust test for the arm".** That removes a test criterion.
- **Criteria 4-6 move out of acceptance into an owner hand check.** This is right for relay (cross-tests-relay H2), but they stop being gates.
- **`"backgroundThrottling": "disabled"` is a new app-wide policy.** The main webview is never throttled while hidden or minimized. The key is valid (F: tauri-utils 2.10.2 `config.rs:2245-2254`, enum `Disabled` camelCase at `:1854-1865`). It still costs some energy, and the owner never chose it.

The global rule says acceptance criteria change only with approval.

Also, risk "low after edits" is understated. The one thing that matters, a hidden webview still running after more than 5 minutes, cannot be checked by relay or CI. It rests on library docs (`tauri-2.12.5 webview_window.rs:1255-1268`). The "macOS 14+" there is when the policy setting is supported, not when suspension starts.

**Change:** add one owner question for 003 covering the throttling policy and the criteria moves. Keep the risk at medium.

### H4. Many more Issues are `ready-for-agent` than the 5 the synthesis parks

- **Facts (F):** 061 (unsplit), 047, 077, 161, 042, 038, 039, 013 and others say `Status: ready-for-agent` with no unmet blocker (`038-*.md:11`, `039-*.md:15`, `061-*.md:11`). The synthesis parks only 002, 010, 043, 067 and 070.
- **Risk:** under the auto-launch rule, 061 as written implements all three parts, including the two the validators rejected as medium-risk (validate-s3+s4, "Rejected").
- **Change:** also set 061, 047, 077, 161 and 042 to needs-info until their edits land. Set the deferred 038, 039, 013, 011 and 094 to needs-info too, or record "launch only by number".

## Medium

### M1. 014 is overrated at rank 2

- **Facts (F):** the Backlinks panel starts collapsed and re-collapses on every path change (validate-s1+s2, row 014, `BacklinksPanel.svelte:16,33-38`). Backlinks and Outgoing links are not on the owner's daily list. The fix touches indexing-rule code (risk low-medium).
- **Change:** rate it medium and rank it after 042 and 055 (below).

### M2. 062 is underrated, and the synthesis grows its scope

- **Facts (F):** the app's own TSV paste writes `\|` and `<br>` (`paste-tsv.logic.ts:129-130`). Every table the owner pastes daily therefore shows raw `\|` and `<br>` once the cursor leaves it. The synthesis cuts 062 to "medium, display only".
- **Scope growth:** the synthesis adds a CommonMark escape grammar, a Unicode word-boundary rule for `_`, a `\\` rule, `<br>` variants, `***x***` nesting and a mousedown spy contract. M is now generous.
- **Change:**
  - Rate it medium-high and rank it 3rd.
  - Offer the owner a lower-risk cut: (a) `\|`, `\\`, `<br>` and links (what the app writes itself) now; (b) `_x_`, `==x==` and `***x***` as a follow-up.
  - Name `inline-markdown.test.ts:87-94` (`**bold***italic*` adjacency) as a guard that must stay green beside the `***x***` change. The only consumer of `renderInlineMarkdown` is `widgets.ts:232`, so the blast radius is table cells only.

### M3. The slot plan starves the owner's queue for unapproved additions

- **Fact:** slot 2 runs `003 -> 014 -> 064 -> 042 -> 062 -> 061p2 -> 002 -> 055`. 014, 064, 042, 061p2 and 055 all wait on Q9, and 002 waits on Q1.
- **Fact:** the whole views chain (009, 070, 010, 067, 068, 012, all from the owner's queue) waits "once the tasks lane idles". The tasks chain still holds 238, 239, 113, 112, 240, 241, 244 and more (cross-order-files M1).
- **(I):** if Q9 is not answered, slot 2 idles after 003, and the queue's views bugs wait an unbounded time.
- **Change:**
  - Slot 2: `003 -> 062 -> 068 -> 009 -> 070 -> 010 -> 067 -> 012 -> 047`.
  - Slot 3, when the tasks lane frees a slot: the approved additions (`061p2, 042, 055, 064, 014`), then `002` after Q1, then `161`.

### M4. 061 part 2 does not need to wait for 062

- **Facts (F):** the guard is `widgets.ts:41-47` and 062's hunk is `:226-278` (cross-order-files L3). The two hunks do not overlap.
- **Change:** a one-line fix should not wait behind an M Issue. Run 061p2 before 062 in the same slot, or treat it as a series pair with no blocker.
- **Rating:** "medium" is also high. A right-click on a checkbox is not a frequent gesture. Rate it low-medium, but it is still worth doing for its cost.

### M5. 055 is under-placed

- **Facts (F):** pure `.logic.ts`, S, low risk, on the owner's daily table-paste path (validate-s7+s8, point 1). The synthesis ranks it 13th, behind 002 (medium risk, every keystroke), 043 (core indexing) and 047 (file-moving path).
- **Change:** move 055 to just after 042.

### M6. 012 keeps a blocker its own refuter calls textual

- **Facts (F):**
  - 012 is `Blocked by: 010` (`012-*.md:10`). refute-012 says "the 010 overlap is textual only" (`refute-012.md:89`).
  - After the 010 split, 010 touches only `evaluator.ts`, `methods.logic.ts` and docs (cross-order-files M4). It no longer shares any file with 012.
  - The synthesis adds 009 but keeps 010, so a "no" to Q2 strands 012.
- **Change:** set Blocked by to `009` only.

### M7. pnpm build edits contradict an active ADR, and they are applied unevenly

- **Facts (F):** ADR 0030 is `status: active` and puts `pnpm build` in the gate for every frontend change. It explicitly rejects "only for dependency changes" (`0030-*.md:5,19,37`). CLAUDE.md rule 6 says the opposite.
- **The synthesis:**
  - drops the build from 042 and 061;
  - keeps it in 004's checkbox (`004-*.md:23`).
- **Change:** do not edit it per Issue. Either leave every Gate line alone (CI runs the build, `ci.yml:84`), or ask the owner to amend ADR 0030 to match rule 6. Dropping a checkbox is also a criteria change.

### M8. 015 AC5 as rewritten is an unbounded loop

- **Fact:** "calls saveFileByPath again until the tab ... is clean or gone" has no bound.
- **Change:** use one re-save. If the tab is still dirty after it, fall through to the failed-save prompt. That covers the keystroke-during-write case with no loop.

### M9. 039 is framed too weakly in Q6

- **Facts (F):** validate-s5+s6 rates 039 high for a daily canvas user. Every file or image node added in the app stores an absolute path, which is then prefixed with `vaultStore.path` again:
  - `CanvasFilePicker.svelte:21,61` uses `file.path`;
  - `file-entries.logic.ts:21` builds `path: node.path`;
  - `FileNode.svelte:40` and `canvas-image.service.ts:34` add the prefix.
- **What depends on 038:** only the image half (`readFile` needs `fs:allow-read-file`, `default.json:66` grants only read-text-file). The file-node half does not.
- **Change:** ask Q6 first among the re-asks, with the symptom stated: "every file node you add from the picker shows Could not load file". Offer 039's file-node half alone (S, low, independent of 038) after 004, since both edit `CanvasInner.svelte`.

## Low

- **L1. Wrong reason for deferring 097.** The synthesis says 097 shares "the Rust run handler with 003". 097 touches `dispatch_shortcut` in `lib.rs` (`097-*.md:7,43`) and `quick_capture/commands.rs`, not the run closure. Same file, different function. Deferring it is still right.
- **L2. The tauri v3 branch is a future conflict for 003.**
  - `update-tauri-to-v3` changes `capabilities/default.json`, `lib.rs` and `tauri.conf.json` against main (`git diff --stat` from its merge-base). These are exactly 003's files. It has been idle since 2026-10-29.
  - Note it in 003's Notes: whoever revives that branch rebases over `allow-hide`, `backgroundThrottling` and the Reopen arm.
- **L3. 152 names a file that changed.** `utils/tag-extraction.ts` changed in `6ff6c3d55` (Issue 248): it now exports `INLINE_TAG_NAME_SOURCE`, which Todoist sync uses. 152 names that file (`152-*.md:26`), so the "no file named below changed" claim does not cover 152's trim. A 152 fix now also changes which Todoist labels become tags. 152 stays deferred.
- **L4. 004's "unblocks 006, 027, 100" adds no value now.** All three are deferred. Its value is the canvas close case plus serial order with 015.
- **L5. 002's impact is honestly medium.** dossier-002 says medium-high frequency. refute-002 says "weekly-ish", visible at once and undoable. Rank 10 is defensible, but 002 should come before 043 and 047 once Q1 is answered, because it is core editing.

## Revised ranked list

| Rank | Issue | Change vs synthesis |
|---|---|---|
| 1 | 003 | Same rank. Risk medium. Add the owner question (H3) |
| 2 | 015 | Up from 3. Runs first in slot 1. Blocker on 004 removed (H2). One re-save, then prompt (M8) |
| 3 | 062 | Up from 8. Medium-high. Optional split (M2) |
| 4 | 004 | Same rank. After 015. Flush only; rename leg goes to the owner (H2) |
| 5 | 068 | Up from 9. Blocker on 067 dropped; first in the views chain (H1) |
| 6 | 042 | Same |
| 7 | 055 | Up from 13 (M5) |
| 8 | 061 part 2 | No blocker on 062; low-medium (M4) |
| 9 | 064 | Same |
| 10 | 014 | Down from 2; medium (M1) |
| 11 | 002 | After Q1 (L5) |
| 12 | 028 | Same |
| 13 | 043 | Same, after Q5 |
| 14 | 047 | Blocked by 068 only, which now runs early |
| 15 | 009 | Views chain |
| 16 | 070 | Views chain, after Q4 |
| 17 | 010 | After Q2 |
| 18 | 067 | After Q3, with a fallback if Q2 is "no" (H1) |
| 19 | 012 | Blocked by 009 only (M6) |
| 20 | 077 | 004 blocker dropped if the rename leg goes |
| 21 | 161 | Same |

**Re-asks, first in the owner questions:**

1. 039 file-node half (M9).
2. 013 (medium-high for daily `.view` use).
3. 007 (meta-bind paste into an input writes into the note).

## Not verified

- Nothing was run.
- That a hidden WKWebView suspends without the policy, and how much energy `Disabled` costs, rest on tauri docs.
- 068's frequency depends on whether the owner sorts DESC on sparse properties, which is not in the repo.
- Whether any owner mod renames a canvas was not checked, because the mods are outside the repo.
