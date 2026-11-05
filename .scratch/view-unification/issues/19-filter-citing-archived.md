# 19: A filter citing `archived` takes control in a view

**What to build:** A view never lists an archived note, even with `archived == true`. The filter matches, then `getNotesForViewPaths` drops the row (`type-sidebar.logic.ts:125,129`, from `viewRowSet`, `lens.logic.ts:713`), and the list says "No notes here" with no error. The owner calls this a bug. The default exclusion stays. An explicit filter wins.

**Citation detector:** a pure `filterCitesArchived(filter)` in `collection.logic.ts`, walking `parse()` ASTs through `and`, `or` and `not`. It must cover every node kind:

- `identifier` and `member.property` equal to `archived` or `_archived`.
- Dotted calls: the parser turns `x.y()` on a static path into `{type:'call', callee:'x.y', args}`, a flat string with no identifier node (`expression/parser.ts:142-144`). So split `call.callee` on `.`, and descend into `call.args` (the toolbar emits `isEmpty(archived)`, `filter.logic.ts:82-85`) and `methodCall.receiver`.
- `file.hasProperty('archived')` and `file.hasProperty('_archived')`.

Not a citation: other string literals, so `status == 'archived'` and `file.hasTag('archived')` stay ordinary filters. A formula referenced by a filter is not followed, and the docs say so.

**Wiring**
- `QueryRowSet` gains a `definition` argument, so global and view filters are both visible. `executeQuery` passes it, and it already receives overridden filters, so the citation sees toolbar state.
- `viewRowSet` passes a new `includeArchived` to `getNotesForViewPaths`, whose only code caller is `viewRowSet`.
- `describeViewFilters` (`lens.logic.ts:809`) drops ", not archived" in that case, through a new field on `ViewQueryResult`.
- `countViewNotes` and the rail follow through `queryViewLens`.
- The collection editor follows too. `ViewRowSetPort.rows` (`view-row-set.port.ts`) gains the definition, `CollectionView.svelte`'s closure (`rowSet.rows(filePath, records, view)`) passes it, and the port in `app/boot.ts:61` forwards it to `viewRowSet`. The port exists so the editor's "N results" match the rail's list and count. An inline `collection` block runs with no row set and is not touched here.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first:
  - Pure logic. Cited: `!_archived`, `archived == true`, `note.archived`, `_archived.isEmpty()`, `note.archived.lower()`, `isEmpty(archived)`, `file.hasProperty('_archived')`, `{not: ['archived']}`. Not cited: `status == 'archived'`, `file.hasTag('archived')`.
  - `lens.logic.test`, real `executeQuery` through `queryViewLens`: a view with `archived == true` lists the archived note, its count matches, and the rule text omits "not archived". Type definitions and `.view` files stay out.
  - `CollectionView.test`, mounted with the registered port: the same `.view` in the editor shows the archived note, and its "N results" equal `countViewNotes` (the pattern at `CollectionView.test.ts:611`). The rail test alone passes while the editor still drops the row.
- [ ] A view with no citation behaves as today. `lens.logic.test.ts` 'leaves out archived notes and the system folder' stays green.
- [ ] A view citing `!_archived` returns the same rows as before. `archived` canonicalizes to `_archived` (`aliases.rs:13`).
- [ ] `help/documentation/12-collection.md` and `25-types-and-relationships.md` (Archived Note Filtering, `limit`, the view keys table) state the rule.

## Notes

- A false negative hides rows, and a false positive shows archived rows. Prefer testing both directions.
- **Size:** M.
