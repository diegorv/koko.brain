# 07: Property actions can remove a property or add items to a list

**What to build:** two more modes for a rule's property consequences (Issue 01). `remove` deletes a property from the note. `add` adds items to a list property without replacing it. Example: give every note in `work/` the tag `work` while keeping its other tags. Read `.scratch/frontmatter-rules/PRD.md` and Issue 01 first. Paths below use the names after Issue 06 (`features/auto-organize/`).

**Blocked by:** 13

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `RuleProperty.mode` becomes `'if-missing' | 'always' | 'remove' | 'add'`. On load:
   - a `remove` entry needs no `value`, and any `value` it has is ignored;
   - an `add` entry needs a string or a `string[]` value, and is dropped otherwise.
2. **`remove`** deletes the canonical key when the note has it, whatever its value. A note without the key is not written.
   - A remove on `_organized`, `_archived` or `_favorite` is allowed. It means "back to the default": organized, not archived, not a favorite. The help page says so.
   - `todoist_project` stays refused, as in Issue 01.
3. **`add`** appends each item that is not already in the list:
   - Items compare as exact strings, and the existing order is kept.
   - If the key is absent or empty, a new list is created with the items.
   - If the current value is a single string, it becomes a list: the old string, then the new items.
   - If the current value is a number, a boolean or a map, nothing is written, and the skip is logged once per rule per session.
4. **`tags`** works with `add` and `remove`, but only on the frontmatter `tags` list. Inline `#tags` in the body are never touched, and the help page says so. Tags are compared without a leading `#`.
5. **Ownership** keeps Issue 01's rule: the first matching rule that names a key owns it for the run. Two rules cannot both `add` to one key. Merging adds from several rules is out of scope.
6. **Settings:** the mode menu offers "remove" and "add to list". A `remove` row hides its value field. An `add` row takes comma-separated items.

### Docs

The help page, `22-auto-organize.md` after Issue 06: the modes table gets `remove` and `add`, with one example each, the lifecycle-default note, and the inline-tags note.

### Acceptance

- [ ] Failing test first, in the service test: a rule with `{ key: 'tags', value: 'work', mode: 'add' }` turns `tags: [a]` into `tags: [a, work]`, and leaves `tags: [a, work]` unchanged.
- [ ] `add` on an absent key creates the list, and `add` on a single string turns it into a list. On a number it writes nothing and logs once.
- [ ] `remove` deletes the key and does not write a note that lacks it. A remove on `_archived` drops the key.
- [ ] Ownership: a higher `if-missing` rule on `tags` blocks a lower `add`.
- [ ] Settings: the new modes are saved; a `remove` row has no value field.
- [ ] Load: an `add` with a boolean value is dropped.
- [ ] Docs updated. Frontend gate passes.

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-07*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

1. **`remove` on `tags` clears the whole key.** Removing a single tag is not supported. The `#`-less comparison applies to `add` only. The help page says so plainly, with a warning: `{ key: 'tags', value: 'draft', mode: 'remove' }` deletes every tag.
2. **Blank items:** `add` items are trimmed and blank items are ignored. An `add` with no item left is dropped on load. Settings splits on commas the same way.
3. **`remove` on `_archived` does not unarchive the folder.** The unarchive lifecycle rule needs `_archived == false` (`type-lifecycle-rules.ts:52`), so a note in its archive folder stays there. The help page tells users to set `always _archived: false` to unarchive.
4. **Behavior 3, last case:** "a number, a boolean or a map" becomes "a number or a boolean". A nested map makes the note lossy, and the whole note is skipped earlier (`properties.logic.ts:286-296,431-433`).
5. **Issue 08** (computed values) defines how `add` treats an expression result.

## Notes

- **Origin:** owner request on 2026-11-10, after the MVP. Merged from two requests, remove a property and add a list item without replacing, because both are modes of the same action in the same code.
- Ordering: Issues 07 to 12 each change the planner, service or Settings row. They are chained to avoid conflicts.

## Comments
