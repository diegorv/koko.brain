# Issue 11 discovery: rename consequence

Builds on Issues 08/09 (`work/08/`, `work/09/`): same loader (`withValidProperties`), once-per-rule log sets, test helpers (`rule`, `captureObserver`, the `create note` in-memory disk) and the no-chain file with the real hooks. What differs: a path change through the real `renameItem`, run before the move.

## Files that change

- `auto-organize.types.ts:59-84`: `RuleRename { name?; expr? }`, `AutoOrganizeRule.rename?`.
- `auto-organize.logic.ts`
  - `renameProblem(raw)`: not an object, both / neither field, blank, `{basename}` in `name`, an `expr` the validator refuses or that reads `file.basename|name|path` (self-reference). `sanitizeRename(raw)` = trimmed value when `renameProblem` is null. The AST walk of `volatileInputs` (`:450`) is parameterized by the `file.*` fields it looks for.
  - `renameTarget(rename, record, vaultPath)`: `name` via `resolveDestination`; `expr` evaluated and converted (date local `YYYY-MM-DD`, `YYYY-MM-DD HH-mm` with `now()`, finite number as text, text as is; list / boolean / null / throw a failure); then `toFileName` (`/ \ : * ? " < > |` and control characters to `-`, trimmed, leading dots dropped). Empty result: null (does nothing).
  - `isAlreadyNamed(basename, name)` (case-insensitive `<name>` or `<name> N`), `numberedName(name, n)`.
- `auto-organize.service.ts`
  - `:122-136` loader keeps a valid `rename`, logs and drops an invalid one.
  - `:247-316` `evaluateAndMove`: step 1 `applyRename` for the first matching rule with a valid `rename`, then the move, icon, properties and create read the renamed path and a record rebuilt there. A failed `renameItem` returns (skips every later step).
  - `applyRename`: gates `propertyWriteSkipReason` + a `todoist_project` key (`isRefusedKey`); dirty open tab (`isTabDirty`) skips the rename only; compute failure logged once per rule (new set, cleared in reset); already named and free in the final folder -> nothing; else the first `numberedName` free in the final folder (destination resolved for that candidate) and, when moving, in the current folder; `renameItem(path, candidate + ext)`.
- `AutoOrganizeRuleRow.svelte`: "Rename" row (Name / Expression select + field, saves on change, blank removes, refused text not saved with the `renameProblem` message, the stored value's problem shown at render); `doesNothing` (`:104`) counts a valid rename; `templateInvalid` derived like `pathInvalid` (amendment 8).
- `help/documentation/22-auto-organize.md`: field table, Settings step, Actions list, "Renaming notes" section, does-nothing sentence.

## Tests (test-first)

- `auto-organize.no-chain.test.ts` (real `renameItem` / `applyPathChange`, fs `rename` moves entries, `get_backlinks_v2` mocked, `fsStore` tree): acceptance 1 (`{year}-{month} Meeting`, link rewritten, second save no rename); the pin: a `true` rule does not write the rewritten linker.
- `auto-organize.service.test.ts` `describe('rename')` with `renameItem` mocked on an in-memory disk: clash -> ` 2`, later save leaves it; rename + move + properties at the final path in one run; free name in the destination; dirty tab skipped then renamed when clean; gates (canvas, `_system`, templates, type definition, `todoist_project`); expr conversion; failure logged once; failed rename skips the rest; loader drops; rename-only rule acts.
- `auto-organize.logic.test.ts`: the new functions. `AutoOrganizeRuleRow.test.ts`: rename field, refused name, stored problem, hint, stored bad template.

## Defaults taken

- Self-reference also refuses `file.path` (it holds the name); `{Basename}` is not a variable, so only `{basename}` is refused.
- Rename gates are the full property gates (lossy frontmatter included), plus `todoist_project`; skips are `debug`.
- A note already named but whose name is taken at the destination is renamed to the first free name there, else the move fails at every save.
- A failed `renameItem` is not logged again here (`renameItem` logs it), as `moveItem`.

## Risks

- The suffix loop costs one or two `exists` calls per taken name; no cap.
- The dirty-tab skip with property writes: the property write flushes the edit inside the skip set, so the rename waits for the next user save (Issue 01's accepted limit).
