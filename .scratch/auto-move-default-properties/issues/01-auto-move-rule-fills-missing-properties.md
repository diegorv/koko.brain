# 01: An Auto Move rule can fill missing frontmatter properties, with or without moving the note

**What to build:** Auto Move rules gain an optional `defaultProperties` map (key -> string value). When a rule matches a saved note, every key in the map that the note does not have, or has empty, is written to its frontmatter. Keys the note already has are never overwritten. `destination` becomes optional: a rule whose `destination` is empty or blank fills properties and does not move the note.

The motivating case is a folder that implies a relationship: every note saved directly in `vault/work/topics/AWS/` without a `_belongs_to` should get `_belongs_to: "[[AWS]]"`.

```json
{
  "id": "rule-...",
  "name": "AWS folder -> belongs to AWS",
  "expression": "file.folder.endsWith(\"/work/topics/AWS\")",
  "destination": "",
  "defaultProperties": { "_belongs_to": "[[AWS]]" },
  "enabled": true
}
```

The field is named `defaultProperties` rather than `setProperties` because it only fills what is missing. The name should not suggest an overwrite.

**Blocked by:** `.scratch/open-itens/issues/001-caret-selection-follow-their-text-when-frontmatter.md`. The note this rule writes to is usually the one being edited. `updateNoteFrontmatter` on the active tab goes through `syncExternalContentToEditor`, which today keeps the caret at its old offset. About 3 s after the save, a line is added above the caret, and the next keystrokes land inside the `---` block. 001 makes the caret follow its text; do not work around it here.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Empty destination means no move.** `rule.destination.trim() === ''` skips the move branch of `evaluateAndMove` entirely. Today an empty destination resolves to `''` (`resolveDestination`, `auto-move.logic.ts:102`) and the note is moved to the vault root. A new rule from `AutoMoveSection.svelte:54` starts with `destination: ''`, so a half-filled rule moves notes to the root. A template that *resolves* to `''` (e.g. `{parent}` for a top-level note) still means the vault root, as before; only the raw empty string means "no move".
2. **Order: move first, then fill**, on the post-move path, like the icon (`auto-move.service.ts:200`). Writing first would make the write's own `notifyAfterSave` schedule an evaluation on the old path after the file has moved.
3. **Write through `updateNoteFrontmatter`** (`core/frontmatter/frontmatter-write.service.ts:99`), with a pure `mutate` that appends only the missing keys. It handles open and closed notes and keeps unsaved body edits. Values are written as text properties. A wikilink value must be written quoted (`_belongs_to: "[[AWS]]"`); unquoted it parses as a nested YAML list.
4. **"Missing" is checked on the canonical key** (`canonicalizeKey`, `utils/frontmatter-aliases.ts`): absent, `null`, `''` or an empty list. `organized` in the map checks and writes `_organized`.
5. **A rule with an empty destination only counts as a match when it has something to do.** Rules are first-match-wins (`findMatchingRule`, `auto-move.logic.ts:17`). If a property-only rule matched every save, it would block every later rule for that note, including the lifecycle archive rules, which run after user rules. So a rule with an empty destination is skipped, and evaluation falls through to the next rule, when every key in `defaultProperties` is already present, or when the frontmatter is lossy (`detectLossyFrontmatter`, `properties.logic.ts:405`), since the write would be refused. A rule *with* a destination matches on its expression alone, as today.
6. **Chaining happens through the save.** The frontmatter write fires `notifyAfterSave`, so the note is evaluated again after the debounce. Now the property-only rule is skipped (rule 5), and a later rule can match on the property it just received: a move rule on `_belongs_to.contains("AWS")`, or a lifecycle rule. No extra loop is needed, and none must be added.
7. **Failures are logged, not toasted per autosave.** A refused or failed write is logged with `error('AUTO-MOVE', ...)`, naming the rule and the note. The move, if any, stays done.
8. Lifecycle rules (`type-lifecycle-rules.ts`) have no `defaultProperties` and behave as today.
9. Old config files without `defaultProperties` load unchanged. A missing or non-object `defaultProperties` is treated as none; non-string values in it are ignored.

### Settings UI

- `AutoMoveRuleRow.svelte`: a "Properties" row under Destination, with key/value pairs, an add button and a remove button per pair, saved like the other fields.
- The Destination placeholder says that empty means the note is not moved.
- A rule with an empty destination and no properties does nothing. Show that inline, in the same style as the expression error, without blocking the save.

### Docs

- `help/documentation/22-auto-move.md`: a "Filling properties" section with the AWS example and rules 1, 2, 5 and 6 in user terms. Update "How Rules Work" (the field table and first-match-wins with the property-only exception) and the "Configuration File" example.

### Acceptance

- [ ] Failing test first, in `src/tests/lib/features/auto-move/auto-move.service.test.ts`: a rule `file.folder == '/vault/topics/AWS'`, `destination: ''` and `defaultProperties: { _belongs_to: '[[AWS]]' }`. Saving `/vault/topics/AWS/note.md` with `---\n_organized: false\n---\nbody`, then advancing past the debounce, leaves the file at the same path with `_belongs_to: "[[AWS]]"` in its frontmatter, and `moveItem` is not called. It fails today (the note is moved to the vault root).
- [ ] A note that already has `_belongs_to: "[[Other]]"` is not changed.
- [ ] A note with `_belongs_to: ""` gets the default.
- [ ] Property-only rule then move rule: the property-only rule is first, and a second rule `_belongs_to.contains("AWS")` -> `Archive/AWS` follows it. After the fill and the write-triggered re-evaluation, the note ends in `Archive/AWS`.
- [ ] Fall-through: with the property-only rule satisfied, a lifecycle archive rule still archives a note with `_archived: true` in that folder.
- [ ] A rule with both a destination and defaults moves the note first, then writes the defaults at the new path.
- [ ] Lossy frontmatter (a comment in the block): no write, nothing toasted, and the property-only rule falls through.
- [ ] `{parent}` resolving to `''` still moves to the vault root (regression).
- [ ] `auto-move.logic.test.ts` covers the pure pieces (which keys are missing; whether a property-only rule counts as a match) with the happy path, empty and null inputs.
- [ ] `AutoMoveRuleRow.test.ts` covers adding, editing and removing a property pair, and the "does nothing" hint.
- [ ] A config without `defaultProperties` loads and behaves as before.
- [ ] `22-auto-move.md` documents the field, the empty destination and the fall-through.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Trigger:** save only, the same after-save hook as the move. A note dragged or renamed into the folder gets its defaults on its next save. Running on move and rename too is Issue 02.
- **Evidence (read at `d8d314ef`, files unchanged at `097315db`):** `src/lib/features/auto-move/auto-move.types.ts` (`AutoMoveRule`, `destination` required); `auto-move.logic.ts:17` `findMatchingRule` (first truthy match wins), `:102` `resolveDestination` (empty template resolves to `''`), `:69` `isAlreadyInDestination`; `auto-move.service.ts:96` after-save observer, `:152` `evaluateAndMove`, `:167` destination, `:190` `moveItem`, `:200` icon applied after the move; `src/lib/features/collection/collection.logic.ts` `projectDerivedProperties` (relationship keys become target arrays, which is why the AWS move rule uses `_belongs_to.contains("AWS")`); `core/frontmatter/frontmatter-write.service.ts:99` `updateNoteFrontmatter` (tab branch saves and fires after-save; closed branch writes and calls `notifyAfterSave`); `AutoMoveSection.svelte:54` new rule with `destination: ''`.
- **Origin:** owner request on 2026-11-10 while setting up the work vault (`brain-os-vault/docs/work-workflow-learnings.md`). Chosen over a separate per-folder-defaults feature (it reuses expressions, order, exclusions and the Settings screen) and over implicit folder-note relationships (too implicit, vault-wide).

## Comments
