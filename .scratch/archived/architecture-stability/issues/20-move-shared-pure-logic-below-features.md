# 20: Move shared pure logic and settings types below the features

**What to build:** Move the pure modules that core and several features share to a lower layer. Rewrite every importer; leave no re-export shims behind.

| From | To |
|---|---|
| `features/quick-switcher/quick-switcher.logic.ts` | `core/filesystem/file-entries.logic.ts` |
| `getNoteName`, `resolveWikilink`, `buildResolutionCache`, `resolveWikilinkCached` and the type `WikilinkResolutionCache` in `features/backlinks/backlinks.logic.ts` (backlinks keeps `parseWikilinks` and `noteEntryV2ToBacklinkEntry`) | `core/filesystem/wikilink-resolution.logic.ts` |
| `features/copy-block-link/copy-block-link.logic.ts` only (the service uses `editorStore` and `svelte-sonner` and stays in features) | `core/markdown-editor/copy-block-link/` |
| `features/folder-notes/folder-notes.logic.ts` | `core/filesystem/` |
| tag extraction (`tags.logic.ts:3-127`, including `FRONTMATTER_REGEX`, `INLINE_TAG_REGEX` and `findTopLevelKey`); this cuts the search -> tags edge | `utils/tag-extraction.ts` |
| `AutoMoveSettings` and the types it references | `core/settings/settings.types.ts` |

Tests move with their modules (`git mv`). No behaviour change.

**Blocked by:** 04, 05, 06


**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/{MarkdownEditor.svelte,setup/editor-extensions.ts,extensions/wikilink/completion*.ts,extensions/live-preview/{widgets.ts,wikilink-navigation.ts,widgets/meta-bind-button-widget.ts}}, src/lib/features/search/search.logic.ts:2, src/lib/core/settings/settings.{store.svelte,types}.ts; docs/adr/0003, 0004

- [x] Before moving: the existing tests of each moved module pass at the old path; record the count
- [x] After moving: the same tests pass at the new path with only import lines changed (`git diff -M` shows renames)
- [x] `grep -rnE "#lib/features/(quick-switcher/quick-switcher.logic|backlinks/backlinks.logic|copy-block-link/copy-block-link.logic|folder-notes|auto-move/auto-move.types)" src/lib/core` is empty
- [x] `src/lib/features/search` no longer imports `features/tags`, and `utils/tag-extraction.ts` imports nothing outside utils
- [x] CLAUDE.md's features list drops folder-notes, and the issue-04 baseline and `featureCycleEdges` shrink by exactly the removed lines (search<->tags leaves `featureCycleEdges`)

## Notes

- **Size:** M (mechanical).

## Comments

- 2026-11-01, branch `issue/20-move-shared-pure-logic-below-features`: quick-switcher logic moved to `core/filesystem/file-entries.logic.ts`, wikilink resolution to `core/filesystem/wikilink-resolution.logic.ts`, copy-block-link logic to `core/markdown-editor/copy-block-link/`, folder-notes logic to `core/filesystem`, tag extraction to `utils/tag-extraction.ts`, `AutoMoveSettings` to `core/settings/settings.types.ts`. Layer baseline 57 -> 44, `featureCycleEdges` 33 -> 23. Deliver fixed the four review findings (stale Rust doc comments and ADR 0004 line, QuickSwitcher import order, JSDoc on `getNoteName` / `resolveWikilink`). Tests: `pnpm check` 0 errors; full suite 385 files, 9276 passed, 1 skipped, 1 todo, `pnpm build` ok (exit=0); `cargo test` 1150 passed, 0 failed. Review round 1: APPROVED (claude).
