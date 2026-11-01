# Issue 42 discovery

No `spec.md` for architecture-stability. Follows `work/41` (the panel guard in `commitChanges`).

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`
  - :734-749 select `change` handler: same rebuild as `dispatchMetaBindUpdate`, inlined.
  - :787-795 `dispatchMetaBindUpdate` (number / date / toggle).
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts`
  - :82-101 `updateMetadata` action: same rebuild, inlined.

## Plan

1. Guard `dispatchMetaBindUpdate`: when `isFrontmatterUnparseable(doc)` (from `properties.logic`,
   already imported by both files, so no new layer-baseline edge) return without dispatching,
   `appendLog('META-BIND', ...)` like the panel, and `toast.error(...)` so the user sees why. The
   message reuses the `unparseable` wording of `frontmatter-write.service.ts`.
2. Make the select handler and the button action call `dispatchMetaBindUpdate` instead of their
   inlined copy (byte-identical code), so all three writers share the one guard. The button keeps
   its dynamic-import style (`await import('../widgets')`).
3. Tests (test-first): in `meta-bind-input-widgets.test.ts`, mount each writer on a note whose
   frontmatter does not parse (`---\na: [unclosed\nb: 1\n---\n`), fire its event (select `change`,
   toggle `change`, number input `blur`, button `click`), assert the doc is byte-identical and the
   toast was shown; plus one happy-path write per writer that still updates the property.

## Prior-art tests

- `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-widgets.test.ts` (mount helper).
- `src/tests/lib/features/properties/properties.service.test.ts` :366-390 (panel guard from Issue 41).
- `svelte-sonner` mock: `src/tests/lib/core/editor/editor.service.test.ts:12`.

## Risks / defaults

- Guard is `isFrontmatterUnparseable`, not `detectLossyFrontmatter`: matches the panel and keeps
  today's writes on notes with comments or nested values working (refusing those is a wider
  behaviour change the Issue does not require).
- `svelte-sonner` is an external package, so importing it in `core/` adds no layer edge.
- Button widget imports `editor.service` statically; the test may need its Tauri mocks.
