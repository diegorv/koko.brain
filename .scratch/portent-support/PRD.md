# Portent Spec Support for Koko Brain

## Summary

Implement the Portent knowledge base spec in Koko Brain. Portent defines 8 document types (PORT: Project, Operation, Responsibility, Task; ENTP: Event, Note, Topic, Person), semantic relationships (`belongs_to`, `related_to`), and a 3-stage lifecycle (captured, organized, archived).

## Reference

- Portent spec: https://portent.md
- Tolaria (reference implementation): https://github.com/refactoringhq/tolaria

## Phases

### Phase 1 - Foundation (type + lifecycle)
System metadata aliases, `is_a` type field in Rust index, lifecycle flags (organized/archived/favorite), UI actions for lifecycle, archived entry filtering.

### Phase 2 - Relationships
`belongs_to`/`related_to` fields in Rust index, backlinks panel with relationship context, collection filter extensions for type/relationship/lifecycle fields.

### Phase 3 - Navigation
Type definition entries (notes with `type: Type`), type-grouped sidebar mode, inbox workflow with explicit organization.

## Non-goals

- Schema validation/enforcement (Portent types are lenses, not schemas)
- Plugin system changes
- Migration tooling for existing vaults
