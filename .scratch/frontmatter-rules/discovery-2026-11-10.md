# Discovery: frontmatter rules (properties, icons, colors) on the expression engine

> Superseded as scope by `PRD.md` (the MVP the owner chose on 2026-11-10). Kept as evidence for code facts.

2026-11-10. Synthesis of 16 scouts, 8 validators, 3 designs (A, B, C) and 2 judges in `.scratch/frontmatter-rules/research/`. Where they disagree, validators beat scouts and the judges' code checks beat the designs. Code was read at HEAD `2e2cc5b60`. Nothing was run. The key ordering facts were re-checked for this file (`frontmatter-write.service.ts:95-97,128-133,158-162`, `editor.service.ts:189-197,227-230`, `editor.hooks.ts:10`, `auto-move.service.ts:154`, `frontmatter-icon.service.ts:26-31`).

## 1. Recommendation

**Grow Auto Move in place (Design C), with the correctness fixes from Judge 1 and the grafts from Judge 2.** Auto Move rules become the one rule list for moves and frontmatter actions. They keep the same feature folder, the same `.kokobrain/auto-move-rules.json`, the same store and the same Settings section. A rule gains an optional `actions` list. `destination` becomes optional: empty means "do not move".

Why, in plain words:

- **The core is not optional, and all three designs reached the same one.** Code forces one runner per note path. `updateNoteFrontmatter` leaves serialization to its callers ("concurrent calls on one closed note race and the last write wins", `frontmatter-write.service.ts:95-97`). Auto Move's icon write deletes `_color`/`_title_color` when its rule has no color (`frontmatter-icon.service.ts:26-31`). That loops against any second writer of those keys, under fill or set (validation-05 R1). A separate feature with its own timer would race and loop, so it would still have to share Auto Move's runner (validation-08 M5, validation-02 M4).
- **Given that core, C wraps the least around it.** A adds a rename, a new versioned config file, a migration and per-rule triggers. B adds a provider layer and a second feature with its own file, switch, section and excluded-folder list. Judge 2 scored C 21/25, A 14, B 12 (judge-2 section 1). Judge 1 ranked A first, but only for correctness details (fixed point, guards, broken-config backup). None of those depends on A's shape. Judge 1's own list of grafts includes C's floor table and C's echo handling (judge-1 section 7).
- **It matches a choice you already recorded.** Issue 01's Origin note says "extend Auto Move" was chosen over a separate per-folder-defaults feature (`.scratch/auto-move-default-properties/issues/01-...md:68`).
- **B ranks last with both judges.** It duplicates the domain the user sees: two lists, two switches, and a precedence between them that neither list shows (judge-2 R4, judge-1 section 4).

Mandatory corrections. As written, all three designs share these defects (judge-1 sections 2 and 7):

1. **Moves inside the fixed point.** After re-planning at the destination, select the move again. If that picks a second move, abort the run: no move, no write, log once. Without this, four plausible rules ping-pong a note between two folders forever, through the write echo, with no user event (judge-1 X2).
2. **No byte echo guard.** The `lastEngineWrite` guard in A and B is dead code. The observer runs inside `updateNoteFrontmatter`, before it returns (`frontmatter-write.service.ts:132-133,161-162`, `editor.service.ts:195-196`). Termination rests on (1) plus the semantic no-op check (judge-1 X1, judge-2 R6).
3. **Idle gate for the active tab.** When the timer fires and the target is the active tab and it is dirty, re-arm instead of writing. Otherwise a fill rule can write into a value the user cleared and is still retyping (judge-1 X3).
4. **No moves from path-change runs.** Otherwise a "done -> Archive" rule undoes a manual drag out of Archive about 3 s later (judge-1 C refutation 2).
5. **Chain the per-path queue across the runner's own move** (one line; judge-1 X5). **Cancel pending runs on delete.**

Grafts from Judge 2: G1, a characterization-test slice first (required by CLAUDE.md "Removing or Refactoring Code" 5-6). G2, a real property-change signal (`previousContent`) in place of "lower `debounceMs`". G3, one vault-lifetime observer that re-checks the switch when the timer fires, replacing `toggleAutoMoveHook`. G4, a `requestPromptIndexRefresh()` nudge after lifecycle-key writes and moves. G5, hold Issue 01 now (section 8, D2).

Also taken from A: broken-config safety. A hand-edited, richer JSON must not be reset to empty and then overwritten (`auto-move.service.ts:61-64`, Issue 031). That fix lands before the actions slice, not after it (judge-1 C refutation 5).

## 2. How "one engine, one domain" is met

Shared, with one copy each:

| Piece | Where |
|---|---|
| Expression engine, unchanged and in place | `features/collection/expression/` (tokenizer, parser, evaluator, methods). Auto Move already imports it (`auto-move.logic.ts:2-4`). QueryJS stays out of it (it runs JS, scout-01 section 4). |
| Rule list, config file, store, Settings section | `features/auto-move/`, `.kokobrain/auto-move-rules.json`, `AutoMoveSection.svelte` |
| Runner and planner | one per-path scheduler, one pure planner, one `updateNoteFrontmatter` call per run |
| "Missing" | export `isEmptyPropertyValue` (`properties.logic.ts:464`, private today). No fifth copy (scout-16 2.2). |
| Match truthiness | export `toTruthy` (`evaluator.ts:632`). Collection has an identical copy at `collection.logic.ts:481-485`, so semantics do not change (judge-2 R7). Auto Move's JS truthiness differs only on `NaN`. |
| Validator | the evaluator's `validateExpression` (`evaluator.ts:306-315`) replaces Auto Move's parse-only one (`auto-move.logic.ts:87-95`) |
| Icons and colors | plain property actions on `_icon`, `_color`, `_title_color` in the same `mutate`. The sidebar refreshes through the `file-icons` note-change consumer (`file-icons.service.ts:240-272,299-305`; validation-05, validation-06 Missed 1). No `setIconForPath` call, so no toast per autosave and no deleted colors. |

Layers: no new feature pair, because `auto-move -> collection | file-icons | type-definitions` already exists (`feature-cycle-baseline.json:2-6`). `core/` cannot import `features/`: the layer baseline holds only 3 `utils -> core` entries (validation-05 M9). Core therefore gains only two seams: a create-content transform registry and an optional third argument on `AfterSaveObserver`. Both are wired in `app/lifecycle/app-lifecycle.service.ts` and pinned by a lifecycle test (ADR 0003). There is no Rust or IPC change, so every slice runs the frontend gate.

The cost of one list (C section 15.7, judge-2 A notes): the list mixes two selection modes. The move is **first match** (one at most) and actions are **all match**. The UI copy has to say so.

## 3. What the engine can and cannot express; effect on Auto Move and Issues 01/02

**Can** (scout-01 section 2, validation-01 confirmed):
- Conditions on frontmatter keys: `==`, `&&`, `||`, string/list/date methods, `isEmpty`, `contains`, dates with `now()`/`today()`/`date()` and durations.
- `file.*` fields: `name`, `basename`, `path`, `folder`, `ext`, `size`, `ctime`, `mtime`, `tags`, `properties`.
- `file.hasTag`, `file.inFolder`, `file.hasProperty`.
- Relationship target names, for example `_belongs_to.contains("AWS")` (`collection.logic.ts:72-77`).

**Cannot, or only with traps:**
- **No previous value, event or transition.** `EvalContext` is `{ record, formulas }` (`evaluator.ts:11-16`). "When status changes to done" can only be written as state: `status == "done"` plus an `ifMissing` action. A `prev.status` silently reads `null`, so it never matches (scout-01 section 6). Real transitions need an engine extension (`prev` namespace, `changed()`). That is out of v1.
- **No dereferencing of linked notes, no backlinks, no body text** except inline tags (scout-01 section 2).
- **"Missing" cannot be tested in a condition.** The projection always adds `organized`, `archived`, `favorite` and `tags`, so `file.hasProperty("archived")` is always true (validation-01 M5). "Missing" is decided in the action, on the parsed canonical keys.
- **Aliases resolve only for `type`.** A condition must use `_icon`/`_color`/`_order`. `color == "red"` is always null (`evaluator.ts:93-95`, validation-06 Missed 6).
- **Typos are silent.** `!stauts` is true, so a rule can match every note and stamp it (validation-06 R2). The only guard is an unknown-identifier warning against `getAllKnownProperties`.
- **Null receivers throw.** `status.lower()` throws on every note without `status` (`methods.logic.ts:255-270`).
- **Folder paths.** `file.folder` is absolute, and `file.inFolder` is a case-insensitive prefix test with no separator check: `/v/work` also matches `/v/workshop` and every subfolder (validation-02 M11).
- **Dates fire only when the note is touched.** `due < today()` never fires at midnight (scout-01 section 2).
- **Names must be ASCII.** Other identifiers throw (`tokenizer.ts:131-165`).
- **Stats are fake in Auto Move today.** `file.mtime`/`ctime` are "now" and `size` is 0 (`auto-move.service.ts:154`). Fix: read them from the index record (`collection.service.ts:152-162` pattern).
- **No parse cache.** `evaluator.ts:75-78` re-parses on every call. An AST cache is a small follow-up, worth adding only if profiling shows the cost.

**Behavior changes for existing Auto Move configs** (each needs your yes, D3/D4):
- An empty `destination` no longer moves the note to the vault root (`auto-move.logic.ts:128-129`). A template that resolves to `''` still means the root.
- The legacy `icon` is translated on load into `_icon` (always), plus `_color`/`_title_color` only when they are set. Colors are **no longer deleted**.
- The icon now applies from **every** matching rule, not only the moving one (judge-2 R1).
- Non-Markdown files are no longer moved. This closes 054: kanban, canvas and mod JSON reach the observer today (validation-02 M1).
- Turning the switch off cancels pending runs (`auto-move.service.ts:134-146`). Timers follow renames.
- `NaN` truthiness changes to `toTruthy`.
- The trailing-slash bug in excluded folders is fixed: `'_templates/'` never matched (validation-01).

**Issue 01: superseded, rewritten as slice S2.** These parts stay:
- Behavior 1: empty destination means no move.
- Behavior 2: move first, then write at the new path.
- Behavior 3: write through `updateNoteFrontmatter`.
- Behavior 4: missing means absent, null, `''` or `[]` on the canonical key.
- Behavior 7: log, never toast.
- Behaviors 8-9: lifecycle rules unchanged; old configs load.

These are replaced:
- Behavior 5 (a property-only rule falls through) becomes all-match actions plus a first-match move among rules that have a destination.
- Behavior 6 (chaining through the save) oscillates as soon as "always" exists (C section 5.1). It becomes an in-memory fixed point with one write per run.
- `defaultProperties` (a string-only map) becomes typed `actions` with a per-action mode. A text `"true"` cannot set `_archived` (validation-08 Correction 6).

`defaultProperties` does not exist in `src/`, so nothing needs migrating.

**Issue 02: rescoped as slice S5** (path-change trigger). Its triage questions are answered in section 4.

## 4. Triggers: hook points and loop protection

One scheduler (`debounceTimers`, `auto-move.service.ts:22`) and one per-path promise tail (the `serializeListWrite` pattern, `rail-shell/list-prefs.service.ts:28-37`). Each run, at fire time:

1. re-check the switch;
2. read the content from the open tab, else from disk; a vanished file returns quietly;
3. apply the gates (below);
4. plan;
5. move, if planned;
6. write once.

The gates:
- `isMarkdownFile` (`fs.logic.ts:65`);
- excluded folders, normalized;
- the templates folder from `settingsStore.templates.folder`, never a hard-coded `_templates` (validation-05 R7);
- type definition notes;
- the writable check: `!content.startsWith('---')`, or a block matches and `detectLossyFrontmatter === null`. This skips the empty `---\n---` block and a missing closing fence, which would otherwise stack a second block (validation-04 R3; design-B section 5 step 3);
- the idle gate: if the target is the active tab and it is dirty, re-arm.

| Trigger | Hook | Delay | Scope |
|---|---|---|---|
| **Save** | `addAfterSaveObserver` (`editor.hooks.ts`), registered once per vault (G3) instead of `toggleAutoMoveHook` (`app-lifecycle.service.ts:443-447`) | `debounceMs` (3000 default) | actions + move |
| **Property change** | additive `previousContent?` on `AfterSaveObserver` (`editor.hooks.ts:10`). `writeTab` captures `tab.savedContent` before `markSavedByPath` (`editor.service.ts:191-195`); the closed branch of `updateNoteFrontmatter` passes `base` (`:161`). It fires when the **parsed canonical frontmatter** differs, never the projected record: inline `#tags` change `tags` (validation-04 R2). | short (300 ms proposed, unmeasured), on top of the 500 ms frontmatter autosave (`editor.service.ts:230`): about 0.8 s after the last keystroke, about 0.3 s after Cmd+D/Cmd+E | actions only; the move waits for the save timer (D7; judge-1 A refutation 3) |
| **Create** | new core registry `registerCreateContentTransform((path, content) => string)`, called after `buildContent` (`note-creator.service.ts:101-103`) and before `create_note` (`fs.service.ts:208`). Synchronous and wrapped in try/catch, because a throw would block creation (`note-creator.service.ts:33-38`). | none (pre-write) | actions only, no move. One write, no tab yet (so 001 does not apply), Rust indexes the final bytes. |
| **Move / rename** | `registerPathChangeConsumer` (`path-change.service.ts:73`), vault-lifetime list (`app-lifecycle.service.ts:258-268`). Synchronous, mid-operation (`:173-182`), so it only schedules. | `debounceMs`; the fire-time read happens after `applyPathChange` settles | actions only (correction 4) |

Path-change consumer behavior:
- **Delete:** cancel `from` and `from + '/'`.
- **Own move:** a module-local mark (`asOwnPathChange` pattern, `event-calendar.service.ts:583-601`) makes the consumer skip it.
- **Single note:** cancel at `from`, schedule at `to`.
- **Folder:** re-key pending timers under the prefix and **do not evaluate children** in v1 (D12).

Renames by Todoist, the calendar and mods also fire the consumer (`sync-now.service.ts:960`, `event-calendar.service.ts:734`, `mod-vault.service.ts:60,67`).

Not seen by any trigger:
- edits outside the app (the watcher never calls `notifyAfterSave`; validation-07 Missed 1);
- link rewrites (`link-updater.service.ts:58,71`);
- type renames;
- task writes;
- Trash restore and `duplicateItem`.

Document these. Deep-link creates already fire after-save (validation-01 R2), so they get the save trigger. The second evaluation finds nothing to do.

**Why not the other hooks.**
- `NoteChangeConsumer` has no `source`, sees unsaved `edit` text, skips save dedupe hits, misses watcher full rebuilds and self-save windows, and cascades into backlink sources on rename (validation-04 R1/R5/R8, validation-08 R2).
- `syncExternalContentToEditor` fires per keystroke from the panel (design-A 5.3).
- The `file-icons` consumer is being rewritten by Issue 169 (validation-03 Missed 2).

**Loop protection**, strongest first:
1. An in-memory fixed point over all-match actions, with claim-on-match per key (a later rule never writes a key a matching earlier rule claimed). Pass cap 10, from the `MAX_FORMULA_DEPTH` precedent (`evaluator.ts:18`). A repeated state or the cap means cycle: write nothing, log once. Each pass rebuilds the record with `buildNoteRecord(rebuildContent(working))` and never patches the Map (scout-16 2.3).
2. Moves inside the fixed point: re-plan at the destination, re-select the move, abort on a second move (correction 1).
3. A semantic no-op check before the writer. `next === base` compares canonical bytes, so a no-op `mutate` still rewrites non-canonical YAML once (validation-01 R1, validation-07 R3). The write's echo then costs one parse.
4. No action removes a key, the legacy icon included.
5. Literal values only. A volatile `always` value (`now()`, mtime) cannot be configured.
6. At most one move per run, plus the own-move mark.
7. Per-path serialization across all triggers, chained across the runner's own move.

Outside the guard, documented:
- a mod writing frontmatter from `onNoteSaved` (`mods-host.service.ts:554-579`; already warned in `28-mods.md:180`);
- sync tools rewriting values.

## 5. Action semantics (per action: `ifMissing` or `always`)

Shape: `{ key, value: string | number | boolean | string[], mode }`. The JSON type of the value decides the YAML type (`serializeProperties` keys off `Property.type`, `properties.logic.ts:603-625`). Keys are canonicalized on load (`organized` -> `_organized`).

| Value type | `ifMissing` writes when | `always` writes when | Notes |
|---|---|---|---|
| text | key absent, `null`, `''` or bare `key:` | value differs | dates are ISO strings (`date` is a read-side label only) |
| number | as text | type or value differs (`"5"` text -> `5` number) | `0` counts as populated |
| boolean | as text | differs | must be a real boolean: `boolFlag` ignores `"true"` (`collection.logic.ts:101-108`). `false` counts as populated. |
| list | absent or `[]` | ordered list differs, then **replace** | `[""]` counts as populated. "Add item if absent" is not in v1 (D15). |
| wikilink | as text, written quoted `"[[X]]"` | as text | `always` fights the rename link rewriter, which rewrites raw and fires no after-save (scout-16 3.3). Default new actions to `ifMissing`, and warn on `always` with `[[`. |

Rules that apply to every type:
- Decide on `parseFrontmatterProperties(content)`, never on `PropertyIndexRecord` (validation-07 R4).
- The pure `mutate` re-checks `ifMissing` against the fresh props, so a value the user typed during the debounce is never overwritten (scout-16 5.1).
- Claims: the first matching rule in list order owns a key for the run, whether or not it writes. A matching `ifMissing` rule above an `always` rule on the same key shadows it.
- Nothing is reverted when a rule stops matching.
- **Key policy:**
  - Deny `todoist_project` (it re-parents tasks; scout-09 3.1, mechanism per validation-05 R2).
  - Warn on `always` for `_organized`, `_archived`, `_favorite` and `_type`: it undoes manual toggles (scout-10 2.4).
  - Warn on `ifMissing _organized: false`: it sends every old matching note to the Inbox (scout-10 2.4).
  - `ifMissing _icon` hides an inherited type icon, because "missing" is about the key (validation-08 M10).
- **Colors:** validate with the readers' rule, no `;` and no `url(` (`file-icons.logic.ts:162-164`). `_color` maps palette names to theme tokens; `_title_color` uses them as raw CSS (validation-03 R8).
- **Side costs of each real write:**
  - one File History snapshot (not an undo net: pruned at about 37 days, can be off; validation-07 R2);
  - a Rust, FTS and semantic reindex, with a chunk re-key when the line count changes (validation-07 R1);
  - Todoist scheduling for anchored notes;
  - mods `onNoteSaved`;
  - a one-time canonical reformat of the YAML block the first time a rule really changes a value (ADR 0029 "Trigger window" amendment, D16).

## 6. Risks and the open-itens 001 dependency

- **001 (caret keeps its old offset)** blocks every slice that writes to an open tab: S2 (save), S5 (rename of the open note), S6 (property change). It does not block S4 (create is pre-write). Rule writes reach the tab through `syncExternalContentToEditor`, then `replaceDoc`, with the old caret offset (`MarkdownEditor.svelte:182-186,627`). Skipping the active note does not help, because background tabs shift too (validation-06 Missed 8). The fix is known and small (map the selection; 001 "What to build"). Do not work around it with a ranged transaction, which would be a second write seam (design-B section 9).
- **Typing conflict (judge-1 X3).** Fixing 001 makes the caret land sanely, but a fill or always write can still change a value the user is retyping, giving `status: tododone`. The idle gate (correction 3) covers the dirty active tab. A clean tab after a pause can still take a write, which is the point of the trigger. This is rare at 3.5 s and routine at 0.8 s.
- **Issue 105 / 008 (Properties panel skip flag).** A rule write inside the 300 ms window after a panel commit is dropped by the panel's next commit (validation-02 M2, validation-05 R6). It is a hard blocker for S6. For S2 it is a co-requisite: the loss is the rule's own key and the next run re-applies it (judge-1 X4).
- **031 (+030) broken config resets rules to empty**, and the next Settings edit overwrites the file (`auto-move.service.ts:61-64`). It blocks S2.
- **005 / 022 (empty `---\n---` block).** The writable gate skips these notes, so they get no rules until 022 lands. They are not corrupted. The folder-note placeholder writes exactly this block (`file-icons.service.ts:100-103`).
- **054 (Markdown only)** is absorbed by S1.
- **Others:**
  - the Todoist closed-note race with `write_task_lines` is plausible and unproven (scout-09 H4); accept it in v1;
  - the calendar's rename-then-write overlap is low risk;
  - Sentry volume grows with triggers, so report once per rule per session (validation-01 M10);
  - the one switch also enables `_archive_to` lifecycle moves, as today (`22-auto-move.md:124`);
  - planner cost is not measured.

## 7. Slices (Issues), in order

Every slice runs the frontend gate only. Answer the D-questions before writing these Issues: Issues with an "owner decision in Notes" criterion come back blocked from relay-lite.

| # | Slice | Blocked by | Owner input |
|---|---|---|---|
| S0 | **Characterization tests** on the real chain: real `editor.hooks`, real `updateNoteFrontmatter`; mock only plugin-fs and `call`. Pin first match, lifecycle archive and unarchive, excluded folders, already-in-destination, icon with color removal, lossy skip, move-failure skip. Today's service test mocks the hooks, so the chain is untested (`auto-move.service.test.ts:6-29`). | none | none |
| S1 | **Runner hardening, no new features:** fire-time read at the current path; per-path tail; Markdown gate (closes 054); writable gate; real stats; `hasLifecycleRules` = "some type has `archiveTo`" (`auto-move.service.ts:101`); one vault-lifetime observer with the switch re-checked when the timer fires (cancels on disable); a path-change consumer that only re-keys and cancels (deletes included); a loader normalizer that drops malformed entries (a `null` rule throws on every save today, validation-06 R1); quiet catch of `FrontmatterWriteError` and vanished paths; trailing-slash fix for excluded folders. | S0 | none |
| S2 | **Actions on save (rewrites Issue 01), JSON only:** `PropertyAction` type and normalizer; legacy `icon` translation with no color removal; the pure planner (all-match claims, fixed point, cycle abort, first-match move among rules with a destination, re-plan at the destination with move re-selection); semantic no-op; one write; idle gate; queue chained across the own move; empty destination means no move; exported `isEmptyPropertyValue`/`toTruthy`; refresh nudge (G4); help page section. | S1, **001**, **031** (+030); 105 recommended | D1-D5, D15, D16 |
| S3 | **Settings UI for actions:** `RuleActionList`/`RuleActionRow` with typed value, mode, IconPicker (icon and color-only mode); derived validation with the strong validator, which also fixes the green check for a persisted invalid expression (`AutoMoveRuleRow.svelte:37-43`); hints ("does nothing", lifecycle and wikilink warnings, `icon` vs `_icon`); copy; flush on destroy (079). | S2 | D3 default mode |
| S4 | **Create trigger:** core transform registry in both creators, lifecycle-pinned, `indexing-watcher-rules.md` rule 6 sentence; Auto Move transform runs actions only. | S2 (not 001) | D9, D14 |
| S5 | **Move/rename trigger (rescopes Issue 02):** schedule at `to` on single-note changes, actions only, own-move mark, folder children not evaluated, mods events doc row. | S2, **001** | D6, D12, D13 |
| S6 | **Property-change trigger:** `previousContent` argument (core), canonical frontmatter diff, short delay for actions with the move left on the save timer, idle gate covered by tests. | S2, **001**, **105** | D7, D9, D10 |
| S7 | Optional: errors once per rule, conflict lint ("overridden by rule N", "always-sets a key it reads"), unknown-identifier warning, AST cache if profiled. | S2 | D17 |

Two tests the judges asked for, to add to S2 or S6:
- one asserting that the observer sees the echo **before** `updateNoteFrontmatter` resolves, so a future byte guard cannot regress;
- one using the real writer and the real `notifyAfterSave`, asserting that a rule set settles in a bounded number of runs with no user event, including the four-rule move loop.

Not proposed: "apply rules to existing notes" (needs its own pre-write snapshot, validation-07 Correction 3), external-edit triggers, computed values, transition conditions.

## 8. Decisions only you can make

| # | Question | Options | Recommended default |
|---|---|---|---|
| D1 | Shape | (a) extend Auto Move in place; (b) A: "Automations", new versioned file, folder rename; (c) B: separate Property Rules over a shared core | (a). Relabel the section in copy only (for example "Rules"), with no code rename. A later rename is mechanical (C section 15.6). |
| D2 | Issues 01 and 02 | (a) set 01 to `needs-info` now, supersede it with S2, rescope 02 into S5; (b) let 01 ship as written | (a). 01 is `ready-for-agent`, and relay auto-launch would ship Behaviors 5-6, which oscillate once `always` exists (judge-2 G5). |
| D3 | Legacy icon | (a) translate to `always` actions that never delete colors and apply from every matching rule; (b) keep "icon only from the moving rule" (a permanent special flag) | (a). New icon/color actions default to `ifMissing`. |
| D4 | Empty destination | (a) no move; (b) vault root as today | (a), as Issue 01 Behavior 1 already decided |
| D5 | Rule cycle | (a) abort the whole run for that note and log once; (b) apply the converged keys and skip only the cyclic ones | (a). It silently disables the note's other rules, so show a warning in Settings (judge-1 J1). |
| D6 | Moves on move/rename triggers | (a) never; (b) yes | (a), so the engine never undoes a manual drag |
| D7 | Move cadence after a property edit | (a) moves keep `debounceMs`, only actions take the short delay; (b) everything at the short delay (an Archive toggle moves the open note in about 0.3 s) | (a): Auto Move timing unchanged |
| D8 | Per-rule triggers | (a) v1: every rule on every trigger, under the fixed policies above; (b) per-rule toggles | (a). Add an optional `triggers?` later if you need "create-only defaults that must not backfill old notes on save". |
| D9 | "Immediately", and the two core seams | about 0.8 s after the last frontmatter keystroke (0.3 s for toggles) through the `previousContent` argument; the create transform registry | Yes to both. They are the requested triggers, not corner cases. Timings are not measured. |
| D10 | Idle gate scope | (a) re-arm only while the active tab is dirty; (b) also while the caret is inside the frontmatter | (a) |
| D11 | Switch | (a) one switch for moves, `_archive_to` moves and actions; (b) a separate switch for lifecycle moves | (a), as today |
| D12 | Folder move or rename | (a) re-key timers, do not evaluate children; (b) evaluate up to a cap | (a) |
| D13 | Renames by Todoist, calendar and mods | (a) they trigger actions-only runs; (b) they are ignored (needs a shared core marker, validation-04 Missed 5) | (a) |
| D14 | Create coverage | (a) `openOrCreateNote` + `createFile`; (b) also mod create, Todoist pull, duplicate, restore | (a); the others get rules at their first save |
| D15 | Values in v1 | text, number, boolean, list; literals only; `always` on a list replaces it | Yes. Computed values come later from the same engine, never `{var}` or `<% %>` (validation-01 M6). |
| D16 | One-time YAML reformat the first time a rule really changes a note | accept (ADR 0029 amendment), or require a byte-preserving line insert (a second write seam, validation-08 M6) | Accept. Notes a rule leaves unchanged are never rewritten. |
| D17 | Runtime rule errors | Sentry once per rule per session; per occurrence; local log only | once per rule per session |

## 9. Evidence index

All files are under `.scratch/frontmatter-rules/research/`.

| File | Covers |
|---|---|
| `scout-01-expression-engine.md` | engine syntax, limits, error policies, placement |
| `scout-02-auto-move-end-to-end.md` | Auto Move today, end to end |
| `scout-03-note-record.md` | `PropertyIndexRecord`, projection |
| `scout-04-frontmatter-write-path.md` | `updateNoteFrontmatter`, canonicalization, caret |
| `scout-05-icons-colors-visual-keys.md` | `_icon`/`_color`/`_title_color`, resolver |
| `scout-06-trigger-after-save.md` | after-save observers and callers |
| `scout-07-trigger-property-change.md` | property-change options, panel/meta-bind/YAML timing |
| `scout-08-trigger-create-move-rename.md` | create seams, `applyPathChange` |
| `scout-09-other-frontmatter-writers.md` | Todoist, calendar, lifecycle, mods |
| `scout-10-overlapping-features.md` | types, templates, explicit organization, Issue 01/02 overlap |
| `scout-11-settings-ui-persistence.md` | Settings registry, config file, UI bugs |
| `scout-12-mods-extension.md` | why not a mod |
| `scout-13-performance-indexing.md` | index and watcher costs |
| `scout-14-prior-art-web.md` | Obsidian plugins, Notion, Tana |
| `scout-15-docs-adrs-constraints.md` | ADRs, docs, naming |
| `scout-16-value-semantics-cycles.md` | missing, claims, cycle taxonomy |
| `validation-01..08.md` | corrections; they win over the scouts |
| `design-A.md`, `design-B.md`, `design-C.md` | the three designs |
| `judge-1.md` | correctness: X1-X5, mandatory corrections |
| `judge-2.md` | simplicity: G1-G5, cuts |

Not verified here:
- No timing was measured. 300 ms and 0.8 s are proposals.
- The X2 move loop and the X3 typing conflict were traced by hand.
- How 001's fix maps a selection through a whole-document replace.
- Whether `PropertyField.svelte` keeps local state while focused.
- The owner's installed mods (outside the repo): whether any of them writes frontmatter on save.
