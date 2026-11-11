# 10: A rule can run a mod action

**What to build:** a new consequence, **run mod action**. When a note matches, the rule invokes an action that a vault mod registered for rules, passing the matched note, so a mod can do what the built-in actions cannot. Read the PRD, Issue 01, ADR 0036 and `help/documentation/28-mods.md` first.

**Blocked by:** 09

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `AutoOrganizeRule` gets `runAction?: { id: string }`, a registered mod action id, `mod:<mod>:action:<action>` (`src/lib/plugins/mods/mod-commands.store.svelte.ts:2-9`).
2. **Opt-in per action.** A mod marks an action as usable by rules, with `"ruleAction": true` on that action in `manifest.json`, or the equivalent field where actions are declared today (read the contract, `src/lib/plugins/mods/contract/mod-api.v1.ts`). Settings offers only those actions. A rule that names any other action logs once per rule per session and does nothing.
3. **Note context.** The action receives an optional context argument, `{ notePath: string }`: the absolute path of the matched note after the run's move. This is an additive change to the mod API:
   - actions that ignore the argument keep working;
   - bump the contract as ADR 0036 requires, and amend the ADR;
   - document it in `help/documentation/mods/` (the API reference and the cookbook).
4. **When.** After the move and the property writes, once per run, only for the first matching rule with `runAction`. A missing or unloaded mod logs once per rule per session. A running instance is not started twice; the host wrapper already handles this.
5. **Layers.** `features/auto-organize` must not import `plugins/mods`. Add a small registry in `core/`, the way `registerTypeIconLookup` (`icon-resolver.ts:26-31`) is done:
   - the mods host registers a runner `(id, context) => Promise<void>` and a list of rule-enabled actions;
   - Auto Organize calls the registry.
   
   No new entry in `layer-baseline.json`.
6. **Loops are documented, not prevented.** An action that writes the same note fires a normal after-save, which runs the rules again. With an `always` rule on the same key, the two fight. The help pages (`22-auto-organize.md`, `28-mods.md`) say so plainly and give the fix: do not write a key that an `always` rule owns.

### Acceptance

- [ ] Failing test first: a matching save invokes a fake rule-enabled action once, with `{ notePath }` equal to the note's final path.
- [ ] An action without the opt-in is not invoked and logs once; a missing action logs once and does not throw.
- [ ] `layer-rules.test.ts` passes with no new baseline entry.
- [ ] A mod action written for the old API, with no argument, still runs.
- [ ] Settings lists only rule-enabled actions.
- [ ] ADR 0036 is amended, and the mods docs and the help pages are updated. Frontend gate passes.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - the `{ notePath }` argument;
  - loops documented only;
  - a manifest opt-in;
  - a registry in `core/`.
- None of the owner's mods uses `onNoteSaved` (checked on 2026-11-10).

## Comments
