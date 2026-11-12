---
summary: "Pure parsing functions that locate live-preview constructs in a document and return their positions and fields."
---

## Responsibility

Owns the functions that find markdown constructs and return positions and parsed fields: fenced code blocks and the shared special-fence finder, tables, blockquotes and callouts, block math, frontmatter, media tags, markdown links and bare-URL autolinks, block and inline comments, footnotes, wikilink embeds, block references, meta-bind inputs and buttons, queryjs and collection blocks, mermaid blocks and inline markdown segments. Block-level finders read the Lezer tree through syntaxTree from @codemirror/language. Obsidian-specific syntax has no Lezer node and is matched by regex. It builds no decorations, widgets or handlers, keeps no state beyond regex objects, and makes no Tauri calls. Callers in plugins/, inline/handlers/, widgets.ts and click-handler.ts turn the results into decorations or click behavior.

## Key files

- `src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts`: findAllFencedCodeBlocks and findSpecialFenceBlocks, the base for the queryjs, collection, mermaid and meta-bind button finders and for the code block decorator.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts`: parseCalloutHeader, calloutHeaderOf and findAllCallouts.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts`: findBlockquoteMarkRange, deliberately null for callout lines.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts`: findAllTables and parseAlignments.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts`: Inline comment ranges and block comment fences.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts`: Extended autolink ranges and findMarkdownLinkUrlAtPosition.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts`: WIKILINK_EMBED_RE and findWikilinkEmbedRanges.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts`: FRONTMATTER_FENCE_RE and findFrontmatterBlock over a line array.

## State

- No persisted state. Several modules hold module-level global-flag RegExp objects that carry lastIndex between calls, and each finder resets lastIndex before its loop.

## Collaborators

- `src/lib/core/markdown-editor/extensions/callout`: callout.ts imports CALLOUT_COLORS and matchCalloutHeader from callout.logic.ts. It is the only parser that imports from outside live-preview.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins`: Consumers of the block-level and residual inline finders.
- `src/lib/core/markdown-editor/extensions/live-preview/inline`: Inline node and line handlers (blockquote, block reference, autolink, inline comment) consume finders.
- `src/lib/core/markdown-editor/extensions/live-preview`: widgets.ts imports the table, meta-bind input, inline markdown and media parsers, and click-handler.ts calls findMarkdownLinkUrlAtPosition.
- `src/lib/core/markdown-editor/setup`: editor-extensions.ts imports FRONTMATTER_FENCE_RE.

## Gotchas

- findSpecialFenceBlocks returns only closed fences whose info string is exactly the requested language and whose fence character is allowed. An unclosed fence, a fence nested inside another fence, or an opening fence indented past its container's content column is not returned. A fence inside a callout, blockquote or list item is found.
- findBlockquoteMarkRange returns null for any line of a callout, including nested callouts, because the callout decorator draws those lines.
- calloutHeaderOf accepts a Blockquote node only when its nesting depth equals the header's count of > prefixes, so in a nested callout only the inner blockquote is the callout.
- Most finders (comments, footnotes, wikilink embeds, autolinks, meta-bind inputs, block references, inline markdown) match text with regex and do not know about code blocks. Callers must suppress matches inside code: the inline pipeline and the residual inline plugins do it with isInsideBlockContext (docs/LIVE-PREVIEW.md).
- findBlockComment takes an isCode predicate so a %% line inside fenced code neither opens nor closes a block comment. A caller that omits it gets no code awareness.
- findFrontmatterBlock takes a line array with text, from and to, not an EditorState.
- parseAlignments uses regex because the Lezer table delimiter node exposes only raw text.
- Module-level global-flag regexes keep lastIndex between calls. A new finder that reads one must reset it before its loop.
