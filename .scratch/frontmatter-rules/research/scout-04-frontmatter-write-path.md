# Scout 04: the frontmatter write path

Scope: what a rule engine that sets properties, icons and colors must go through to write a note's frontmatter. Read-only research; everything below was read in code at HEAD (`2e2cc5b60`). Nothing was run, so behavior claims about `yaml` output come from the ADR plus the serializer code, not from execution (marked "unverified by execution" where it matters).

## 1. Summary

- There is exactly one write primitive that handles open and closed notes safely: `updateNoteFrontmatter(path, mutate)` at `src/lib/core/frontmatter/frontmatter-write.service.ts:99`. `mutate` receives the whole `Property[]` and returns the whole new `Property[]`, so any number of keys can change in ONE parse, ONE serialize and ONE disk write. Atomic multi-key writes are already the native shape of the API.
- Icons and colors are plain frontmatter keys (`_icon`, `_color`, `_title_color`), so they ride the same `mutate`. Auto Move today applies an icon through a second, separate write (`setIconForPath` -> `setFrontmatterIcon` -> `updateNoteFrontmatter`, `auto-move.service.ts:209`, `file-icons.service.ts:127-133`). A shared rule core should fold icon keys and property keys into one `mutate`.
- Triggers: every one of the owner's wanted triggers except create/move/rename already converges on `notifyAfterSave` (`editor.hooks.ts:76`) with a latency of 500 ms (frontmatter edits) or 2 s (body edits). "Immediately on property change" is not available from an after-save observer; it needs a different hook (section 6).
- The dangerous interaction is with the active tab: every write on the open note is a whole-document replace through `syncExternalContentToEditor` and the CodeMirror content-sync effect, which today keeps the caret at its old numeric offset (open-itens 001). A rule that fires after the user saves will hit exactly that path, usually while the user is typing. 001 is a hard prerequisite, as Issue 01 already says.
- Four defects/constraints in the write path that a rules feature would newly expose are in section 8 (empty `---` block, CRLF, canonical-key mismatch in a naive upsert, no per-path serialization).

## 2. `updateNoteFrontmatter`: the two branches

Source: `frontmatter-write.service.ts:99-163`.

1. Entry: captures `vaultStore.path` (`:103`), then `attempt()` (`:111`).
2. Base: open tab -> `tab.content` (`:119`, includes unsaved body edits); closed note -> `readTextFile(path)` then `assertVault` (`:121-122`).
3. Safety gate: `detectLossyFrontmatter(base)` (`:125`). Any non-null reason throws `FrontmatterWriteError(reason, path)` and nothing is written (reasons: `unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors`; `properties.logic.ts:357-363`, detector at `:405-461`).
4. Rebuild: `rebuildContent(mutate(parseFrontmatterProperties(base)), extractBody(base), base)` (`:128`). If `next === base` it returns `base` and does nothing (`:129`), so a no-op rule never writes, never saves, never fires after-save.
5. Open-tab branch (`:131-141`): `syncExternalContentToEditor(path, next, false, 'none')`, then `await saveFileByPath(path)`, then `assertVault`. On `save-failed` the tab is restored to `base` only if nobody edited it meanwhile (`:137`). The whole tab is saved, so any unsaved body edit is flushed to disk at the same time (documented at `:88-89`).
6. Closed-note branch (`:143-162`): `exists` re-check, restart onto the tab branch if a tab opened during the read (`:148`), `writeTextFile(path, next, { create: false })`, then `syncExternalContentToEditor(path, next, true, 'none')` (no-op without a tab, covers a tab opened during the write) and `notifyAfterSave(path, next)` (`:160-161`).
7. Errors: `FrontmatterWriteError` with `reason` in `{lossy reasons, 'save-failed', 'vault-changed', 'missing'}` (`:30`). `toastFrontmatterWriteError` (`:64`) toasts; `save-failed` shows nothing because the editor already toasted. Read errors propagate raw.
8. Contract limits stated in the JSDoc (`:93-98`): `mutate` must be pure (it can run twice if a tab opens during the read); concurrent calls on one closed note race and last write wins, so callers must serialize per path.

Existing callers: `lifecycle.service.ts:36,52,70`, `frontmatter-icon.service.ts:46`, `list-prefs.service.ts:44`, `todoist-sync/sync-now.service.ts:903`, `event-calendar.service.ts`, `bookmark-migration.service.ts`, mods (`mod-app.service.ts:53`, exposes it to vault mods). The Properties panel and meta-bind do NOT use it (section 6).

Test coverage exists: `src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts` (open dirty tab, tab opens during read, vanished note, lossy refusal, save failure, vault switch, tab opened during write).

## 3. What gets written: value types

`Property` is `{ key, value: string | number | boolean | string[], type: 'text' | 'list' | 'number' | 'date' | 'boolean' }` (`properties.types.ts:5-12`).

Serializer: `serializeProperties` (`properties.logic.ts:603-625`) builds a `yaml` `Document` and calls, per property:
- `type === 'list'`: `doc.createNode(value as string[])` with `flow = true` -> `key: [a, b]` (`:610-614`). Only the `list` type takes this branch; the check is on `type`, not on `Array.isArray(value)`. A rule must set `type: 'list'` for arrays.
- everything else: `doc.set(key, value)` with the raw JS value (`:620`). The `type` field is NOT used to coerce. Consequences (read from code, unverified by execution): a `number` property holding the JS number `5` emits `5`; a `text` property holding the string `"5"` emits `"5"` (quoted, ADR 0029 numeric-like rule); a `boolean` holding `true` emits `true`; a `text` holding `"true"` emits `"true"`. So the type of the JS value decides the YAML type, and a rule engine must produce correctly typed JS values (a number from an expression result is a number, not a string).
- `date`: no Date object path. A date is a plain string; ISO-style strings are emitted bare (`2026-05-31`, `2026-05-31T12:00:00`) per ADR 0029 ("Bare survives"; `yaml-quoting.logic.ts:123-128`). Reading back classifies a string matching `ISO_DATE_REGEX` as `type: 'date'` (`properties.logic.ts:40,199`). The rule engine writes dates as strings.
- Wikilinks: a string value `[[AWS]]` is quoted because `[` is a must-quote leading char (`yaml-quoting.logic.ts:40-57`, ADR 0029 table: `[[Foo]]` -> `"[[Foo]]"`). Inside a list the same string is quoted in flow-item context. Writing it unquoted would parse as a nested list; the TS read path folds that back to a string (`foldUnquotedWikilinks`, `properties.logic.ts:113`), but the write always quotes. So callers pass the string `[[X]]` and the serializer does the quoting. Helper: `computeAddRelationshipValue` (`:779`) builds a wikilink/list value; `extractWikilinks` (`:750`).
- Lists: items coerced to strings on parse (`String(item)`); on write they must already be `string[]`. A rule setting `[1, 2]` as numbers into a `list` property would pass numbers to `createNode`; keep list items as strings (ADR 0029 "Lists").
- Empty: `''` emits `key: ""`; an empty list emits `key: []`. Null never written. "Missing" for fill-only semantics is best defined as in Issue 01: absent, `''` or empty list (`isEmptyPropertyValue`, `properties.logic.ts:464`, is module-private; `isEmptyYamlNode` `:390` is also private).
- Preserved spellings: an unchanged number/boolean keeps its source spelling (`0042`, `True`, `1e3`) via `SOURCE_TOKEN_TAG` and `Object.is` equality, only when `rebuildContent` receives the original content (`:550-566`, `:616-619`, `:689-697`; ADR 0029 amendment 2026-11-02). `updateNoteFrontmatter` passes `base`, so this holds. A rule that sets a key to an equal value does not change its spelling.
- Quote style, key order, flow lists, no comments: ADR 0029. Key order = input array order; appended keys land at the end of the block (`serializeProperties` iterates in order; rule-added keys go last).

`yamlScalar(value)` (`:634`) gives the one-line scalar form for pasting after `key: ` (used when text is spliced rather than re-serialized). Not needed on the `mutate` path.

## 4. Key canonicalization and `_` system keys

- `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts:29`) maps 16 aliases (`icon`->`_icon`, `color`->`_color`, `title_color`->`_title_color`, `favorite`, `organized`, `archived`, `type`, `order`, `sort`, `template`, `view`, `visible`, `sidebar_label`/`sidebar label`, `list_properties_display`, `favorite_index`). Unknown keys pass through. Rust mirror: `src-tauri/src/vault/aliases.rs` (ADR 0027).
- Read path canonicalizes every key (`properties.logic.ts:297`), then `dedupeCanonicalKeys` (`:481-503`). So `parseFrontmatterProperties` never returns an alias key; `mutate` sees `_icon`, never `icon`.
- Write path canonicalizes again inside `serializeProperties` via `dedupeCanonicalKeys` (`:609`). That function is last-writer-safe only for empty-vs-populated: when two entries share a canonical key and both are populated, the FIRST wins and the later is dropped with a log line (`:490-499`). Consequence for a rules engine: if a rule appends `{ key: 'icon', ... }` (raw alias) while `_icon` already exists populated, the appended value is silently discarded, even for an "always set" action. The engine must canonicalize the rule's key BEFORE matching it against the props (`canonicalizeKey(key)`, then replace in place). `updatePropertyValue`/`removeProperty` match on exact `p.key` (`:711-729`), which works only if the key is already canonical. `setPropertyByBindTarget` (`:651`) is the existing canonical-aware upsert, but it sets one key per call and can retype.
- ADR 0027: `_`-prefixed = app-managed, users may also edit; system keys are excluded from the Rust property reverse index (`entry.rs:370-372` per ADR) and listed in the panel's System section. Underscore keys that exist: ADR 0027 amendment table (2026-11-04): `_type`, `_organized`, `_archived`, `_favorite`, `_favorite_index`, `_belongs_to`, `_related_to`, `_has_many`, `_order`, `_icon`, `_color`, `_title_color`, `_sidebar_label`, `_visible`, `_template`, `_folder`, `_list_properties_display`, `_archive_to`, `_hub`, `_rail`, `_sort`, `_view`, `_open_in_editor`, `_group`, `_rail_view`. Several are meaningful only on type definitions or `.view` files. Rules that write them onto ordinary notes can trigger behavior elsewhere (for example `_archived: true` fires the type's archive Auto Move lifecycle rule, `lifecycle.logic.ts` comment at "Sets the organized flag"; `_type` changes which type-definition applies). Consider an allow/deny list or a warning in the rule UI (open question 5).
- Icon format: `pack:name`, bare name defaults to Lucide (ADR 0027 "Icon format", `file-icons.logic.ts:82` `parseIconValuePermissive`). Colors are strings (hex or preset; see `utils/color*.ts`, not read in this scout).
- Icon removal semantics in `withIconColors` (`frontmatter-icon.service.ts:25-29`): an absent color REMOVES `_color` / `_title_color`. A rules engine with "fill missing" or "always set" semantics and "nothing is reverted" must not reuse `withIconColors` as is: calling it with `color === undefined` deletes an existing color. `upsertProperty` and `withIconColors` are module-private (not exported); `upsertProperty` there matches exact key, `type: 'text'`.
- Whether the icon index (`fileIconsStore`) sees a write: `setIconForPath` updates `fileIconsStore.updateFrontmatterIcon` itself after a successful write (`file-icons.service.ts:129-131`). A write that goes straight through `updateNoteFrontmatter` relies on the after-save path to refresh the icon index (`notifyAfterSave` -> `applyNoteChange` -> registered `registerFileIconsNoteChangeConsumer`, per `indexing-watcher-rules.md` rule 6, 'save' policy runs TS consumers synchronously). Not read further in this scout; the file-icons scout should confirm.

## 5. Atomic multi-key writes

Yes, with one caveat each:

- One `mutate` returning the full array = one write = one `notifyAfterSave` = one after-save evaluation round. Example shape (not implemented): `props => applyActions(props, actions)` where each action is `{ key: canonical, value, type, mode: 'fillMissing' | 'always' }`.
- Because `mutate` runs twice if a tab opens during the read (`:148`) and receives `props` from the freshest base, "is this key missing?" must be decided INSIDE `mutate`, from the `props` argument, not from the stale content the after-save observer received. Auto Move's `evaluateAndMove` builds its record from the observer's `content` (`auto-move.service.ts:154`), which is up to `debounceMs` old; the actual write may see newer content. Matching a rule (expression) on stale content and deciding fill-vs-set on fresh props is acceptable but should be documented; re-evaluating the expression on the fresh record inside the write is stricter.
- The whole frontmatter block is re-serialized, so a rule touching one key also canonicalizes every other key (quote style, flow lists, alias keys to canonical, `key:` null to `""`). ADR 0029 "Trigger window": this normalization is by design and only fires on UI mutations.
- Lossy frontmatter refuses the whole write, so a rule fails entirely rather than partially. For an automatic trigger this must be logged and not toasted per autosave (Issue 01 behavior 7; Auto Move pre-checks `detectLossyFrontmatter` before the icon write at `auto-move.service.ts:203`).
- Moves are separate from writes. Auto Move moves first then writes at the new path (`auto-move.service.ts:190-209`); Issue 01 rule 2 gives the reason (writing first would schedule an evaluation on the old path). A move+set rule would be two disk operations, not one atomic op.

## 6. What fires after a write, and the triggers

### Closed note
`writeTextFile` -> `syncExternalContentToEditor(path, next, true, 'none')` (no tab: returns at `editor.service.ts:78`) -> `notifyAfterSave(path, next)` (`frontmatter-write.service.ts:160-161`).

### Open note
`syncExternalContentToEditor(path, next, false, 'none')` then `saveFileByPath` -> `writeTab` -> `writeTextFile`, `markSavedByPath`, `notifyAfterSave` (`editor.service.ts:187-198`). `saveFileByPath` queues behind a pending save of the same path (`saveTails`, `:163-179`), so two saves of one file never overlap.

### `syncExternalContentToEditor` (`editor.service.ts:71-92`)
Updates the tab (`updateTabContentOnly` when `markSaved` is false, `updateTabContentByPath` when true), and only if the tab is the ACTIVE one bumps `editorStore.externalContentSignal`; then `scheduleAutoSave(schedule)`. Background tabs are updated in the store only; CodeMirror picks the content up on the next tab switch (`showTabState`, `MarkdownEditor.svelte:215-249`).

### `notifyAfterSave` (`editor.hooks.ts:76-100`)
`markRecentSave(path)` (so the watcher skips it for 15 s), `applyNoteChange({kind:'upsert', source:'save', ...})` (Rust index + TS per-file consumers synchronously, indexing rule 6), `notifyContentInvalidated()`, then every registered after-save observer in order, each in try/catch. Observers are fire-and-forget (`AfterSaveObserver`, `:10`). Auto Move registers one (`auto-move.service.ts:96`), debounced per file by `settingsStore.autoMove.debounceMs` (`:116-123`).

### The trigger map for the owner's list

| Trigger | Existing signal | Latency / notes |
|---|---|---|
| On save (body typing) | `onContentChange` -> `scheduleAutoSave('body')` -> `saveDirtyTabs` -> `writeTab` -> `notifyAfterSave` | 2 s debounce, at most 10 s (`editor.service.ts:227`) + the rule debounce |
| Property edit in the Properties panel | `commitChanges` (`properties.service.ts:77-103`) -> `syncExternalContentToEditor(path, content, false, 'frontmatter')`, so a dirty tab, saved after 500 ms (`:230`) then `notifyAfterSave` | not immediate; 500 ms + rule debounce. Does not go through `updateNoteFrontmatter`. |
| YAML edit in the editor | `onContentChange(content, frontmatterChanged=true)` (`MarkdownEditor.svelte:128`) -> 500 ms timer | same 500 ms path |
| Meta-bind widget | `dispatchMetaBindUpdate` (`widgets.ts:868-895`) dispatches a CodeMirror change on the view, then the normal keystroke pipeline | same 500 ms path |
| Lifecycle toggle, icon picker, list prefs, Todoist, mods | `updateNoteFrontmatter` | open: saved at once; fires after-save immediately |
| Note create | `note-creator` / `createFile` call `applyNoteChange` with source `create`/`fs` (indexing rule 6), not `notifyAfterSave` | no after-save observer fires for a freshly created note until its first save |
| Move / rename | `path-change.service::applyPathChange` calls `registerPathChangeConsumer` consumers synchronously after the disk op (indexing rule 6) | a vault-lifetime consumer is the existing seam; Issue 02 of auto-move-default-properties covers it |

"Immediately" for property change cannot come from an after-save observer. Options (analysis, nothing verified by running): (a) accept the 500 ms already inherent in the frontmatter timer and call that immediate; (b) hook the editor store / `onContentChange` with `frontmatterChanged === true` and evaluate on the in-memory tab content, which would then write through `updateNoteFrontmatter` and its immediate save. (b) puts a rule write in the middle of the user's frontmatter typing session (section 7).

### Convergence
- A write whose `mutate` changes nothing returns before any save (`:129`), so a satisfied rule produces no after-save event; evaluation converges for idempotent actions (fill-missing; always-set with a constant value).
- A rule whose value is non-deterministic or self-referential (a timestamp, a counter derived from its own previous value) rewrites on every after-save and loops forever with a ~500 ms to debounce period. Another rule that always-sets the same key to a different value ping-pongs. The engine needs either a restriction (constant values / pure functions of the record's other keys) or a first-match-wins / single-pass guard. Auto Move avoids this today by first-match-wins and by the Issue 01 rule 5/6 design ("chaining happens through the save").
- A rule that only fires on after-save will also fire on its own write's after-save; this is what makes chaining work and what makes idempotence mandatory.

## 7. Interaction with typing in the active note (open-itens 001)

Current behavior, as written in `.scratch/open-itens/issues/001-...md` and verified against code:

- The content-sync effect (`MarkdownEditor.svelte:625-650`) reads `cursorPos = min(selection.main.head, content.length)` (`:636`) from the OLD doc and calls `replaceDoc(content, cursorPos)` (`:644`). `replaceDoc` (`:170-200`) diffs the view doc against the new text with `docDiff` (`doc-diff.logic.ts:27`, line-hunk based, trimmed to differing characters; returns null past `DOC_DIFF_MAX_EDITS`) and dispatches the changes WITH an explicit `selection: EditorSelection.cursor(cursorPos)` (`:184-188`). CodeMirror treats an explicit selection as post-change coordinates, so the caret is not mapped through the change. Net effect: any rule write that adds or removes characters ABOVE the caret leaves the caret at the same numeric offset, so it lands the number of added characters too early (Cmd+D adds about 16). A range selection collapses to a cursor. Autosave then persists whatever the user types next at the wrong place.
- Same on revisit: `showTabState` overrides the saved selection with the unmapped `cursorPos` (`:222-227`).
- A rule write on the open note appends keys inside the frontmatter block, which is always above the body caret. This is the common case, not a corner case. A rules feature that fires 0.5 to ~3 s after the user pauses typing would produce this at a high rate. Every existing writer (`toggleActiveNoteFavorite`, link rewrite, watcher reload) is user-initiated or rare; rules would be the first background writer that is both frequent and fired while the editor is focused.
- 001 is `ready-for-agent`, first wave, frontend gate only; Issue 01 of auto-move-default-properties already lists it as a blocker. Its fix (map the selection through the diff) is in the editor, not the write path, so the rules feature needs no workaround and should not add one.
- Further hazard the fix does not cover: caret INSIDE the frontmatter block while a rule rewrites that block. Mapping through a diff keeps the caret on the same text when the text survives, but `serializeProperties` re-canonicalizes the whole block (requotes, removes spacing, reorders `key:` null to `""`, expands alias keys), so text near the caret can be rewritten under it while the user is typing a key or value. The lossy gate protects some states (an unparseable half-typed line is `unparseable` and the write is refused), but a half-typed value on a valid line like `title: fo` is valid YAML and would be rewritten. Mitigation to consider (design, not verified): skip a rule write while the editor selection head is within the frontmatter range and the editor is focused, retry on the next after-save. Open question 3.
- Typing during the async window: in the tab branch there is no `await` between `findTab(path)` / `tab.content` and `syncExternalContentToEditor` (`:116-132`), so `base` is current at that moment and the signal bump is applied in the next Svelte effect flush. Keystrokes typed during the later `await saveFileByPath` land in `tab.content` and are written by that save or the next autosave. `saveFileByPath` writes `tab.content` at the time `writeTab` runs (`editor.service.ts:191`), so those keystrokes may be saved in the rule's own write. This is the same flush-on-write behavior documented at `:88-89`.
- Undo: `replaceDoc` dispatches with `Transaction.addToHistory.of(false)` (`:187`), so a rule write is not in the undo history and cannot be undone with Cmd+Z; docDiff exists so history maps through it. For rules the owner should know "undo does not revert a rule's changes". (Consistent with "nothing is reverted".)
- Background tab: no CodeMirror involvement; the tab store is updated and saved; on revisit `showTabState` brings the saved state up to date via diff (`:215-249`), subject to the same unmapped-selection bug until 001 lands.

## 8. Defects and constraints found while reading (affect rules)

1. Empty frontmatter block `---\n---\nbody`. `FRONTMATTER_REGEX` requires at least one line between delimiters (`properties.logic.ts:39`, noted in `ensureFrontmatterLink` at `:525`). For `---\n---\nbody`, `extractRawFrontmatter` is null, `extractBody` returns the whole content (`:55-59`), `parseFrontmatterProperties` returns `[]`, `detectLossyFrontmatter` returns null. A `mutate` that adds keys then produces `---\n<yaml>\n---\n---\n---\nbody`: a new block plus the old empty delimiter pair left in the body. By reading the code this should happen; I did not execute it. `ensureFrontmatterLink` special-cases this (`:525`), `updateNoteFrontmatter` does not. Rules that "fill properties on notes without frontmatter" will meet templates that leave an empty block. Needs a failing test before any claim is acted on.
2. CRLF notes. The regex accepts `\r?\n`; the writer always emits LF for the frontmatter and keeps the body bytes (`rebuildContent`, `:696`; ADR 0029 "Framing"). A CRLF note gets a mixed-ending file after a rule write. `toDocText` in the editor normalizes for display (not read in detail). Low frequency on a macOS vault; mention only.
3. Canonical-key mismatch in a naive upsert (section 4): exact-key `updatePropertyValue` plus an alias key appends an entry that `dedupeCanonicalKeys` then discards.
4. No per-path serialization in `updateNoteFrontmatter` for CLOSED notes (JSDoc `:95-98`). `list-prefs.service.ts:18-37` has `serializeListWrite`, a per-path promise queue, as a pattern to copy or hoist. A rules feature fires from several triggers (save observer, path-change consumer, panel/YAML edit, create) that can overlap on one path, so the rule runner needs its own per-path queue (or the shared one) before calling the write. Open tabs are safe: `saveFileByPath` already queues per path.
5. Debounce keyed per file in Auto Move (`debounceTimers`, `:22`) is the only per-path control today; it coalesces events but does not serialize an in-flight write against a new event.
6. `removeFrontmatterIcon` reads the current content before deciding to write (`frontmatter-icon.service.ts:70-76`) so a no-op removal never refuses on lossy frontmatter. Mirror this for rule writes: compute "would change anything" from the props before calling the write so an automatic rule on a lossy note stays silent.
7. Parse cache: `parseFrontmatterProperties` is an LRU of 16 keyed by raw frontmatter and returns clones (`:223-241`), so evaluating rules on every save adds no re-parse for unchanged frontmatter.
8. The mods API exposes `updateNoteFrontmatter` (`mod-app.service.ts:53`). A rule engine in core/feature is separate, but a vault mod can already implement "set properties on save" with `updateNoteFrontmatter`; worth knowing for the build-vs-mod decision.

## 9. Constraints a design must respect

- Write through `updateNoteFrontmatter` only; never hand-edit text or call `writeTextFile` for a note (loses unsaved body edits, skips lossy gate, skips after-save). Rule actions compose into one `mutate`.
- `mutate` must be pure and idempotent, and must decide fill-vs-set from its `props` argument.
- Canonicalize the rule's key with `canonicalizeKey` before matching.
- Pass correctly typed JS values (`number`, `boolean`, `string`, `string[]` with `type: 'list'`); wikilinks as `[[X]]` strings; dates as ISO strings. Do not pre-quote strings.
- Per-action mode `fillMissing | always`: define "missing" as absent, `''`, or empty list (Issue 01 rule 4). "Always set" with an equal value is a no-op write (returns early at `:129`), which is what lets the loop terminate.
- Refusals from automatic triggers: log with `error('RULES' ...)`, never toast per autosave (Issue 01 behavior 7). Use `FrontmatterWriteError.reason` for the log line.
- Order with moves: move first, then write on the new path (Issue 01 rule 2). On create/move/rename triggers use the path-change consumer seam, not an after-save observer.
- Do not add behavior to core write paths for rare failures (user rule, `no-core-changes-for-corner-cases`); the empty-block defect in section 8 is the only one that rules would hit routinely, and it needs a test first.
- Tests: `.logic.ts` for the pure action application (no framework imports), service tests with real stores and mocked Tauri fs, as `frontmatter-write.service.test.ts` does; never mock stores or `.logic.ts`.

## 10. Open questions for the owner

1. "Immediately on property change": is the existing 500 ms frontmatter autosave latency acceptable, or must the rule run on the in-memory edit before the save? The second option writes while the user is typing in the frontmatter (section 7) and is materially riskier.
2. Should a rule be allowed to write any `_` system key, or only a documented subset? Examples with side effects elsewhere: `_archived: true` fires type archive moves, `_type` changes the type definition, `_favorite` pins to the sidebar, `_rail`/`_view`/`_sort` only mean something on definitions or `.view` files.
3. When the caret is inside the frontmatter block of the active note and the editor is focused, should an automatic rule write be deferred (retried on the next save) or applied anyway after 001 lands?
4. Non-deterministic or self-referential action values (today's date, a counter): allowed? They break convergence unless limited to fill-missing or to a single pass per trigger event.
5. Two rules always-setting the same key: first match wins (as in Auto Move) or all matching rules apply in order? This decides whether one `mutate` carries one rule's actions or the union.
6. Icon actions: should "always set" icon/color with an unspecified color leave the existing `_color` alone (the "nothing reverted" reading) rather than remove it as `withIconColors` does today? Recommended yes; confirm.
7. Empty `---`/`---` block and CRLF notes: acceptable to treat the empty block as a known case to fix first (one failing test), or skip rules on such notes?

## 11. Not verified

- Whether `yaml` actually emits the exact bytes for each value type; taken from ADR 0029, the quoting predicate and its parity tests (not run).
- The empty-block corruption in section 8 item 1 (derived from code reading only).
- The icon-index refresh after a bare `updateNoteFrontmatter` write (the file-icons consumer was not read).
- `settingsStore.autoMove.debounceMs` default, color value format, and `toDocText` behavior were not read.
