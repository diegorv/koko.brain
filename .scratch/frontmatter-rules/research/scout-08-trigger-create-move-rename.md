# Scout 08: create / move / rename triggers

Area: where a frontmatter-rules feature can hook "a note was created", "a note was moved" and "a note was renamed", how to keep its own writes and Auto Move's moves from re-triggering it, and whether external (watcher) changes belong in scope. Read-only research; nothing was run. All claims cite `path:line` at HEAD `2e2cc5b60`.

## 1. Summary

- There is NO single create owner and NO single "note appeared" signal. Creation reaches the indexes through four different shapes (section 3). A uniform "on create" hook has to pick one of: a pre-write content transform in two core creators, or a new registered post-create notification fired from `applyNoteChange`.
- Move and rename DO have one owner: `path-change.service.ts::applyPathChange`. It already has a registry (`registerPathChangeConsumer`, `path-change.service.ts:73`) with the exact event shape needed `(from, to)`. This is the safe hook for move and rename, with four constraints (section 4.2).
- The after-save observer (`editor.hooks.ts:52`) is the only hook that sees "the note's saved content changed". It is also fired by every frontmatter write the feature itself makes (`updateNoteFrontmatter`), so a feature that writes through it re-triggers itself. It terminates only because an unchanged rewrite is a no-op (`frontmatter-write.service.ts:133`). Conflicting "always set" rules do NOT terminate (section 5.1).
- Auto Move's own move is visible to a path-change consumer. The two features need OPPOSITE exclusion policies (section 5).
- Watcher (external) changes: recommend OUT of scope for v1. The watcher carries paths only, cannot tell an own rename or link rewrite from an external edit, and its large-burst branch (git pull, sync client) has no per-path content (section 7).

## 2. Constraints from `docs/agents/indexing-watcher-rules.md`

| Rule | Constraint on hooking here |
|------|---------------------------|
| 6 (`applyNoteChange` is the ONE owner of "a note's bytes changed") | The feature must not call per-file updaters directly or grow a second index owner. Any write it makes must go through a path that ends in `applyNoteChange` (`updateNoteFrontmatter` does, via `notifyAfterSave` at `editor.hooks.ts:69`). A new "created" notification may live next to the owner but must not take over its indexing job. Doc rule 6 would need an amendment if the hook sits inside `applyNoteChange`. |
| 6, sub-bullet "Consumers register, they are not imported" | `core/` cannot import `features/` (ADR-0003). Any hook placed in `core/filesystem/` or `core/note-creator/` must be a registry with a registration wired in `initializeVault` and unwound in `teardownVault`, or in `registerAppPorts` for app lifetime. "Forgetting the registration is a SILENT no-op." Pattern to copy: `registerEventCalendarPathChangeConsumer` wired at `app-lifecycle.service.ts:262`. |
| 6, sub-bullet "`save` must stay synchronous" | `NoteChangeConsumer.upsert/remove` must be synchronous (`note-change.service.ts:29`). A rule evaluation that reads files and writes frontmatter cannot live in a `NoteChangeConsumer`. It also would be called on `edit` keystrokes (1 s debounce, `note-change.service.ts:91`) and on every `watcher` upsert. Not a fit. |
| 6, sub-bullet "per-source policy" | `create` and `fs` upserts skip the Rust IPC and the dedupe map (`note-change.service.ts:93-94`), so each call is a real creation; `save` dedupes consumers. `restore` is a separate source. A post-create notification keyed on `source in {create, fs}` and `kind: upsert` fires once per creation. |
| 6, path changes | "Anything that changes a note's PATH goes one level up, through `path-change.service::applyPathChange`." Move and rename hooks belong on its registry, not on `applyNoteChange` and not on the watcher. |
| 4 (watcher) | Watcher is Rust-native, 500 ms debounce (`watcher.rs:34`), then a 300 ms TS debounce (`app-lifecycle.service.ts:509`); 1 to 10 Markdown files go incremental, more go to full rebuild with no per-path work. Payload is `{ paths: string[] }` only (`generated/VaultFilesChangedPayload.ts:7`): no event kind, no self-write flag. |
| 5 (hidden dir filter) | `.kokobrain/` writes never reach TS. The feature's rules file under `.kokobrain/` does not echo. |
| 7 (frontmatter autosave debounce) | A frontmatter edit (properties panel, YAML) arms the 500 ms timer; there is no separate "property changed" event. "On property change" is therefore the after-save hook with a 500 ms floor (`editor.service.ts` `scheduleAutoSave`, doc rule 7). Covered in depth by scout 06. |
| 8 (dedupe) | The delete branch clears the signature; a re-created identical file re-indexes. Not relevant to the hook itself, but the feature must not touch `index-dedupe` (`applyNoteChange` is the only reader/writer). |
| 9 (absolute paths) | Hook payloads and any rule-state keyed by path must be absolute. |

## 3. Creation paths (verified)

Core creators that write through Rust `create_note` and then call `applyNoteChange`:

| Creator | File:line | Source passed | `notifyAfterSave`? | Content in hand |
|---------|-----------|---------------|--------------------|-----------------|
| `createFile` (explorer New File, Quick Switcher, note-action-bar hub, type-definitions, event-calendar, canvas/kanban/view files) | `fs.service.ts:198-224` (`applyNoteChange` at 216) | `fs` | no | yes (`content` arg) |
| `openOrCreateNote` (templates, periodic notes, quick-capture composer, one-on-one, editor-host wikilink create, deep-link non-silent, mods app, type-definitions) | `note-creator.service.ts:78-132` (`applyNoteChange` at 118) | `create` | no | yes (after `buildContent`, line 101) |
| mods `vault.create` | `mod-vault.service.ts:103-115` | `create` | no | yes |
| Todoist `createNoteFile` | `closed-note-writer.service.ts:74-81` | `create` | no | yes |

Creators that write with `writeTextFile` and call `notifyAfterSave` (the after-save observers, including Auto Move, already fire):

- Deep link capture / silent create / prepend / append / overwrite: `deep-link.service.ts:262-340`, and `deep-link-actions.ts:55-75`, `:205-225` (daily note append, capture).

Creators with NO index call at all:

- `duplicateItem` (`fs.service.ts:345-365`): `copyFile` / `copyDirectoryRecursive` then `addScannedToTree`. The Rust index learns of the copy only from the watcher.
- Trash restore: `applyNoteChange` source `restore` (`trash.service.ts:257`), not `applyPathChange`. It is a move back, not a creation.

Consequences:

1. A hook on the after-save observer alone misses explorer-created, template-created, periodic and mod-created notes, which is the main "on create" population. Today, a new note from `openOrCreateNote` is first seen by Auto Move at its first save (about 2 s after the user types, 3 s Auto Move debounce, `settings.store.svelte.ts:112`).
2. Creation for non-Markdown goes through `createFile` too (`.canvas`, `.kanban`, `.view`; `canvas.service.ts:9`, `kanban.service.ts:19`, `collection.service.ts:34`). `isMarkdownFile` is already the guard at `fs.service.ts:215` and `note-creator.service.ts:117`; Auto Move uses `isViewFile` at `auto-move.service.ts:97`. The feature must skip non-Markdown and `.view`.
3. Startup ordering is fine: Auto Move config loads in step 3 (`app-lifecycle.service.ts:303`), the daily note is created in step 9 (`:533`). A rules config loaded alongside it is ready before `autoOpenDailyNote`.

### Create hook options

A. Pre-write content transform (recommended for notes that are brand new).
   - Apply the rules to the rendered content right before `create_note`: in `openOrCreateNote` after `buildContent` (`note-creator.service.ts:101-103`) and in `createFile` before the `call('create_note', ...)` (`fs.service.ts:208`). `buildContent` already exists as a documented "rewrite before it is written" seam (`note-creator.service.ts:33-38`).
   - Effects: one write, no tab to preserve, no after-save echo, no flash of a second write after the note opens, and notably no caret problem (Issue 001 blocker does not apply to a note that has no tab yet). Rust `create_note` indexes the final content, so `VaultIndex` never holds the pre-rule frontmatter.
   - `buildNoteRecord(path, content)` (`collection.logic.ts:22`) works on a path that does not exist yet.
   - Costs: `core/` cannot import the feature, so a registered pure-ish port is needed (a "pre-create content transformer" registry, app-lifetime or vault-lifetime). Two core call sites plus, optionally, `mod-vault.create` and `createNoteFile` (the latter two are machine writers; arguably should be left out). Must skip lossy frontmatter (`detectLossyFrontmatter`, `properties.logic.ts`) and non-Markdown. Must not throw: a failing rule must not block note creation (create must still succeed; log with `error`).

B. Post-create notification fired from the `create` / `fs` upsert branch of `applyNoteChange` (`note-change.service.ts:228+`).
   - One edit site covers `createFile`, `openOrCreateNote`, mods create and Todoist create, and the content is in hand (no re-read). Deep-link paths are covered by the after-save hook.
   - The feature then writes with `updateNoteFrontmatter`. The note is usually already open (`openOrCreateNote` opens it at line 126; `commands.ts:134-135` opens it), so the write lands in the ACTIVE tab: `syncExternalContentToEditor` plus an immediate save, and caret blocker 001 applies. Also the note gets two writes and two index updates, and `file-history` records a snapshot per save (`file-history.service.ts:192`).
   - Needs doc rule 6 amended: `applyNoteChange` would gain a side-effect notification. Risky given "Do not grow a second owner".

C. A new `notifyNoteCreated(path, content)` called from the creators (like `markRecentSave` is called today at 8 sites). Same effects as B, but N call sites that can drift, which is exactly what rule 6 warns against.

Recommendation: A for `openOrCreateNote` and `createFile`; the after-save hook for everything else (deep-link writers already call `notifyAfterSave`; machine writers get rules on their next save). Sources that route via other owners (`duplicateItem`, restore) are an owner decision (section 9).

## 4. Move and rename

### 4.1 Entry points

All disk moves and renames funnel through `applyPathChange`:

- `renameItem` `fs.service.ts:280-299` and `moveItem` `fs.service.ts:307-327`: both call `applyPathChange({ from, to, diskOp })`.
- Callers of `renameItem`: `FilesNavigator.svelte:176`, `NoteRowMenu.svelte:135`, `type-definitions.service.ts:224`, `event-calendar.service.ts:734`, `sync-now.service.ts:960` (Todoist rename), `mod-vault.service.ts:60`.
- Callers of `moveItem`: `FilesNavigator.svelte:285` (drag and drop), `mod-vault.service.ts:67`, `auto-move.service.ts:190`. The command palette / quick switcher stores matched the grep only for unrelated names (`moveItem` selection helpers); not verified as move entry points.
- `deleteItem` also goes through it with `to: null` (`fs.service.ts:248`); consumers must ignore `to === null`.

### 4.2 The hook: `registerPathChangeConsumer`

`PathChangeConsumer.pathChanged(from, to)` (`path-change.service.ts:38-49`): synchronous, called once per change after `diskOp` succeeded, `updateTabAfterRenameOrMove` already ran, and before the first await after it (`:171-182`). A folder change is reported ONCE, for the folder. Failures are isolated per consumer (`:178-180`).

Constraints a design must respect:

1. Consumers are synchronous and void. The consumer can only SCHEDULE an evaluation (debounced timer), never do the read and write inline.
2. At call time the world is mid-flight. The explorer tree is still pre-move: `moveTreeNode` runs after the link rewrite (`:198-199`). Rust `rename_note` and `rename_in_search_index` run after that (`:209-226`), so `VaultIndex` and the property index still hold the old key. The scheduled evaluation must read the note from an open tab at `to` (tabs are re-pathed before consumers, `:173`) or from disk at `to`, and must NOT depend on the Rust entry, `fsStore.fileTree` or the collection property index being updated. Debounce long enough (Auto Move already uses 3 s) or read from disk.
3. Folder move or rename: the consumer receives only the folder. To evaluate children it must enumerate paths under `to + '/'` later (tree after the move, or `get_all_vault_entries_v2`). A folder rename changes `file.folder` for N notes, and the motivating example of Issue 01 (folder implies a relationship) is exactly this case. That means N reads and potentially N writes from one drag. Needs a cap or a confirmation (open question).
4. A rename changes `file.name` and `file.basename`; a move changes `file.folder` (`buildNoteRecord`, `collection.logic.ts:29-33`). Both are inputs to rules, so both must evaluate.
5. Pending debounce timers keyed by path go stale. Auto Move keys `debounceTimers` by `filePath` (`auto-move.service.ts:22`, `:113-125`). A move of a note with a pending timer leaves it firing on the OLD path: `evaluateAndMove(oldPath, ...)` builds a record with the old folder and `moveItem(oldPath, ...)` fails (caught and logged at `:190-194`). This quirk exists today for user drags. A path-change consumer should drop or re-key timers for `from` and for `from + '/'` prefixes.
6. A write to a note renamed away from the path it was scheduled for fails: `updateNoteFrontmatter` in the closed branch calls `readTextFile(old)` which throws a plain fs error (not a `FrontmatterWriteError`), `frontmatter-write.service.ts:119-120`. The scheduled work must re-resolve the current path at fire time or handle both error shapes.
7. Link rewrites are not user touches. `updateLinksAfterRename` rewrites OTHER notes (`link-updater.service.ts:35-80`) and indexes them as source `save` but does not call `notifyAfterSave` (`:71`), so no after-save observer fires for them. Good: a rename does not cascade evaluations into its backlink sources through the after-save hook. (It does show up in the watcher, section 7.)

Editor state: the active note being renamed or moved gets a frontmatter write while open. `updateNoteFrontmatter` takes the tab branch (`syncExternalContentToEditor` + `saveFileByPath`, `:127-135`). Issue 001 (caret follows frontmatter rewrites) is therefore a blocker for the move and rename triggers on the active note too, not only for the save trigger.

### 4.3 Path change versus after-save for evaluation input

After a save the observer receives `(filePath, content)` (`editor.hooks.ts:33-34`) and Auto Move builds its record from that content (`auto-move.service.ts:152-154`). A path change has no content in hand. The scheduled evaluation must read: `editorStore.tabs.find(t => t.path === to)?.content` (unsaved edits win, as `link-updater.service.ts:51-54` and `removeFrontmatterIcon` do) else `readTextFile(to)`.

## 5. Excluding own writes and Auto Move's own moves

### 5.1 The feature's own writes

Fact: every frontmatter write by `updateNoteFrontmatter` ends in `notifyAfterSave`, in both branches (tab branch via `writeTab`, `editor.service.ts:196`; closed branch `frontmatter-write.service.ts:158`). That fires ALL after-save observers: the feature itself, Auto Move, file-history snapshot (`file-history.service.ts:192`), search hook (`search.service.ts:303`), Todoist scheduler (`sync-scheduler.service.ts:90`) and the mods host (`mods-host.service.ts:559`). Issue 01 rule 6 relies on exactly this to chain Auto Move.

Recommended exclusion (cheapest that works):
- Evaluate to a fixed point IN MEMORY: apply every matching rule against a working copy of the properties, re-evaluate up to a small bounded number of passes (so a later rule that matches on a property an earlier rule just filled still fires), compute one final mutation, write once through `updateNoteFrontmatter`.
- Remember `{ path -> content just written }` in a module-local map. The after-save callback for that path with identical content returns at once. Other observers (Auto Move, file-history, search) are independent and still see the echo, which is what the chain Auto Move relies on.
- Do not mark the write with `markRecentSave`: `notifyAfterSave` already does (`editor.hooks.ts:35`).
- Idempotence is the backstop: `next === base` returns without writing (`frontmatter-write.service.ts:133`), so a settled note produces no write and no echo.

Failure this guards: two "always set" rules that disagree on one key (`status = a` when `x`, `status = b` when `x`) with only per-save evaluation would write on every echo, about every 500 ms for an open note, forever. Fill-only-if-missing actions converge on their own; always-set does not. In-memory fixed point with a pass cap plus a loud log (and ideally a settings-screen warning for conflicting rules) is required.

### 5.2 Auto Move's own moves

Auto Move calls `moveItem` (`auto-move.service.ts:190`), which runs `applyPathChange`, so a path-change consumer sees it. A move does not call `notifyAfterSave`, so Auto Move today does not re-evaluate on its own move and cannot chain moves. If Auto Move ITSELF started evaluating on path changes (Issue 02), two rules with opposite destinations (X to Y and Y to X) could ping-pong, which is what Issue 02 warns about.

Two consumers, two opposite policies:

- Auto Move (Issue 02 case): must EXCLUDE its own moves. Pattern already in the repo: `asOwnPathChange` / `takeOwnPathChange` (`event-calendar.service.ts:583-601`): a module-local set of `{ from, to }` marks added around the call, consumed by the path-change consumer (`followPathChange`, `:621`). Same pattern: wrap the `moveItem` call at `auto-move.service.ts:190`, and have the consumer call `take(from, to)` first. The mark is set before `diskOp` and deleted in `finally`; a consumer call is synchronous inside `applyPathChange` so the mark is always present in time.
- Frontmatter rules feature: must NOT exclude Auto Move's move. A note Auto Move drops into `topics/AWS` is exactly the note whose folder-keyed defaults should now apply. It also repairs the ordering hazard in section 4.2.6: if the feature's save-triggered evaluation fires after Auto Move moved the note, the write at the old path fails with a missing file; the path-change event for that same move schedules an evaluation at the new path. No loop is possible, since the feature never moves notes and its own writes are idempotent and excluded per 5.1.

Ordering when both observe one save: both register on `addAfterSaveObserver` and both debounce on their own timers. Issue 01 rule 2 ("move first, then fill") assumes one function sequence. As two features, ordering is not guaranteed unless the feature schedules after Auto Move's debounce or tolerates the missing-file case. With the "shared rule core" or "extend Auto Move" shapes the single `evaluateAndMove` keeps the order; with a separate feature, section 4.2.6 plus the path-change trigger is the safety net. This is an input for the Auto Move relationship decision.

### 5.3 Other own-change sources to exclude from the path trigger

- Event-calendar renames and deletes (`event-calendar.service.ts:734`, `:1050`) and Todoist renames (`sync-now.service.ts:960`) run through `renameItem` and will fire the path trigger. These are programmatic renames of machine-managed notes. Whether rules should apply to them is an owner decision. A feature-level opt-out is cheap only if callers can mark themselves, as `asOwnPathChange` does.
- `mod-vault.service.ts:60-67` mod-driven rename and move: same question.

## 6. Create versus after-save overlap

Deep-link writers call `notifyAfterSave` after writing a new note (`deep-link.service.ts:312-316`). If the feature adds a create hook AND listens to after-save, a note created by a deep link is seen by after-save only (fine). A note created via `openOrCreateNote` with option A (pre-write transform) is seen by the create hook once, and by after-save at its first save: the content already matches the rules, so the fixed point finds nothing to change and writes nothing. Idempotence makes the overlap free.

## 7. External (watcher) changes: recommend out of scope

Evidence:

1. The payload is paths only, with no event kind (`VaultFilesChangedPayload.ts:7`, `watcher.rs:257-300` forwards `event.paths` and nothing else). A create, a modify and a rename are indistinguishable.
2. Own operations appear as external changes. `markRecentSave` is only called by some writers (grep: `fs.service.ts:209`, `note-creator.service.ts:107`, `task-write.service.ts:28`, `trash.service.ts:256`, deep-link writers, `mod-vault.service.ts:107`, `closed-note-writer.service.ts:77`, `type-definitions.service.ts:438`, plus `notifyAfterSave`). A rename or move marks nothing, and `link-updater.service.ts:58` writes backlink sources with `writeTextFile` and no `markRecentSave`. So after one user rename the watcher batch holds `from`, `to` and every rewritten backlink source, all unmarked, and `areAllRecentSaves` does not skip it (`watcher-handler.service.ts:50`). A watcher hook would evaluate those backlink sources and write frontmatter into notes the user did not touch.
3. A burst above 10 Markdown files (git pull, iCloud or Syncthing catch-up, vault restore) takes the full rebuild branch (`watcher-handler.service.ts:61-86`), which carries only `changedPaths`, no content. Evaluating that burst means N reads and up to N writes, in the middle of a sync, and a write on the machine that just pulled creates a second sync round trip. With two devices running the same rules and "always set" actions, the devices can race each other.
4. A write-back into an externally edited note can clobber an in-flight external save (the editor, git checkout). `reloadExternallyChangedTabs` explicitly lets the editor win over disk (`editor.service.ts:416-422`); a rule writer adds a third party.
5. No evaluation runs for notes that already exist at vault open (`initializeVault` has no pass). The state "notes created while the app was closed" is the external case by another name.

The in-scope surface instead: after-save (covers the app's own editor saves, properties panel and YAML edits), the create transform, and the path-change consumer. For backfill of old or externally changed notes, a manual "apply rules to this folder / vault" command is the safer sibling (explicit, previewable, bounded). That would be a separate Issue.

If the owner does want watcher coverage later, the safe hook is `incrementalUpdateFiles` (`watcher-handler.service.ts:94-126`), not `applyNoteChange`: content is already read in `readResults` (`:98-103`), only for `result.content !== null` upserts, and only for 1 to 10 files. A batch above the threshold should be skipped, not evaluated.

## 8. Test and doc implications (from the repo's own rules)

- Any new registry in `core/` (path-change consumer is existing; a pre-create transformer or created-observer is new) needs a `registerAppPorts` or `initializeVault` registration and a teardown test, since a forgotten registration is a silent no-op (doc rule 6).
- `layer-rules.test.ts` fails on any new `core/` to `features/` import (`CLAUDE.md` Layer Rules).
- Tests must use real stores and not mock `.logic.ts`. A path-change test can call `applyPathChange` with a stub `diskOp` and assert on real tab and store state; `src/tests/lib/core/filesystem/` and `src/tests/lib/features/auto-move/auto-move.service.test.ts` are the existing homes.
- Doc rule 6 of `indexing-watcher-rules.md` needs an edit if a hook is added to `applyNoteChange` (option B), or a short sentence under "Consumers register" if a new registry is added next to it.

## 9. Open questions only the owner can answer

1. Create trigger shape: is it acceptable that notes created by `openOrCreateNote` and `createFile` get properties set BEFORE the file is written (option A, invisible, one write), versus a visible second write after the note opens (options B and C)? A also means a failing rule must never block note creation.
2. Does "create" include a duplicate (`duplicateItem`, no index call today), a Trash restore, notes created by mods, Todoist closed notes and event-calendar notes? Recommendation: the first two no, the rest yes if they go through `createFile` / `openOrCreateNote`, with a way for machine writers to opt out.
3. Folder move or rename: evaluate every note under the folder? A folder rename can touch hundreds of notes. Options: unlimited, a hard cap (say 50) with a toast, or a confirmation.
4. Should a rename or move done by Auto Move, a mod, event-calendar or Todoist sync count as a trigger for the frontmatter feature? Recommendation: Auto Move yes (section 5.2), the others at the owner's discretion.
5. Conflicting "always set" rules: first-match-wins, all-match with later rule overriding, or a settings warning? This decides the shape of the in-memory fixed point (section 5.1). Fixed-point passes need a cap, and the cap behavior (stop and log vs toast) is a UX choice.
6. External changes: confirm out of scope for v1, with a manual "apply rules" command as the backfill path (section 7).

## 10. Not verified

- The `quick-switcher.store.svelte.ts` and `command-palette.store.svelte.ts` hits for `moveItem` were not opened; I assumed they are unrelated selection helpers.
- I did not open `periodic-notes.service.ts`, `templates.service.ts` or `one-on-one.service.ts` beyond confirming they call `openOrCreateNote` (grep). The event-calendar daily-note store was not traced past its header comment.
- I did not read `src/tests/` for existing coverage of `applyPathChange` consumers, and did not check ADR-0003 text beyond what `CLAUDE.md` summarizes.
- Rust `rename_note` / `create_note` read for index behavior only; I did not check whether Rust emits any event the TS side could use as a creation signal beyond `vault-index-updated` (`UpdateResult`, with `upserted` / `removed` paths; its throttled 2 s bump makes it unsuitable as a trigger).
