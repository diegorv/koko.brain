# Auto Move rules with consequences (MVP)

An Auto Move rule today is a filter plus a destination: when a saved note matches the filter, it moves. This feature keeps that model and widens the "then" part. A rule is **a filter plus one or more consequences** the user picks: move to a folder, set properties, or both. Icons and colors are properties (`_icon`, `_color`, `_title_color`), so they need no special case.

Same engine, same rule list, same config file, same Settings section, same trigger. Nothing new is added to `core/`.

## Decisions

Made by the owner on 2026-11-10. Do not reopen them.

1. **One engine.** The filter is the Collection filter: `FilterItem` (`CollectionFilter | string`, `features/collection/collection.types.ts`) evaluated by `evaluateFilter` (`collection.logic.ts:317`). A rule's conditions combine with all / any / none, exactly as in a view. A plain expression string keeps working, and `&&`, `||`, `!` and parentheses work inside it.
2. **Extend Auto Organize in place.** No second feature, no second rule list, no new config file. Rules stay in one file, `.kokobrain/auto-organize-rules.json` since Issue 06 renamed the feature to Auto Organize (no migration from `auto-move-rules.json`).
3. **Trigger: save only**, through the existing after-save observer and debounce (`registerAutoOrganizeHook` in `auto-organize.service.ts`). Editing a property is a save, so it is covered. Moving, renaming or creating a note is not a save and is out of the MVP. Those notes get their consequences at their next save.
4. **Consequences:**
   - **Move to folder:** as today. It is optional now. An empty destination means "do not move".
   - **Set property:** `{ key, value, mode }`. The mode `if-missing` writes only when the key is absent, `null`, `''` or `[]`. The mode `always` writes whenever the value differs. Values are literals: text, number, boolean or list.
5. **Several rules can match.** Every matching rule applies its properties. Only the first matching rule that has a destination moves the note, as today, so lifecycle rules still run after user rules. If two matching rules set the same key, the rule higher in the list wins. Inside one rule, the user controls the logic with all / any / none.
6. **No chaining.** The saves caused by a run's own writes do not run the rules again. That covers both writes, the legacy icon included. A rule whose filter depends on another rule's output applies at the next save. This is the whole loop protection. The run reads the note as it is when the timer fires, not as it was when it was saved.
7. **Nothing is reverted** when a note stops matching. With `always`, the rule owns the key: a manual change is rewritten at the next save. The help page says so.
8. **Existing notes are not backfilled.** A new rule applies to a note at its next save. The help page says so.
9. **Errors:** a failed property write is logged with `error('AUTO-ORGANIZE', ...)` once per rule per session, never toasted. A failed move writes nothing for that run. Move-failure toasts stay with open-itens Issue 082.
10. **Never written by a rule:**
    - non-Markdown files;
    - `_system` (`settingsStore.templates.systemFolder`), like lists, the calendar and QueryJS;
    - the templates folder;
    - type definition notes;
    - notes whose frontmatter the app cannot rewrite safely.
    
    The key `todoist_project` is refused. `_organized`, `_archived` and `_favorite` accept only true or false.
11. **The YAML block is canonicalized** the first time a rule really changes a note, as every other frontmatter writer does (ADR 0029). A note the rules leave unchanged is never rewritten.
12. **`file.inFolder` accepts a vault-relative folder** (Issue 04), so folder rules read naturally.
13. **Guards against a broad rule:** a new rule starts disabled, Settings shows "Matches N notes now" under the filter, and fields save on change or blur, not on every keystroke. Rules run on any save, including saves made by Todoist sync, the calendar and mods, so a typo in a property name (`stauts == null`) would otherwise stamp every note.

## Out of the MVP

Not now. Each needs its own Issue if wanted later:

- triggers on move, rename, create, or a faster reaction to property edits;
- chained rules;
- a command that applies the rules to notes that already exist;
- computed values (`today()`, `file.basename`);
- "add to list" for list values;
- replacing the legacy `icon` field. It is kept. It is applied before the properties, so an explicit `_color` wins over its color removal (`frontmatter-icon.service.ts:26-31`), and it is covered by Decision 6, so the two cannot loop.
- number and list editors in Settings. The JSON accepts them.

## Issues

| # | Issue | Blocked by |
|---|---|---|
| 01 | Rules set properties on save | open-itens 001 |
| 02 | Rule consequences in Settings | 01 |
| 03 | The rule filter uses the view filter builder | 02 |
| 04 | `file.inFolder` takes a vault-relative folder | none |
| 05 | Also evaluate on move and rename (`needs-triage`, after the MVP) | 06 |
| 06 | Rename Auto Move to Auto Organize everywhere (no migration), and document filters and actions | 03 |
| 07 | Property actions can remove a property or add items to a list | 13 |
| 08 | Property values can be computed with the expression engine | 07 |
| 09 | A rule can create a note | 08 |
| 10 | A rule can run a mod action (uses the existing `run.target`, no contract change) | 12 |
| 11 | A rule can rename the note | 09 |
| 12 | Document the two-rule pattern for values that switch back (docs only) | 14 |
| 13 | An object rule filter reports a condition that fails at runtime (safety; found in Issue 03 review) | 06 |
| 14 | Normalize a create-note target before its gates run (security review of 09) | 11 |

open-itens 001 (the caret follows its text when the frontmatter is rewritten) blocks 01, because the rule usually writes into the note being edited. Without 001, the caret lands inside the `---` block.

## Run order and gates for Issues 07-13

Issues 06-13 come after the MVP. Where they change an MVP decision, they supersede it:
- **Issue 06:** Decision 2's file name and Decision 9's `AUTO-MOVE` tag become `auto-organize-rules.json` and `AUTO-ORGANIZE`.
- **Issues 07 and 08:** Decision 4 ("values are literals") widens to `remove`, `add` and computed values.
- **Issue 10:** line 5 ("Nothing new is added to `core/`") gives way to a small registry in `core/`. The mod action's own saves are ordinary saves, outside Decision 6's skip set.
- **Issues 07, 08, 09 and 11:** the "Out of the MVP" items they implement are in scope.

**One run, in this order:**
1. rename (11);
2. move;
3. the legacy icon;
4. properties, in one write (01, 07, 08);
5. create note (09).

Steps 1-5 happen inside the skip set. Then:

6. run mod action (10), after the skip set is released.

After a rename, every later step resolves with the new name and path. A failed rename or move skips every later step of that run.

**Shared gates.** Every action except the move runs only when the note passes Issue 01's Behavior 10 gates (`propertyWriteSkipReason`):
- Markdown only;
- not `_system`;
- not the templates folder;
- not a type definition;
- frontmatter that is not lossy.

A rule whose only consequence is a rename, a create or an action must still act. Widen the service's early return and the Settings "does nothing" hint each time.

**Chain:** 06, 13, 07, 08, 09, 11, 14, 12, then 10. Issue 10 uses the existing `run.target` field, so it needs no mod-core change. Issue 05 stays `needs-triage`.

## Superseded

- The old `auto-move-default-properties` Issue 01 (`git show 2e2cc5b60:.scratch/auto-move-default-properties/issues/01-auto-move-rule-fills-missing-properties.md`) is replaced by Issue 01 here. Its fall-through and chaining rules (Behaviors 5 and 6) are replaced by decisions 5 and 6. Its Issue 02 moved here as Issue 05.
- `discovery-2026-11-10.md` and `research/` hold the full deep dive (16 scouts, 8 validators, 3 designs, 2 judges, a critic). They designed a much larger system. This PRD is the MVP the owner chose from it. Use them as evidence for code facts, not as scope.
