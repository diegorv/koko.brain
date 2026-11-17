# 03: Search result cards: note name, folder, plain-text snippets, themed highlight

**Origin:** design review 2026-11-17, proposals P58 and P158 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-search-panel.md` (ticket A) and `.scratch/finders-ux/research/breakdown.md` (01). Also builds the span-only result markup of P162 (counted in 04).

**What to build:**

1. **Title and subtitle.** The note name is the card title in every mode. The subtitle is the parent folder (nothing at the vault root) plus `§ heading` when there is a heading, and never repeats the file name (`SearchResult.svelte:47-68`).
2. **Hybrid adapter.** The `search_hybrid` adapter at `search.service.ts:161-170` derives the title from the path with `.md` stripped (not from `r.heading`) and omits `source`. `source` becomes optional at `search.types.ts:46`, so the badge shows only on the legacy merge fallback, where the source really varies.
3. **Plain-text snippets.** A new pure util in `src/lib/utils/` (for example `markdown-plain-text.ts`, later shared with review P74) turns markdown into plain text: ATX headings, `**`/`*`/`_`/`~~`/`==` marks, links and images, wikilinks (alias if present, else the target's last segment), checkboxes, list and quote markers, inline code, fences and callout markers. It keeps `<mark>`/`</mark>` and tolerates unbalanced syntax cut by `...` or the 200-character limit. It runs on every snippet. For the HTML snippets (Text FTS and hybrid, `snippetIsHtml` at `SearchResult.svelte:86`) it runs before `sanitizeSnippetHtml` (`src/lib/utils/sanitize.ts:57`): strip first, sanitize last. The hybrid raw chunk never carries `<mark>`. Semantic snippets and the legacy in-memory fallback snippets (`SearchResult.svelte:78-82`) render as text, not HTML, so the util runs on them before they render as text.
4. **Markup.** The result `<button>` holds only phrasing content: spans styled `block`/`flex`, no `div` or `p` (`SearchResult.svelte:136-173`).
5. **Highlight.** One `mark` rule for search results in `src/app.css` uses the existing `--lp-highlight-bg` token with `color: inherit`. No new theme token.
6. **Help.** Rewrite the "Search Results" section of `help/documentation/06-search-and-navigation.md:125-133` to describe the card as built: note name, folder and heading, snippet. The "relevance score" bullet holds only for Semantic.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/search.spec.ts`.

- [ ] Failing test first, `src/tests/lib/utils/<util>.test.ts`: the util strips headings, emphasis, `==highlight==`, `~~`, links, images, wikilinks (alias, else the last segment), checkboxes, list and quote markers, inline code, fences and callouts; keeps `<mark>`; tolerates a `...` cut and an unbalanced cut. Empty input returns an empty string.
- [ ] Failing test first, `search.service.test.ts`: a hybrid chunk for `Projects/a.md` with heading `Intro` adapts to title `a` (no `.md`) and no `source`; the `:282` `source` assertion changes on purpose. A new test covers the `search_hybrid`-throws fallthrough: legacy merge results still carry a real `source`.
- [ ] Failing test first, `SearchResult.test.ts`: in every mode the title is the note name and the subtitle is folder plus `§ heading`, never the file name; a root-level note shows no folder; a hybrid card without `source` shows no badge, and one with `source` still does; the snippet shows no raw markdown in Text, Hybrid, Semantic and legacy fallback cards.
- [ ] The result button contains only phrasing content; the subtitle test uses a data hook (for example `data-search-result-subtitle`) instead of `querySelector('p')`.
- [ ] `mark` in search results uses `--lp-highlight-bg` with `color: inherit`; `theme-snapshot.test.ts.snap` is unchanged. This rule is CSS only; no computed-style test is required.
- [ ] `e2e/specs/search.spec.ts` stays green (rows still contain the note name).
- [ ] The help section describes the new card.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P58.** Hybrid search results hide the note name, and every card says "Both". The title is the note name, and the subtitle is the folder plus the heading. Hide a badge that is the same on every card.
- **P158.** Search result cards show raw markdown, unstyled highlights and a redundant path. Strip markdown from snippets (shared with P74), style `mark` with a theme token, and show only the parent folder.

## Problem

In Hybrid mode the heading is both title and subtitle, so the user cannot tell which note a hit belongs to, and every card carries the same "Both" badge. Snippets are raw markdown in every mode, `<mark>` has no themed style, and the subtitle repeats the file name.

## Evidence

Checked at `bb57e6165`.

- `src/lib/features/search/search.service.ts:161-170`: `title: r.heading ?? r.sourcePath.split('/').pop()`, `snippet: r.content.slice(0, 200)`, `source: 'both' as const`.
- `src/lib/features/search/search.types.ts:46`: `source: 'text' | 'semantic' | 'both'` (required).
- `src/lib/features/search/SearchResult.svelte:47-68` title and subtitle; `:136-173` `div` and `p` inside the result `<button>`.
- `src/lib/utils/sanitize.ts:57`: `sanitizeSnippetHtml`, no markdown stripping anywhere in the snippet path. The Rust `compute_snippet` (`src-tauri/src/vault/entry.rs:376`) keeps markdown on purpose.
- `src-tauri/src/search/hybrid.rs:187`: a chunkless hybrid path has its marks removed, so hybrid cards never carry `<mark>`.
- `src/app.css:320`: `--lp-highlight-bg` exists; there is no `mark` rule.
- Correction to the review: the screenshot came from the E2E mock, whose `search_fts` returns snippets without `<mark>` (`e2e/mocks/tauri-core.ts:315-321`). Tailwind preflight does not reset `mark`, so in the real app WebKit paints it yellow with black text in every theme. The highlight work is "theme it", not "make it visible" (not checked in the running app).

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: the highlight reuses `--lp-highlight-bg` (no new token); a root-level note shows no folder; the badge shows only where `source` is set.
