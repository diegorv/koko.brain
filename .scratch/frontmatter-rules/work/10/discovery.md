# Issue 10 discovery: run mod action consequence

Builds on Issues 09/11 (`work/09/`, `work/11/`): same once-per-rule log sets, the same service test helpers (`rule`, `saveAndRun`, `captureObserver`) and the no-chain file with the real hooks. What differs: the consequence runs after the skip set is released, through a new `core/` registry the mods host fills. No mod contract change (Contract decision, 2026-11-11): the action gets `run.target = { on: 'note', path: <vault-relative final path> }` and input `''`.

## Files that change

- New `core/rule-actions/rule-actions.store.svelte.ts`: `$state.raw` list of `{ id, label, run(target) }`; `list` getter, `get(id)`, `register(action)` returning a cleanup that removes only that entry (as `mod-commands.store.svelte.ts:27-35`). Reactive, so Settings updates when a mod loads late.
- `plugins/mods/mods.logic.ts:138-210`: `ModManifest.ruleActions?: string[]`, validated as a list of non-empty strings (`ruleActions must be a list of action ids`).
- `plugins/mods/mods-host.service.ts`
  - `:89` `ActionOrigin` gains `'rule'`.
  - `:334-339` `runAction`: a `rule` call on a busy action logs `debug` and returns without revealing the live run (a save must not pop the run view).
  - `:472-512` `addAction`: when `manifest.ruleActions` lists the id, also `ruleActionsStore.register({ id: actionKey, label, run: (target) => runAction(entry, '', 'rule', true, target) })`, unregistered with the action.
- `features/auto-organize/auto-organize.types.ts:72-98`: `AutoOrganizeRule.runAction?: { id: string }`.
- `features/auto-organize/auto-organize.logic.ts`: `sanitizeRunAction(raw)` = `{ id }` trimmed, or undefined.
- `features/auto-organize/auto-organize.service.ts`
  - `:341-360` the early return only skips the write phase; after the `finally`, `runRuleAction(matched, targetPath, content, vaultPath)`.
  - `runRuleAction`: first matching rule with a valid `runAction`; gate `propertyWriteSkipReason` (debug skip); not registered -> `error` once per rule (new set, cleared in reset); else `void action.run({ on: 'note', path: vaultRelativeKey(...) })` with a `.catch` that only debugs (the host already reports mod failures). Not awaited: a run whose action prompts or never settles still ends.
- `AutoOrganizeRuleRow.svelte`: "Run mod action" select (None + `ruleActionsStore.list`; a saved id not listed shows as `<id> (not loaded)`); `doesNothing` (`:107`) counts a valid `runAction`; hint text names it.
- Docs: `help/documentation/22-auto-organize.md` (Actions list, "Running a mod action" section with loops and fixes, field table, Settings step, hint), `28-mods.md` (loops), `mods/01-anatomy-and-loading.md` (manifest field + error row), `mods/02-actions-and-entry-points.md` (`run.target` table row), `mods/03-runs.md`, `mods/13-api-reference.md`, `mods/14-cookbook.md` (recipe). PRD line 5 already superseded in its "Run order" section.

## Tests (test-first)

- `auto-organize.service.test.ts` `describe('run mod action')` with real `ruleActionsStore`: acceptance (once, target vault-relative after a move), unregistered id logs once over two saves and does not throw, only the first matching rule's action, gates (templates folder, canvas), failed move skips it, action-only rule acts, a never-settling action lets the run end (a second save evaluates again).
- `auto-organize.no-chain.test.ts`: a fake action that writes the note once (real `notifyAfterSave`) schedules exactly one more evaluation.
- `rule-actions.store.test.ts`: register / list / get / cleanup removes only its entry.
- `mods.logic.test.ts`: `ruleActions` parse and errors. `mods-host.service.test.ts`: listed action registered and run with target and `''`, origin `rule`; unlisted not registered; removed on unload; busy rule call does not reveal.
- `AutoOrganizeRuleRow.test.ts`: select lists only registered rule actions, saves the id, shows an unlisted saved id, hint hidden. `auto-organize.logic.test.ts`: `sanitizeRunAction`.
- `layer-rules.test.ts` run unchanged.

## Defaults taken

- Missing mod, unloaded mod and an action not in `ruleActions` are the same case (not in the registry): one `error`, once per rule per session.
- When the first matching `runAction` rule's action is missing, no later rule's action runs.
- A failing action keeps the host's toast, as from any entry point (it is the mod's failure, not the rule's).
- The gate reads the content the run evaluated (properties written by the run cannot make it lossy).

## Risks

- Loops (amendment 6) are documented only: an action that writes the matched note runs again after the debounce while the note matches.
