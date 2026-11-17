# 03 discovery: search result cards

No `spec.md` exists for finders-ux; the Issue, `research/verdict-search-panel.md` (ticket A) and the prototype are the inputs.

## Files that change

- `src/lib/utils/markdown-plain-text.ts` (new): `markdownToPlainText(md)`. Test: `src/tests/lib/utils/markdown-plain-text.test.ts` (new).
- `src/lib/features/search/search.service.ts:161-170`: hybrid adapter title = `stem(r.sourcePath)`, no `source` key.
- `src/lib/features/search/search.types.ts:46`: `source?:` optional.
- `src/lib/features/search/SearchResult.svelte:47-84` (title, subtitle, snippet derivations) and `:136-173` (markup: `div`/`p` inside the button become spans `flex`/`block`, subtitle gets `data-search-result-subtitle`).
- `src/app.css` (before `@layer base`, ~:484): `[data-search-result] mark { background-color: var(--lp-highlight-bg); color: inherit; }`.
- `help/documentation/06-search-and-navigation.md:125-133`: Search Results section.
- Tests: `src/tests/lib/features/search/search.service.test.ts:254-283` (`:282` assertion flips, new fallthrough test), `src/tests/lib/features/search/SearchResult.test.ts` (subtitle hook, badge fixture, new title/subtitle/snippet cases).

## Plan

1. Util test-first, then util. Line rules (after leading whitespace): fence marker line, `>` quote markers, `[!type]` callout marker (+/-), ATX `#`, list `-*+`/`1.`, checkbox `[x]`. Inline: wikilinks/embeds (alias, else last `/` segment not belonging to `</mark>`), images (alt), links (text), cut link/image `[t](url...` at the end, stray `[[`/`]]`, backticks, `**`/`__`/`~~`/`==`, `*`, `_` at word edges only (keeps `snake_case`). Whitespace collapses to one space, trimmed. `<mark>`/`</mark>` untouched.
2. Service: adapter change + tests (red then green).
3. Component: one `snippet` derived = `markdownToPlainText(raw)`, HTML path stays `sanitizeSnippetHtml(snippet)` (strip first, sanitize last). Subtitle = parent folder of the vault-relative path + `§ heading`; title = FTS `title` (Rust `extract_title` = stem), stem for semantic, hybrid `title`, legacy `fileName` (stem). Spans only inside the button.
4. CSS rule, help text.

## Prior-art tests to copy

- `SearchResult.test.ts` `mountResult` helper and fixtures; `search.service.test.ts` `mockInvoke` with per-command `mockImplementation` (like `mockSearchIPCs`).

## Risks

- Issue 209 adds `pr-7` to the same subtitle/snippet elements; whichever lands second keeps both (verdict note).
- `_` stripping only at word edges; `*` stripped everywhere (a literal `2*3` loses its star; accepted for a preview).
- Removing `p` changes the existing subtitle test selector (moved to the data hook, as the Issue asks).

## Defaults taken

- Folder = full vault-relative parent path (`Projects/Sub`), not just the last folder: the Issue says "parent folder", the redundant part is the file name.
- Subtitle format `Projects § Intro`; root note with heading shows `§ Intro`; root note without heading renders an empty subtitle span (keeps the fixed card height).
- Heading part keeps the primary color in its own span; folder part is muted.
- Images reduce to their alt text; `![[embed]]` follows the wikilink rule.
- `#heading`/`^block` suffixes of a wikilink target are left as written.
