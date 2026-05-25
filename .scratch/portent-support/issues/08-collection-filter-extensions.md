Status: ready-for-agent
Phase: 2

# Add type, relationship, and lifecycle field resolvers to collection filters

## What to build

The collection filter DSL already supports filtering by frontmatter properties. Extend it with first-class support for Portent fields so users can build views like "all Projects", "tasks belonging to X", "unorganized notes".

New filter fields:
- `type` / `is_a`: filter by document type (`equals`, `not_equals`, `is_empty`)
- `belongs_to`: filter by ownership target (`contains`, `is_empty`)
- `related_to`: filter by relationship target (`contains`, `is_empty`)
- `organized`: boolean filter
- `archived`: boolean filter
- `favorite`: boolean filter

These fields should resolve from the indexed entry fields (issues 02, 03, 06), not re-parse frontmatter.

## Acceptance criteria

- [ ] Collection filter recognizes `type` as a filterable field
- [ ] `{ field: "type", op: "equals", value: "Project" }` filters correctly
- [ ] `belongs_to` and `related_to` work with `contains` operator
- [ ] `organized`, `archived`, `favorite` work as boolean filters
- [ ] Existing property-based filters unchanged
- [ ] Collection views using new fields render correctly in the UI
- [ ] Tests for each new field resolver

## Blocked by

- 02-type-field-in-rust-index
- 03-lifecycle-flags-in-rust-index
- 06-relationship-fields-in-rust-index
