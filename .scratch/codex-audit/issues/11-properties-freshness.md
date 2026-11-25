# 11: Preserve newer note properties across panel commits

**What to build:** Editing a property never reconstructs the note from a stale property snapshot or suppresses a newer same-note refresh.

**Blocked by:** none
**Files:** src/lib/features/properties/properties.service.ts, src/lib/features/properties/properties.store.svelte.ts, src/lib/features/properties/PropertiesView.svelte, src/lib/features/properties/PropertyField.svelte, src/lib/core/frontmatter/properties.logic.ts, src/lib/core/frontmatter/frontmatter-write.service.ts, src/lib/core/editor/editor.service.ts, src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts, src/tests/lib/features/properties/, src/tests/lib/core/frontmatter/properties.logic.test.ts, src/tests/lib/core/editor/editor.service.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-widgets.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts
**Status:** ready-for-agent
**Priority:** P1
**Gate:** Frontend with mounted Properties and meta-bind coverage.

## Acceptance criteria

- [ ] A byte-identical panel commit neither arms refresh suppression nor dispatches an external document replacement.
- [ ] After a no-op numeric edit, wait beyond 300 ms, add an editor property, and change another panel property: both values survive saving and reopening.
- [ ] A real panel change followed by an editor change inside 300 ms refreshes to both values; a later panel commit retains them.
- [ ] Repeat the second-change case with the actual meta-bind checkbox.
- [ ] Suppression recognizes only the exact content produced by the panel, not merely its path.
- [ ] If a commit originates from a stale displayed revision, rebase its intended property operation or refuse and refresh; never serialize an obsolete whole property array over current values.
- [ ] Switching notes cannot transfer properties or suppress the new note's parse.
- [ ] Retain the existing refusal of lossy frontmatter and canonical YAML policy.
- [ ] Use real component, stores, parser, service, and save pipeline; assert persisted values.

## Provenance

Supersedes [open-itens 008](../../open-itens/issues/008-properties-panel-commit-that-changes-nothing-does.md) and the Properties section of [105](../../open-itens/issues/105-minor-write-races-are-closed-autosave-during.md). Other 105 claims have explicit dispositions in [deferred findings](../deferred.md). [Evidence](../evidence.md#properties-and-types).

## Comments
