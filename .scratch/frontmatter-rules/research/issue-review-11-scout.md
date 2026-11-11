# Scout for Issue 11: A rule can rename the note

Read-only review of `.scratch/frontmatter-rules/issues/11-rule-action-rename-note.md` against main at `17892c5ed`. Code names are today's (`auto-move`); Issue 11 uses the post-06 names (`auto-organize`). Issues 03 and 06-10 are not on main; I read their specs only.

## 1. Code facts stated by the Issue

| # | Claim in the Issue | Verdict | Evidence |
|---|---|---|---|
| 1 | `renameItem` is at `src/lib/core/filesystem/fs.service.ts:280` | CONFIRMED | `fs.service.ts:280` `export async function renameItem(oldPath: string, newName: string): Promise<string>`. It takes a NEW NAME (file name incl. extension), not a path: `renamedPath(oldPath, newName)` = `${parent}/${newName}` (`fs.logic.ts:49-51`). The caller must pass `name + '.md'`. |
| 2 | `renameItem` means "links are rewritten and the tab follows the note" | CONFIRMED | `renameItem` -> `applyPathChange` (`path-change.service.ts:145`): `updateTabAfterRenameOrMove` at `:173` (tab re-pathed, view state follows), `updateLinksAfterRename(from, to)` at `:185` when the target is Markdown, then `rename_note` / `rename_in_search_index` IPC, then `forgetNote(from)`. Links are rewritten only when the note NAME changes case-insensitively (`link-updater.service.ts:39`) and only for sources that `get_backlinks_v2(oldPath)` lists (`:46`). |
| 3 | `renameItem` is safe to call on a clash | WRONG as an implied behavior, correct as code | It throws `targetExistsError` when `exists(newPath)` (`fs.service.ts:284`), and its catch block calls `error('FS', 'Failed to rename item:', err)` (`:295`), which reports to Sentry (`utils/debug.ts` `error`). The suffix search in Behavior 4 must therefore pre-check with `exists` from `@tauri-apps/plugin-fs` (already imported in `auto-move.service.ts:1`) and never rely on the throw. |
| 4 | Link-rewriter saves do not fire the after-save hook (`link-updater.service.ts:58,71`) | CONFIRMED | `:58` is a raw `writeTextFile`; `:66` `syncExternalContentToEditor(..., true, 'none')`; `:71` `applyNoteChange({ kind: 'upsert', source: 'save', ... })`. None calls `notifyAfterSave`. Complete caller list of `notifyAfterSave(`: `frontmatter-write.service.ts:161`, `editor.service.ts:196`, `deep-link-actions.ts:78,216`, `mod-vault.service.ts:135`, `deep-link.service.ts:277,296,313,337`. `applyNoteChange` never calls it (`note-change.service.ts` has no observer call; `editor.hooks.ts:67` is the only fan-out and it calls `applyNoteChange`, not the reverse). The watcher never calls it either. So Behavior 6's first branch ("they do not, pin with a test") applies; the second branch is dead. |
| 5 | Discovery section 4 says the same | CONFIRMED | `discovery-2026-11-10.md:131` lists link rewrites under "Not seen by any trigger"; `research/scout-08-trigger-create-move-rename.md:94` says the same. |
| 6 | "`{variable}` syntax of the destination" | CONFIRMED for syntax, WRONG for the example | `resolveDestination` (`auto-move.logic.ts:336-364`) knows only `folder`, `parent`, `basename`, `type`, `status`, `year`, `month` (`:352-360`). Unknown variables stay literal (`vars[key] ?? match`, `:362`). `{date}` does NOT exist. `{date} {basename}` would rename a note to the literal `{date} Meeting.md` (`{` and `}` are not in the invalid-character list). |
| 7 | "a note already named `<name>.md` or `<name> N.md` is treated as already renamed" makes `{date} {basename}` idempotent | WRONG (design flaw, not a path:line fact) | `{basename}` is the note's CURRENT base name (`collection.logic.ts:30-31`, `buildNoteRecord`). The template `X {basename}` evaluated on the renamed note `X Meeting` gives `X X Meeting`, which is neither `X Meeting.md` nor `X Meeting N.md`. Every save renames again and the name grows. The Issue's headline example, and the acceptance "a second save does nothing", cannot hold with any template that contains `{basename}` or `file.basename` (also true for `expr`). Idempotent templates reference stable inputs only: `{year}`, `{month}`, `{status}`, `{type}`, `{parent}`, or properties through `expr`. The Issue and its docs need a self-reference-free example and a warning. |
| 8 | Skip set from Issue 01 Behavior 9 | CONFIRMED | `writingPaths` at `auto-move.service.ts:46`, checked at `:128`, added at `:257`, cleared in `finally` at `:266`. Today it wraps only the write phase and is only entered when there are writes (`:255` returns early otherwise). A rename or move fires no after-save, so no skip entry is needed for them; only for the property write at the final path. |
| 9 | Issue 08 says rules build the record with `buildNoteRecord(filePath, content, Date.now(), Date.now())` | CONFIRMED (relevant here) | `auto-move.service.ts:207`. |
| 10 | Open note "with unsaved edits": detectable | CONFIRMED | `isTabDirty(tab)` = `tab.content !== tab.savedContent` (`core/editor/editor.logic.ts:45-47`). The service already reads tabs via `editorStore.tabs.find` (`auto-move.service.ts:188`) and imports `editorStore`. At fire time the tab content is what `readCurrentContent` returns (`:187-199`), dirty or not. |
| 11 | `docs/agents/indexing-watcher-rules.md` covers path changes | CONFIRMED | Rules 6 and 8: path changes go through `applyPathChange`; `renameItem` already satisfies them. Nothing else to follow if the rename uses `renameItem`. |

## 2. Touchpoints the Issue does not name

### Service (`src/lib/features/auto-move/auto-move.service.ts`)
- `evaluateAndMove` (`:206-268`) threads `filePath` through `isAlreadyInDestination(filePath, ...)` (`:225`) and `moveItem(filePath, destPath)` (`:244`). After a rename the move must use the NEW path. `moveItem` keeps the file's current name (`fs.service.ts:308`, `getFileName(sourcePath)`), so rename-then-move composes. The early return at `:255` (`!rule?.icon && owned.length === 0`) needs no change for rename.
- The record is built once from the old path (`:207`). `{basename}` in the destination template and `file.basename` in Issue 08 computed values are therefore the PRE-rename name. Decide and document: evaluate everything against the pre-run record (simplest, matches "same record as the filter").
- `renameItem` import: the service test mocks `#lib/core/filesystem/fs.service.js` with only `moveItem` (`auto-move.service.test.ts:19-22`). Every existing test that imports the service needs `renameItem` added to that mock factory or the import is `undefined`.
- Failure semantics are unspecified. Existing rule: a failed move writes nothing for the run (`:245-249`, Issue 01 Behavior 8). Issue 11 does not say what a failed or refused rename does to the move and the properties. State it (suggest: log once per rule per session, as Decision 9 does for property writes, and continue at the old path, or stop like the move; pick one).
- "First free name" needs a loop of `exists(candidate)` (mkdir/exists are already mocked in service tests). `generateUniqueName` (`fs.logic.ts:233`) starts at ` 1`, not ` 2` (`:258-261`), and is case-insensitive over a sibling list; it cannot be reused as is for the ` 2`, ` 3` rule.
- Case-insensitive volumes (macOS default): a case-only rename (`x.md` to `X.md`) makes `exists(newPath)` true for the note itself, so `renameItem` throws and the suffix loop would pick ` 2`. The "already named" check should compare case-insensitively.
- The "already named" pattern `<name>( \d+)?` also swallows genuine names ending in a number (template `Weekly`, note `Weekly 2026` is "already renamed"). A consequence of the owner's suffix choice; mention in the help page, do not redesign.

### Sanitizing and name hygiene
- There is no existing file-name sanitizer in `src/lib` (searched for sanitize/illegal/invalid-char helpers; only unrelated hits). Write one pure function in `auto-move.logic.ts` (testable, `.logic.ts` rules).
- `resolveDestination` also collapses `/+` and strips a leading and trailing `/` (`:363`), and it does not trim spaces. Order matters: resolve template, replace `/ \ : * ? " < > |` with `-`, then trim whitespace and leading/trailing dots (a leading `.` makes a hidden file). An empty result does nothing (Behavior 1) must also cover a result that is only `-` or spaces.
- "The `.md` extension is kept": keep the note's ORIGINAL extension, since `isMarkdownFile` accepts `.markdown` too (`fs.logic.ts:65-68`).

### Gates for rename (the Issue has none)
Issue 01 Behavior 10 gates apply only to property writes (`propertyWriteSkipReason`, `auto-move.logic.ts:251-269`). Today the observer gates only on `isViewFile` and excluded folders (`:129`, `:139`), so a `.canvas` or `.kanban` file can reach `evaluateAndMove`. A rename would turn `Board.canvas` into `<name>.md` or `<name>.canvas.md`. Rename must at least require `isMarkdownFile`. Strongly consider the same protected folders (`_system`, templates), because:
- `_system` holds mods, lists, calendar data;
- type definition notes are renamed through their own flow that rewrites `_type` values (`type-definitions.service.ts:224`), so a rule rename orphans the type;
- Todoist sync renames project notes by name and tracks `relPath` (`todoist-sync/sync-now.service.ts:950-970`), so a rule would fight it every cycle;
- the event calendar has its own rename and path consumer (`event-calendar.service.ts:734`, `asOwnPathChange`).
Reusing `propertyWriteSkipReason` as the gate is not a fit (it also checks frontmatter shape, irrelevant to a rename); extract or add a smaller `renameSkipReason`.
The user doc at `help/documentation/22-auto-move.md` ("Auto Move only evaluates `.md` files") overstates today's behavior for moves; do not copy that sentence into the rename section without the gate.

### Dirty-tab rule (Behavior 5) interacts with Issue 01's skip set
When the open note is dirty, the run skips the rename but still writes properties. `updateNoteFrontmatter` takes the tab branch, patches the tab and calls `saveFileByPath` at once (`frontmatter-write.service.ts:127-135`), flushing the user's pending edit. That save fires `notifyAfterSave`, but the path is in `writingPaths` (`auto-move.service.ts:257`), so the observer ignores it (`:128`). The promised "renamed at the next save with no pending edit" then has no save to ride on: the flush is swallowed and the next run waits for the user's next edit. Issue 01 lists this as an accepted limit (its Notes), but the acceptance "renamed at the next clean save" needs a test that states which save it means. With no property writes in the rule, the pending edit's own autosave (2 s) reschedules normally.

Also: `isTabDirty` is checked at timer fire, but `applyPathChange` awaits several IPC calls. A keystroke during that window lands on the re-pathed tab (`updateTabPath` is synchronous right after `diskOp`, `path-change.service.ts:173`), so no data loss; the later autosave schedules a normal run at the new path.

### Link rewrites and the cascade test (Behavior 6)
- No code change needed (confirmed above). The test belongs next to `auto-move.no-chain.test.ts`, which already runs the real `editor.hooks` and `updateNoteFrontmatter` against an in-memory `plugin-fs` and mocked `call` (`auto-move.no-chain.test.ts:6-31`). To run the real `renameItem` there: the fs mock has `rename: vi.fn()` (`:19`) and must move entries in `files`; `call('get_backlinks_v2')` must return the backlink sources; `fsStore.fileTree` must list the markdown paths (`link-updater.service.ts:41-44`); `vaultStore.path` must be set.
- `link-updater.service.test.ts` exists but has no assertion about after-save observers (grep returned nothing); the new pin is not a duplicate.
- The watcher also sees the rename and every rewritten source unmarked (`scout-08:141`), but the watcher never calls `notifyAfterSave`, so rules cannot cascade through it.

### Load, store and persistence
- Rules persist through `saveAutoMoveConfig` as whole objects (`auto-move.service.ts:109-113`), so a new `rename` field persists with no change there.
- Load does NOT validate unknown fields: `withValidProperties` (`:92-96`) returns a rule untouched when it has no `properties`. A hand-edited `rename` (a string, both `name` and `expr`, neither, non-string values) goes straight to the run. Add a `sanitizeRename` next to `sanitizeRuleProperties` (`auto-move.logic.ts:157`) and apply it in the loader, and guard at use. Issue 08 does the same "exactly one of two" validation for `RuleProperty`; follow that.
- `AutoMoveConfig`/`AutoMoveRule` live in `auto-move.types.ts:27-46`; `rename?` is added there. `autoMoveStore.updateRule` merges partials (`auto-move.store.svelte.ts:34-36`), so Settings can send `{ rename }`. A cleared rename must send `rename: undefined`, not `{}`.

### Settings UI
- `AutoMoveRuleRow.svelte:65` `doesNothing` = no destination and no valid properties. A rename-only rule would show the "does nothing" warning (`:223`). It must count `rename`. (Issues 09 and 10 will need the same; consider one shared `ruleHasConsequence` in the logic file.)
- `AutoMoveSection.svelte:152` hint says "The first matching rule determines the destination folder"; `:54` creates new rules with `destination: ''`.
- The row is rewritten by Issue 03 (not on main) and renamed by Issue 06, so Issue 11's UI work lands on the post-03, post-06 row. Test files: `AutoMoveRuleRow.test.ts` and the harness `src/tests/fixtures/AutoMoveRuleRowHarness.svelte`.
- Expression field: `validateExpression` (`auto-move.logic.ts:321`) exists; the name template has no validator (nothing to validate beyond non-empty).

### Docs and examples
- Help page today is `help/documentation/22-auto-move.md` (renamed to `22-auto-organize.md` by Issue 06). Sections to touch: the new "Renaming notes" section, "How Rules Work" (`:21`, order rename, move, properties), the field table, the "Configuration File" JSON example (`:241-282`), and the Actions list Issue 06 adds.
- `help/examples/auto-move-features/auto-move-rules.json` is covered by `src/tests/help/examples-scoping.test.ts:405` and its rule-path-predicate check (`:351-359`): any example rule with `rename` needs a path predicate and must stay inside the example folder.
- `help/documentation/28-mods.md` and `mods/*.md`: no change; the mods contract is untouched (mods already call `renameItem` through `mod-vault.service.ts:60`, with no after-save).

### Architecture and tests
- Layers: `isTabDirty` comes from `core/editor/editor.logic.js`, `renameItem` from `core/filesystem/fs.service.js`; features importing `core/` is allowed (ADR-0003). No new entry in `layer-baseline.json` or `feature-cycle-baseline.json` (the only `auto-move` entries are `feature-cycle-baseline.json:4-6`, which Issue 06 renames).
- `raw-write-ratchet.test.ts:32` already exempts `auto-move.service.ts` for config JSON; rename uses `renameItem`, adds no raw write.
- Rename must also be an "own path change" for Issue 05 if that ever lands (05 is not blocked by 11): the future path-change consumer would otherwise re-run rules on the rule's own rename. Note it in Issue 05's triage, not here.
- Test placement: logic (`sanitizeRename`, file-name sanitizer, next-free-name, "already named" matcher) in `auto-move.logic.test.ts`; run order, dirty tab, no re-trigger in `auto-move.service.test.ts` (mock `renameItem` there) and the no-chain test (real `renameItem`).

## 3. Things that make a Behavior impossible or bigger than it looks

1. **The `{date} {basename}` example cannot work.** `{date}` is not a variable (`auto-move.logic.ts:352-360`), and any `{basename}` template renames again on every save with a growing name (fact 7). Behavior 4's "already named" rule cannot detect it. Acceptance 1 ("a second save does nothing") fails for that template. Fix the example (for example `{year}-{month} Meeting`, or an `expr` built from a property) or add a variable, which would be new scope for the owner to decide. Issue 08 will not add `{date}` either (08 changes `expr`, not the destination variables).
2. **Rename needs gates the Issue does not list** (non-Markdown, `_system`, templates, type definitions, Todoist and calendar managed notes). Without `isMarkdownFile` a `.canvas` file could be renamed to a `.md` name.
3. **Behavior 5 plus properties** swallows the flush save (section 2), so the deferred rename waits for another user edit.
4. **`expr` result typing** is undefined for names: a number, boolean, date or list result needs a rule (String() for scalars; Issue 08 writes dates as `YYYY-MM-DD`; a list is probably "do nothing"). Depends on Issue 08, which is not on main; today `evaluateExpression` exists (`auto-move.logic.ts:12`) and returns raw values.
5. **Size:** logic is small (sanitizer, matcher, next-free-name, ~60 lines), service change is moderate (thread the new path, dirty check, exists loop), Settings is the larger part because it lands on the Issue 03 row.
6. **Volatile names (Behavior 7)** rename on every save with `now()`, and each rename runs `applyPathChange` (Rust re-key, FTS and semantic re-key, link rewrite of every backlink source, a watcher burst). Documented by the owner, accepted; the cost is higher than a property write.

## 4. Not checked

- Issue 03's final row layout and Issue 06-10 code (not on main).
- Rust `rename_note` behavior on a clash or case-only rename.
- Todoist and calendar interaction beyond reading their rename call sites.
