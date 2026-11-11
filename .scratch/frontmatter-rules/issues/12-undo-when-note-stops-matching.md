# 12: A rule can undo its properties when a note stops matching

**What to build:** an opt-in per rule. When a note that matched stops matching, the rule restores the properties it set to their previous values. Example: `status == "blocked"` sets a red `_color`; when the status changes, the color goes back to what it was. Today nothing is reverted (PRD Decision 7). Read the PRD and Issues 01 and 07 first.

**Blocked by:** 11

**Status:** needs-triage

### Proposal

- `AutoOrganizeRule` gets `revertWhenUnmatched?: boolean`. It applies to property consequences only. A move, a rename, a created note or a mod action is never undone.
- **Memory of what the rule changed.** When the rule writes a key, it records the key's previous value for that note, or "absent". This needs state the note does not carry today. Options:
  - a vault file `.kokobrain/auto-organize-state.json`, keyed by note path and rule id. Paths change on rename and move, so path changes must re-key it;
  - a hidden frontmatter key in the note, such as `_rule_applied: [rule-id]`. It is visible in the YAML, but it travels with the note;
  - the vault index.
- **On a save where the rule no longer matches** and the note is in the state: restore each recorded key, but only while it still holds the value the rule wrote. If the user changed it since, keep the user's value and drop the record.
- The restore is one more write in the same run, inside the skip set.

### Questions for triage

1. **Where to store** the memory: in a vault state file, in a hidden frontmatter key, or in the index? This is the main decision.
2. **Other writers:** if a second rule now owns the key, which one wins?
3. **Rule edits:** what happens to the stored records when the rule itself is edited or deleted? Revert everything, or forget silently?
4. **Notes edited outside the app,** where no save runs the rules: accept that they stay as they are until their next save in the app?
5. Is this worth its cost? Two rules covering both states, one for `status == "blocked"` and one for `status != "blocked"`, give the same effect with no memory, when the "off" value is known. Document that pattern instead, and keep this Issue only for when the previous value really is unknown?

### Acceptance (draft)

- [ ] A note that stops matching gets its recorded keys restored, including removing a key that was absent before.
- [ ] A key the user changed after the rule wrote it is not touched.
- [ ] Moves and renames keep the record attached to the note.
- [ ] Docs explain the opt-in and the two-rule alternative. Frontend gate passes.

## Notes

- **Origin:** owner request on 2026-11-10, after the MVP. It is the largest of these Issues, because it is the only one that needs persistent state.

## Comments
