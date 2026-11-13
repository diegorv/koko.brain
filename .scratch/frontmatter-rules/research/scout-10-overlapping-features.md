# Scout 10: overlapping features (duplication risk)

Area: features that already set, imply or inherit properties/icons/colors by condition. Read-only research, 2026-11-10. Everything below was read in the repo at the paths cited. Anything not verified is marked as such.

## 1. Verdict in short

1. **A type does not define default properties.** Nothing in the type system writes frontmatter into existing notes. `TypeMetadata` has 14 fields and none is a property map (`src/lib/features/type-definitions/type-definitions.logic.ts:5-35`; extraction at `:100-121`). The nearest things are `_template` and `_folder`, which act only when a note is created through "New <Type>" (see 2.2).
2. **A type does imply an icon and colors, but by read-time inheritance, not by writing.** A note with no `_icon` of its own renders the icon of its type's definition note, with its own `_color`/`_title_color` laid over (`src/lib/features/file-icons/icon-resolver.ts:55-77`). Nothing is stored in the member note. This is the exact overlap with the owner's "icons, colors" goal.
3. **The only type-to-rule precedent is `generateLifecycleRules`**, which compiles `_archive_to` on a type definition into synthetic Auto Move rules on the same engine (`src/lib/features/auto-move/type-lifecycle-rules.ts:20-60`). So "types feed Auto Move rules" already exists, in the direction type definition -> rule, for move only.
4. **Recommendation for this area:** the new rules are a separate concept from types. Do not put rule lists inside type definition notes. A type can still be one of the inputs to a rule (`type == "Project"`), and an optional later convenience can be a generated rule from a type key, following the `_archive_to` pattern. Reasons and exact overlaps follow.

## 2. Exact overlaps, one by one

### 2.1 Type definition -> icon/color (read-time) vs rule -> `_icon`/`_color` (write-time)

- Resolution chain, `icon-resolver.ts:64-77`: (a) the note's own frontmatter icon wins, with only its own colors; (b) otherwise the type definition's icon, with the note's own colors over the type's. `resolveTypeIconForPath` skips type `Type` and untyped notes (`:93-98`).
- Consequence for a rule that writes `_icon` on a note: it takes priority over the type icon from then on, permanently (no revert, as the owner decided). A rule "notes with `status == "done"` get `_icon: check`" will hide the type icon on those notes forever, even after `status` changes.
- Consequence for a rule that writes only `_color` or `_title_color`: still layered over the type's icon (`:72-76`), so a color-only rule composes cleanly with type icons. Worth stating as a design point: `_color` "applies only together with `_icon`" for a type definition (`help/documentation/25-types-and-relationships.md:49`) but on a note the resolver lets an own color apply over an inherited icon (`icon-resolver.ts:72-76`). I did not verify whether a note-level `_color` without any `_icon` and without a type icon renders anything; `resolveRef` returns a result when only colors exist (`:51`), and callers "keep their own default icon and still apply titleColor" (`:34-37`). Colors with no icon at all: unverified for the icon color (only the title color is documented as working without an icon).
- `ADR-0026` amendment (2026-11-04) says `TypeMetadata.icon`/`color` have no reader and `BUILTIN_TYPES` icon/color are dead (`docs/adr/0026-...md:15`; code at `type-definitions.logic.ts:38-45` still lists them). The docs agree: "No type has a default icon or color, built-in or not" (`25-types-and-relationships.md:531`). So there is no second, hidden icon source to collide with.
- Writing: icons are written through `setIconForPath` -> `setFrontmatterIcon` -> `updateNoteFrontmatter` (`file-icons.service.ts:118-135`, `frontmatter-icon.service.ts:57-67`), keys `_icon` (as `pack:name`), `_color`, `_title_color` (`:18`). `withIconColors` removes the color keys when no color is passed (`:26-31`), so a rule action that sets an icon without colors would delete existing colors. A "fill only if missing" icon action cannot reuse `setIconForPath` as is. It needs a missing-key check on top, or a direct `mutate`. Note this when sizing the action model.
- A new rule engine should call the existing writers (`updateNoteFrontmatter` with a pure `mutate`), not add a fourth icon-writing path. The three existing icon writers already live in `frontmatter-icon.service.ts`.

### 2.2 Type `_template` / `_folder` vs "default properties"

- `createNoteOfType` / `createTypedNote` build a note from the type's `_template` (or the inline `---\n_type: X\n---\n`), in the type's `_folder` (`type-definitions.service.ts:54-81, 84-95, 129-155`).
- A template can carry any default frontmatter (icons, colors, `status: inbox`), so "defaults for new notes of type X" already exists, but only for notes born through that one path, only once, and only per type. It does not touch notes created any other way (Cmd+N, Quick Capture, file explorer) and does nothing for existing notes.
- Nothing re-applies a template to an existing note. A type has no "when a note becomes type X, fill these" behavior.
- Overlap if rules gain a create trigger: for a typed new note, both the template and a rule may set the same key. With "fill only if missing" the template wins (it runs first, at creation); with "always set" the rule wins. The ordering is a design rule to state.
- `_template` is a single vault-relative path (`type-definitions.logic.ts:112, 19`), not a property map. Putting default properties into the type definition would be a new key, and see 2.6 for why a map there is hostile to the writers.

### 2.3 Explicit organization (`_organized: false` on create) is a hard-coded fill-if-missing rule

- `withUnorganizedFlag` inserts `_organized: false` textually after the opening `---` unless a top-level `_organized:`/`organized:` line exists, whatever its value (`src/lib/core/note-creator/explicit-organization.logic.ts:29-37`). That is exactly "fill only if missing", with a fixed key and a fixed condition (new user note, setting on).
- It is opt-in per call site, not built into any creation primitive. The ADR lists about 15 covered paths and several excluded ones (`docs/adr/0026-...md:55`, "The helper is opt-in per call site ... not built into `openOrCreateNote` or `fs.service::createFile`"). Callers verified: `type-definitions.service.ts:93, 148`, `templates.service.ts:67`.
- Lesson for a create trigger: there is no single create choke point where a rule evaluator can hook in without touching those paths. `openOrCreateNote` is the nearest shared owner (`note-creator.service.ts:78-132`) and already calls `applyNoteChange({ kind: 'upsert', source: 'create', ... })` (`:118`), but periodic notes, `createFile`, type definitions and the file explorer do not all go through it. Whether a rule create-trigger should run on periodic notes is an owner question (see section 5). Today they are explicitly excluded from the Inbox flag (`explicit-organization.logic.ts:5-7`, ADR `:55`).
- Overlap to flag: a rule "new notes in folder X get `_organized: false`" would duplicate this switch, and a rule that sets `_organized` would interact with it (it leaves content that already sets `_organized` unchanged). Both are fill-if-missing, so they compose; but if a rule uses "always set" on `_organized`, it can silently undo the user's Organized click on the next trigger. See the lifecycle caution in 2.4.

### 2.4 Lifecycle flags (`_organized`, `_archived`, `_favorite`) and the Inbox

- Writers: the note action bar toggles go through `updateNoteFrontmatter` (`src/lib/features/properties/lifecycle.service.ts:30-41, 48-57, 77-93`). `toggleActiveNoteArchived` relies on the save running after-save hooks so Auto Move applies `_archive_to` (`:87-93` comment).
- The Inbox predicate `isInboxEntry` = not organized, not archived, listable (`inbox-workflow.logic.ts:10-12`), and a missing `_organized` reads as organized (ADR amendment `:57`). A rule that "fills `_organized: false` if missing" would push every old note that matches into the Inbox, which is the opposite of the documented default (existing notes must stay out). A rule with "always set `_archived`" re-archives a restored note on its next trigger. These are the highest-risk keys for "always set". Flag in the design: either document them as footguns or block "always set" for lifecycle keys. This is a product decision, not a code fact.
- `lifecycle-filter.*` (`src/lib/features/properties/lifecycle-filter.{logic,service,store.svelte}.ts`) is not an overlap: it only builds the archived path set for the Quick Switcher dimming (`lifecycle-filter.service.ts:7-11`, `QuickSwitcher.svelte:73`). It sets and implies nothing. Despite the name it is out of scope for this feature.

### 2.5 Auto Move already has everything the owner asked for, except property writes and triggers

What Auto Move has today:
- Rule model: `{ id, name, expression, destination, enabled, icon? }`, first match wins, stored in `.kokobrain/auto-move-rules.json` (`auto-move.types.ts:13-35`, `auto-move.service.ts:19, 42-65`).
- Engine: `findMatchingRule` -> `evaluateExpression` over a fresh `buildNoteRecord` of the saved content (`auto-move.logic.ts:17-37`, `auto-move.service.ts:154`).
- Trigger: only the after-save observer, debounced (`auto-move.service.ts:94-127`), and only while `settingsStore.autoMove.enabled` (`:98`).
- Excluded folders and `.view` skip (`:97, 107`).
- An icon action, applied after the move, even when already in the destination (`:199-214`). This is a one-key-group property action already living inside Auto Move: `rule.icon` writes `_icon/_color/_title_color` with always-set semantics (`setIconForPath` upserts `_icon`, and removes the color keys when not given, `frontmatter-icon.service.ts:26-31, 64-66`). Per-action "fill only if missing" does not exist for it.
- A generated lifecycle rule set appended after user rules (`:156-157`).

Overlaps with the open Issues:
- Issue 01 adds `defaultProperties` (fill-if-missing only) to Auto Move rules and makes `destination` optional (`.scratch/auto-move-default-properties/issues/01-...md`). This is the same capability as the new feature, narrowed to one action kind and one trigger.
- Issue 02 adds move/rename triggers, still `needs-triage`, blocked by 01 (`.../02-...md`).
- The new feature is therefore the generalization of 01+02: more action kinds (set vs fill), per-action semantics, more triggers. Building it as a separate feature while 01 ships would leave two property-writing rule systems on the same engine. That is the duplication the owner wants to avoid.

Structural coupling that makes a clean split harder than it looks:
- First-match-wins (`findMatchingRule` returns one rule). Move rules need that. Property rules do not: the owner's examples (icon by status, color by type, default relationship by folder) want every matching rule to apply. Issue 01 solves it by making a property-only rule fall through when it has nothing to do (rule 5 in Issue 01), which is a workaround for sharing one list. A shared rule core would need two evaluation modes: "first match" for moves, "all matches" for property actions. This is the main design question for a shared engine.
- Auto Move's single global switch gates everything, including `_archive_to` (`22-auto-move.md`: "with it off, `_archive_to` moves nothing"; `auto-move.service.ts:98`). Property rules inside Auto Move would be turned off by the same switch that people use to stop file moves. A user who wants property rules but not moves cannot get that without a second switch. Flag as a product risk.
- Auto Move's UI is labeled and documented as moving files ("Automatically organize notes into folders", `22-auto-move.md:3`). Property-only rules in it contradict the feature name and the destination field being required in the table of fields.

### 2.6 Where a rule list could live: type definition notes are a poor home

- A type definition is one note per type, read by `extractTypeMetadata` with scalar/list keys only (`type-definitions.logic.ts:66-88`: `fmString`, `fmNumber`, `fmBool`, `fmStringArray`).
- A map of default properties, or a list of rules with expression + actions, is a nested YAML structure. Writers that edit definition notes (`setTypeRailPin` at `lifecycle.service.ts:66-75`, icon picker, `list-prefs.service.ts:44`, all through `updateNoteFrontmatter`) refuse frontmatter with nested values: `LossyFrontmatterReason` includes `'nested'` and `'comments'` (`src/lib/core/frontmatter/properties.logic.ts:357-363`), with the message "has nested values; it cannot be rewritten without losing them" (`:382`). Adding a nested rules key to a definition note would make Pin to rail, Change icon and every other app edit of that definition fail with a toast. This is a hard constraint, verified.
- Flat alternatives exist (a list of strings, or one key per property such as `_default_status: inbox`), but they cannot carry a per-action fill/set choice or an expression without inventing a string micro-format.
- A type is a single-valued classification (`_type`, case-normalized first letter, `normalizeTypeCasing` at `:103`). The owner's rules are expression-based (folder, tag, status, date). A rule scoped to a type is expressible as `type == "Project"` in the existing engine (`type-lifecycle-rules.ts:28-32` does this and notes that `type ==` is already case-insensitive for the type key). So a type needs no special rule syntax.
- The store for type metadata (`typeDefinitionsStore.typeMetadataMap`) is rebuilt from vault entries and short-circuits when unchanged (`type-definitions.service.ts:28-34`, `sameTypeMetadata`), so it is cheap for rules to read `typeMetadataMap` if a "type -> generated rules" layer is added later, as Auto Move already does (`auto-move.service.ts:156`).

Where rules are stored today for comparison: Auto Move's JSON in `.kokobrain/` (ADR-0019), not in notes. A rules file for the new feature should follow that, not frontmatter.

### 2.7 Periodic notes and templates

- Periodic notes: no frontmatter logic. They render a template (file or inline daily template) via `openOrCreateNote` with `contextDate` and periodic variables (`periodic-notes.service.ts:38-61`). They are excluded from explicit organization. They conceptually "imply" properties only through whatever the user's template contains. No overlap with a rule engine except the create-trigger question (should a rule fire on a newly created daily note and, for instance, set an icon?). Note `openOrCreatePeriodicNoteForDate` is also used when clicking a wikilink to a non-existent periodic note (`:30-37` comment), so it is a user-visible creation path.
- Templates plugin: scans `_templates/`, `createFileFromTemplate` writes at vault root and applies the unorganized flag (`templates.service.ts:20-69`). No conditional logic. `ensureTemplatesFolder` writes empty placeholder template files directly with `writeTextFile` and `addToTree`, bypassing indexes (`:111-121`). These are scaffolding, not notes; a create trigger must not fire on them (they are in the templates folder; Auto Move's `excludedFolders` mechanism exists for this, docs `22-auto-move.md` suggest excluding `_templates`).
- `processTemplate` expands `<% %>` expressions only (`note-creator.service.ts:63`); this is a different expression language (template variables) from the Collection engine. Not a second rule engine, but a second "expression" dialect users already know. Do not confuse them in docs.

### 2.8 Other writers of frontmatter by condition (non-overlapping but affected)

- Event calendar writes event fields via `updateNoteFrontmatter` (`event-calendar.service.ts:759`), todoist sync writes an id (`sync-now.service.ts:903`), Properties/rail prefs write keys (`list-prefs.service.ts:44`). Each write fires the full after-save path (`frontmatter-write.service.ts` doc: "Closed note: writes the file, then runs the full after-save path (`notifyAfterSave`)"; open tab: saves the tab). So any rule that hangs off the after-save hook will also be triggered by these background writes. A rule action that rewrites frontmatter re-triggers itself once (this is Issue 01 rule 6, "Chaining happens through the save"), so idempotence is required: a second evaluation must produce no write (byte-equal result, so `updateNoteFrontmatter` writes nothing; see mods doc line 180 for the exact rule: it writes nothing only when the rebuilt text equals the file).
- Canonicalization side effect: any `updateNoteFrontmatter` call rewrites other keys into canonical form (block lists become `[a, b]`, `type:` becomes `_type:`) (`help/documentation/28-mods.md:180`). A rule that matches but changes nothing semantically can still rewrite a note's YAML formatting the first time. Rules that skip the write entirely when nothing is missing avoid that. Relevant to "always set" actions that write an equal value: compare before writing.
- Vault mods: a mod's save callback can already set frontmatter by condition with `ctx.app.updateNoteFrontmatter` (`28-mods.md:180, 532, 590-600`), with the documented caveat that a save callback that writes the same note can loop. So power users already have a code-based path; the rules feature is the no-code version. The mods doc's loop warning applies equally to rules (see 2.8 above). Mods use the same after-save observer list (`src/lib/plugins/mods/mods-host.service.ts` is among the `addAfterSaveObserver` users; also search, file-history, todoist sync-scheduler, auto-move). Order of observers is registration order (`editor.hooks.ts:52-57, 67-84`), so a mod and a rule that both write on save run in an unspecified relative order. I did not read `mods-host.service.ts`; the list of users comes from a grep.

## 3. Where new rules should live (this area's recommendation)

Ranking, by overlap with what exists:

1. **Shared rule core, two consumers (best fit for "one engine, one domain").** Extract what Auto Move and the new feature both need: rule type with expression, trigger evaluation, `findMatchingRule`-style evaluation, per-vault JSON config in `.kokobrain/`, excluded folders, the Settings screen skeleton. Auto Move keeps first-match + move + the lifecycle generated rules; the new feature gets all-matches + property/icon/color actions. Types remain a pure input (`type == X`) plus the existing `_archive_to` generator. Cost: Issue 01/02 as written must be re-scoped, because 01 puts `defaultProperties` inside the Auto Move rule.
2. **Extend Auto Move.** Cheapest now, and Issue 01 is already ready-for-agent. But it keeps the first-match-wins coupling (2.5), the single "moves" master switch, and a UI/docs identity of "moving files". Property-only rules fall through by special case. Icon action already shows the pattern strains: it is one more optional field on a move rule, with always-set semantics only.
3. **Put rules in type definitions.** Not recommended: nested YAML refused by every writer of definition notes (2.6), type-scoped only, no home for folder/tag/date conditions.

Whatever is chosen, do not add a second path that writes `_icon/_color/_title_color` or a second frontmatter writer. Reuse `updateNoteFrontmatter` (`frontmatter-write.service.ts`) and the key set in `frontmatter-icon.service.ts:18`.

## 4. Constraints a design must respect (from this area)

1. Precedence of icons: note's own `_icon` beats the type icon (`icon-resolver.ts:64-77`). A rule that writes `_icon` overrides type inheritance for that note permanently. Decide whether a rule icon action should default to fill-if-missing so it never beats a user's own pick.
2. `setIconForPath` is always-set and clears unspecified colors (`frontmatter-icon.service.ts:26-31`); per-action fill/set needs its own mutate.
3. Lossy frontmatter (comments, nested values, duplicate keys, anchors, alias collisions, unparseable) is refused by `updateNoteFrontmatter` (`properties.logic.ts:357-387`). Rules triggered per save must skip quietly (log, no toast per autosave), as Issue 01 rule 7 says. Folder-note and type-definition notes often carry user YAML; a rule matching them must not toast repeatedly.
4. A rule's own write triggers the after-save path again (`frontmatter-write.service.ts` header doc). Rules must be idempotent; "always set" must compare to the current value and write nothing when equal.
5. Type definitions, `.view` files, `.canvas`/`.kanban`, and non-Markdown files must be excluded from property rules (Auto Move skips `.view` at `auto-move.service.ts:97` and docs say only `.md`; `isTypeDefinition` at `type-definitions.logic.ts:91`). A rule that sets `_type` or `_icon` on a definition note would break the type system (`resolveTypeIconForPath` skips `Type`, `icon-resolver.ts:95`). Also exclude the system folder and `_templates` (template placeholders are empty files, `templates.service.ts:118`).
6. The `type ==` and `_archived`/`_organized` identifiers have special evaluator behavior (type compares case-insensitively; `organized` defaults to true; `archived` vs `_archived` are different fields): `25-types-and-relationships.md:348`, `type-lifecycle-rules.ts:28-32`. Rule authors will hit these; the rules UI/docs need a pointer to Collection filter gotchas.
7. Lifecycle keys are the footgun set for "always set" (2.4).
8. Layering (CLAUDE.md layer rules): a new feature in `features/` may import `features/collection/expression` and `features/file-icons` (Auto Move already does, `auto-move.logic.ts:2-4`, `auto-move.service.ts:5-6`). A shared core used by both would sit in a feature folder or `core/`; `core/` importing `features/` is baseline debt that may only shrink (CLAUDE.md "Layer Rules"). So the shared core must not live in `core/` if it imports the expression engine from `features/collection`. I did not open `layer-baseline.json`.
9. Indexing rules doc applies to any hook on create/move/rename/path changes: `.claude/rules/indexing-watcher.md` points to `docs/agents/indexing-watcher-rules.md`. I did not read that file (the reminder arrived while researching, and this scout makes no code changes), so triggers on move/rename/create must be checked against it by whoever scouts the trigger area (Issue 02 already cites it for the same reason).

## 5. Open questions only the owner can answer (from this area)

1. Should a rule icon/color action by default beat an icon the user set by hand, or only fill when none exists? (Per-action config already decided; the default for icon actions and for lifecycle keys is not.)
2. Should rules be allowed to set `_type`? It would re-categorize notes and change type icon inheritance. Safe-by-default option: forbid `_type` and `_organized/_archived/_favorite` in "always set" mode.
3. Create trigger: include periodic notes (daily/weekly), Quick Capture and calendar events? Today periodic notes are deliberately excluded from the Inbox flag. Same for notes created from templates.
4. Should the rules feature have its own master switch, independent of Auto Move's "enable moving files" switch?
5. If a shared core is chosen: is it acceptable to re-scope Issues 01 and 02 (01 is `ready-for-agent`, 02 `needs-triage`) so the properties live in the new feature and not in Auto Move rules?
6. Do you want types to be able to declare rules (generated rules like `_archive_to`) later, e.g. `_default_status`? This scout recommends not now.
7. Fill-if-missing "missing" definition: absent, null, empty string, empty list (Issue 01 rule 4). Same for all new actions?

## 6. What I did not verify

- `src/lib/plugins/mods/mods-host.service.ts` and the other after-save observers (search, file-history, todoist sync-scheduler) were not read; the observer list comes from a grep of `addAfterSaveObserver`.
- Whether a note-level `_color` with no `_icon` and no type icon renders any colored icon (only the resolver code was read, not the renderer).
- `docs/agents/indexing-watcher-rules.md` and `src/tests/lib/architecture/layer-baseline.json` were not opened.
- Rust-side parsing of `_icon`/`_color` in `entry.rs` was not read.
- The Settings UI for Auto Move (`AutoMoveSection.svelte`, `AutoMoveRuleRow.svelte`) was not opened; its line references come from Issue 01.
