# Scout 09: every other frontmatter writer, and where a rule engine would collide with it

Scope: all code paths that write a note's frontmatter (or create/rename a note with frontmatter) other than Auto Move, for the planned "frontmatter rules" feature. Read-only research at HEAD (`2e2cc5b60`). Nothing was run. Cited as path:line; "unverified" marks what I inferred and did not confirm by reading every step. Sibling reports (scout-04 write path, scout-06 after-save trigger) are built on, not repeated.

## 1. Summary

1. There are 14 distinct writers (table in section 2). Only 6 go through `updateNoteFrontmatter` (`core/frontmatter/frontmatter-write.service.ts:99`); the rest are raw string writers (deep link, type rename, Rust `propagate_type_rename`), in-editor transactions (meta-bind, Properties panel, Kanban, Todoist open-tab) or creation-time content builders (templates, explicit organization, quick capture). `src/tests/lib/raw-write-ratchet.test.ts:23-44` lists every allowed raw `writeTextFile` site with its reason; it is the best inventory of "writes a note without `updateNoteFrontmatter`".
2. Most writers touch keys no sane rule would target (`todoist_project`, `_favorite`, `date/start/end/event_color`, `_rail`, `_list_*`). The real conflict surface is narrow but sharp, in five places:
   - **Auto Move's icon write removes `_color`/`_title_color` when the rule has none**, so a frontmatter rule that sets `_color` fights it forever (H1).
   - **The Properties panel rebuilds the whole block from its own stale store**, so a rule write landing within ~300 ms of a panel edit can be silently erased by the next panel edit (H2). This is the exact scenario of the owner's "on property change, immediately" trigger.
   - **No shared per-path write queue.** Three private queues exist (event calendar, list prefs, bookmark migration comment) and `updateNoteFrontmatter` documents "callers must serialize" (`:95-97`). A rule engine is a new unserialized caller, and an "on rename" trigger races the event calendar's rename-then-write (H3) and the Todoist cycle (H4).
   - **Todoist ADR 0037 two-way sync does not ping-pong on frontmatter** (it owns exactly one frontmatter key, `todoist_project`), but a rule must never write that key, and a rule that moves or creates notes in the sync folder changes Todoist scope (H5, H6).
   - **Creation has 8 independent content builders** with no shared "after create" hook; "on create" rules cannot piggyback on one place (section 5).
3. Of the writers, only two re-enter `notifyAfterSave` with the same shape a rule's write will: `updateNoteFrontmatter` callers and the editor autosave. Todoist task writes, type rename, link rewrite, create and rename do not fire after-save observers (section 4).
4. A third expression-like evaluator exists, `utils/template.ts` (`<% tp.date.now() %>`), used at creation only. It is separate from the Collection engine and from QueryJS. Relevant to the owner's "one engine" preference: a rule action's value should not grow a fourth syntax; if values need `now()` or `file.name`, they come from the Collection engine, not from `processTemplate`.

## 2. Writer inventory

"After-save" = does the write end in `notifyAfterSave` (observers fire, so Auto Move / Todoist scheduler / mods `onNoteSaved` / a future rules observer see it).

| # | Writer | Trigger | Keys written | Mechanism | After-save? |
|---|---|---|---|---|---|
| 1 | Todoist `writeProjectId` (`todoist-sync/sync-now.service.ts:887-911`) | A sync cycle creating a Todoist project from a note in the sync folder | `todoist_project` only (`:890-893`) | Open tab: patch tab content, `syncExternalContentToEditor(..., 'body')`, no save (`:895-901`). Closed: `updateNoteFrontmatter` (`:903`) | Open tab: later, via the 2 s autosave. Closed: yes, `:161` |
| 2 | Todoist project-note creation (`pull.logic.ts:607`, `closed-note-writer.service.ts:74-81`) | Pull finds a Todoist project with no note | New note with frontmatter `todoist_project: <id>` | Rust `create_note`, then `applyNoteChange({source:'create'})` | No |
| 3 | Todoist task-line writes (`note-writer.service.ts:41-85`, `closed-note-writer.service.ts:35-64`, Rust `commands/vault.rs:898-947`) | Every cycle | Body only (task lines), never frontmatter | Closed: Rust `write_task_lines`, `write_atomic` (`vault.rs:938`), `settleTaskWrite`. Open: view transaction or `syncExternalContentToEditor(..., 'body')` | Closed: no (`applyNoteChange('task')`). Open tab: via autosave later |
| 4 | Todoist project-note rename (`sync-now.service.ts:954-973`, `renameItem` at `:960`) | Todoist renamed a project | none (renames the file) | `renameItem` -> `applyPathChange` -> path-change consumers | No (path change, no observers) |
| 5 | Lifecycle toggles (`properties/lifecycle.service.ts:36,52,70`) | User click / Cmd+E: favorite, organized, archived, type rail pin | `_favorite`, `_organized`, `_archived`, `_rail` | `updateNoteFrontmatter` | Yes; the archive toggle is documented to rely on it so Auto Move applies `_archive_to` (docstring of `toggleActiveNoteArchived`) |
| 6 | Bookmark migration (`properties/bookmark-migration.service.ts:63-80`, called at `app-lifecycle.service.ts:300`) | Once per vault open, only while `.kokobrain/bookmarks.json` exists | `_favorite: true` | `updateNoteFrontmatter`, sequential | Yes (closed notes `:161`) |
| 7 | Event calendar (`event-calendar.service.ts:759`, `:1004`; `event-calendar-event.logic.ts:309-330`, `:344-362`) | Calendar drag / resize / edit dialog / duplicate / create | `date`, `start`, `end`, `all_day`, `event_color`, `location`, `event_title`; on create `_type` plus the same | `updateNoteFrontmatter` after an optional `renameItem` (`:732-735`); duplicate and create go through `createFile` | Update: yes. Duplicate/create: no (`applyNoteChange('create')`) |
| 8 | Icon / color writes (`file-icons/frontmatter-icon.service.ts:57-90`, `file-icons.service.ts:118-135`) | Icon picker (`NoteRowMenu.svelte:172`), Auto Move icon (`auto-move.service.ts:209`) | `_icon`, `_color`, `_title_color` | `updateNoteFrontmatter`; also `fileIconsStore.updateFrontmatterIcon` (`file-icons.service.ts:131`) | Yes |
| 9 | Properties panel (`properties/properties.service.ts:83-107`) | User edits a field in the right sidebar | Any key | Rebuilds the block from `propertiesStore.properties`, `syncExternalContentToEditor(..., 'frontmatter')`, no save | Later: 500 ms frontmatter autosave (`editor.service.ts:229-230`) |
| 10 | Meta-bind inputs and button `updateMetadata` (`live-preview/widgets.ts:855-890`, `meta-bind-button.logic.ts:8-14`) | User clicks a widget in a note | Any bound key | CodeMirror transaction replacing the frontmatter range of `view.state.doc` | Later, via autosave (500 ms if the edit touches the YAML block, per scout 06) |
| 11 | Kanban board (`app/EditorView.svelte:80`, `plugins/kanban/KanbanView.svelte:60-89`) | Board interaction | No frontmatter edits; frontmatter is kept verbatim (`kanban.types.ts:98`) | `onContentChange(markdown)` of the whole tab | Later, via 2 s autosave |
| 12 | Mods (`plugins/mods/mod-app.service.ts:53,65`, `mod-vault.service.ts:121-135`, `mods-host.service.ts:554-579`) | Mod code: commands, shortcuts, `onNoteSaved` | Anything | `ctx.app.updateNoteFrontmatter`, `ctx.app.saveFileByPath`, `ctx.app.syncExternalContentToEditor`, `ctx.vault.write` (whole file, refuses a dirty tab `:130`) | `updateNoteFrontmatter`: yes. `ctx.vault.write`: yes (`:135`) |
| 13 | Type rename (`type-definitions.service.ts` `renameType`, raw `writeTextFile` at `:233`; Rust `propagate_type_rename_inner`, `vault.rs:397-437`, `write_atomic` at `:425`) | User renames a type | `_type` (and the `type` alias) across all member notes | Raw rewrite of open tabs, then a Rust pass over every member | No (`applyNoteChange('save')` for tabs, Rust index update for the rest) |
| 14 | Creation-time content builders (section 5) | New note | `_organized: false`, `_type`, `_belongs_to`, `_related_to`, `title`, `tags`, template frontmatter | String transforms before `create_note`/`writeTextFile` | Mostly no; deep link yes |

Others reading as writers but not frontmatter: `list-prefs.service.ts:44` writes `_list_*` keys of type definition notes through `updateNoteFrontmatter` inside its own queue (`serializeListWrite`, `:23-40`); `file-history`, `settings`, `trash`, `auto-move` config writes are non-note files (ratchet test list).

## 3. Per-writer notes that matter to a rule engine

### 3.1 Todoist two-way sync (ADR 0037)

What it owns in a note: the `🆔 td-...` anchors on task lines (body) and one frontmatter key, `todoist_project`. It reads `todoist_project` from the property index (`vault-scan.service.ts:106-108`). Nothing else in frontmatter is read or written, so a rule on any other key cannot ping-pong with Todoist through the bases (`local_base` / `remote_base` hold task-line fields only, ADR "Two-base field merge").

Facts a design must respect:

- **Reserved key.** A rule must never set, clear or "always set" `todoist_project`. Changing it re-parents or detaches a project note (`projects.logic.ts:172-282`: a note whose id is unknown is treated as new, a note with no id directly in the sync folder becomes a NEW Todoist project at `:277-291`). Recommend a deny-list of keys a rule action may not write: `todoist_project` at minimum.
- **Scope is path-based.** `isInSyncScope` (`anchor.logic.ts:104-110`) excludes only `_system/`, `.kokobrain/`, `.view` and the templates folder. A rule that moves or creates a plain note directly in the Todoist sync folder makes it a Todoist project on the next cycle (creating a project in the user's account, within the create cap and first-run preview). That risk exists today with Auto Move destinations; a frontmatter-only rule engine does not add it, but a "create note" or "move" action would.
- **Todoist renames and moves are not frontmatter changes, but they ARE path changes.** A Todoist project rename renames the note via `renameItem` (`sync-now.service.ts:960`); a local rename pushes `project_update` (`projects.logic.ts:221-229`); a local move only updates the base (`:225`). If the rules engine adds an "on rename/move" trigger (owner wants it), it WILL fire on Todoist-driven renames of project notes. Harmless while rules only write frontmatter (Todoist ignores it). If a future rule action renames a file, it ping-pongs with Todoist: local rename -> `project_update` -> Todoist name -> rename note -> ... Keep file-name actions out of scope, or exclude `todoist_project` notes.
- **Task-line edits are guarded and tolerate frontmatter growth.** First-anchor writes locate the line by 1-based line number from the index plus the expected text (`task-line-edits.logic.ts:131-134`). If a rule adds a frontmatter line between the scan and the write, the line number shifts, the guard returns `lineDiffers` (stale), the whole batch is dropped, and the next cycle retries (all-or-nothing, design rule 12). Cost: one delayed cycle, not corruption. Anchored edits (`locate`, `:123-128`) do not depend on line numbers.
- **The Todoist observer reacts to any save of a note holding an anchor.** `sync-scheduler.service.ts:90-98` arms a 5 s timer and requests an automatic cycle when saved content `hasAnchoredLine`. Every rule write that goes through after-save on a note with anchored tasks therefore also schedules a Todoist cycle (30 s minimum spacing, `startAutoSync` docs). A rule that keeps writing (volatile value) keeps scheduling cycles.
- **Todoist's open-tab writes never save** (design rule 12, `note-writer.service.ts:21-34`, `:83`). A rule write on an open tab goes through `updateNoteFrontmatter`, which saves the WHOLE tab (`frontmatter-write.service.ts:131-141`), flushing Todoist's pending in-tab edits to disk early. Safe (the edits were already synchronously in `tab.content`), but it means rule writes make "Todoist wrote it" reach disk before the 2 s autosave; no correctness issue found.

### 3.2 Event calendar (ADR 0032)

Event notes are `_type: Event` notes; the calendar reads and writes `date`, `start`, `end`, `all_day`, `event_color`, `location`, `event_title` (`event-calendar-event.logic.ts:309-330`). `event_color` is a separate key from the icon system's `_color` (do not conflate them when designing "colors" actions).

- It optimistically overlays its writes in a store (`putPending`, `settlePending`, `event-calendar.service.ts:750-805`) until the index shows the new state. A rule that "always sets" any of those keys on event notes overrides a user's calendar drag within the debounce, and the calendar shows the wrong state until the overlay settles or its version clock runs out (settling details unverified beyond `:796-803`).
- It serializes its own writes per path with `enqueue(path, ...)` (`:998`, queue design at `:361-398`), but that queue knows nothing about other writers.
- Rename then write: `renameAndWrite` calls `renameItem` (inside `asOwnPathChange`, `:732-735`) and then `updateNoteFrontmatter(target, ...)` (`:759`). A path-change consumer for "on rename" runs synchronously in `applyPathChange` after the disk op and before the link rewrite (scout 06 section 3.3). If it starts an async rule write on the same closed note, that write overlaps the calendar's field write that begins right after `renameItem` returns (H3).
- Duplicate copies bytes from the tab or disk and rewrites only `event_title` (`:1000-1004`); a rule-written key is copied along. Create goes through `createTypedNote`, so it picks up whatever type template and `applyExplicitOrganization` give it (section 5).
- Recommendation: either leave `_type: Event` notes out of "always set" rules on the calendar's keys, or let the owner opt specific keys out. Fill-if-missing on other keys is safe.

### 3.3 Properties lifecycle (`lifecycle.service.ts`)

- Keys `_favorite`, `_organized`, `_archived`, `_rail` are the lifecycle flags (ADR 0026, ADR 0027 table). They drive lists, the rail, and Auto Move lifecycle rules (`generateLifecycleRules(typeMetadataMap)` built from `_archive_to`, `auto-move.service.ts:~170-173`).
- A rule that writes `_archived`, `_organized` or `_type` feeds Auto Move: write -> after-save -> Auto Move re-arms its debounce on the new content -> may move the note. That chain is intended by Issue 01 rule 6 but means "rules fighting each other" can span two features (rule A sets `_archived: true`, lifecycle rule moves the note to `_archive_to`, rule B on the new folder sets it back). Needs a first-match or priority story across both feature sets, or a documented warning.
- Explicit organization (default on, `settings.store.svelte.ts:158`) inserts `_organized: false` into every user-created note at creation. A "fill only if missing" rule on `_organized` never fires on new notes (the key is already there); an "always set" one overrides the inbox flag on every save. Rules that touch lifecycle flags should be called out as special.
- Lifecycle clicks use `requestPromptIndexRefresh()` to skip the throttled version bump (`lifecycle.service.ts:33`, `:48`, `:67`) so lists update at once. A rule that changes `_favorite`/`_organized`/`_archived`/`_rail` or `_type` has no such nudge; lists and the rail would lag by the throttle (about 2 s isolated, up to 10 s in a burst, per `docs/agents/indexing-watcher-rules.md` rule 12) unless the engine also requests it. Unverified whether the rule engine's after-save write path already triggers a faster bump.

### 3.4 Icon and color writer (the most direct overlap)

- `setFrontmatterIcon` = `withIconColors(upsertProperty(props, '_icon', pack:name), color, titleColor)` (`frontmatter-icon.service.ts:57-67`), and `withIconColors` REMOVES `_color` / `_title_color` when the argument is absent (`:25-30`). So "set an icon" through the existing helper erases a user-chosen color. A rules action that sets only `_icon` must NOT call `setIconForPath`; it must write through one `mutate` that touches only the keys the rule names, as scout 04 also recommends.
- The icon store has a second path: `setIconForPath` updates `fileIconsStore` right after the write (`file-icons.service.ts:131`). The store otherwise rebuilds from `get_all_vault_entries_v2` (`buildFrontmatterIconIndex`, `:201-225`), called at vault init (`app-lifecycle.service.ts:426`) and after full watcher rebuilds (`watcher-handler.service.ts:78`). Whether the incremental note-change consumer (`registerFileIconsNoteChangeConsumer`) refreshes the icon for an after-save write is stated in `docs/agents/indexing-watcher-rules.md` rule 6 but I did not read its body; a rules engine that writes `_icon`/`_color` directly must confirm the icon appears without a manual `updateFrontmatterIcon` call. Unverified.
- Auto Move's icon is an existing "always set" precedent: `evaluateAndMove` applies `rule.icon` on EVERY matching save, even when the note is already in the destination (`auto-move.service.ts:200-216`), overwriting a user's manual pick each time. Per-action "always set" semantic already exists for icons in Auto Move, with no opt-out.

## 4. Conflicts and races

### H1. Auto Move icon vs a frontmatter rule on `_color` / `_title_color` (infinite loop, high confidence)

1. Auto Move rule R has `icon` with no `color`. On each save it calls `setIconForPath(..., color undefined)` (`auto-move.service.ts:209`), which removes `_color`/`_title_color` (`frontmatter-icon.service.ts:25-30`).
2. A frontmatter rule F "always sets" `_color: red` on the same notes.
3. F writes `_color` -> after-save -> Auto Move observer re-arms (`auto-move.service.ts:96-126`) and 3 s later removes `_color` -> that write notifies -> F fires -> ...
   Neither write is a byte no-op, so `next === base` (`frontmatter-write.service.ts:129`) never stops it. Each cycle also writes a File History snapshot and a reindex and, with anchored tasks, schedules a Todoist cycle.
Mitigation options: an `_icon`/`_color`/`_title_color` write ownership rule (the new engine, not Auto Move, owns icon keys), or let Auto Move's icon be re-expressed as a rule action of the new engine (the "shared rule core" outcome), or at minimum make Auto Move's icon write preserve a color it is not configured to set. This is the strongest argument in this scout for NOT leaving Auto Move's icon write in place as a second implementation.

### H2. Properties panel erases keys a rule wrote (property-change trigger, high confidence by code reading, not reproduced)

- `commitChanges` builds `updated` from `propertiesStore.properties` (not from the tab content) and rebuilds the block (`properties.service.ts:83-107`, `rebuildContent(updated, body, content)` at `:99`). Keys present in the tab but absent from the store are dropped.
- The store re-parses from content through `PropertiesView.svelte:104-118`: debounced 300 ms for same-note edits, and `consumeSkipNextParse` (`properties.service.ts:37-41`) skips ONE parse after a panel commit to avoid a feedback loop.
- Sequence for "on property change, immediately": user edits a field at t0 (skip flag armed, `:100`) -> a rule fires synchronously and rewrites the tab at t0+ms -> the effect re-runs and its single 300 ms timer fires once, consumes the skip flag and does NOT parse the rule-modified content -> the store lacks the rule's keys and the panel does not show them -> the user's next panel edit rebuilds from the stale store and deletes them.
- Rules that fire after the 500 ms frontmatter autosave (the after-save path) land after the 300 ms timer and are parsed normally, so the problem is specific to a trigger that fires before the debounce elapses. Any "immediate" property trigger must either write through the same path the panel uses (so the store and the tab move together), or call `parseAndSetProperties` / `propertiesMatchActiveNote` after its write, or fire only after the panel's debounce.
- The same stale-store shape exists nowhere else: meta-bind builds from `view.state.doc` (`widgets.ts:867-870`), lifecycle and icons parse the tab at call time (`lifecycle.service.ts` `updateActiveNote` docstring says exactly this), and `updateNoteFrontmatter` reads `tab.content`.

### H3. No shared per-path write queue (closed-note lost update)

- `updateNoteFrontmatter` contract: "Concurrent calls on one closed note race and the last write wins, so callers must serialize writes per path" (`frontmatter-write.service.ts:95-97`). The closed branch is read (`:121`), `exists` (`:143`), `writeTextFile` (`:153`), with awaits between, so two overlapping calls lose one update.
- Serializers today are private and unrelated: `serializeListWrite` (`list-prefs.service.ts:23-40`), the event calendar `enqueue`, bookmark migration's sequential loop (`bookmark-migration.service.ts:63`), `saveTails` for editor saves only (`editor.service.ts:163-179`). The rule engine would be a fourth unaware writer.
- Concrete overlap: the "on rename" trigger vs the calendar's rename-then-write (3.2). Also "on create" vs the creator's own follow-up writes, and two triggers of the same engine for the same path (save debounce plus property change).
- Open tabs are safe: the tab branch is one synchronous read-modify-write of `tab.content` (`:116-119`, `:128-132`).
- Options: (a) the engine keeps its own per-path chain and accepts races with other writers (cheap, leaves the hole); (b) a shared chain inside `updateNoteFrontmatter` keyed by path (closes it for all callers, touches the single core write path). Note the owner's standing rule "no core changes for corner cases" (memory: no-core-changes-for-corner-cases): this one is not a theoretical corner, it is a documented contract the engine would violate daily, so ask rather than assume (open question Q2).

### H4. Rule write vs a Todoist cycle on a closed note (reverted Todoist change, plausible, unverified end to end)

- Todoist writes closed notes through Rust `write_task_lines`: read file, apply edits, `write_atomic` under the VaultIndex write lock (`vault.rs:898-947`, lock at `:965-969`). `updateNoteFrontmatter` writes through the TS plugin with no such lock and no atomic rename.
- If the rule's read lands before Todoist's write and its write after, the rule writes the OLD task line back. The Todoist cycle already moved its `local_base` for that line, so the next scan sees a local difference from `local_base`, i.e. a local edit, and pushes the old value to Todoist, reverting the remote change. I did not trace the order in which the cycle commits bases relative to the write (`todoist_commit_state`), so treat this as plausible, not proven. The window is milliseconds and needs a closed note, so rare; the consequence is a data reversion across two systems, which the owner's own rules call out as worth a named failure ("data, security or money at risk").
- Cheapest guard: the engine skips notes that carry an anchored task line while a Todoist cycle is running, or both use one per-path chain (H3 option b). Open tabs do not have this issue (synchronous patch on both sides).

### H5. Rule actions that move or create notes in the Todoist sync folder

See 3.1: `projects.logic.ts:277-291` turns any unlinked note directly in the sync folder into a Todoist project. Out of scope for frontmatter-only actions, in scope if the shared core also carries Auto Move's `destination`.

### H6. Observer chaining with Todoist, mods, Auto Move and each other

Scout 06 covers loops; additions from this scout:
- **Mods are an unbounded fifth writer.** `onNoteSaved` callbacks fire after every after-save (`mods-host.service.ts:554-579`, `setTimeout(0)`), and a mod may call `ctx.app.updateNoteFrontmatter` or `ctx.vault.write`, which re-fire all observers including the rules engine (`mod-vault.service.ts:135`). A mod that sets a key a rule also sets is the same ping-pong as H1, invisible to the engine. I could not inspect the owner's installed mods (they live outside the project tree; the vault mods source is not in the working directory). Which mods write frontmatter on save is an open question (Q4).
- **Observer order is registration order, not a contract** (scout 06 section 2.2). A new rules observer registered before Auto Move changes which rule sees a note first after a save; first-match semantics across the two features depend on it.
- **Stale decision on move.** Auto Move's debounce timer is keyed by the old path; the rule engine inherits the same issue (scout 06 4.3). A rule write on the old path after an Auto Move move hits `missing` (`frontmatter-write.service.ts:145`), logged, not toasted.

### H7. Templates and system notes get rewritten

- Auto Move's default `excludedFolders` is empty (`auto-move.service.ts:30`), and its observer excludes only `.view` (`:96-100`). Todoist scope explicitly excludes `_system/`, `.kokobrain/`, `.view`, and the templates folder (`anchor.logic.ts:104-110`); default templates folder is `_system/templates` (`settings.store.svelte.ts:98`).
- Template notes can contain `<% tp.file.title %>` or `<% tp.date.now(...) %>` in their frontmatter (`utils/template.ts:22-31` expands them at creation). A rule matching a template note and rewriting its frontmatter through `rebuildContent` could re-quote or refuse it (a value starting `<%` is not plain YAML in all positions; behavior unverified by execution). The type-definition notes, `.view` files and `_system/mods` also live in or near these paths. A rule engine needs the same default exclusion as Todoist: `_system/`, `.kokobrain/`, hidden dirs, templates folder, `.view`, and probably type-definition notes.

### H8. Writers that bypass `updateNoteFrontmatter` can stomp a rule write

- Deep link append/prepend/overwrite read from disk and write the whole file raw (`deep-link.service.ts:269-340`); it calls `saveOpenNoteBeforeWrite` first (`:243-248`), then reads, then writes. A rule write between the read and the write is lost. Deep link then calls `notifyAfterSave`, so the rules run again and converge.
- Type rename (`type-definitions.service.ts:233`, `vault.rs:425`) rewrites `_type` raw and fires no after-save, so a rule that matches on `_type` does not re-evaluate after a rename, and a rule EXPRESSION that names the old type (`_type == "Task"`) is not updated: `renameType` has no reference to auto-move rules (no hit for `autoMove` in `features/type-definitions/*.ts`). The same will hold for the new rules config. Document it or add a path-aware refresh.

### H9. Kanban and open-tab writes

Kanban re-derives its board from `editorStore.activeTab.content` (`EditorView.svelte:80`; `KanbanView.svelte:60-89` re-parses on `markdownContent`), keeps the frontmatter verbatim, and writes back the full serialized text on interaction. A rule write on an open kanban tab is picked up by the next re-parse. I did not verify there is no window in which Kanban serializes a stale parsed board over a rule write (the `if (newMarkdown === markdownContent) return` guard at `:87` suggests it compares to the live prop). Low risk, unverified. Kanban note saves do fire after-save, so rules see them; every card drag is a save, so the "on save" rules re-evaluate on each interaction.

## 5. Note creation: the "on create" trigger has no single seam

Creation paths and their content builders (all build a string, then call `create_note` / `writeTextFile`):

| Path | Where | Frontmatter shaping | Index/notify |
|---|---|---|---|
| Template / inline note | `core/note-creator/note-creator.service.ts:78-118` | `loadNoteTemplate` (`<% %>`), then `buildContent` | `create_note` + `applyNoteChange('create')`, no after-save |
| Typed note | `type-definitions.service.ts:129-155` (`createTypedNote`) | type template, `buildContent`, `applyExplicitOrganization` | `createFile` |
| "+ New here" / Cmd+N | `rail-shell/new-note.service.ts:25-46` | `newNoteContent(rule)` + `applyExplicitOrganization` | `createFile` |
| Command "new file" | `app/commands.ts:134` | `applyExplicitOrganization('')` | `createFile` |
| Quick capture | `plugins/quick-capture/note-composer.service.ts:49` | template frontmatter, `withUnorganizedFlag` | creator path |
| Deep link new | `deep-link.service.ts:306-340`, `app/deep-link-actions.ts:210-216` | injected title/tags (`deep-link.logic.ts:384-455`), explicit organization | silent create calls `notifyAfterSave` (`:337`); others do not |
| Hub "New linked note" / 1:1 | `note-action-bar.service.ts:79`, `one-on-one.service.ts:96` | `ensureFrontmatterLink` (`_belongs_to`, `_related_to`) + explicit organization | creator path |
| Calendar event | `event-calendar.service.ts` `createEvent` -> `applyEventDraft` | `_type`, `date`, `start`, `end`, ... | `createTypedNote` |
| Mod `ctx.vault.create` | `mod-vault.service.ts:102-115` | whatever the mod passes | `applyNoteChange('create')`, no after-save |
| Todoist pull | `pull.logic.ts:607`, `closed-note-writer.service.ts:74-81` | `todoist_project` | `applyNoteChange('create')` |
| Watcher (note appears from outside, git pull, another editor) | `watcher-handler.service.ts` | none | `applyNoteChange('watcher')` |

Consequences:
- There is no choke point where a rule can shape content before the first write; `applyExplicitOrganization` is the existing "creation-time rule", already copy-pasted into five builders. A rules engine that wants "on create" has two honest options: (a) a post-create `NoteChangeConsumer` for source `create` that performs a second write (two writes, an extra snapshot, a visible flash in the file; the consumer interface does not expose the source, scout 06 section 3.3), or (b) a pure "apply rules to content" function called from each builder (8+ call sites, mirrors explicit organization, one write, but touches many files). Option (b) also breaks for watcher-created notes, which would still need (a).
- Because creation builders already put `_organized: false`, `_type`, `_belongs_to` in the first write, a "fill only if missing" action sees them as present and respects them; an "always set" action overrides them after the fact. This matches the owner's per-action semantics and needs no special case, but the docs should say so.
- Todoist-created and mod-created notes do not fire after-save, so "on save" rules do not see them until the first real save; only a create trigger would.

## 6. Constraints a design must respect (derived from the above)

1. All frontmatter writes by the engine go through `updateNoteFrontmatter` with ONE pure `mutate` per note per evaluation (icons, colors and properties folded together). The `raw-write-ratchet` test (`src/tests/lib/raw-write-ratchet.test.ts`) enforces that raw writes outside `core/filesystem` are listed; a rules writer should not add a raw site.
2. `mutate` must be pure (it can run twice, `frontmatter-write.service.ts:95`) and must compare on canonical keys (`canonicalizeKey`): `_icon`/`icon`, `_color`/`color`, `_organized`/`organized`, `_type`/`type`, `_title_color`/`title_color` (ADR 0027 table; scout 04 section 8 has the naive-upsert hazard).
3. A deny-list of keys an action may never write: `todoist_project` (3.1). Strong candidate additions: `_type`? (it drives type membership, rules, Auto Move lifecycle; decide explicitly), `_archived` (feeds moves), `_favorite_index`. Owner decision.
4. Default exclusions: `_system/`, `.kokobrain/`, hidden dirs, the templates folder, `.view`, probably type-definition notes (H7).
5. Skip notes whose frontmatter is lossy (`detectLossyFrontmatter`), quietly, as Auto Move does for icons (`auto-move.service.ts:203-207`), because the write would otherwise toast on every autosave.
6. "Always set" with a volatile value (a timestamp, a counter) never converges and also re-triggers Todoist cycles, File History and reindex; forbid it in the value language or evaluate only on a user-originated save (needs an origin argument on the hook, scout 06 2.1).
7. An immediate property-change trigger needs a decision on H2 before it ships (write through the panel's path, or parse the store after the write, or wait out the 300 ms debounce).
8. Two rules, or a rule plus Auto Move, setting the same key to different values are a ping-pong. Mitigations already proposed in the spec (first-match-wins, Issue 01 rule 5) cover only rules inside the Auto Move list. A separate rules list needs first-match (or last-wins-by-order) with a documented order across features.
9. The engine's own evaluation must handle the path changing under it (debounce timer keyed by path), as scout 06 4.3 describes.
10. Caret blocker (`.scratch/open-itens/issues/001-...`) applies to every active-tab write of the engine, including the property-change trigger, where the user is guaranteed to be typing in the note or panel.

## 7. Recommendation relevant to "extend Auto Move vs separate feature vs shared core"

From this area only (the full recommendation belongs to the synthesis):

- The icon overlap (H1) is the single concrete, already-existing collision. It argues for ONE owner of `_icon`/`_color`/`_title_color` writes: either the shared rule core absorbs Auto Move's icon action, or Auto Move's icon write is changed to touch only keys it configures. Two independent icon writers with different "remove if absent" semantics will fight.
- Todoist and the event calendar impose no engine-level coupling beyond a deny-list, default exclusions and a per-path write chain; they do not favor any of the three structural options.
- The "creation has no seam" finding (section 5) means "on create" is the most expensive trigger in this codebase whichever structure is chosen, and is separable: ship save and property-change first.

## 8. Open questions only the owner can answer

- Q1. Should "always set" be allowed on keys other features own: `_archived`, `_organized`, `_favorite`, `_type`, the calendar's `date/start/end/event_color`? Default proposal: allowed except `todoist_project`, with a warning in the rule editor for lifecycle and calendar keys. Alternative: a hard deny-list.
- Q2. May the engine rely on a per-path write chain inside `updateNoteFrontmatter` (touches the one core write path, closes H3 and H4 for every writer), or keep a private chain in the rules feature (leaves races with calendar, Todoist and mods)? Cost of the shared chain: a small change in core; cost of leaving it: rare closed-note lost updates, one with cross-system reversion (H4).
- Q3. Should the Auto Move icon action move into the new engine (single icon owner, resolves H1) or stay as is with a "do not set `_color` in a rule on notes covered by an Auto Move icon" caveat?
- Q4. Which installed vault mods write frontmatter on `onNoteSaved` or via `ctx.app.updateNoteFrontmatter`? I could not inspect them (outside the project tree). Any that set a key a rule also sets will loop.
- Q5. For "on property change, immediately", is a delay equal to the panel's 300 ms re-parse (so H2 disappears) acceptable, or must the effect be same-keystroke? The second needs the panel and engine to share a write path.
- Q6. Should rules skip notes with anchored Todoist lines while a cycle is running, or is the H4 window (milliseconds, closed notes only) acceptable?

## 9. Not verified

- Whether a no-op-looking write could differ byte-wise after `rebuildContent` on already-canonical frontmatter (affects loop termination; scout 06 also flags it).
- The order in which a Todoist cycle commits bases relative to its note writes (H4 chain), and how its `stale` handling reacts to a body line reverted by a foreign writer.
- Whether the file-icons note-change consumer refreshes `fileIconsStore` for an after-save `_icon` write without the explicit `updateFrontmatterIcon` call.
- Event calendar overlay settle behavior when a foreign write changes a calendar key (read only the call sites, not `prunePending`).
- Behavior of `<% %>` frontmatter in template notes under `rebuildContent` (reasoned from the serializer, not executed).
- Kanban stale-serialize window (H9) and whether `bookmark-migration` at `app-lifecycle.service.ts:300` completes before the after-save observers register (`:441`, `:445`); it only matters while a legacy bookmarks file exists.
- Vault mods content; the Rust watcher's handling of rule-written files beyond the self-save marker (`markRecentSave` is called by `notifyAfterSave`, scout 06).
