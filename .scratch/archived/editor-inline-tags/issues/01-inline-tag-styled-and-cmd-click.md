# 01: An inline #tag is styled in the editor, and Cmd+click on it opens the tag search

**What to build:** In live preview, a `#tag` in the note body is drawn as a tag pill (the `#` stays visible, nothing is hidden), the same way for every tag. Cmd+click (Ctrl+click on Windows/Linux) on it opens Search with `tag:<tag>`, which is what clicking that tag in the Tags panel does (`TagsView.svelte` `handleTagClick` -> `openSearch(`tag:${tag}`)`). A plain click only moves the cursor, so the tag stays easy to edit. Something the indexer counts as a tag gets styled, and nothing it would skip does.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] A body `#tag` gets a `cm-lp-tag` mark covering `#` plus the tag name; the text is not replaced or hidden, and it stays styled when the cursor is on its line (handler tests through the pure inline builder)
- [x] The match rule is the indexer's: `#` at line start or after whitespace, first char a letter or `_`, then letters, digits, `_`, `/`, `-`; trailing `/` is not part of the tag. `foo#bar`, `#1984`, `# Heading`, `[[Note#Heading]]` and a `#anchor` inside a URL are not styled. Share the rule with `utils/tag-extraction.ts` (`INLINE_TAG_REGEX`) instead of writing a third copy of it
- [x] Nothing is styled inside inline code, fenced code blocks, frontmatter or HTML comments, where the indexer skips tags too
- [x] A nested tag (`#area/sub`) is one mark, and Cmd+click searches the full `tag:area/sub`
- [x] Cmd/Ctrl+click with the primary button on a tag pill opens Search with `tag:<tag>` and does not move the cursor; a plain click, another button or another modifier falls through to CodeMirror (click-handler tests, using the `isOpenLinkModifier` / `mac` pattern from `handleLivePreviewLinkMousedown`)
- [x] The click reaches Search through a new `EditorHost` method (for example `openTagSearch(tag)`) that `src/lib/app/editor-host.ts` implements with `openSearch(`tag:${tag}`)`, with a no-op in the default host. `core/` does not import `features/search` (the layer baseline does not grow)
- [x] The pill uses theme variables (accent background and text, small radius), with no per-tag color; it reads in light and dark themes
- [x] The Tags section of `help/documentation/07-sidebar-panels.md` says body `#tags` show as pills in the editor and Cmd+click opens the tag search

## Notes

- **Owner decisions (2026-11-04):** Cmd+click, not a plain click (links and wikilinks in Koko open on Cmd+click; a plain click moving the cursor keeps the tag editable, unlike Obsidian, where a plain click opens the search). The same default style for every tag: the custom colors from the Tags panel (`settingsStore.tagColors`) are not used in the editor. One ticket.
- **Why:** the indexer already counts body `#tags` (`vault/parsing.rs::extract_inline_tags`, `entry.rs` -> `extract_tags_strict`), so they show in the Tags panel, Collections and search. The editor had no tag handler at all (`live-preview/inline/handlers/` has wikilink, link, highlight and others, nothing for tags), so a typed `#tag` looked like plain text.
- **Where it plugs in:** a `LineHandler` in `live-preview/inline/handlers/` registered with the inline plugin, like `wikilinkHandler`. It only adds a mark; it does not hide syntax, so CLAUDE.md performance rule 1 (hide with `Decoration.replace`) does not apply, and it needs no reveal logic. Check how existing line handlers avoid inline code and fenced code (Lezer `InlineCode` / `FencedCode` nodes) and reuse that rather than re-stripping the line text.
- **Click:** extend `click-handler.ts` (or add a sibling handler next to it) for `.cm-lp-tag`; read the tag name from the document range, not from `textContent`.
- **Out of scope:** the format differences from Obsidian (a tag may start with a digit, as in `#2024-goals`, but not be all digits; emoji in tags). They touch the TS regex, the Rust strict extractor, the FTS extractor and the task-tag regex together, so they go in a separate Issue if wanted. Tag autocomplete on `#` is also out of scope.
- **Size:** S/M.

## Comments

- 2026-11-04, branch `issue/01-inline-tag-styled-and-cmd-click`: body `#tags` get a `cm-lp-tag` pill in live preview (shared rule with `INLINE_TAG_REGEX`, skipped in code/frontmatter/comments); Cmd/Ctrl+click opens Search with `tag:<tag>` via a new `EditorHost.openTagSearch`. Review round 1: CHANGES_REQUESTED (dark-theme pill tint, help text), fixed in a fix round; round 2: APPROVED with no findings. Full suite: 460 files, 10679 tests passed, build ok.
