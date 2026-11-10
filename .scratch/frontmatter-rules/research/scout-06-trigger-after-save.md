# Scout 06: the after-save trigger

Scope: `src/lib/core/editor/editor.hooks.ts` (`addAfterSaveObserver`, `notifyAfterSave`), every real caller of `notifyAfterSave`, every observer, timing, payload, ordering and feedback loops. Read-only research; nothing was run. Everything below is read from code at HEAD (`2e2cc5b60`), cited as path:line.

## 1. Summary for the design

1. The after-save hook is a plain synchronous array of `(filePath, content) => void` observers (`editor.hooks.ts:10-13`, `:52-60`, `:67-88`). It carries NO old content, NO old frontmatter, NO source/reason. A "property changed" trigger cannot be derived from the payload alone.
2. It fires from the editor save and from a short, closed list of other writers (section 3). It does NOT fire for external edits (watcher), task writes, link rewrites, create, rename, move, restore. So "on create / move / rename" and "external YAML edit" have no hook today; only "on save" has one.
3. An observer that writes the note back re-enters `notifyAfterSave` and re-fires ALL observers, itself included. Today's only writer-observer (Auto Move icon) converges only because `updateNoteFrontmatter` returns early when `next === base` (`frontmatter-write.service.ts:128-129`). A rules engine that writes "always set" values must keep that property or add its own guard.
4. Auto Move's observer is the right shape to copy for the "on save" trigger (debounce per path, evaluate from the saved `content`, write after move) but it is a single-purpose observer inside the Auto Move feature, not a shared trigger bus. Anything new either adds a second `addAfterSaveObserver` or shares the Auto Move one.

## 2. The hook itself

### 2.1 API and payload

- `AfterSaveObserver = (filePath: string, content: string) => void` (`editor.hooks.ts:10`). `content` is the plaintext written (doc comment `:7-9`). Return value ignored; an async observer's rejection is NOT caught by the hook (only synchronous throws are, `:79-85`), so observers must catch their own async errors (File History does: `file-history.service.ts:193-195`; Auto Move does: `auto-move.service.ts:116-122`).
- `notifyAfterSave(filePath, content)` does, in order, all synchronously (`editor.hooks.ts:67-88`):
  1. `markRecentSave(filePath)` (15 s self-save marker for the watcher, `:19-37`).
  2. `void applyNoteChange({ kind: 'upsert', source: 'save', ... })` which, for source `save`, runs the Rust IPC and fans out to registered per-file indexes synchronously (policy row `note-change.service.ts:90`: `consumers: 'deduped', rust: 'always', mark: true, yieldBeforeConsumers: false`). Rules 6 and 17 of `docs/agents/indexing-watcher-rules.md` require `save` to stay synchronous.
  3. `notifyContentInvalidated()` (`note-change.service.ts:153-161`).
  4. Loop over `afterSaveObservers` in array (registration) order, each in try/catch (`:78-86`).
- Old content is not available at the hook. In `writeTab` the old text exists as `tab.savedContent` until `editorStore.markSavedByPath(path, content)` overwrites it (`editor.service.ts:194-196`, `editor.store.svelte.ts:91-96`), and `notifyAfterSave` is called after that. The dedupe map `index-dedupe` holds the last indexed content per path, but `applyNoteChange` overwrites it with the new content (`markIndexed`, `note-change.service.ts:233`) before the observers run. So an "old frontmatter" for a property-change trigger needs either (a) a new optional third parameter threaded from `writeTab`, or (b) the rule engine keeping its own last-seen snapshot per path. Not verified which is cheaper; (a) only covers the editor save, the other callers (section 3) have no old content in hand.
- Observer teardown: `addAfterSaveObserver` returns an unsubscribe (`:52-60`); `resetHooks()` empties the list (`:91-98`, used in tests and teardown). Note `resetHooks` clears ALL observers, including any a new feature registered.

### 2.2 Ordering between observers

Order is registration order, and registration order is incidental, not a contract:

| Observer | Registered at | Order |
|---|---|---|
| File History snapshot | `app-lifecycle.service.ts:282` (`registerFileHistoryHook`), only if `settingsStore.history.enabled` | early in `initializeVault` |
| Search incremental FTS5 + semantic | `app-lifecycle.service.ts:441` (`registerSearchIndexHook`) | after the search index build kicks off |
| Auto Move | `app-lifecycle.service.ts:445` via `toggleAutoMoveHook(true)`, only if `settingsStore.autoMove.enabled` | right after search |
| Mods `onNoteSaved` (each mod, each call) | `mods-host.service.ts:559`, from `startModsHost` in a `setTimeout(..., 0)` (`app-lifecycle.service.ts:539-545`) | late, after the open path |
| Todoist auto sync | `sync-scheduler.service.ts:90`, from `startAutoSync` in the same timeout | late |
| `SemanticIndexStatus.svelte` | `onMount` (`SemanticIndexStatus.svelte:23`) | whenever the component mounts |

A toggle in Settings removes and re-adds the Auto Move observer (`auto-move.service.ts:134-146`), which moves it to the END of the array. So Auto Move can run before or after any other observer depending on history. No observer depends on another's side effects today: each is either fire-and-forget IPC or defers to a timer. A new observer that must run BEFORE others (so they index the already-filled content) cannot rely on order; the right way to get "others see the filled content" is the re-notify after the rule's own write (section 4), not ordering.

### 2.3 Observer behavior, one by one

| Observer | Sync cost in the hook | Deferral | Writes the note? |
|---|---|---|---|
| Auto Move (`auto-move.service.ts:96-126`) | filters: `.view`, `settingsStore.autoMove.enabled`, any user/lifecycle rule, vault path, excluded folder; then `clearTimeout`/`setTimeout` per path | per-path debounce `settingsStore.autoMove.debounceMs`, default 3000 ms (`settings.store.svelte.ts:112`) | Yes: move (`moveItem`) and icon (`setIconForPath` -> `updateNoteFrontmatter`) |
| File History (`file-history.service.ts:190-197`) | none (starts async) | none; `save_snapshot` IPC, returns false when content unchanged (`:117-118`) | No (writes snapshot backup files under `.kokobrain`) |
| Search (`search.service.ts:300-324`) | path filter, `vaultRelativeKey` | none; two fire-and-forget IPC | No |
| Mods `onNoteSaved` (`mods-host.service.ts:557-579`) | `vaultRelativeKey`, vault guard | `setTimeout(0)` "to leave the synchronous save fan-out before running any mod code" | A mod may write through `ctx.vault.write`, which calls `notifyAfterSave` again (`mod-vault.service.ts:135`): a mod-level loop possibility, mods' problem |
| Todoist (`sync-scheduler.service.ts:90-98`) | `settingsStore.todoist.syncEnabled` guard, `hasAnchoredLine(content)` parse | 5 s timer (`SAVE_DELAY_MS`, `:26`) then `requestAutoCycle('after-save')` | The sync later writes tasks/frontmatter (`sync-now.service.ts:880-900`, `note-writer.service.ts:83`) |
| SemanticIndexStatus | `saveBump++` if the saved path is the active tab | n/a | No (UI only) |

## 3. Every caller of `notifyAfterSave`

Verified with `grep -rnE "notifyAfterSave" src/lib`. The brief listed 7 callers; four of them are only mentions, not calls.

### 3.1 Real callers (they fire the observers)

| Caller | Site | Notes |
|---|---|---|
| Editor save (`writeTab`) | `editor.service.ts:196` | The main path. Reached by autosave (`saveDirtyTabs` -> `saveFileByPath`, `:209-220`), `saveCurrentFile`, `saveAllDirtyTabs`, and by any service that calls `saveFileByPath(path)` (e.g. `updateNoteFrontmatter` on an open tab, `.view` rewriters). Skips when the tab is virtual or not dirty (`:189`) |
| `updateNoteFrontmatter`, closed note | `frontmatter-write.service.ts:161` | After `writeTextFile(path, next, { create: false })`. Used by icon writes, favorite/organized toggles, Todoist project id, calendar writers |
| `updateNoteFrontmatter`, open note | indirect via `saveFileByPath` (`frontmatter-write.service.ts:133`) | Patches tab content (`syncExternalContentToEditor(..., false, 'none')`, `:132`) then saves at once, so it also flushes pending body edits ahead of the autosave |
| Deep-link daily-note append/prepend | `app/deep-link-actions.ts:78` | Raw write + `syncExternalContentToEditor(..., true, 'none')` |
| Deep-link capture note | `app/deep-link-actions.ts:216` | Fresh Quick Capture file; the content carries injected title/tags |
| Deep-link create/prepend/append/overwrite | `features/deep-link/deep-link.service.ts:277, 296, 313, 337` | Includes a silent create (`:337`), so a new note CAN reach observers via deep link |
| Mod `ctx.vault.write` | `plugins/mods/mod-vault.service.ts:135` | Skipped for the mod's own code path (`:132`, `isModCodePath`) |

### 3.2 Not callers (comment or doc mentions only)

- `core/filesystem/task-write.service.ts:19` (comment). `settleTaskWrite` uses `applyNoteChange({source:'task'})` + `notifyContentInvalidated()` (`:31-40`); observers do NOT fire for task toggles or Todoist `write_task_lines`.
- `core/filesystem/note-change.service.ts:10,192` (comments).
- `app/lifecycle/index-updater.service.ts:25` (comment). It is the layout content effect's 1 s debounced indexer, source `edit` (`+layout.svelte:152-165`), not a save.
- `plugins/queryjs/queryjs-block-widget.ts:18` (comment about a legacy shim) and `queryjs-session.store.svelte.ts:117` (comment).

### 3.3 Writers that change a note's bytes WITHOUT firing the observers

Relevant because the owner wants triggers beyond "save":

| Writer | Where | What it calls instead |
|---|---|---|
| Watcher (external edit, YAML edited in another app) | `editor.service.ts:425-451` (reload clean tabs, `syncExternalContentToEditor(..., true, 'none')`), index via `applyNoteChange({source:'watcher'})` | no observers |
| Properties panel edit | `properties.service.ts:104-107` | in-memory only (`syncExternalContentToEditor(activePath, newContent, false, 'frontmatter')`); reaches observers only when the 500 ms frontmatter autosave runs |
| Task toggle / Todoist task write | `task-write.service.ts:25-40` | `applyNoteChange('task')` |
| Link rewrite on rename | `link-updater.service.ts:56-67` | `applyNoteChange({source:'save'})` directly, NOT `notifyAfterSave`; observers do not see it |
| Note create | `note-creator`, `fs.service::createFile`, `mod-vault` create (`mod-vault.service.ts:102-115`) | `applyNoteChange('create'/'fs')` + `markRecentSave`; observers do not see a created note (deep-link create does, see above) |
| Rename / move / delete / restore | `path-change.service::applyPathChange`, `trash.service::restoreItem` | path-change consumers (`registerPathChangeConsumer`, `path-change.service.ts:38-80`, `pathChanged(from, to)`, synchronous, no content) and `applyNoteChange('restore')` |
| Todoist `writeProjectId` into an open tab | `sync-now.service.ts:900` | `syncExternalContentToEditor(..., false, 'body')`, autosave later |

Consequence for the trigger list the owner wants:

- on save: existing hook, usable as is.
- on property change "immediately": two existing choices. (a) The 500 ms frontmatter autosave path already exists (`editor.service.ts:229-230`, `editor-extensions.ts:174-191` sets `frontmatterChanged` when an edit touches the YAML block, `:187`), so a property edit reaches `notifyAfterSave` about 500 ms later, but only if the tab is dirty and the edit came through CodeMirror or the properties panel. (b) A true "immediate" trigger needs a hook at `onContentChange` / `syncExternalContentToEditor`, which is a new seam in `core/editor`. External YAML edits (watcher) need a new seam in the watcher handler or an `applyNoteChange` consumer.
- on create: no observer hook (except deep-link create). Candidates are the `NoteChangeConsumer` registry (`registerNoteChangeConsumer`, `note-change.service.ts:26-33`, `:108-116`), which sees `create`, `fs`, `watcher`, `restore`, `task`, `save`(deduped) and `edit` sources, but its `upsert(path, content)` is synchronous and is also called on debounced `edit` keystrokes (1 s, unsaved content), so it must filter by source (the interface does not expose the source today, `NoteChangeConsumer.upsert(path, content)` only).
- on move / rename: `PathChangeConsumer.pathChanged(from, to)` is the existing seam (`path-change.service.ts:48`); it carries no content, so the engine must read the file. This is exactly Issue 02's question 2 (`.scratch/auto-move-default-properties/issues/02-auto-move-evaluates-on-move-and-rename.md`).

## 4. Timing

### 4.1 From keystroke to observer

- Body edit: autosave `debounce(saveDirtyTabs, 2000, { maxWait: 10_000 })` (`editor.service.ts:227`).
- Frontmatter edit through CodeMirror or the properties panel: 500 ms (`:230`). The two timers are mutually exclusive (`scheduleAutoSave`, `:243-251`; rule 7 of the indexing doc).
- `updateNoteFrontmatter` on an open tab and `saveFileByPath` callers: save is immediate, queued behind any pending save of the same path (`saveTails`, `:163-179`). `saveFileByPath` chains writes per path, so two writes of one file never interleave.
- Closed note: `notifyAfterSave` runs right after the write.

### 4.2 From the observer to the rule effect (Auto Move)

Auto Move adds its own `debounceMs` (default 3000 ms) per path, timer map keyed by `filePath` (`auto-move.service.ts:22`, `:113-125`). Worst case from last body keystroke to a rule write is roughly 2 s + 3 s = 5 s (up to 10 s + 3 s under continuous typing, because the maxWait forces a save but each save re-arms the Auto Move timer, so Auto Move waits for a pause of 3 s after the last SAVE, which can be postponed indefinitely while the user keeps typing and saves keep landing every 10 s; not tested). For a frontmatter edit it is about 0.5 s + 3 s = 3.5 s. The owner wants "right away" for properties: the 3 s debounce is the dominant delay; a property-triggered path would need a much shorter or no debounce.

The debounce is a policy of the Auto Move feature, not of the hook. A shared rule core would need a per-trigger delay (save: debounced, property change: short, create/move: none or short).

### 4.3 Staleness

- Auto Move evaluates the `content` captured at save time (`auto-move.service.ts:96`, `:119`, `buildNoteRecord(filePath, content, ...)` at `:154`). Because each save clears and re-arms the path's timer, the evaluated content is the last saved one. Unsaved keystrokes typed after that save are not seen by the match. The later write (`updateNoteFrontmatter`) re-reads `tab.content` fresh (`frontmatter-write.service.ts:116-119`), so the write itself is applied on current bytes, but the DECISION used older bytes. For "fill only if missing" this is benign (the mutate is evaluated on fresh props); for "always set" driven by an expression over other properties it can set a value derived from stale input. The next save re-evaluates, so it self-heals.
- Rename or move during the debounce: the timer is keyed by the old path and calls `moveItem`/`setIconForPath` on a path that may no longer exist; failures are logged (`:119-122`). Not tested here. No cancellation on path change was found in `auto-move.service.ts` (not checked in `resetAutoMove` beyond vault teardown, `:218-231`).
- A write from a rule flushes the tab's pending body edits early (`updateNoteFrontmatter` saves the whole tab, `frontmatter-write.service.ts:88-90`, `:132-133`), so the on-disk note jumps ahead of the autosave schedule. Acceptable, but it means a rule firing while the user types causes an extra save (a new File History snapshot and an extra search reindex).
- Caret hazard: the active-tab write goes through `syncExternalContentToEditor` (`frontmatter-write.service.ts:132`), which bumps `externalContentSignal` and replaces the doc keeping the caret at its old numeric offset. This is the blocker `.scratch/open-itens/issues/001-caret-selection-follow-their-text-when-frontmatter.md`. Any rule that adds a line above the caret while the user types is hit by it. It applies to every trigger that writes the active note, not only save.

## 5. Feedback loops: does an observer's write re-fire observers?

Yes, in every case where the write goes through `updateNoteFrontmatter` (the only sanctioned frontmatter writer, enforced by `src/tests/lib/raw-write-ratchet.test.ts:10-40`):

- Open tab: `saveFileByPath` -> `writeTab` -> `notifyAfterSave` (`editor.service.ts:196`). Only when the tab is dirty (`:189`): `syncExternalContentToEditor(path, next, false, 'none')` leaves `content != savedContent`, so the save writes and notifies.
- Closed note: `notifyAfterSave(path, next)` directly (`frontmatter-write.service.ts:161`).
- Not re-fired: no-op writes. `if (next === base) return base;` (`:129`) returns before any write or notify. That is what ends Auto Move's chain: icon applied -> re-notify -> Auto Move re-evaluates -> same rule matches -> `setIconForPath` -> mutate yields identical text -> early return, no notify.
- Move: `moveItem` goes through `applyPathChange` and does not call `notifyAfterSave`, so a move alone does not re-fire observers. Issue 01 of the spec relies on this ordering ("move first, then fill", rule 2).

Loop-risk matrix for the new feature:

| Case | Outcome with the current machinery |
|---|---|
| "Fill only if missing", value constant | Converges after one write: second pass finds the key present, no write |
| "Always set", value constant, rule keeps matching | Converges: second `mutate` is a text no-op, `next === base` |
| "Always set" with a volatile value (a timestamp such as "modified now", a counter, `now()`) | Never converges: every write changes the bytes and re-notifies, so a loop at the debounce period, plus a snapshot and a reindex per cycle. Must be forbidden or guarded (e.g. evaluate only on a user-originated save, or suppress re-evaluation for N ms after the engine's own write) |
| Two rules "always set" the same key to different values, both matching | Ping-pong forever unless the engine uses first-match-wins (Auto Move's `findMatchingRule`, per spec Issue 01 rule 5) or a fixpoint cap |
| Rule A sets key K, rule B matches on K and sets key L | Works through the re-notify chain (spec Issue 01 rule 6 relies on this); depth unbounded in principle, bounded in practice by distinct keys |
| Rule writes a key that the YAML serializer rewrites differently (quoting, ordering, normalization) on every pass | `rebuildContent` could produce text unequal to `base` while semantically the same; not verified. A semantic check ("would any value change?") before calling `updateNoteFrontmatter` is safer than relying on byte equality. Auto Move's icon path already relies on byte equality, with a lossy-frontmatter guard (`auto-move.service.ts:203-207`) |
| Engine write on a note the user is actively typing in | Triggers 001 (caret) and an early save; see 4.3 |
| A mod with `onNoteSaved` that writes | Re-fires every observer incl. the rule engine each cycle; the mods host defers via `setTimeout(0)` (`mods-host.service.ts:564-575`) but does not guard writes |

The engine's own writes cannot be distinguished at the hook (no source field, section 2.1). If the design needs "do not trigger on my own write" (for example to keep a "set on first save only" semantic, or to make a timestamp rule safe), the hook needs a source/origin argument or the engine needs a per-path "own write in flight" set around the `updateNoteFrontmatter` call; with `saveTails`/`notifyAfterSave` being synchronous after the write, a set cleared in a `finally` after the await would catch the open-tab path (the notify happens inside the awaited `saveFileByPath`) and the closed-note path (notify is before `updateNoteFrontmatter` resolves, `:161-162`). Not prototyped.

## 6. Constraints a design must respect

1. Keep `notifyAfterSave` synchronous up to and including the `applyNoteChange` call and `notifyContentInvalidated` (rules 6 and 17 of `docs/agents/indexing-watcher-rules.md`). A new observer must not await inside the hook; defer with a timer as Auto Move and mods do.
2. Observers must catch their own async errors (the hook only catches sync throws, `editor.hooks.ts:79-85`).
3. A rule engine that writes must go through `updateNoteFrontmatter` (ratchet test `raw-write-ratchet.test.ts`), pass a PURE `mutate` (it can run twice, `frontmatter-write.service.ts:95-96`), and serialize writes per path (`:96-97`: concurrent calls on one closed note race, last write wins). Auto Move's per-path debounce gives that serialization for free for the save trigger; additional triggers (property change, create, move) on the same path need a shared per-path queue or they reintroduce the race.
4. Lossy frontmatter (comments, etc.) is refused by `updateNoteFrontmatter` (`FrontmatterWriteError`, `:125-126`); the engine must pre-check with `detectLossyFrontmatter` to skip quietly rather than toast on every autosave (precedent `auto-move.service.ts:201-207`).
5. `.view` files are skipped by Auto Move (`auto-move.service.ts:97`); a frontmatter rule engine should skip them too (they are rewritten by `rewriteViewFile`).
6. Hook registration is lifecycle-bound: observers are added in `initializeVault` and must be removed in teardown (`resetHooks`, `resetAutoMove`). A second feature registering its own observer must be added to both lists or it leaks across vault switches.
7. Layer rules (ADR-0003): `core/editor/editor.hooks.ts` is `core/`; anything it learns about rules must come through registration, not import. A new "property changed" seam in core would need the same register-a-consumer pattern used by `registerNoteChangeConsumer` and `registerPathChangeConsumer`.
8. Excluded folders and the master switch live on Auto Move (`settingsStore.autoMove.enabled`, `autoMoveStore.excludedFolders`, `auto-move.service.ts:98`, `:107`). A shared rule core must decide whether the property rules honor them.
9. Trigger coverage gap: the hook sees deep-link creates and mod writes but not note-creator/explorer creates, watcher events, task writes or link rewrites. A "frontmatter rules fire on create/move/rename/external edit" promise needs new seams for each (section 3.3), each with its own content-in-hand situation (path-change has no content; watcher has the read content in `watcher-handler`; not read in this scout).

## 7. Evidence that the "extend Auto Move's observer" route is the cheapest for the SAVE trigger

- Auto Move already: filters `.view`, excluded folders, per-path debounce, builds a fresh `PropertyIndexRecord` from the saved content (`buildNoteRecord`, `auto-move.service.ts:154`), evaluates the expression engine through `findMatchingRule` with per-rule error reporting (`:159-161`), and applies the icon after the move through `setIconForPath` -> `updateNoteFrontmatter` (`:200-213`). Icons/colors are frontmatter keys (`frontmatter-icon.service.ts:11`, `:57-67`), so the icon action is already "a frontmatter write via the one writer".
- Rule evaluation is therefore one `buildNoteRecord` + expression per rule per saved note; the cost on the save path is not the observer (sync part is a few checks, `:97-125`) but the timer callback.
- What a second, separate observer would duplicate: the filters, the debounce map, the evaluation pipeline, the lossy-frontmatter guard and the reset/teardown. This is the "duplicated rule machinery" the owner wants to avoid; the observer layer itself is cheap to share (one `addAfterSaveObserver` call), so the sharing decision is really about the rule model and the evaluate step, not about the hook.
- Auto Move's first-match-wins semantic (`findMatchingRule`, `auto-move.logic.ts:17`, per spec Issue 01 rule 5) is a poor fit for "apply every matching rule's actions". The new feature's semantic (several rules may fire, per-action fill/always) differs: Auto Move rule selection must not change for existing users.

## 8. Not verified / open

- Whether anything today relies on observer ORDER (no dependency found; `editor.hooks.test.ts` and `auto-move.service.test.ts` were listed but not read).
- Exact behavior of `rebuildContent` for byte-identical round trips of values with quotes/wikilinks (affects the no-op check in section 5); `properties.logic.ts` not read here.
- `watcher-handler.service.ts` (external edit seam) was not read; the claim that the watcher does not call `notifyAfterSave` comes from the grep of callers (no hit) and from `editor.service.ts:425-451`.
- Whether Auto Move's per-path timer is cancelled or re-keyed on a rename during the debounce (no code found that does it; not tested).
- Whether the 10 s `maxWait` under continuous typing starves Auto Move indefinitely (reasoned from the timer code, not run).

## 9. Questions only the owner can answer

1. For "on property change", is ~500 ms (the existing frontmatter autosave plus no extra debounce) acceptable, or does it need to apply before the save, on the editor's in-memory content (a new seam, and then the write races with the user's typing)?
2. Should "always set" actions be allowed to use volatile values (timestamps, counters)? If yes, the engine needs a "do not re-trigger on own write" origin guard; if no, constants and expression-derived-from-other-keys only, and the no-op convergence above is enough.
3. Should several matching rules all apply (and in what order on a key conflict), or first-match-wins as in Auto Move? This drives the loop analysis in section 5.
4. Should the property rules honor Auto Move's master switch and excluded folders, or have their own?
5. External YAML edits (watcher): in scope for "on property change"? It needs a new seam and writes into a file the user edited elsewhere.
6. Is it acceptable that a rule write flushes the open tab to disk early (extra File History snapshot, extra reindex)?
