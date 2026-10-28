# 44: A tab-kind registry

**What to build:** special tab kinds (collection, tasks, graph, tags, canvas, kanban, event-calendar) register themselves with core instead of core naming each one, in line with ADR-0003 (`core/` must not import `features/` or `plugins/`).

**Blocked by:** None

**Status:** needs-triage

- Today the kinds are a closed union in `src/lib/core/editor/editor.types.ts:12` (`fileType?: ... | 'event-calendar'`) and `EditorView.svelte` imports the feature view directly. The plan (D-notes on core changes) filed the registry instead of adding it.
- Open: the registration API, and whether every existing kind moves at once or one at a time.

- [ ] Decision recorded on the API and the migration order
- [ ] If accepted: core has no import of a feature tab view; each kind registers its component, icon and title
