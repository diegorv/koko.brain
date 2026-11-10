# 01: Auto Move rules set properties on save

**What to build:** an Auto Move rule gains an optional list of property consequences. When a saved note matches the rule's filter, each property is written to its frontmatter, alone or together with the move. `destination` becomes optional: empty means "do not move". Read `.scratch/frontmatter-rules/PRD.md` first. Its Decisions are settled.

```json
{
  "id": "rule-...",
  "name": "AWS topic notes",
  "expression": "file.folder.endsWith(\"/work/topics/AWS\")",
  "destination": "",
  "properties": [
    { "key": "_belongs_to", "value": "[[AWS]]", "mode": "if-missing" },
    { "key": "_icon", "value": "lucide:cloud", "mode": "always" }
  ],
  "enabled": true
}
```

**Blocked by:** none

**Requires first (other feature):** open-itens Issue 001, `.scratch/open-itens/issues/001-caret-selection-follow-their-text-when-frontmatter.md`, delivered to `main`. The rule usually writes into the note being edited, and without 001 the caret lands inside the `---` block. Do not launch this Issue until 001 is `done` in `.scratch/open-itens/ledger.md`.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `AutoMoveRule` (`src/lib/features/auto-move/auto-move.types.ts`) gets `properties?: RuleProperty[]`, where `RuleProperty` is `{ key: string; value: string | number | boolean | string[]; mode: 'if-missing' | 'always' }`. On load:
   - a missing or non-array `properties` is treated as none;
   - an entry with an empty key, a missing mode or a value of another type is dropped;
   - an entry whose canonical key is `todoist_project` is dropped. Todoist routes tasks by that key (`features/todoist-sync/create.logic.ts:218`, `projects.logic.ts:205-210,272-281`);
   - an entry on `_organized`, `_archived` or `_favorite` whose value is not a boolean is dropped. A text `"false"` reads as the default in Rust and TS (`src-tauri/src/vault/entry.rs:251-254`, `features/properties/lifecycle.logic.ts:24-26`). Unnoticed, it would send a note out of the Inbox, or never archive it.
2. **Fresh content when the timer fires.** The observer only schedules the run. When the timer fires:
   - re-check `settingsStore.autoMove.enabled`. Today a run scheduled before the switch was turned off still runs (`auto-move.service.ts:116-123`);
   - read the note as it is now: the open tab's content if there is a tab (`findTab`), else the file from disk. A note that vanished returns quietly. Note that `readTextFile` throws a plain read error, not `FrontmatterWriteError('missing')`.
   
   Today the run evaluates the content captured at save time. A rename followed by a new note at the old path within the debounce would then be moved or stamped using another note's content, and an edit flushed by the rule's own save would never be evaluated.
3. **Matching.** Every enabled rule whose filter is true matches. User rules come first, then the generated lifecycle rules, as today (`auto-move.service.ts:156-157`).
4. **Move.** The first matching rule whose `destination.trim()` is not empty decides the move, exactly as today. A rule with an empty destination never moves. Today an empty destination moves the note to the vault root (`resolveDestination`, `auto-move.logic.ts:102`), and a new rule from `AutoMoveSection.svelte:54` starts with `destination: ''`. A destination template that *resolves* to `''` still means the vault root.
5. **Properties.** Every matching rule contributes its `properties`, in list order. Keys are compared by `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts:29`), so `icon` and `_icon` are the same key. The first matching rule that names a key owns it for that run, even when its `if-missing` writes nothing. A lower rule's value for that key is ignored.
6. **Modes.**
   - `if-missing` writes when the canonical key is absent, `null`, `''` or `[]`. This is the same notion as `isEmptyPropertyValue` (`src/lib/core/frontmatter/properties.logic.ts:464`), which can be exported. `false` and `0` count as present.
   - `always` writes when the current value differs. A list compares item by item, and `always` replaces it.
   - Both decide on the parsed frontmatter (`parseFrontmatterProperties`), never on `PropertyIndexRecord`, whose derived keys (`organized`, `archived`, `favorite`, `tags`) are always present.
7. **Value types.** The JSON type of `value` decides the YAML type. A boolean is written as a real boolean. Text containing `[[` is written quoted (`_belongs_to: "[[AWS]]"`); unquoted, it parses as a nested list.
8. **Order of writes.**
   1. Move first.
   2. Then, at the new path, apply the legacy `icon` field of the moving rule, if any, through `setIconForPath`, as today.
   3. Then write the properties through one `updateNoteFrontmatter(path, mutate)` call (`src/lib/core/frontmatter/frontmatter-write.service.ts:99`) with a pure `mutate`. Properties come last, so an explicit `_color` beats the legacy icon's color removal (`frontmatter-icon.service.ts:26-31`).
   
   If nothing changes, nothing is written. If the move fails, the run writes nothing.
9. **No chaining, no loop.** The after-saves fired by this run's writes must not schedule a new evaluation. Hold the note's **target** path in a module-level set for the whole write phase, the legacy icon write and the property write both, and clear it in `finally`. The observer returns early for paths in the set. Both writes notify before they return: the tab branch through `saveFileByPath` and `writeTab`, the closed branch at `:161`. Without the icon write inside the set, a legacy icon with no color plus a `_color` property rewrites the note every 3 s forever. A rule that depends on another rule's output applies at the next save.
10. **Gates for property writes**, each a quiet `debug` skip:
    - the file is not Markdown (`isMarkdownFile`, `src/lib/core/filesystem/fs.logic.ts:65`). A `.canvas` or `.kanban` file must never get a YAML block. Moves of non-Markdown files stay as they are; open-itens 054 covers those;
    - the note is under `settingsStore.templates.systemFolder` (`_system` by default) or `settingsStore.templates.folder`. Both are vault-relative: join each with the vault path and match it as `prefix + '/'`. A template that gets `_organized` would make every note created from it skip the Inbox;
    - the note is a type definition (parsed `_type` is `Type`; `type-definitions.service.ts:190-193`). Its `_icon` and `_color` are inherited by every note of the type (`icon-resolver.ts:64-77`);
    - `detectLossyFrontmatter(content) !== null`;
    - the content starts with `---` but `extractRawFrontmatter` (`properties.logic.ts:46`) finds no block, as with the empty `---\n---` block or a missing closing fence. Writing there would stack a second block (open-itens 005/022).
11. **Errors.** A failed property write is logged with `error('AUTO-MOVE', ...)` naming the rule and the note, at most once per rule per session. The move, if it happened, stays done.
12. **Legacy `icon` field.** Kept, applied as in Behavior 8. Do not migrate or remove it.

### Docs

`help/documentation/22-auto-move.md` gets a "Setting properties" section with the AWS example. Update the field table, the "How Rules Work" text (every matching rule applies its properties, and the first rule with a destination moves the note) and the "Configuration File" example. State in user terms:

- An empty destination does not move the note.
- Rules run on **any** save of a note: yours, and those made by Todoist sync, the calendar, the Inbox and Archive buttons, and mods. A broad filter, or a typo in a property name (`stauts == null` is true for every note), stamps every note that any of them saves.
- `always` rewrites a manual change within seconds of the edit, because a Properties panel edit is a save. Do not use `always` on keys the calendar, meta-bind or the Inbox and Archive buttons set, unless the rule should win over them.
- `if-missing` on `_organized` or `_archived` sends notes to the Inbox or Archive. A rule-set `_archived: true` moves the note only at its next save.
- A new rule applies at a note's next save. It never touches notes nobody saves.
- A rule never runs because of another rule's write.
- A rule's write cannot be undone with Cmd+Z. To restore a version from File History, disable the rule first, or it writes again.
- Renaming a note or a type does not update values inside rules. A `[[link]]` value goes stale.
- A mod that writes the same key as an `always` rule on save will fight it.
- Icons and colors are best set with properties. The legacy icon option clears colors it does not set.

### Acceptance

- [ ] Failing test first, in `src/tests/lib/features/auto-move/auto-move.service.test.ts`: a rule `file.folder == '/vault/topics/AWS'`, `destination: ''` and `properties: [{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' }]`. Save `/vault/topics/AWS/note.md` with `---\n_organized: false\n---\nbody` and advance past the debounce. The file stays at the same path, its frontmatter has `_belongs_to: "[[AWS]]"`, and `moveItem` is not called. It fails today, because the note is moved to the vault root.
- [ ] `if-missing`: a note with `_belongs_to: "[[Other]]"` is unchanged; a note with `_belongs_to: ""` gets the value.
- [ ] `always`: a note with `status: paused` and an always rule `status: active` ends with `status: active`. A note already at `active` is not written.
- [ ] Two matching rules on the same key: the higher one's value is written. A higher `if-missing` rule whose key is present blocks a lower `always` rule on that key.
- [ ] A rule with properties and no destination does not block a later rule with a destination: the note gets the properties and moves.
- [ ] A rule with a destination and properties moves first, then writes at the new path. A failed move writes nothing.
- [ ] No chaining, with the real `editor.hooks` and the real `updateNoteFrontmatter`, mocking only the Tauri fs plugin and `call`. Rule A sets `_belongs_to: "[[AWS]]"`; rule B has the filter `_belongs_to.contains("AWS")` and sets `x: 1`. After one save and two debounces, `x` is absent and no timer is pending.
- [ ] No loop: a moving rule with a legacy icon and no color, plus a matching rule setting `_color: red` with `always`. After one save and three debounces, `_color` is `red`, and no timer is pending.
- [ ] Fresh content: when the note's content changes between the save and the timer, the run evaluates the new content. A note deleted before the timer fires produces no write and no error log.
- [ ] Turning Auto Move off before the timer fires prevents the write.
- [ ] A boolean value is written as `true`, not `"true"`.
- [ ] Load: entries on `todoist_project`, and `_archived: "true"` given as text, are dropped. A config without `properties` loads and behaves as before.
- [ ] Gates: a `.canvas` file, a note under `_system/`, a note in a templates folder set outside `_system`, a type definition note, lossy frontmatter (a YAML comment) and an empty `---\n---` block are not written.
- [ ] `auto-move.logic.test.ts` covers the pure planner (which rules match, which one moves, which property values win and which are missing), with happy path, empty and null inputs.
- [ ] `22-auto-move.md` documents the points above.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Supersedes** the old `.scratch/auto-move-default-properties/issues/01-auto-move-rule-fills-missing-properties.md`, deleted when this Issue was written. Read it with `git show 2e2cc5b60:.scratch/auto-move-default-properties/issues/01-auto-move-rule-fills-missing-properties.md`; its evidence section still applies. Its Behaviors 5 (fall-through) and 6 (chaining through the save) are replaced by Behaviors 3-5 and 9 here.
- **Reviewed** on 2026-11-10 by three opus reviewers: refute, side effects, and user scenarios. Behaviors 1, 2, 5, 8, 9 and 10 carry their fixes.
- **Accepted limits:**
  - `updateNoteFrontmatter` has no per-path queue (`frontmatter-write.service.ts:95-97`). A rule write can race a Todoist task-line write or a link rewrite on a closed note, in a window of milliseconds.
  - While the path is in the skip set, a user save already queued for it is not evaluated until the next save.
- **Evidence:** read at `2e2cc5b60`:
  - `auto-move.service.ts:94-127` (observer) and `:152-217` (`evaluateAndMove`);
  - `auto-move.logic.ts:17-35` (`findMatchingRule`, first match only);
  - `frontmatter-write.service.ts:85-163`;
  - `frontmatter-icon.service.ts:17-31`.
  
  More in `.scratch/frontmatter-rules/research/`.

## Comments
