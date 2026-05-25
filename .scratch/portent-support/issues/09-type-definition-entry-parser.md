Status: done
Phase: 3

# Type definition entry parser and reactive store

## What to build

Notes with `type: Type` are Type Definitions - they define a document type rather than being an instance of one. Create a new feature module that parses these entries and exposes their metadata reactively.

A Type Definition entry looks like:
```yaml
---
type: Type
_color: red
_icon: rocket
_order: 2
_sidebar_label: Projects
_template: "..."
_sort: title
_view: all
_visible: true
_list_properties_display:
  - belongs_to
  - status
---
# Project

Projects are time-bound efforts that produce an output.
```

The module should:
1. Identify Type Definition entries from vault index (`is_a === "Type"`)
2. Extract display metadata: icon, color, order, sidebar label, template, sort, view, visible, list properties display
3. Build a reactive map: type name (from entry title) -> metadata
4. Rebuild when vault index updates (`vaultIndexVersion` pattern)

New feature: `src/lib/features/type-definitions/`

## Acceptance criteria

- [ ] Feature module with `type-definitions.logic.ts`, `type-definitions.store.svelte.ts`, `type-definitions.service.ts`
- [ ] Correctly identifies entries with `is_a: "Type"`
- [ ] Extracts icon, color, order, sidebar label from frontmatter
- [ ] Reactive store rebuilds on `vaultIndexVersion` change
- [ ] Provides lookup: `getTypeMetadata("Project")` -> `{ icon, color, order, label }`
- [ ] Handles vaults with no Type Definition entries (graceful empty state)
- [ ] Built-in fallback metadata for common types (Project, Person, Event, Topic, Task, Note)
- [ ] Tests for logic, store getters

## Blocked by

- 02-type-field-in-rust-index
