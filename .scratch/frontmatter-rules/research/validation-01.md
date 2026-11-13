# Validation 01: scout-01 (expression engine) and scout-02 (Auto Move end to end)

Adversarial pass at HEAD `2e2cc5b60`. Both reports exist. Every load-bearing claim below was checked against the cited code; nothing was run (no tests, no builds). "Unverified" marks what I could not confirm by reading.

Verdict in one line: both scouts are accurate on behavior. I found no claim that inverts a design conclusion. I found three imprecise or incomplete claims that matter for design (idempotence of `updateNoteFrontmatter`, which creates reach the after-save hook, a test that does not pin what it is said to pin) and several gaps, the biggest being that the after-save hook carries non-Markdown files into a write path that has no Markdown guard.

## Refuted (claim, why, correct evidence)

### R1. "A write that changes nothing returns without writing; that idempotence is what stops the icon from looping" (scout-02 1.x and 3.3). Partly wrong.

- `updateNoteFrontmatter` compares BYTES after a full re-serialization: `next = rebuildContent(mutate(parse(base)), body, base); if (next === base) return base;` (`src/lib/core/frontmatter/frontmatter-write.service.ts:128-129`).
- `serializeProperties` builds a fresh `yaml` Document every time (`src/lib/core/frontmatter/properties.logic.ts:603-625`). It forces every list to flow style (`seq.flow = true`, `:610-613`), canonicalizes alias keys (`dedupeCanonicalKeys`, `:609`) and keeps only the original spelling of unchanged numbers and booleans (`:616-619`). Strings get the library's quoting.
- Consequence: a `mutate` that changes no value still writes once on any note whose YAML is not already in serializer form. Block lists (`tags:\n  - a`) and `icon:` instead of `_icon:` are the common cases. That write fires `notifyAfterSave`, a file-history snapshot and a re-index. The loop stops on the second pass, because serializer output is then stable. I inferred that from the code; no test I found asserts it.
- So the guard against loops and needless rewrites has to be semantic: decide "nothing to do" on the parsed properties BEFORE calling `updateNoteFrontmatter`. `removeFrontmatterIcon` already does this (`src/lib/features/file-icons/frontmatter-icon.service.ts:84-89`). The Auto Move icon does not (`setFrontmatterIcon`, `:57-67`), so today every icon rule reformats the YAML of each note it matches once.

### R2. "Note creators and `fs.service::createFile` go through `applyNoteChange` and do not call `notifyAfterSave`" (scout-02 3.4, "Create"). Incomplete in a way that matters.

- True for the note creator (`src/lib/core/note-creator/note-creator.service.ts:118`, source `create`), the explorer (`src/lib/core/filesystem/fs.service.ts:216`, source `fs`), mod `create` (`src/lib/plugins/mods/mod-vault.service.ts:95-116`) and the Todoist closed-note writer (`src/lib/features/todoist-sync/closed-note-writer.service.ts:79`).
- False for deep-link creates. The silent create (`src/lib/features/deep-link/deep-link.service.ts:332-338`), overwrite of a possibly new file (`:306-313`) and capture into a new unique path (`src/lib/app/deep-link-actions.ts:212-216`) all call `notifyAfterSave`. Those new notes already reach Auto Move.
- Design impact: if "on create" is built as a separate hook next to "on save", deep-link creates fire both. Dedupe per path is needed, or create has to be defined as "the first after-save or create event for a path".

### R3. "Null-hostile methods ... Pinned by `evaluator.test.ts:238`" (scout-01 3). The behavior is real, but no test pins it.

- The code does throw: a `null` receiver has no registry entry, `lower` is not in `any`, so `dispatchMethod` throws `Unknown method: lower` (`src/lib/features/collection/expression/methods.logic.ts:255-270`).
- `evaluator.test.ts:234-244` pins the opposite case: `type.lower()` now resolves through the alias. Only its comment mentions the old throw. The only throw assertions are `status.unknownMethod` (`:541`), `unknown()` (`:436`), `file.unknownMethod` (`:536`), circular formulas (`:372`) and `methods.test.ts:665-674`.
- Impact: making methods null-safe (scout-01 risk 3) breaks no existing test. It needs new tests, and you must decide what formula columns should show.

### R4. "Three consumers" of the engine (scout-01 scope and section 4). An undercount.

- Missing importers: `src/lib/features/collection/toolbar/FilterRow.svelte:17` (the strong `validateExpression`), `src/lib/features/collection/toolbar/formula.logic.ts:2` (`parse`), `src/lib/features/collection/toolbar/filter.logic.ts:2-3` (named in the text but left out of the table) and `src/lib/features/collection/CollectionTableView.svelte:4` (`isDisplayValue`).
- Separate homonym: `src/lib/utils/template.ts:38` exports an unrelated `evaluateExpression`, the Templater `<% %>` evaluator. See M6.

### R5. Citation drift (minor, conclusions unaffected)

- Nested mappings are skipped at `properties.logic.ts:286-295`, not `:333-334` (that is the doc comment).
- The examples test is at `src/tests/help/examples-scoping.test.ts:231-234` and `:351-359`, not under `src/tests/lib/`.
- Scout-02 places lifecycle at `app-lifecycle.service.ts`. The full path is `src/lib/app/lifecycle/app-lifecycle.service.ts`. Lines `:294-296`, `:303`, `:443-445` and `:669` are correct.

## Confirmed key claims

Engine (scout-01):
- `EvalContext` is `{ record, formulas }` only, with no previous value and no event (`evaluator.ts:11-16`).
- Bare identifier: formula, else `properties.get(alias(name)) ?? null`. The only alias is `type -> _type` (`evaluator.ts:93-95, 143-150`). `prev.status` silently resolves to `null` through the dotted fallback (`:174-181`).
- `file.*` fields and methods are exactly as listed (`evaluator.ts:194-214, 563-588`). `file.inFolder` and `file.folder` are ABSOLUTE (record built from the absolute path, `collection.logic.ts:32-33`; documented at `help/documentation/12-collection.md:409-425`).
- ASCII-only identifiers; `a-b` is one identifier; other characters throw (`tokenizer.ts:131-165`). `1.2.3` becomes one NaN number token (`:42-49`). No ternary, no `in`, no indexing (`parser.ts:160-203`).
- Auto Move's `validateExpression` only parses (`auto-move.logic.ts:87-95`) and is the one `AutoMoveRuleRow.svelte:17,41` uses. The strong one is `evaluator.ts:306-315`.
- No parse cache in `parse` or `evaluateExpression` (`parser.ts:8`, `evaluator.ts:75-78`). `evaluateFormula` re-parses (`:224`). Caching exists only per `executeQuery` (`collection.logic.ts:147-158`).
- `.filter()` / `.map()` temporarily swap `ctx.record.properties` (`evaluator.ts:520-560`), and `executeQuery` passes shared index records (`collection.logic.ts:144,161-170`).
- Auto Move builds its record with `Date.now()` twice and size 0 (`auto-move.service.ts:154`; defaults at `collection.logic.ts:22-28`). `updateNoteInIndex` keeps the existing stat values (`collection.service.ts:152-162`).
- The projection always sets `organized`/`archived`/`favorite`/`tags` and rewrites the relationship keys to target arrays (`collection.logic.ts:53-77`).
- Layer baseline has exactly 3 `utils -> core` entries with `BASELINE_SIZE = 3` (`src/tests/lib/architecture/layer-baseline.json`, `layer-rules.test.ts:32`). CLAUDE.md's wording that the baseline holds `core->features` / `features->plugins` debt is stale.
- `featureCycleEdges` is empty and `FEATURE_CYCLE_EDGES_SIZE = 0`. A new acyclic pair is auto-written and never fails (`feature-cycle.test.ts:36-44, 88-94`). The pairs `auto-move -> collection|file-icons|type-definitions`, `type-definitions -> collection|file-icons` and `rail-shell -> collection` exist.
- ADR-0003 allows feature -> feature while acyclic, and registration APIs invert core dependencies (`docs/adr/0003-four-layer-source-taxonomy.md:37, 90-92`).

Auto Move (scout-02):
- Boot order and teardown (`app-lifecycle.service.ts:294-303, 443-445, 669`).
- The observer gates are `.view` only, enabled, user rules or `typeMetadataMap.size > 0`, vault path, then excluded folder (`auto-move.service.ts:96-110`).
- There is one timer per path, and it captures the last save's content (`:112-125`).
- Defaults are `enabled: false`, `debounceMs: 3000` (`settings.store.svelte.ts:110-113`). The UI clamps 500..30000 (`AutoMoveSection.svelte:29-31`).
- `notifyAfterSave` call sites are exactly as listed: `frontmatter-write.service.ts:161`, `editor.service.ts:196`, `deep-link-actions.ts:78,216`, `deep-link.service.ts:277,296,313,337`, `mod-vault.service.ts:135`.
- First match wins. A throwing rule goes to `onError` and is skipped (`auto-move.logic.ts:17-35`). User rules come before lifecycle rules, which are regenerated on every evaluation (`auto-move.service.ts:156-157`).
- `moveItem` throws when the target exists (`fs.service.ts:312`). Auto Move swallows that with a bare `return` (`auto-move.service.ts:189-195`).
- The icon is applied after the move and also when the note is already in place, with a lossy pre-check on the captured content (`:199-214`).
- The icon is "always set" and removes `_color`/`_title_color` when the rule has none (`frontmatter-icon.service.ts:26-31, 57-67`). Refusals are toasted except `save-failed` (`:38-50`, `frontmatter-write.service.ts:64-72`).
- The config loader does no per-rule validation. Corrupt JSON gives empty defaults, and the next structural or text edit in Settings writes the store over the file (`auto-move.service.ts:42-88`, `AutoMoveSection.svelte:33-87`).
- Excluded folders use an un-normalized prefix match, so `'_templates/'` never matches (`auto-move.logic.ts:41-63`). They are checked only at observer time.
- `toggleAutoMoveHook(false)` does not clear pending timers (`auto-move.service.ts:134-146`). Only `resetAutoMove` does (`:218-231`). `evaluateAndMove` does not re-check `enabled`.
- `moveItem -> applyPathChange` never calls `notifyAfterSave`. Path-change consumers run synchronously after `diskOp` and before the link rewrite, once per change, folders once (`path-change.service.ts:38-49, 173-191`).
- The docs/code mismatch on ".md only" is real (`help/documentation/22-auto-move.md:183` vs `auto-move.service.ts:97`). The mods doc confirms that `write` runs Auto Move for non-Markdown files (`help/documentation/28-mods.md:304`).
- Concurrent closed-note writes race and the last one wins. Callers must serialize (`frontmatter-write.service.ts:95-97`).
- The service test mocks `plugin-fs`, `editor.hooks`, `fs.service`, `file-icons.service` and `debug` (`auto-move.service.test.ts:6-29`), so the write -> after-save -> re-evaluate chain is untested.
- The caret blocker evidence matches (`MarkdownEditor.svelte:182-186, 627`; Issue 001), and the existing Auto Move icon already takes that path.

## Missed

### M1. Non-Markdown files reach the hook, and the generic write path has no Markdown guard. Corruption risk.

- Mod `write` fires `notifyAfterSave` for any extension (`mod-vault.service.ts:118-135`).
- Deep-link create and overwrite keep the name's own extension (`deep-link.service.ts:322-337`).
- Auto Move filters only `.view` (`auto-move.service.ts:97`).
- Today the icon is harmless on `data.json` only because `setIconForPath` checks `isMarkdown` and silently does nothing (`file-icons.service.ts:127-145`). The MOVE still happens: a match-all rule moves a mod's JSON file.
- `updateNoteFrontmatter` has no extension check (`frontmatter-write.service.ts:116-128`). With a non-empty property list, `rebuildContent` returns `---\n<yaml>\n---\n<body>` (`properties.logic.ts:689-696`), which prepends a YAML block to a JSON or text file.
- A frontmatter-rules action that calls `updateNoteFrontmatter` directly must gate on `isMarkdownFile` first. The collection consumer does the same (`collection.service.ts:182-190`).

### M2. Move chaining already exists today.

- An icon rule's write fires `notifyAfterSave` on the NEW path (`frontmatter-write.service.ts:161`, or the tab branch via `saveFileByPath -> writeTab`, `editor.service.ts:171-204`). That schedules a full re-evaluation after the debounce, and a different first-matching rule can move the note again.
- A dirty open tab re-keyed by the move autosaves to the new path, with the same effect.
- So "own move must not re-trigger" is not only an Issue 02 concern. Any design that writes after a move inherits it.

### M3. Debounce timers do not follow renames.

- The timer captures `filePath` and `content` (`auto-move.service.ts:116-123`), and Auto Move registers no path-change consumer.
- If the note is renamed or moved within the debounce window, the timer evaluates the old path. `moveItem` fails, which is logged to Sentry, and a frontmatter write would fail on `readTextFile` of a missing path with a raw read error, not a `FrontmatterWriteError` (`frontmatter-write.service.ts:121`).
- A shared dispatcher needs a path-change consumer that re-keys or cancels pending timers.

### M4. Truthiness differs between consumers.

- Auto Move uses JS truthiness (`if (result)`, `auto-move.logic.ts:27`). Collection uses `toTruthy` (`collection.logic.ts:321,355`; `evaluator.ts:632-636`). They disagree on `NaN`: Collection true, Auto Move false. Example: `number(x)` on a non-numeric value.
- A shared `matchesRecord` must pick one; `toTruthy` keeps Collection unchanged.

### M5. Alias traps on the read side.

- `parseFrontmatterProperties` canonicalizes keys at parse (`properties.logic.ts:297`, `utils/frontmatter-aliases.ts:6-23`). A note written with `color: red` is stored under `_color`, so the expression `color == "red"` is always null. Users must write `_color`, `_icon`, `_order`, `_template`. Documented at `12-collection.md:387`, but rule authors will hit it constantly.
- `file.hasProperty("archived")`, `("organized")`, `("favorite")` and `("tags")` are ALWAYS true, because the projection inserts them on every note (`collection.logic.ts:63-69`). `file.hasProperty("color")` is always false.
- Neither can express "missing". The "fill only if missing" check must run on the parsed `Property[]` inside `mutate`, as Issue 01 says.

### M6. There are three value-template syntaxes, not one.

- The Collection engine (`now().format("YYYY-MM-DD")`).
- Auto Move destination variables `{folder}`, `{year}`, ... (`auto-move.logic.ts:102-130`, with `new Date()` at `:117`).
- Templater `<% tp.date.now(...) %>` (`utils/template.ts:22-46`).
- If action values may be computed, the "one engine" preference implies the Collection engine (scout-01 section 7 item 4). Then `{var}` and `<% %>` must not be re-used in action values, or users get a third dialect in one rule file.

### M7. Each rule write has side costs.

- One file-history snapshot: an after-save observer at `file-history.service.ts:192`.
- One Rust re-index and an FTS/semantic update (`editor.hooks.ts:67-94` -> `note-change.service.ts:197-269`).
- Content-cache invalidation (`notifyContentInvalidated`).
- On an open tab, the save flushes the user's unsaved body edits to disk at once (`frontmatter-write.service.ts:131-133`).
- A two-pass loop (R1) doubles all of this. A rule that writes every note on save adds a history row per note.

### M8. "Property change immediately", timing measured from code (scout-02 left it unverified).

- Editor frontmatter edits arm a 500 ms save. Body edits arm 2 s, with a maximum of 10 s (`editor.service.ts:227-251`). Auto Move then waits `debounceMs` (3000 ms by default).
- A YAML edit in the editor therefore reaches evaluation about 3.5 s later at defaults.
- A `NoteChangeConsumer` gets `edit`-source upserts during typing, about 1 s, without a save (`note-change.service.ts:10-19, 89-99`). It also gets link-rewrite upserts of OTHER notes (`link-updater.service.ts:71`, source `save` but no `notifyAfterSave`). Use it only if rules should react to typing and to link rewrites. Scout-07 owns the details.

### M9. Previous-record availability, and when it exists.

- The collection consumer is registered first (`app-lifecycle.service.ts:258-260`) and overwrites the record in place (`collection.service.ts:152-162`). Any later note-change consumer sees the NEW record.
- During `pathChanged`, the TS record is still keyed at `from`: `forgetNote` runs at the end of `applyPathChange` (`path-change.service.ts:233-235`). A rename trigger can read the pre-rename record, with real stat values, from `collectionStore.propertyIndex.get(from)` at that moment.
- I could not verify when or how the record at `to` appears in the TS index after a rename. It is not upserted in `applyPathChange`. Presumably it arrives through the Rust `rename_note` delta, which I did not trace. Build the record from content in the path-change trigger.

### M10. Error volume goes to Sentry.

- `error()` reports to Sentry (CLAUDE.md, Debugging).
- A rule that passes Auto Move's weak validator but throws at runtime (`statuz()`, `status.lower()` on notes without `status`) sends one Sentry event per rule per note per save (`auto-move.service.ts:159-161`).
- A failed move on an existing target also logs to Sentry on every save (`fs.service.ts:322-324`).
- Fanning out more triggers multiplies both. The stronger validator, plus a rate limit or "report once per rule", belongs in the shared layer.

### M11. Unarchive lifecycle rule and absent keys.

- `_archived == false` on a note without `_archived` is `null == false`, which is false (`evaluator.ts:704`). The generated unarchive rule (`type-lifecycle-rules.ts:52`) fires only when the flag is written explicitly.
- That is probably intended, but it is the pattern a user will copy for "fill only if missing" conditions and get wrong. Use `isEmpty(_archived)` or the projected `archived == false`.

### M12. A new feature pair might close a cycle.

- If the properties panel (`features/properties`) must call the new feature for "on property change", the pair `properties -> frontmatter-rules` appears. The new feature must then never import `features/properties`.
- The new feature will likely import `file-icons` (icon picker, `setIconForPath`). `properties -> file-icons` already exists, which is safe.
- The cycle test fails at once on any cycle (`feature-cycle.test.ts:67-86`).

## Corrections a designer must know

1. Decide "no-op" semantically before writing (R1). Byte idempotence in `updateNoteFrontmatter` is not enough, because the first call reformats non-canonical YAML. Merge every action of one evaluation into one `mutate`, and skip the call when the computed property set equals the parsed one.
2. Gate every frontmatter action on `isMarkdownFile(path)` (M1). The after-save hook delivers JSON and other files from mods and deep links.
3. Deep-link creates already fire after-save (R2). A separate create trigger needs per-path dedupe.
4. Own-write and own-move re-entry already exist (M2). Any dispatcher needs an "own change" mark or a convergence rule, not only for path-change triggers.
5. Pending timers must follow or cancel on path changes and on disable (M3, plus scout-02 3.8).
6. Use one truthiness function (`toTruthy`) and one validator (`evaluator.ts:306`) in the shared match layer (M4, scout-01 3).
7. "Missing" cannot be expressed with `file.hasProperty` or `isEmpty` on the projected flags (M5). Compute it on canonical keys in `mutate`. Expressions must use underscore keys for every alias except `type`.
8. Null-receiver method throws are not pinned by any test (R3). A null-safe change is free with respect to existing tests but changes formula columns, so you have to decide it.
9. Use real stat values. Never call `buildNoteRecord(path, content, Date.now(), Date.now())`. On a rename trigger the pre-change record is still at `from` while consumers run (M9).
10. Expect about 3.5 s between a YAML edit and evaluation at the defaults (M8). "Immediately" needs a different source or a shorter debounce for that trigger. That choice is yours.

## Open questions only the owner can answer (new, beyond the scouts' lists)

1. Should rules ever act on non-Markdown files? Moves currently do for mod and deep-link writes (M1). Restricting frontmatter actions to `.md` is required, but should moves be restricted too (a behavior change for Auto Move)?
2. Is a one-time YAML reformat (block lists to flow lists, `color:` to `_color:`) acceptable the first time a rule touches a note, or must rules never rewrite a note whose values are already satisfied (R1)?
3. Is one File History snapshot per rule-driven write acceptable, or should rule writes be excluded from history (M7)?
4. Should runtime rule errors go to Sentry per occurrence, once per rule, or only to the local log (M10)?
