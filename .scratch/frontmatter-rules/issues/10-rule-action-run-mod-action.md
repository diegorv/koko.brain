# 10: A rule can run a mod action

**What to build:** a new consequence, **run mod action**. When a note matches, the rule invokes an action a vault mod registered, so a mod can do work the built-in actions cannot. Read the PRD, Issue 01, ADR 0036 and `help/documentation/28-mods.md` first.

**Blocked by:** 09

**Status:** needs-triage

### Proposal

- `AutoOrganizeRule` gets `runAction?: { id: string }`. The id is a registered mod action id, `mod:<mod>:action:<action>` (`src/lib/plugins/mods/mod-commands.store.svelte.ts:2-9`).
- The action runs after the move and the property write, and only once per run.
- A missing action is logged once per rule per session and does nothing. That covers a mod that is disabled, not installed, or not loaded yet.
- A running instance is not started twice. The host wrapper already reveals a running instance.

### Questions for triage

1. **Which note?** Mod actions take no arguments today: the registry invokes a wrapper. To act on the matched note, the action needs its path. Options:
   - extend the mod API with an optional context argument, `{ notePath }`. That is an API change, so ADR 0036 and the contract version are affected;
   - open the note first and let the action read the active note. This changes focus and is surprising;
   - only allow actions that do not need a note.
   
   The recommended answer: the optional context argument.
2. **Loops.** A mod that writes the note fires a normal after-save, outside the run's protection. With an `always` rule on the same key, the two fight forever (`help/documentation/22-auto-organize.md`, mods warning). Should the run's skip set also cover the mod action's writes to the same note? The recommended answer: yes, while the action's promise is pending.
3. **Trust.** Mods are user-trusted (ADR 0036), but a rule makes an action run without a click, on any save, including saves by Todoist sync and the calendar. Should rules only call actions whose mod opts in, for example a manifest flag `"ruleAction": true`?
4. **Layers.** `features/` calling `plugins/mods` is a new layer dependency. Should it go through a small registry in `core/`, like `registerTypeIconLookup`?

### Acceptance (draft)

- [ ] A matching save invokes the configured action once, with the note context as decided.
- [ ] A missing action logs once and does not throw.
- [ ] The loop answer in question 2 is covered by a test with a fake mod action that writes the note.
- [ ] No new layer violation (`layer-rules.test.ts`).
- [ ] Docs (`22-auto-organize.md`, `28-mods.md`) and Settings (pick from registered actions) updated. Frontend gate passes.

## Notes

- **Origin:** owner request on 2026-11-10, after the MVP. None of the owner's mods uses `onNoteSaved` (checked on 2026-11-10).

## Comments
