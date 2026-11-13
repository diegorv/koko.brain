# 055 discovery: HTML link paste keeps bracketed link text and table cells intact

No `spec.md` in `.scratch/open-itens/`; the Issue file is the spec.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts`
  - :68-73 `htmlLinksToMarkdown`: after parsing, return `null` when `doc.querySelector('table')` finds a table, so the handler returns false (`paste-html-link-handler.ts:28`) and `pasteTsvHandler` (registered after it, `live-preview.ts:104`) builds the table from the tabbed plain text.
  - :90 label interpolation: escape `\`, `[` and `]` in the anchor text (backslash first) before building `[text](href)`. `[1]` becomes `[\[1\]](url)`, which no longer matches `WIKILINK_DECORATION_RE`.
  - Module JSDoc / function JSDoc: document both rules.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts`: two new cases (red first).

## Plan (test-first)

1. Add the bracket test from the Issue's first criterion (Wikipedia `<sup><a>[1]</a></sup>` + a second anchor): result has no `[[`, contains `[\[1\]](https://w.org/#c1)`. Run, see it fail. Add a backslash-label case in the same test group.
2. Implement the escape. Run the file green.
3. Add the table test: `<table>` with a header row and a cell link `https://j.io/1` that is not in the plain `Name\tLink\nTask\tJIRA-1`; expect `null`. Fails today (returns fused text). Implement the early return. Run green.
4. Targeted checks: `pnpm check`, the logic test file, and the TSV handler test file if one exists (unchanged behavior, sanity).

## Prior art

Existing cases in the same test file (jsdom env, direct `htmlLinksToMarkdown` calls with `toBe` / `toBeNull`).

## Risks / defaults taken

- `BLOCK_TAGS` keeps `TABLE` and `TR`: with the early return they are no longer reached, but Issue 167 (table-link conversion) will revisit table extraction there. Left untouched to keep the diff to what the Issue asks; noted for the reviewer.
- The `href === ''` branch inserts the anchor text as plain text, not as a link label, so it is not escaped (a bare `[1]` is not a wikilink).
- Bare-href branch (text equals href or empty) unchanged.
- Any `<table>` anywhere in the fragment, including one mixed with paragraphs, sends the paste to the TSV / default path, per the owner's scope ("a fragment that contains a <table>").
