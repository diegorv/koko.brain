# 19: A filter citing `archived` takes control in a view

**What to build:** A view never lists an archived note, even with `archived == true`. The filter matches, then `getNotesForViewPaths` drops the row (`type-sidebar.logic.ts:125,129`, from `viewRowSet`, `lens.logic.ts:679`), and the list says "No notes here" with no error. The owner calls this a bug. The default exclusion stays. An explicit filter wins.

**Citation detector:** a pure `filterCitesArchived(filter)` in `collection.logic.ts`, walking `parse()` ASTs through `and`, `or` and `not`. It must cover every node kind:

- `identifier` and `member.property` equal to `archived` or `_archived`.
- Dotted calls: the parser turns `x.y()` on a static path into `{type:'call', callee:'x.y', args}`, a flat string with no identifier node (`expression/parser.ts:142-144`). So split `call.callee` on `.`, and descend into `call.args` (the toolbar emits `isEmpty(archived)`, `filter.logic.ts:82-85`) and `methodCall.receiver`.
- `file.hasProperty('archived')` and `file.hasProperty('_archived')`.

Not a citation: other string literals, so `status == 'archived'` and `file.hasTag('archived')` stay ordinary filters. A formula referenced by a filter is not followed, and the docs say so.

**Wiring**
- `QueryRowSet` gains a `definition` argument, so global and view filters are both visible. `executeQuery` passes it, and it already receives overridden filters, so the citation sees toolbar state.
- `viewRowSet` passes a new `includeArchived` to `getNotesForViewPaths`, whose only code caller is `viewRowSet`.
- `describeViewFilters` (`lens.logic.ts:783`) drops ", not archived" in that case, through a new field on `ViewQueryResult`.
- `countViewNotes` and the rail follow through `queryViewLens`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first:
  - Pure logic. Cited: `!_archived`, `archived == true`, `note.archived`, `_archived.isEmpty()`, `note.archived.lower()`, `isEmpty(archived)`, `file.hasProperty('_archived')`, `{not: ['archived']}`. Not cited: `status == 'archived'`, `file.hasTag('archived')`.
  - `lens.logic.test`, real `executeQuery` through `queryViewLens`: a view with `archived == true` lists the archived note, its count matches, and the rule text omits "not archived". Type definitions and `.view` files stay out.
- [ ] A view with no citation behaves as today. `lens.logic.test.ts:1296` stays green.
- [ ] A view citing `!_archived` returns the same rows as before. `archived` canonicalizes to `_archived` (`aliases.rs:13`).
- [ ] `help/documentation/12-collection.md` and `25-types-and-relationships.md` (Archived Note Filtering, `limit`, the view keys table) state the rule.

## Notes

- A false negative hides rows, and a false positive shows archived rows. Prefer testing both directions.
- **Size:** M.
