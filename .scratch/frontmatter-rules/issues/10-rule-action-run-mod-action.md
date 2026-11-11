# 10: A rule can run a mod action

**What to build:** a new consequence, **run mod action**. When a note matches, the rule invokes an action that a vault mod registered for rules, passing the matched note, so a mod can do what the built-in actions cannot. Read the PRD, Issue 01, ADR 0036 and `help/documentation/28-mods.md` first.

**Blocked by:** 12

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

- [ ] Failing test first: a matching save invokes a fake rule-enabled action once, with `run.target` equal to `{ on: 'note', path: <final vault-relative path> }`.
- [ ] An action without the opt-in is not invoked and logs once; a missing action logs once and does not throw.
- [ ] `layer-rules.test.ts` passes with no new baseline entry.
- [ ] A rule-invoked action that opens a dialog through `run.ui` does not hang the run: document that rule actions must not prompt, and test that a run whose action awaits nothing completes.
- [ ] Settings lists only rule-enabled actions.
- [ ] The mods docs and the help pages are updated. Frontend gate passes.

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-10*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

**Contract decision (main session, 2026-11-11, after the owner authorized Issue 10):** no change to the mod contract and no `koko.brain-mods` commit. `ModRunV1` already carries the note: `run.target?: { on: 'note' | 'folder'; path: string }`, which is vault-relative (`mod-api.v1.ts:43-49` in mod-core). The host's `runAction` already takes it (`src/lib/plugins/mods/mods-host.service.ts:334,387`). The rule invokes the action with `target: { on: 'note', path: <vault-relative path of the matched note at the end of the run> }` and `input: ''`. This replaces Behavior 3's `{ notePath }` argument and amendments 1 and 2 below: the mod reads `run.target.path`, the same field a note-menu invocation fills. Gate: frontend only, with no lockfile change and no `pnpm build`. ADR 0036 is not amended. The mods docs (`help/documentation/mods/`, API reference and cookbook) say that a rule invocation fills `run.target` with `on: 'note'`, and that a mod which needs to tell the two apart lists the action in `ruleActions` and treats it as rule-safe: no dialogs, because nobody clicked.

1. **The note path is vault-relative** (still holds: it is `run.target.path`), not absolute. The mod API rejects a leading `/` (`mods.logic.ts:69-73`), and `run.target.path` and `onNoteSaved` are vault-relative. Use the path at the end of the run, after any Issue 11 rename and the move.
2. *(Superseded by the contract decision above: no contract change.)* **The contract change is additive to v1,** with no `apiVersion` bump (ADR 0036:13, contract header): an optional third `run` parameter, `context?: { notePath }`.
   - Gate: add `pnpm build`, because the lockfile changes.
   - Blocked by: the mod-core commit, whose SHA goes in Notes.
3. **Opt-in:** the manifest declares no actions; actions are registered at runtime (`mods-host.service.ts:472-512`). Use an optional manifest list, `"ruleActions": ["<local action id>"]`, validated by `parseModManifest` (`mods.logic.ts:138-210`). Settings offers the actions that are both listed there and registered by a loaded mod. Drop the "or the equivalent field" clause.
4. **Outside the skip set.** The action is invoked after the `finally` that releases the run's skip set. Its saves are ordinary saves, not the run's own writes. The early return at `auto-move.service.ts:255` must let an action-only rule through.
5. **Gates:** invoke only when `propertyWriteSkipReason` returns null for the final path. No templates, `_system`, type definitions or non-Markdown files. Test that a matching note in the templates folder does not invoke it.
6. **Loops** (Behavior 6) do not need an `always` rule. `ctx.vault.write` has no equality guard, so an action that writes the matched note runs again about every 3 s while the note matches, and an appending action grows the note without bound. The docs state this, and give the fixes: a marker property, or an idempotent write. Add a test that a writing fake action schedules exactly one more evaluation.
7. **PRD:** the `core/` registry supersedes PRD line 5 ("Nothing new is added to core/"), which scoped the MVP only.
8. **Docs:** add "Run mod action" to the Actions list on the help page.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - the `{ notePath }` argument;
  - loops documented only;
  - a manifest opt-in;
  - a registry in `core/`.
- None of the owner's mods uses `onNoteSaved` (checked on 2026-11-10).

## Comments
