# Cross-check: run order, blockers and shared files

Adversarial validation at HEAD `318b6e9b5` (main, 2026-11-12). Read-only: nothing was run. (F) = read in code, the ledger, the Issue files or `git` output at HEAD. (I) = inference.

Inputs: the 12 dossiers and refutes, the 4 validate files (the confirmed additions come from them), `ledger.md`, `priority-2026-11-08.md`, the Issue files' **Blocked by** lines, `.scratch/tasks-view-ux/ledger.md`, and the diffs of the two running tasks branches.

## Summary

- **High:** the queue runs 067 before 010, but 067 is `Blocked by: 010` in both the Issue and the ledger. Move 010 ahead of 067. It is cheapest when cut to the validator only.
- **Medium:**
  - Two relay workflows are running now (111 and 248), so open-itens gets one slot under the 3-workflow cap.
  - 003 owns the Tauri config, `lib.rs` and the only cargo gate in the queue.
  - The `editor.service.ts` group mislabels 028.
  - 010's scope decision changes which files it touches.
  - Three conditional additions point at deferred blockers.
  - 047 belongs in the view chain.
  - No queue Issue can launch until its Issue edits are made.
- **Tasks view:** no queue Issue and no confirmed addition touches `src/lib/features/tasks`, `e2e/specs/tasks-view.spec.ts` or `e2e/mocks/vault-index.ts` (F, grep of `.scratch/open-itens/issues`: only the done 021 and 198 name them). Everything can run beside 111 and its next Issues (238, 239, 113, 112, 240, 241). Files overlap only with the later 244, 121 and 122.

## Recommended run order

Series chains. Run each chain in order. Different chains may run at the same time, within the slot budget (finding M1).

| Chain | Order | Why it is one chain |
|---|---|---|
| E1 close path | 004 -> 015 -> 094 (reduced) | `closeTab` and `editor.service.ts` / `editor.service.test.ts` (F: `editor.service.ts:303`) |
| E2 path change | 028 -> 043 -> 077 (077 also after 004) | `fs.service.ts` + `path-change.service.ts` (028, 043); `link-updater.service.ts` (004's rename leg, 077) |
| V views | 009 -> 070 -> 010 -> 067 -> 068 -> 012 -> 047 | `priority-2026-11-08.md:63` series rule; `collection.logic.ts`, `evaluator.ts`, `collection-logic.test.ts`, `CollectionView.*` |
| L live preview | 062 -> 061 part 2 | both edit `live-preview/widgets.ts` |
| S shell | 003 | cargo, `default.json`, `tauri.conf.json`, `lib.rs`, `tauri-listeners.service.ts` |
| Free | 002, 014, 042, 055, 064 | no file shared with any other queued Issue (F, Issue file paths) |
| Search | 045 -> 161 | shared Rust search files and help 06; 161 needs cargo |

Suggested schedule. It keeps the owner's relative order, except that 010 moves before 067:

- **Slot 1 (free now):** 004 -> 015 -> 028 -> 003 -> 002, then 043 -> 094 -> 077.
- **Slot 2 (once 248 delivers):** 062 -> 009 -> 070 -> 010 -> 067 -> 068 -> 012, then 047.
- **Slot 3 (once the tasks lane idles, or with owner authorization for up to 5):** 014, 042, 064, 055, 061 part 2 (start it only after 062 is merged), 045 -> 161.

What can run beside what:

- 028 may run beside 004 or 015. It edits neither `editor.service.ts` nor `link-updater.service.ts`.
- 003 can run beside every frontend-only Issue. It must not overlap another cargo-gated run.
- 002 can run beside 062: their files are disjoint.
- The views chain and the live-preview chain do not share files.

## Findings

### H1. 067 is blocked by 010, which the queue runs later

- **Issue:** 067 (and 068 behind it).
- **What:** the queue reads `... 070, 067 -> 068, 028, 003, 010 -> 012 ...`. The ledger's Next up rule lets an Issue start only when every Issue in its Blocked by is `done`.
  - With no Issue numbers, relay-lite will not start 067 until 010 is done.
  - Forced by number ("Add Issue numbers to force them", `ledger.md` § Continue), 067 starts before 010. 010 then has to rebase onto 067's changes in `evaluator.ts` and `collection.logic.ts`, which are the same functions it edits (dossier-010 § 7).
- **Evidence (F):**
  - `issues/067-columns-resolve-like-expressions.md:10` `**Blocked by:** 010`; `ledger.md:104`.
  - `ledger.md` § Next up.
  - `refute-067.md:55-64`; `refute-010.md:84`; dossier-010 § 7.
- **Fix:** run `009 -> 070 -> 010 -> 067 -> 068 -> 012`. This needs no ledger edit. With refute-010's split, 010 becomes an S validator fix in `evaluator.ts` and `methods.logic.ts`, so moving it up costs little.
  - The alternative is refute-067's edit: Blocked by `none` plus a series note, changed in the Issue and through `relay ledger`, never by hand.
  - Do not do both. A blocker that is removed while 010 is also moved first protects nothing.

### M1. Slot budget: one open-itens slot is free now

- **What:** 111 and 248 are `in-progress` in tasks-view-ux, and both have worktrees. The owner's limit is 3 relay workflows across sessions without asking, and up to 5 only with authorization. So open-itens gets one slot until 248 delivers. The tasks chain (111 -> 238 -> 239 -> 113 -> 112 -> 240 -> 241 -> 244 ...) keeps one slot busy after that.
- **Evidence (F):**
  - `.scratch/tasks-view-ux/ledger.md:43` (111 in-progress), `:74` (248 in-progress).
  - `git worktree list`: `brain.worktrees/issue-111-quick-filters`, `issue-248-...`.
  - MEMORY.md: "Gate matches what changed" and "Relay auto-launch" (3 workflows, 1 cargo, 1 E2E per checkout).
- **Fix:**
  - Start chain E1 (004) in slot 1 once its Issue edits are in (M7).
  - Open chain L/V (062, then 009) in slot 2 when 248 delivers.
  - Each deliver runs the full suite. With 3 slots, deliveries can overlap, which works against "serial checks only" (I). Stagger launches.
  - More slots move main faster, which can starve a deliver of a clean rebase (MEMORY "Relay deliver starved by main commits"). Batch the ledger and docs commits.

### M2. 003 owns the config files and the queue's only cargo gate

- **Issue:** 003.
- **What:** 003 edits files that other open Issues also edit:
  - `src-tauri/capabilities/default.json` (add `core:window:allow-hide`): also edited by 038.
  - `src-tauri/tauri.conf.json` (`backgroundThrottling`, refute-003): also edited by 098.
  - `src-tauri/src/lib.rs` run closure: also edited by 090 and 097, and by tasks 121 and 122.
  - `src/lib/app/tauri-listeners.service.ts` and its test: 043 adds a test to the same test file (`043-*.md:17`), and tasks 244 edits the source.
  - A capabilities test beside `src/tests/lib/architecture/fs-capabilities.test.ts`, which 038 also edits.
  - It is the only queued Issue with a Rust gate. Its macOS-only `Reopen` arm also needs cfg gating to keep clippy `-D warnings` green on Linux CI.
- **Evidence (F):**
  - `default.json:66` (only `fs:allow-read-text-file`, no allow-hide, no allow-read-file).
  - `tauri.conf.json` has no `backgroundThrottling`.
  - Files named in Issue 038 (`default.json`, `fs-capabilities.test.ts`) and Issue 098 (`tauri.conf.json`).
  - `.scratch/tasks-view-ux/issues/121-*`, `122-*` name `src-tauri/src/lib.rs`; `244-*` names `tauri-listeners.service.ts`.
  - MEMORY "Cargo builds throttled": one cargo build at a time, and worktrees share main's target dir.
- **Fix:**
  - Run 003 when no other cargo-gated run or deliver is active. Today that is anything outside the current tasks Issues, which are frontend-only (F: the 111 and 248 diffs touch no `src-tauri`).
  - Never run it beside 043, 038, 098, 121, 122 or 244.
  - If canvas is un-deferred, run 038 after 003.
  - Run 003 before tasks 121 and 122 reach `lib.rs`, which is many Issues away (I).

### M3. The `editor.service.ts` group mislabels 028; its real conflicts are 043 and 029

- **Issue:** 028 (also 004, 077).
- **What:**
  - `priority-2026-11-08.md:58` lists 028 in the `editor.service.ts` group. 028's fix exports `saveDirtyTabsUnder` (`path-change.service.ts:65`) and awaits it in `duplicateItem` (`fs.service.ts:345-365`). It does not edit `editor.service.ts` (refute-028:12, dossier-028 § 5).
  - 043 edits the same two files (`043-*.md` names `fs.service.ts` and `path-change.service.ts`), and 029 edits `duplicateItem`.
  - 004's rename leg, kept by refute-004 M3, edits `updateTabAfterRenameOrMove` (`link-updater.service.ts:93`; its only caller is `path-change.service.ts:185`). 077 edits the same file.
- **Fix:**
  - 028 may run beside 004 and 015.
  - Keep 028 -> 043 (and 029, if it is un-deferred) serial.
  - Run 077 only after 004 is merged.
  - Add 043 and 077 to a "path-change / link-updater" series line in the priority file.

### M4. 010's scope decision changes its file set and its conflicts

- **Issue:** 010 (also 012, 043, 131).
- **What:**
  - **Full scope (dossier-010 § 3):** edits `RailNoteList.svelte`, `lens.logic.ts`, `rail-shell.types.ts`, `CollectionView.svelte:587`, `collection-block-widget.ts`, the live-preview `styles.ts`, `collection.types.ts`, and the `executeQuery` filter loop. That conflicts with 012 (`CollectionView.svelte`), 067 (`collection-block-widget.ts`, `executeQuery`) and 043 (the RailNoteList series).
  - **Refute-010's preferred split:** the count moves to a new needs-info Issue, and 010 keeps only `evaluator.ts`, `methods.logic.ts` and the docs. Its only conflicts are then 067, 047 and 098 (`evaluator.ts`).
- **Evidence (F):** dossier-010:6-12, refute-010:26, `:83` (131's Blocked by lists only 011, `ledger.md:147`).
- **Fix:** decide on the split before 010 is moved up (H1). If the split is taken:
  - Add the new count Issue to 131's Blocked by.
  - Do not let the count Issue run beside 043 or 012.

### M5. Three conditional additions point at deferred blockers

- **Issues:** 139, 141 (the narrow `!=` part), 025.
- **What:**
  - 139 is `Blocked by: 138, 069`. 138 is in the deferred chain 131-144 and 069 is deferred.
  - 141 is `Blocked by: 068, 013, 136, 137, 140`. 013 is deferred, and 136, 137 and 140 are in the deferred chain.
  - 025, the meta-bind wrong-note write that validate s1+s2 wants to ask about, is `Blocked by: 024`, which is deferred with meta-bind.
  - None of the three can launch from the queue as written.
- **Evidence (F):** `ledger.md:155` (139), `:157` (141), `:62` (025); `issues/139-*:10`, `141-*:19`, `025-*:21`.
- **Fix:**
  - **141:** cut the `!=` part into its own Issue with Blocked by none, but only if a grep of the owner's vault finds `!= true` or `!= false`.
  - **139:** leave it deferred. If the owner wants it, drop the 138 and 069 blockers with a series note.
  - **025:** if the owner un-defers it, un-defer 024 too, or record the owner's reason for dropping that blocker.

### M6. 047 joins the view chain after 068

- **Issue:** 047.
- **What:** 047 edits `compareValues` in `expression/evaluator.ts:718-725` and `toolbar/filter.logic.ts`, and adds tests to `collection-logic.test.ts` and `evaluator.test.ts`.
  - `evaluator.ts` is also edited by 010, 067 and 098; `filter.logic.ts` by 013 and 141; `collection-logic.test.ts` by 010, 067 and 068.
  - Its fix also changes what Auto Organize rules match (`auto-organize.logic.ts:17` imports the evaluator), so its tests must also cover that path.
- **Evidence (F):** file paths named in `issues/047-*.md`; validate-s1+s2 row 047.
- **Fix:** run 047 in chain V after 068, never beside 010, 067, 068 or 098.

### M7. No queue Issue can launch as written

- **What:** all 12 refutes return `run-after-edits`. Their must-fix edits are launch prerequisites, and the schedule above assumes they are applied. The first slot is gated on 004's edits M1-M3. The edits that change ordering or files are:
  - 004: the rename leg moves to `link-updater.service.ts` (M3 above).
  - 010: split (M4).
  - 067: blocker (H1).
  - 003: `tauri.conf.json` and a config test (M2).
  - 002: moves out of the properties group (L2).
  - 012: Blocked by gains 009 (L1).
- **Evidence (F):** the refuter verdicts JSON; `refute-*.md` § must-fix.
- **Fix:** apply the edits for the next Issue in each slot before launching it. Re-check this file's chain table after the 010 and 004 edits.

### L1. 012 should list 009 in Blocked by

- **What:** the rule "VD-01 (009) before VE-01 (012)" (`priority-2026-11-08.md:63`) is only text. Both Issues edit `CollectionView.view-writes.test.ts`. The queue order already satisfies the rule; the change only lets relay-lite enforce it.
- **Evidence (F):** `ledger.md:49`, `issues/012-*:23`, refute-012 S4.
- **Fix:** set Blocked by to `010, 009` through the Issue and `relay ledger`.

### L2. 002 is in the wrong series group

- **What:** `priority-2026-11-08.md:60` puts 002 with `properties.logic.ts` and `properties.service.ts`. 002 touches neither file. It edits `plugins/frontmatter-field.ts`, the registration in `live-preview.ts`, a new test and `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts`. 062 touches none of these (it edits `widgets.ts`, `inline-markdown.ts` and the table tests).
- **Evidence (F):** file paths in `issues/062-*.md`; refute-002 S8; dossier-002 § 5.
- **Fix:** move 002 to a "live-preview frontmatter" line. It may run beside 062. Its E2E run uses a per-worktree port (`scripts/e2e.sh:18-22`), so it does not clash with the tasks reviewers' `tasks-view.spec.ts` runs.

### L3. 061 part 2 and 062 both edit `widgets.ts`

- **What:**
  - The checkbox guard is at `widgets.ts:41-47`, and 062 edits `renderInlineSegments` at `:226-278`. The hunks are disjoint, but the file is in one series group (`priority-2026-11-08.md:61`).
  - 007 and 158, both deferred, are in the same group. Validate s7+s8 proposes 158 as a rider on 062.
- **Fix:** start 061 part 2 only after 062 is merged. Take 158 as a rider only inside 062's run.

### L4. Wrong overlap claims in dossier-070, refute-070 and refute-010 about 009

- **What:**
  - 009 edits only `yaml-parser.ts` and its tests, with no Svelte change (dossier-009:3, :12). It cites `type-sidebar.logic.ts:426-440` as evidence only (`issues/009-*:5`).
  - dossier-070 § 5 and refute-070 S2 say 009 and 070 share `type-sidebar.logic.ts`. They do not.
  - refute-010's replacement Notes say 010 shares `CollectionView.svelte` with 009. It does not.
  - `priority-2026-11-08.md:63` contradicts itself: "every VE and VD Issue" runs in series, yet 070's own never-beside list leaves out VD-01 (009).
- **Fix:**
  - Keep chain V serial unless the owner grants an exception, so this changes no schedule.
  - Correct refute-010's replacement Notes text before it is pasted into Issue 010.

### L5. 004 -> 015 leaves an interim save behind

- **What:** 004's plan adds `if (flushPendingEdits(tabPath)) await saveFileByPath(tabPath)` in `closeTab`. 015's save-first makes that line redundant (dossier-004 step 4, refute-004 S6). Unless 015's Issue says so, its agent may keep two saves.
- **Fix:** add one line to 015's Notes: remove 004's interim save and put the save after 004's flush. 016, which is `Blocked by: 015`, stays deferred.

### L6. Two files share the number 006

- **What:** `issues/006-calendar-archived-overlay-outlives-hide.md` (needs-triage, Blocked by none) and `issues/006-kanban-card-lane-title-being-edited-saved.md` (Blocked by 004). The ledger row 006 (`ledger.md:43`) is the kanban one, so the calendar Issue has no ledger row and cannot run.
- **Fix:** renumber the calendar Issue and give it a ledger row through `relay ledger`.

### L7. 043 and tasks 244 both change how the entries snapshot refreshes

- **What:** 043 makes user renames, deletes and creates request a prompt index refresh, and tests it in `tauri-listeners.service.test.ts`. Tasks 244 edits `tauri-listeners.service.ts` and `vault-entries.service.ts` to add a write overlay. Both are cache-refresh logic under `docs/agents/indexing-watcher-rules.md` (I).
- **Fix:** do not run 043 beside 244. 244 is after 241 in the tasks chain, so 043 in chain E2 will very likely land first (I).

### L8. 045 and 161 share the Rust search path

- **What:** both name `fts_repo.rs`, `search_index.rs` and `help/documentation/06-search-and-navigation.md`. 161 needs cargo. 045's frontend variant (validate s1+s2: S) needs only `search.service.ts` and `search.logic.ts`.
- **Fix:** run them in series. Run 161 under the cargo rule (M2). Correct 161's accented-first-letter criterion first (validate s7+s8).

### L9. 094 (reduced) touches `lens.logic.ts` and `NoteRow.svelte`

- **What:** besides `editor.service.ts:125`, 094 names `lens.logic.ts` (the folder lens) and `NoteRow.svelte`. 043 sits in the lens series, and 214 also edits `NoteRow.svelte`.
- **Fix:** keep 094 after 043 in slot 1, and run 214, if taken as a rider, after 094.

## Blockers on deferred or closed Issues

| Issue | Blocked by | Problem |
|---|---|---|
| 067 | 010 | queued later than 067 (H1) |
| 139 | 138, 069 | both deferred (M5) |
| 141 | 068, 013, 136, 137, 140 | 013 deferred; 136, 137, 140 in the deferred chain (M5) |
| 025 | 024 | meta-bind, deferred (M5) |
| 013 | 012, 010 | both queued; 013 itself deferred, and it blocks 069 and 136, so the .view chain stays parked |
| 138 / 143 / 228 | 069 / 138 / 142 | deferred chain; no queue impact |
| 100 | 039, 004, 052 | 039 (canvas) and 052 (kanban) deferred |
| 027 | 004, 026 | 026 (canvas) deferred |
| 006 (kanban) | 004 | 004 queued; 006 deferred |
| 016 | 015 | queued; 016 deferred |
| 029 | 028 | queued; 029 deferred, and it shares `duplicateItem`, so run it right after 028 if it is taken |
| 131 | 011 | its text also wants 010 or the new count Issue (M4) |
| 152 | 040, 151, 048 | 151 is done (`07ec74a68`, `ledger.md:167`); the Issue file still lists it |

No queued Issue's blocker points at a closed or wontfix Issue. The tasks Waits on lines (tasks-view-ux 123 and 243 on 030, open-itens 198 on 236) are all satisfied: 030, 236 and 198 are done.

## Not checked

- Nothing was run. Whether relay-lite launches a named Issue whose blocker is not done comes from the ledger's "force" wording, not from the relay-lite source.
- Whether other sessions (the `update-tauri-to-v3` or `ios-poc` worktrees) run cargo was not checked.
- Hunk-level conflicts are inferred from the files and functions the Issues name. No trial rebase was done.
