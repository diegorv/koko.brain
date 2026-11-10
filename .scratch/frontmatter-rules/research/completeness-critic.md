# Completeness critic: frontmatter rules discovery

2026-11-10. Read-only. Inputs: `.scratch/frontmatter-rules/discovery-2026-11-10.md` and every file in `.scratch/frontmatter-rules/research/` (scouts 01-16, validations 01-08, designs A-C, judges 1-2, mostly skimmed by grep; the discovery and both judges read in full). Code read at HEAD `2e2cc5b60`. Nothing was run. Each code claim below was re-opened for this file unless it says "via research".

Severity: **High** means the plan could ship something the owner did not ask for, or Issues will collide. **Medium** means a slice spec has a hole an implementer will fill by guessing. **Low** means a doc, test or wording gap.

## Summary table

| # | Gap | Severity | Kind |
|---|---|---|---|
| G1 | A rule that is added or edited does nothing to notes that already match; no D-question asks about it | High | owner decision missing |
| G2 | The owner's real rules were never examined (work-vault doc, 12 mods) | High | area no scout read |
| G3 | No sequencing plan against about 12 open, `ready-for-agent` Issues on the same files; 082 contradicts "log, never toast" | High | slice cannot ship alone |
| G4 | No defined behavior when the planned move fails | Medium | spec hole |
| G5 | Folder rules: `file.folder` is absolute, and no decision is offered on it | Medium | owner decision missing |
| G6 | Issue 096 (root destination writes `vault//x.md`) is inherited by S2 and not listed | Medium | risk not listed |
| G7 | Notes that rules skip without a word (comments, nested, 081, alias collisions) are not counted and not shown | Medium | unverified population |
| G8 | Only the templates folder is gated, not the system folder | Medium | gate gap |
| G9 | `always` plus the property-change trigger makes a key read-only; no D-question | Medium | owner decision missing |
| G10 | S2 is "JSON only", but a hand edit made while the app runs is overwritten by the next Settings edit | Medium | slice cannot ship alone |
| G11 | Issue 169 removes the refresh path the discovery relies on; G4's nudge order is wrong | Medium | claim contradicted by code/Issue |
| G12 | "Real stats" from the property index are stale or zero just when triggers fire | Medium | spec hole |
| G13 | Quick Capture and periodic notes: create-trigger coverage is not named for the owner | Low | owner decision not surfaced |
| G14 | A rule write cannot be undone with Cmd+Z | Low | user-facing fact not surfaced |
| G15 | No ADR or glossary step | Low | process |
| G16 | E2E test dropped from the slice table | Low | process |
| G17 | Idle gate can re-arm forever; a path-change run can overlap a long link rewrite | Low | spec hole |
| G18 | Discovery's "not verified" item on 001 can be partly closed now | Low | closes an open item |

## High

### G1. Adding or editing a rule changes nothing that already matches

- Owner goal: "when a note matches a rule, things change right away". Under the discovery, a note that already matches changes only on its next save, property change, create or rename. Section 7 lists "apply rules to existing notes" under "Not proposed" (`discovery:218`). No D-question asks the owner whether that is acceptable.
- Nothing runs when the rule list changes. `saveAutoMoveConfig` only writes the file (`auto-move.service.ts:70-88`). The only trigger is the after-save observer (`:94-127`).
- Cmd+S on a clean tab writes nothing and fires no observer (`editor.service.ts:189`, Issue 224). So the owner cannot "touch" a note to apply a new rule without editing it.
- The likely first use is "I add a rule for folder X and expect the notes in X to change". As planned, that does nothing.
- **To close:**
  1. Add a D-question with three options: (a) no backfill, documented; (b) an explicit "Apply to matching notes now" command with a match count and a confirm; (c) a "re-evaluate this note" command, which costs nothing because the runner already exists.
  2. For (b), size it from what the research already has: one File History snapshot and one reindex per note (scout-13 sections 4-5, validation-07 Correction 3 asks for a pre-write snapshot), the folder-children cap question (D12), and the Todoist scheduling per anchored note.
  3. Option (c) is cheap: a palette command that schedules the runner for the active path. It also gives a manual workaround for G7 and for date conditions that never fire (`discovery:62`).

### G2. The owner's real rules were never checked against the engine

- Issue 01's Origin note says the request came "while setting up the work vault (`brain-os-vault/docs/work-workflow-learnings.md`)" (`.scratch/auto-move-default-properties/issues/01-...md`, Notes, Origin). No scout read that document. It is outside the working directory, so this critic did not read it either.
- Every example in the research is made up (`side: x`, `status == "done"`, `_belongs_to.contains("AWS")`). The "Can / Cannot" list (`discovery:46-65`) was never run against the rules the owner actually wants. G5 shows why this matters: the one folder case Issue 01 motivates hits the absolute-path trap.
- The owner's 12 vault mods are built from `~/kokobrain-vaults/kokobrain-mods-src` (owner memory). The discovery lists "whether any of them writes frontmatter on save" as not verified (`discovery:274`). That leaves two risks open: a loop outside the guard (`discovery:150-152`), and a mod that already does part of this feature. A mod that stamps defaults would be a second rule system, against the "one engine" preference.
- **To close:** ask the owner for the path, or for permission to read `brain-os-vault/docs/work-workflow-learnings.md` and the mods source. Then:
  1. write 3 to 6 real rules as `{condition, actions, destination}`;
  2. mark each one expressible, expressible with a trap (absolute folder, ASCII names, null receivers, aliases), or not expressible (transitions, computed values);
  3. grep the mods source for `updateFrontmatter`, `vault.modify`/`write` and `onNoteSaved`, and list each mod that writes frontmatter, with its keys.

### G3. No sequencing against the open Issues on the same code

These are open in `open-itens/ledger.md` and touch `auto-move.service.ts`, `auto-move.logic.ts`, the Settings section or the icon index. Statuses re-read for this file:

| Issue | Status | Touches | Covered by the discovery? |
|---|---|---|---|
| 001 caret | ready-for-agent | editor | blocker, listed |
| 030 / 031 broken config | ready-for-agent | `loadAutoMoveConfig` | blocker, listed |
| 054 Markdown only | ready-for-agent | observer gate | "absorbed by S1"; no step marks 054 `wontfix`/superseded, so relay can still launch it |
| 079 rule edit flushed on close | ready-for-agent, blocked by 031 | `AutoMoveSection` | named in S3 only |
| **082 failed move toasts** | ready-for-agent, **owner first-wave pick 2026-11-06** | the `evaluateAndMove` catch (`:189-194`) | **not mentioned**. It adds a toast per failed move, against Issue 01 Behavior 7 and D17 ("log, never toast"). With more triggers the failure repeats more often. 082's own criterion "no toast per save" needs a per-path memory that S1/S2 must keep. |
| **096 root unarchive and `..`** | ready-for-agent | `resolveDestination`, `destPath` (`auto-move.service.ts:175`) | **not mentioned** (G6) |
| 105 skip flag | needs-triage | panel | blocker for S6, listed |
| **169 icon index** | ready-for-agent | the `file-icons` consumer | named only as "do not hang a trigger on it". It also deletes the refresh path section 2 relies on (G11). |
| 224 docs example | ready-for-agent | help page, example JSON | **not mentioned**. S2 edits the same help page. |
| 005 / 022 empty block | ready-for-agent | writers | listed |
| **081 unquoted wikilink** | ready-for-agent | `detectLossyFrontmatter` | **not mentioned** (G7) |

- Owner memory: relay auto-launches `ready-for-agent` Issues, with up to 3 workflows at once. S1 and S2 rewrite `evaluateAndMove`. 082, 096 and 054 edit the same lines. Parallel runs will conflict, or will ship behavior that S2 then reverses (082's toast).
- **To close:** write a one-table plan before the Issues are written. For each Issue: land before S0, absorb into S1/S2 (and mark it superseded), or hold as `needs-info`. 082 needs an owner call: toast once per note per session, or log only. That is also D17's question, asked for moves.

## Medium

### G4. What a run writes when its move fails

- The run is "plan, move, write once" (`discovery:100-102`). The planner re-plans at the destination, so destination-keyed actions (Issue 01's motivating case) are planned for a path the note never reaches when `moveItem` throws. It throws on an existing target (`fs.service.ts:312`, via judge-1 section 1).
- Today the icon is skipped on failure (`auto-move.service.ts:189-195`). S0 pins that skip, then S2 is silent about it. Three readings are possible:
  1. write nothing;
  2. write the source-path plan, which needs a second planner pass;
  3. write the destination plan at the old path, which is wrong for folder-keyed actions.
- Each failure also reaches Sentry on every save (`fs.service.ts:322-324`, validation-01:139). The new triggers multiply that.
- **To close:** add a planner contract line to S2 ("a failed move writes nothing for that run", the simplest) and a test. Tie the Sentry and toast volume to D17 and 082.

### G5. Folder rules and the absolute `file.folder`

- `buildNoteRecord` sets `folder` to the absolute parent path (`collection.logic.ts:31-33`). `file.inFolder(x)` is a case-insensitive `startsWith` on it (`evaluator.ts:572-575`). So `file.inFolder("Projects/AWS")` never matches, and an absolute argument also matches siblings (`/v/work` matches `/v/workshop`).
- The shipped examples work around it with `file.folder.endsWith('/auto-move-features/Inbox')` (`help/examples/auto-move-features/auto-move-rules.json:6,18,29,42,49`).
- The discovery lists the trap (`discovery:61`) but no remedy and no decision. Folder-keyed actions are the motivating case of Issue 01 and of S5.
- Any engine fix, such as a vault-relative argument or a separator check, changes Collection filters too, because there is one engine. That is the owner's own constraint.
- **To close:**
  1. grep `.view` files and the help examples for `inFolder(` to see whether any rely on the prefix or absolute form;
  2. add a D-question with three options: (a) document `endsWith('/X')`; (b) make `inFolder` vault-relative with a separator check, for Collection too; (c) a rule-only helper, which is a second dialect and against "one engine";
  3. state the cost of each for Collection.

### G6. Issue 096 is inherited by S2

- `destPath = ${vaultPath}/${resolvedDest}` (`auto-move.service.ts:175`). `moveItem` builds `${targetDirPath}/${fileName}`. A destination that resolves to `''` (unarchive at root, or a template that resolves to empty) gives `vault//x.md` in the tab and in the Rust index. 096 confirmed this with a test (Issue 096, "Evidence").
- The discovery keeps "a template that resolves to `''` still means the root" (`discovery:68`). It adds "re-plan at the destination" and an own-move mark keyed on the `to` path. A non-canonical `to` breaks the mark match and the per-path queue key.
- `..` segments are not rejected (096 section 3).
- **To close:** put 096's root-destination half before S2, or into S1, with a test that the own-move mark and the queue key use the normalized path.

### G7. Notes that rules skip without a word

- The writable gate skips every `LossyFrontmatterReason`: `unparseable`, `nested`, `comments` and the rest (`properties.logic.ts:357-369`), plus alias collisions (validation-03 R2) and the empty block (005/022).
- Two of these are common in hand-written or agent-written vaults:
  - YAML comments (`properties.logic.ts:416,428`);
  - unquoted wikilinks such as `up: [[Home]]`, reported as `nested` until Issue 081 lands. The owner's relationship keys (`_belongs_to`) are exactly where such a link appears.
- The skip logs at most a debug line. The owner gets no "why didn't my rule apply" signal. How many of the owner's notes fall in this set is unknown.
- **To close:**
  1. ask the owner to run, or allow, a one-off count over the work vault of notes where `detectLossyFrontmatter !== null`, by reason (`get_all_vault_entries_v2` plus the TS check);
  2. decide whether 081 is a co-requisite of S2;
  3. decide whether skipped notes get a Settings hint ("N notes skipped: frontmatter has comments") or only a log, which is D17's sibling.

### G8. The system folder is not gated

- The gates list the templates folder from `settingsStore.templates.folder` (`discovery:107`), not the system folder. The defaults are `folder: '_system/templates'` and `systemFolder: '_system'` (`settings.store.svelte.ts:97-100`).
- Lists, the calendar day lens and QueryJS all exclude the system folder (`excludeSystemFolder`, `type-sidebar.logic.ts:65-75`; callers `kb-api.ts:15`, `day-lens.logic.ts:46-48`). A broad rule such as `_type == null`, fill `_organized: false` would stamp Markdown under `_system/`: mod docs under `_system/mods/<id>/`, dashboards, and the periodic and capture templates if the templates setting points elsewhere.
- **To close:**
  1. list the `.md` files that ship or are generated under `_system/` (mods, help examples, type definitions);
  2. ask the owner to choose between gating the whole system folder (consistent with lists) and the templates folder only.

### G9. `always` makes a key read-only

- With the property-change trigger, an `always` rule rewrites a key the user changed by hand about 0.8 s later, because nothing is reverted and nothing is exempt. Scout-07 Q2 (`scout-07:150`) asked who wins. The discovery dropped the question. The idle gate (D10) only delays the rewrite until the tab is clean.
- The lifecycle warnings (`discovery:173-174`) cover four keys. They do not cover the general case, for example `status`.
- **To close:** add a D-question with three options: (a) intended, and the Settings and panel copy says "managed by rule N"; (b) exempt the keys the triggering edit changed (the `previousContent` diff already computes them, so it costs little in S6); (c) `always` runs only on save and create, never on property change.

### G10. S2 "JSON only" has no safe way to edit the JSON

- S2 ships actions with no UI until S3, so the owner edits `.kokobrain/auto-move-rules.json` by hand. Three facts make that unsafe:
  1. the config loads only at vault open (`app-lifecycle.service.ts:303`);
  2. `.kokobrain` is a hidden directory, which the watcher drops (`docs/agents/indexing-watcher-rules.md` rule 5), so there is no reload;
  3. `saveAutoMoveConfig` writes the whole in-memory store on any Settings edit (`auto-move.service.ts:70-88`, Issue 224 evidence).
- So a hand edit made while the app runs is lost silently at the next Settings change. 031 covers only a failed parse.
- The store spreads rules (`auto-move.store.svelte.ts:22-36`), so `actions` survive edits of other fields. That was checked and is not the risk.
- **To close:** S2 either documents "edit with the vault closed, or reopen it", or adds a "Reload rules" command. Or S2 and S3 ship together.

### G11. Issue 169 and the refresh nudge

- Section 2 says icon writes reach the sidebar "through the `file-icons` note-change consumer" (`discovery:40`). Issue 169 (`ready-for-agent`) deletes that consumer's raw-text parse. After 169 the icon index is patched only from the throttled `vault-index-updated` delta, about 2 s alone and up to 10 s in a burst, which 169 accepts as a cost.
- G4's nudge (`discovery:24`) is the mitigation, but it is placed **after** the write. The existing callers call `vaultStore.requestPromptIndexRefresh()` **before** the write (`lifecycle.service.ts:34`, `:50`, `:68`; flag semantics at `vault.store.svelte.ts:113-123` and `tauri-listeners.service.ts:147-149`). Called afterwards, the flag can miss the save's own index event and speed up some later, unrelated event instead.
- **To close:**
  1. specify "call before `updateNoteFrontmatter` / `moveItem`", copying `lifecycle.service.ts:34`;
  2. decide the order between S2 and 169;
  3. add `_color`/`_title_color` to the G4 key list, which names `_icon` only.

### G12. Real stats are stale or zero when the triggers fire

- The fix is to read stats "from the index record (`collection.service.ts:152-162` pattern)" (`discovery:64`). That pattern is `existing?.mtime ?? 0` (`collection.service.ts:153-160`). The record is refreshed by the throttled delta, 2 to 10 s late (indexing rule 12). So:
  - a note created by Quick Capture, a deep link or Todoist has no record at its first save run, and `file.ctime` is 0;
  - after a move, the record at the new path may not exist yet;
  - at the create transform there is no record at all.
- A rule like `file.ctime > today()` ("new notes") silently fails exactly when it matters.
- **To close:** define the fallback per trigger: now for create, the record if present else now for save, and the record at `from` for path changes, as A proposed (judge-1 section 3). Test each one.

## Low

### G13. Quick Capture and periodic notes

- Quick Capture creates with a raw `writeTextFile` plus `notifyAfterSave` (`deep-link-actions.ts:213-216`; the composer window hands the write to the main window, `src-tauri/src/events.rs` `QC_COMPOSER_CAPTURE_RESULT_EVENT`). So it never reaches the create transform. Its rules apply about 3 s later as a second closed-note write: one more History row, one reindex. The owner uses Quick Capture daily (memory). D14 should name it rather than say "deep-link creates".
- Periodic notes go through `openOrCreateNote` (scout-08 table). So under D14(a), create rules apply to every daily note, including the one auto-created at startup. Explicit organization deliberately excludes periodic notes (`explicit-organization.logic.ts:5-7`, via scout-10).
- **To close:** add both to the D14 copy, and ask whether periodic notes are in or out.

### G14. Undo

- Rule writes into the open tab go through `replaceDoc` with `Transaction.addToHistory.of(false)` (`MarkdownEditor.svelte:184-188`). Cmd+Z never reverts a rule write. Only File History can, with its limits (validation-07 R2). Scout-04 line 109 noted this. The discovery does not pass it on.
- **To close:** one line in the help section of S2.

### G15. No ADR or glossary step

- `CONTEXT.md` does not exist (design-A:17, re-checked with `ls`). The runner contract is foundational and will be cited by later Issues: one runner per path, claims, a fixed point with move re-selection, first-match move with all-match actions, no key removal. "Rule" already has several meanings (Auto Move rule, lifecycle rule, `RESERVED_KEY_RULES`, layer rules; design-A:17).
- **To close:** add an ADR (next is 0038) to S2, and a glossary entry through the domain-modeling skill once D1 is answered.

### G16. E2E dropped

- Design C proposed one E2E happy path (`design-C.md:385`). No Auto Move E2E spec exists (scout-15 section 3.7). The slice table runs "frontend gate only" everywhere. CLAUDE.md rule 8 and the one-E2E-per-checkout limit apply.
- **To close:** add one E2E to S3: create a rule, edit a note, assert the rendered property.

### G17. Two timing holes

- **Idle gate.** "Re-arm while the active tab is dirty" has no cap. Continuous body typing re-arms at every fire. This is harmless, but the spec should say "no cap" on purpose, or cap it at the body autosave's max wait (`editor.service.ts:227`, 10 s).
- **Path change.** The consumer's timer starts mid-`applyPathChange` (`path-change.service.ts:174-182`). `moveItem` awaits the link rewrite and the Rust renames after that (judge-1 section 1). A slow link rewrite in a large vault can exceed `debounceMs`, so the run may read before `rename_note` lands. It reads the disk or the tab, so it is mostly safe. Only a note that links to itself is rewritten by both.
- **To close:** state that the run never depends on the Rust entry or the tree at fire time (scout-08 constraint 2), and leave it.

### G18. Partly closing "how 001 maps a selection through a whole-document replace"

- `replaceDoc` does not replace the whole document. It dispatches the line-level `docDiff` hunks (`MarkdownEditor.svelte:174,190`; `doc-diff.logic.ts:27-40`) and only then forces `EditorSelection.cursor(Math.min(cursorPos, ...))` (`:186`). Mapping the current selection through those hunks is therefore well defined. Only the `null` (too large) branch, which builds a fresh state (`:175-182`), keeps the old-offset behavior.
- **To close:** confirm against 001's "What to build". This reduces the risk the discovery lists at `discovery:272`.

## Claims re-checked and found sound

- The observer runs before `updateNoteFrontmatter` returns: `frontmatter-write.service.ts:132-133,160-162`, `editor.service.ts:191-196`. X1 holds.
- `writeTab` captures `content` at `:191` and calls `markSavedByPath` at `:195`, so `previousContent` is reachable.
- `toggleAutoMoveHook` does not clear timers (`auto-move.service.ts:134-146` against `resetAutoMove` `:218-231`).
- Only `isViewFile` gates today (`auto-move.service.ts:97`). `.canvas` and `.kanban` are separate extensions (`fs.logic.ts:76-83`), so the Markdown gate covers them.
- The four `create_note` sites match validation-05 R4: `note-creator.service.ts:103`, `fs.service.ts:208`, `mod-vault.service.ts:103`, `closed-note-writer.service.ts:76`.
- The own-move mark pattern exists as cited (`event-calendar.service.ts:583-601`).
- `registerPathChangeConsumer` is at `path-change.service.ts:73`.

## Not verified by this critic

- The owner's vault, the work-workflow doc and the mods source (G2, G7). All are outside the working directory and need the owner.
- How many `.view` files use `inFolder(` (G5).
- Whether todoist-bisync Issues 11, 12 and 14, delivered 2026-11-10, add frontmatter writers beyond scout-09's inventory. HEAD `2e2cc5b60` includes them, and scout-09 cites `sync-now.service.ts`, but this critic did not diff the inventory against those Issues.
