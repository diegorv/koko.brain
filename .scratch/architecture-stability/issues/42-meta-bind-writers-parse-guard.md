# 42: Meta-bind inline writers drop the frontmatter when it does not parse

**What to build:** Issue 41 made Properties panel edits refuse when the frontmatter does not parse (`commitChanges` in `src/lib/features/properties/properties.service.ts`, guarded by `isFrontmatterUnparseable` in `properties.logic.ts`). Three meta-bind writers in the editor rebuild the frontmatter the same way with no guard:
- the inline select `change` handler in `createMetaBindSelect` (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`, around :736-742),
- `dispatchMetaBindUpdate` for the number / date / toggle inputs (same file, around :786-792),
- the `updateMetadata` action of the meta-bind button (`src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts`, around :91-95).

Each calls `parseFrontmatterProperties(doc)` and `rebuildContent(updated, body)`. When the block does not parse, `parseFrontmatterProperties` returns `[]`, so the rewrite keeps only the bound property and drops every other key.

Fix: refuse the write in all three when `isFrontmatterUnparseable(doc)` is true (or reuse `detectLossyFrontmatter`, which also refuses comments and nested values), and tell the user the way the panel does. Add a test per writer that a note with unparseable frontmatter keeps its bytes.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** review of Issue 41, 2026-11-01, finding 2 (minor, pre-existing).

- [ ] A meta-bind select, input or button write on a note whose frontmatter does not parse leaves the note unchanged (a test per writer)
- [ ] The user sees why the write was refused

## Notes

- **Size:** S.
