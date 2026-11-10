# Judge 1: correctness and data safety

Judge 1, 2026-11-10. Lens: lost edits, caret and typing conflicts, write loops, oscillation, races with other writers, index/watcher rules, failure handling. Inputs: `design-A.md`, `design-B.md`, `design-C.md` (all three present), checked against the scout and validation files in this folder and against the code at HEAD `2e2cc5b60`. Nothing was run. Every code claim below was re-read for this report unless it is marked "via research".

## 0. Verdict

| Rank | Design | Score (10 = no known break) | One line |
|---|---|---|---|
| 1 | **A** (one Automations list, Auto Move becomes the `move` action) | **7.0** | Most complete planner (fixed point, claims, re-plan at destination, guards, broken-config backup). Two real breaks it shares with B (dead echo guard, moves outside the fixed point), plus a typing conflict from its 300 ms property-change delay. All fixable inside the design. |
| 2 | **C** (grow Auto Move in place, no property-change hook) | **6.5** | Smallest surface and the most honest echo reasoning (semantic no-op, no byte guard). Same move-cycle break with no guard at all, and "every rule on every trigger" lets move rules undo a manual drag at once. Misses the owner's "immediately". |
| 3 | **B** (shared core plus a separate Property Rules feature) | **5.5** | Same runner as A, but no re-plan at the destination, a refuted termination guarantee, a guard keyed on the wrong path, and a kept "remove colors" effect that makes a natural fill rule abort the whole run. Two lists and two switches add a hidden cross-provider precedence. |

All three agree on the load-bearing core, and that core is right: one runner per path, a per-path promise chain, fire-time read, one `updateNoteFrontmatter` call per run, a semantic no-op check before the writer, claim-on-match per key, an in-memory fixed point with a pass cap, Markdown and broken-block gates, and a pre-write create transform. The differences that matter for safety are in the details below.

## 1. Code facts this judgment rests on (re-verified)

- `updateNoteFrontmatter` returns the written content, and fires the after-save observers **before it returns**:
  - closed note: `notifyAfterSave(path, next)` at `frontmatter-write.service.ts:161`, `return next` at `:162`;
  - open tab: `syncExternalContentToEditor(path, next, false, 'none')` at `:132`, then `await saveFileByPath(path)` at `:133`, which runs `writeTab`, which calls `notifyAfterSave` at `editor.service.ts:196` before `updateNoteFrontmatter` returns at `:140`.
- `writeTab` sets `savedContent` (`markSavedByPath`, `editor.service.ts:195`) **before** `notifyAfterSave` (`:196`). A `previousContent` argument has to be captured before `:195`, at `:191`. Both A and B say "before the write", which is satisfiable, but the line matters.
- `updateNoteFrontmatter` on an open tab bases on `tab.content` (dirty buffer, `:119`) and saves the whole tab at once (`:133`): an engine write flushes the user's unsaved body early. That is not a loss.
- `mutate` can run twice (`:95-97`, restart at `:148`); concurrent closed-note calls race, last write wins (`:96-97`).
- `moveItem` awaits the whole `applyPathChange` (`fs.service.ts:307-322`), including the link rewrite, tree move, `rename_note` and `rename_in_search_index` (`path-change.service.ts:184-227`). It throws on an existing target (`fs.service.ts:312`). Path-change consumers run synchronously before the first await after `diskOp` (`path-change.service.ts:174-182`).
- YAML typed in the editor and panel edits autosave 500 ms after the last change, with no max wait (`editor.service.ts:230`, `:243-251`). Body edits autosave at 2000 ms with a 10 s max wait (`:227`).
- The Properties panel arms a single-use skip flag on commit (`properties.service.ts:28,38-39,100`). Issue 105 exists (`.scratch/open-itens/issues/105-...md`), as do 001, 005, 022, 031, 054.
- `isEmptyPropertyValue` (`properties.logic.ts:464`) and `toTruthy` (`evaluator.ts:632`) are private; `MAX_FORMULA_DEPTH = 10` (`evaluator.ts:18`). The designs' "export it" steps are needed.
- Lifecycle rules: archive needs `_archived == true` (plus a folder guard for `{folder}/<seg>`), unarchive moves to `{parent}` when `_archived == false` inside the archive segment (`type-lifecycle-rules.ts:39-56`).
- Today Auto Move evaluates the bytes captured at save time with `Date.now()` stats (`auto-move.service.ts:116-125,154`), and its icon write already re-enters the observer at the new path (validation-04 R6).

## 2. Breaks that hit more than one design

### X1. The byte echo guard in A and B is dead code as specified (A, B)

- A 5.1 step 7: call `updateNoteFrontmatter`, then "Record the returned bytes in `lastEngineWrite`". The save observer checks that map (A 5.6 step 6).
- B section 5, step 8: `next = updateNoteFrontmatter(...); lastEngineWrite.set(path, next)`.
- The observer runs inside the call (section 1), so when it checks the map the entry for this write does not exist yet. The echo is never skipped. Scout-06 line 139 already said a guard must be set before the call and cleared in a `finally`. Neither design picked that up.
- Consequence: A's layer 5 and B's "own-write guard" do nothing. Every engine write schedules a second run. For properties that run is a semantic no-op (A layer 4, B `hasEffect`, C F2), so the damage is one parse per write. For moves it is the root of X2.
- In A the echo also carries `propertyChange` (previous = `base`, frontmatter differs), so the echo run fires at the short cadence.
- B adds a second defect: the entry is set at `path` (the pre-move path), while the echo arrives at `newPath`, so it would miss even if the order were right. B 4.4's "re-key `lastEngineWrite` on own moves" runs before the entry exists.
- **Fix:** check the guard at **fire time**, not in the observer: the run reads the content and skips when it equals `lastEngineWrite.get(currentPath)`. That keeps validation-03 Missed 7 (byte match, a queued user save still runs) and needs no in-flight flag. Or drop the guard and rely on the semantic no-op as C does, after X2 is fixed. The guard is an optimization, never the termination argument.

### X2. Moves are outside the fixed point, so the write echo can chain and cycle moves (A, B, C)

- A section 4 step 4 picks the move on the record after the property fixed point. Step 5 re-plans properties at the destination but **does not re-select a move**. C 5.2 step 4 does the same. B does not re-plan at the destination at all.
- So the written state at the destination is a fixed point for properties only. When it selects another move, the next run moves again. With X1 the next run is the echo of the engine's own write, so no user event is needed.
- **Concrete unbounded loop**, valid for all three as written. User rules, in order:
  1. `file.inFolder("/v/A")`, set `side: "x"`, always;
  2. `file.inFolder("/v/B")`, set `side: "y"`, always;
  3. `side == "y"`, move to `A`;
  4. `side == "x"`, move to `B`.

  A note saved in A gets `side: x`, moves to B, is re-planned there to `side: y`, and is written at B. The echo at B selects rule 3, moves to A, re-plans to `side: x`, writes. The echo at A moves it back to B, and so on. Each hop is a move, a write, a File History snapshot, a reindex and a Todoist schedule, every `debounceMs` (C, B) or 300 ms (A, because the echo carries `propertyChange`), with no user event.
- The likelihood is low: it needs a cross-folder cycle in the user's config. But severity is high, and every design claims this cannot happen:
  - A 5.4: "A ping-pong such as 'Auto Move X -> Y, then Y -> X' is impossible";
  - A section 6, layer 6: "one move per run" (true per run, false per user event);
  - B 5.1: "Re-running on the written bytes is a no-op";
  - C section 8 item 2: "The write's own echo evaluates, finds `changedKeys` empty and writes nothing".
- A non-cyclic chain (A to B to C) is finite, but it costs one move and one write per hop through echoes. That is exactly the "chaining through the save" all three say they replace.
- **Fix (cheap, pure, in the planner):** after re-planning at the destination, select the move again. If it is not "already in destination", treat the run as a cycle: abort before acting, write nothing, move nothing, log once. The planner is pure in A and C, so the abort happens before `moveItem`. Then the written state is a fixed point for moves too, and termination no longer depends on any guard. Add a test: the four-rule loop above plans no move and no write.

### X3. Typing conflict from rule writes into the active tab during an edit (A, B strongly; C weakly)

- YAML typed in the editor autosaves 500 ms after a pause (`editor.service.ts:230`). A and B then run 300 ms later (A 5.3; B 4.2 says "short"). The run reads the open tab and writes through `syncExternalContentToEditor` with a full block re-serialization (`frontmatter-write.service.ts:128,132`).
- **Scenario.** Rule `true`, set `status: "todo"`, `ifMissing`, triggers include `propertyChange`.
  1. The user selects the value of `status: done` in the YAML, deletes it, and pauses about 0.8 s before typing the new value. The line is `status:`.
  2. The save fires with `status` empty. The run fills it with `todo` and rewrites the block under the caret.
  3. Without 001 the caret jumps to its old numeric offset. With 001 fixed, the caret maps past the inserted text.
  4. Either way the next keystrokes produce `status: tododone` or land in the wrong line.

  This is a silent corruption of the value the user was typing. The same happens in the panel: clearing a field to retype it commits, saves and refills within about 0.8 s. With an `always` rule on a key the user is editing, every pause reverts it.
- Fixing 001 does not remove this. It only makes the caret land in a sane place. C has the same mechanism at about 3.5 s, which needs a much longer pause, so it is rarer but not gone.
- **Fix to graft:** an idle gate for the **active** tab. At fire time, if the target is the active tab and it is dirty (the user typed after the save that triggered the run), re-arm instead of writing. Optionally also re-arm while the editor selection is inside the frontmatter range, if the owner wants that coupling (owner question J3). Background tabs and closed notes are unaffected. Lifecycle toggles and panel commits that end in a clean save still apply at the short cadence.

### X4. Issue 105 is not only a short-delay problem (A, B, C claims partly refuted)

- B 8: "Save-triggered runs land after the 300 ms window". C 7.2: 105 "does not block the 3 s default". A section 7 ties it to the property-change delay.
- The window is 300 ms after the latest **panel commit**, while the run timer counts from the latest **save**. A user who resumes typing in the panel at 2.95 s commits, and the run (armed by the previous save) writes at 3.0 s, inside the window. The panel's next commit then rebuilds from the stale store and drops the rule's key (validation-05 R6, validation-08 M4).
- Severity is lower than "data loss" here: the dropped key is the rule's own, and the next run re-applies it, because every design writes a fixed point. The user's own edits are not lost by this path. While the user keeps typing in the panel, the drop and refill can repeat, but it is bounded by the typing.
- **Consequence for slicing:** 105 is a co-requisite of any slice that writes to open notes, not only of the property-change slice. It is not a hard blocker for the save slice, because the loss self-heals.

### X5. The per-path queue does not follow the runner's own move (A, B, C; minor)

- The queue is keyed by path (A 5.1, B 4, C 7). Run R1 at X awaits `moveItem` (the full `applyPathChange` tail, `fs.service.ts:313`), then writes at Y. A run for Y queued meanwhile is not chained behind R1.
- For an open tab both writes go through `saveTails` (`editor.service.ts:171-179`) and the tab branch patches synchronously, so they are safe.
- For a closed note, only another module's rename onto Y, or a folder enumeration in A or B, could start such a run inside the window. That is rare.
- **Fix:** on an own move, set `queue[Y] = R1's promise` before awaiting the write. One line.

## 3. Design A: claims checked

Confirmed:
- One owner of `_icon`/`_color`/`_title_color` removes the H1 loop. Translating the legacy icon without color removal is correct, and it is the only design that both stops removal and keeps one list (A 3.3, layer 7).
- Planner pieces:
  - the semantic diff before the writer (A 4 step 6, validation-01 R1);
  - `ifMissing` re-checked inside `mutate` (A 5.1 step 7);
  - the `---` without a matched block gate (A 5.6 step 5, validation-04 R3);
  - the Markdown gate;
  - fire-time read;
  - real stats from the index with a capture at path-change time.
- Broken-config backup with refuse-to-save (A 3.2), and the downgrade-safe migration (the old file is never touched).
- Create transform before `create_note`: no tab, so no 001, one write, Rust indexes the final bytes. Both creators were verified (`note-creator.service.ts:101-103`, `fs.service.ts:208-209`). `createFile` computes `uniqueName` before `create_note`, so the transform sees the final path.
- No core import of features. The core changes are registries and an additive argument. Consistent with `indexing-watcher-rules.md` rule 6: every write still goes through `updateNoteFrontmatter`, then `notifyAfterSave`, then `applyNoteChange`, and creates go through `create_note` plus `applyNoteChange`.

Refuted or incomplete:
1. **The layer 5 echo skip never fires** (X1).
2. **"Ping-pong is impossible"** (X2).
3. **Save-only automations run at the property-change cadence.** A's pending entry takes the shortest delay of the merged triggers (A 5.1), and every property-change save is also a `save` (A 5.3). Step 1 then selects every automation whose triggers intersect `{save, propertyChange}`. So a move automation configured for "On save" only moves the open note about 0.8 s after a frontmatter keystroke, not after `debounceMs`. The per-automation trigger choice does not mean what the UI says. **Fix:** select by trigger and delay together. A `save`-only automation runs only when the `save` delay has elapsed, so either use two timers per path, or have the short run select only `propertyChange` automations and leave `save` pending.
4. **Delete does not cancel pending work.** A 5.4 step 1 is "return if `to === null`". The pending timer for the deleted path still fires and is caught as a vanished path (A 5.1 step 8). Harmless, but B and C cancel, which is cleaner and avoids a stray error path. Graft that.
5. **Folder enumeration can mass-move.** A 5.4 schedules up to 50 children with `pathChange`. Any automation with a `move` action and the `pathChange` trigger then moves children out of a folder the user just renamed. A does not say which triggers type automations get. **Fix:** runs for enumerated children are `set`-only, and type automations get `save` and `propertyChange`, never `pathChange` (owner question J2).
6. **Migration edge:** after a downgrade, edits made to `auto-move-rules.json` in the old build are ignored on the next upgrade, because `automations.json` already exists (A 3.3 step 1). The owner is the only user, so this is low risk. Document it.

Other risks (stated by A, agreed): a cycle abort empties the whole plan for that note, so one bad rule pair silently disables every automation on it, including unrelated moves. The card warning in A 9 is the mitigation. Keep it.

## 4. Design B: claims checked

Confirmed: the same runner core as A, with the same correct gates (B 5 step 3 is the best-written writable gate of the three), delete cancels pending runs (B 4.4), and the core re-checks the switches at fire time.

Refuted or incomplete:
1. **The termination guarantee is false.** B 5.1: "a run writes only a state on which the plan is a fixed point. Re-running on the written bytes is a no-op, so termination does not depend on the own-write guard". B moves after planning and does not re-plan at the destination (B 5, steps 6 to 8). The re-run at the new path sees a new `file.folder`, so folder-keyed rules can plan new writes and a new move. Termination does depend on the guard, and the guard is dead (X1).
2. **The Issue 01 motivating case needs a second write.** A move into the AWS folder followed by a folder-keyed fill of `_belongs_to` is not applied in the moving run. As written, the dead guard lets the echo apply it with a second write, a second snapshot and a reindex. With the guard fixed, it waits for the next user save. Either way B 5's claim that step 6 "replaces Issue 01 Behavior 6" with "one write instead of one write per hop" does not hold for destination-keyed actions.
3. **The guard is keyed at the old path** (X1).
4. **Keeping the legacy color removal makes the H1 fix conditional.** B 5.3 keeps "remove `_color`/`_title_color` on unclaimed keys". Scenario:
   - Property Rule P has the condition `_color == null` (a natural way to write "fill") and the action fill `_color: orange`. The note matches an Auto Move rule M that has an icon and no color.
   - Pass 1: P matches, claims and fills `_color`.
   - Pass 2: P no longer matches, so `_color` is unclaimed and M's remove effect deletes it.
   - Pass 3 equals pass 1, so the run aborts as a cycle. Nothing is written for that note, ever, and the log says "cycle".

   The removal also keeps deleting a color the user sets by hand on any note an Auto Move icon rule matches, on every save. That is today's behavior (`frontmatter-icon.service.ts:26-31`), but it contradicts "nothing is reverted" and keeps a key-removal effect inside the fixed point. Dropping removal (A, C) is the safe choice.
5. **Hidden cross-provider precedence.** Property Rules claim before Auto Move's icon actions (B 5.1, admitted as weakness 3). Two switches plus two excluded-folder lists mean a note excluded in one list is still written by the other provider in the same run. Each provider's exclusions are applied per provider (B 5 step 2), so this is not a bug, but it is a source of "why did this note change" reports.
6. **Calendar exemption is partial.** Skipping `move`/`rename` runs for `_type: Event` (B 8) avoids the `renameAndWrite` overlap, but `save` runs on Event notes still write. That is fine, because the calendar's write is serialized through its own path. This is a good idea, and it is listed as a graft.

## 5. Design C: claims checked

Confirmed:
- F1 to F8 is the clearest statement of the correctness floor, and every item checks out against the code.
- The no-byte-guard reasoning (C 8 item 2) is right for properties and avoids the X1 trap entirely.
- Delete cancels timers, and folder renames only re-key timers without evaluating children (C 7.3). That is the safest choice for a folder rename.
- No new feature pair, no new config file, and `examples-scoping.test.ts` keeps covering the file name.
- Create transform as in A.

Refuted or incomplete:
1. **"The echo writes nothing" ignores moves** (X2). C has no guard at all, so the four-rule loop runs at `debounceMs` forever with certainty.
2. **Every rule on every trigger lets move rules undo a manual move at once.** C 11, O6: no per-rule triggers, and slice C adds the path trigger for all rules. Scenarios:
   - A `status == "done"` rule moves to `Archive`. The user drags a done note back to `Projects` to keep working on it. About 3 s later it is back in `Archive`.
   - The type archive rule does the same to an archived note dragged out by hand.

   Today this happens only on the next save. With C it happens at once, and the user cannot hold the note in place without editing the condition's keys first. It is not data loss, but the engine fights the user's last action. **Fix:** move actions do not run on path-change triggers by default (A's per-automation triggers, or a fixed policy: path-change runs are `set`-only).
3. **105 "does not block the 3 s default"** is partly refuted (X4). The risk is lower, not zero.
4. **One-way legacy icon translation without a version field** (C 4): after the first save, an older build sees rules with no icon. The owner is the only user, so this is accepted, but A's separate-file migration is strictly safer.
5. **A broken config still wipes rules** until 031 lands (C 4, P3 is "recommended" before A2, not required before A1). A hand-edited JSON with a typo is reset to empty, and the next Settings edit overwrites the file. Since C makes the JSON richer and hand-edited, 031 should block A1, not A2.
6. **The latency gap is honest, not a bug.** But "lower `debounceMs` to 500" as the property-change answer brings X3 and X4 back at full strength, without the idle gate.

## 6. Scores by sub-criterion

| Criterion | A | B | C |
|---|---|---|---|
| Lost edits (user data) | X3 risk at 0.8 s; 105 self-heals | same as A; plus repeated deletion of user colors | X3 rarer (3.5 s); 105 self-heals |
| Caret / typing | 001 blocks the right slices; X3 needs the idle gate | same as A | same, lower frequency |
| Write loops | X1 plus X2 (the echo carries `propertyChange`, so it loops at 300 ms) | X1 plus X2, guarantee claim false | X2 with no guard |
| Oscillation (rule vs rule) | claims plus fixed point plus cycle abort: good | good, but the remove effect creates aborts | good |
| Races with other writers | per-path queue; X5; Todoist and calendar analyzed | same; best calendar mitigation | same |
| Index/watcher rules | compliant | compliant | compliant |
| Failure handling | best: backup, refuse-save, quiet refusals, once-per-session errors | good: shared backup service | weakest: depends on 031 |
| Unexpected writes by trigger design | save-only automations ride the short cadence; mass-move on folder rename | timing change admitted | manual moves undone at once |

## 7. Winner and grafts

**Winner: Design A**, with these mandatory corrections before any slice is written:

1. **Moves inside the fixed point** (X2): re-select the move after the destination re-plan, and abort the whole plan if a second move would be chosen. Test it with the four-rule loop.
2. **Echo guard checked at fire time, or dropped** (X1). The termination argument rests on X2's fix plus the semantic no-op, never on the guard.
3. **Idle gate for the active tab** (X3): a dirty active tab at fire time re-arms the run.
4. **Trigger selection honors each automation's delay** (A refutation 3).
5. **Children of a folder rename get `set`-only runs; type automations never take `pathChange`** (A refutation 5).
6. **Chain the queue across the runner's own move** (X5).
7. **Cancel pending runs on delete** (from B and C).

Ideas from the losers worth grafting onto A:
- **From C:**
  - the F1 to F8 floor table as the acceptance checklist of the S2/S3 Issues;
  - the semantic no-op as the primary echo stop (C 8.2), with no reliance on bytes;
  - "folder rename re-keys timers and evaluates no children in v1" as the default, with A's cap only if the owner asks (owner question Q10);
  - skip the S4 folder rename: C 15.6 shows that renaming later is mechanical.
- **From B:**
  - the writable gate as written in B 5 step 3 (`!startsWith('---') || (regex matches && not lossy)`);
  - skip `move`/`rename` runs for `_type: Event` notes (B 8), against the calendar's `renameAndWrite`;
  - the provider-level fire-time re-check of every switch;
  - the shared `rule-config.service` idea, reduced to one config, so the backup and refuse-save code is written once.
- **From neither, new:**
  - a test that the observer sees the echo before `updateNoteFrontmatter` resolves, so a future guard cannot regress X1;
  - an architecture-level test that runs the real `updateNoteFrontmatter` and the real `notifyAfterSave`, and asserts that a full rule set settles in a bounded number of runs with no user event.

## 8. Questions only the owner can answer

- **J1.** On a rule cycle (two always rules, or a move cycle), abort the whole run for that note (A, B, C) or apply what converged and skip only the cyclic keys? Abort is safer, but it silently disables unrelated rules on that note.
- **J2.** Should `move` actions ever run on move/rename triggers? Recommended: no for the path that was just changed by hand, so the engine never undoes a manual drag. Type `_archive_to` automations: save and property change only?
- **J3.** Idle gate scope: re-arm only while the active tab is dirty, or also while the editor caret is inside the frontmatter (a UI coupling)?
- **J4.** Legacy Auto Move icon colors: confirm that removal stops (A, C). B keeps it, and section 4 item 4 shows the cost.

## 9. Not verified

- No test or prototype was run. The X1 ordering is read from code (`frontmatter-write.service.ts:132-140,161-162`, `editor.service.ts:191-196`); the X2 loop is traced by hand.
- How 001's planned fix maps a selection through a whole-document replace (it determines how X3 lands on screen). I did not read Issue 001's fix sketch.
- `PropertyField.svelte` local state while focused (validation-02 says the same), which changes how visible X3 and X4 are in the panel.
- Whether `file.inFolder` includes subfolders. The designs rely on validation-08 M2 for "no separator check"; I did not re-read it.
- Timings: 300 ms, 3000 ms and the race windows are configuration values, not measurements.
