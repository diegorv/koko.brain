# Relationship fields: underscore-canonical + has_many first-class

Relationship frontmatter fields are app-internal, so their canonical key becomes the
underscore-prefixed form and they take NO alias:

- `_belongs_to`, `_related_to`, `_has_many` are the canonical keys written on disk.
- No alias entries at all for relationships (remove the old `"belongs to"`/`"related to"` space aliases).
- Rename the `has` relationship to `has_many` and promote it to a first-class field with
  FULL PARITY to belongs_to/related_to (own NoteEntry field + reverse-index backlinks + PropertiesView row).
- Internal names stay bare: Rust struct fields `belongs_to`/`related_to`/`has_many`, TS `belongsTo`/`relatedTo`/`hasMany`,
  backlink `relationship_type` strings bare ("belongs_to"/"related_to"/"has_many"), UI labels "Belongs To"/"Related To"/"Has Many".

## Tasks

- [x] Task 1: Alias maps — remove the relationship space-aliases from `aliases.rs` + `frontmatter-aliases.ts` (no relationship entry at all). Update both alias test suites. (Both layers -> cargo test + pnpm check + pnpm vitest run.)
- [x] Task 2: Rust — switch frontmatter key lookups to `_belongs_to`/`_related_to`, add `_has_many` first-class. `entry.rs` (struct field, parse keys, SYSTEM_KEYS, fixtures, parse tests), `index.rs` (`lookup_relationship_backlinks` has_many loop + test, relationship_type strings stay bare), `commands/vault.rs` (`to_note_record` insert keys `_belongs_to`/`_related_to`/`_has_many`), integration tests (`vault_index_test.rs`, `vault_file_ops_test.rs`). (Rust only -> cargo test.)
- [x] Task 3: TS — `vault-v2.types.ts` add `hasMany`; `PropertiesView.svelte` FIXED_RELATIONSHIPS keys `_belongs_to`/`_related_to`/`_has_many` + labels; `portent-filters.test.ts` keys `_belongs_to`/`_related_to`; `properties.logic.test.ts` `formatRelationshipLabel('has_many')`. (Frontend only -> pnpm check + pnpm vitest run.)
- [x] Task 4: Migrate shipped content — 10 `help/` files (doc page + 9 example notes + README) bare `belongs_to:`/`related_to:` -> `_belongs_to:`/`_related_to:`; update ADR 0026 to document the underscore convention. (Content only.)

## Notes

- Decisions confirmed by user: canonical = underscore form; NO alias; full parity for has_many; bare display labels; migrate help + ADR (leave historical `.scratch/` issues).
- `has` today is frontend-only (PropertiesView FIXED_RELATIONSHIPS); has_many is purely additive (no `has:` in shipped content).
- `formatRelationshipLabel` has no non-test callers; `BacklinksPanel` shows `relationshipType.replace('_',' ')` -> bare type strings keep display clean.
- No `_`-prefix hide filter in properties, so `_belongs_to` renders fine as a fixed relationship row.
