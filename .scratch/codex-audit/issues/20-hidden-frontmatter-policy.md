# 20: Decide whether to protect hidden metadata from implicit input

**What to build:** An explicitly approved extension of hidden-frontmatter protection for source-mode transitions, search, pointer selections, and history-restored carets.

**Blocked by:** none
**Files:** src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts, src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts, src/lib/core/markdown-editor/setup/editor-extensions.ts, src/lib/core/markdown-editor/MarkdownEditor.svelte, src/lib/core/markdown-editor/tab-view-state.ts, src/lib/core/editor/editor.store.svelte.ts, src/tests/lib/core/markdown-editor/, e2e/
**Status:** needs-triage
**Priority:** P1
**Gate:** Frontend plus real pointer/focus and native-input verification.

## Disposition

The corruption is reproduced, but these paths were expressly excluded by the delivered keyboard-protection ticket. This is a request to change that policy, not a demonstrated regression in the delivered requirement.

## Decisions and acceptance criteria

- [ ] Explicitly retain or supersede the prior exemptions for ordinary input, pointer selections, hidden search matches, and unannotated/history selections.
- [ ] Choose whether unsafe input is redirected, refused, or made visible before editing.
- [ ] Specify behavior for a caret/range in opening fence, metadata, closing fence, mixed hidden/body cursors, and frontmatter-only documents.
- [ ] Cover source-to-preview followed by typing/Enter/paste; Find Next/Previous then editor input; source edit followed by undo in preview; body-to-padding drag; copy-drop.
- [ ] Keep intentional metadata writes, normal body editing, and reversible undo/redo.
- [ ] Preserve explicit Replace All behavior unless separately changed by the decision.
- [ ] Do not broadly filter input in ways that break composition or silently drop typed text.
- [ ] Turn approved choices into real-extension/store tests and browser/native pointer and IME checks.

## Provenance

Follow-up policy request to [resolved open-itens 002](../../open-itens/issues/002-keyboard-edits-next-hidden-frontmatter-never-change.md), whose completed status and historical decisions remain intact. [Evidence](../evidence.md#hidden-frontmatter).

## Comments

The owner behavior decision above is required before implementation.
