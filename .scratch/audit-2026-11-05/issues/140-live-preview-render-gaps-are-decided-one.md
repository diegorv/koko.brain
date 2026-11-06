# 140: Live-preview render gaps are decided one by one: meta-bind options with ], math right under a paragraph or callout, and the others listed

**Migrated from:** `.scratch/live-preview-audit/issues/05-render-gaps-needing-a-decision.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). Postponed by the owner. Each item needs a decision or a repro.

**Audit check at `5f8003d67`:** still_present (corner, low). Item 1: INPUT_RE is still /`INPUT\[([^\]]+)\]`/g at src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:23, so an option containing `]` ends the match early. Item 2: the BlockMath parser in src/lib/core/markdown-editor/extensions/lezer/math-extension.ts:63-111 still has no endLeaf, so `$$` right after a paragraph line stays paragraph text. Item 3 (stale embeds) was traced only and remains unverified. Item 4 (zero-width-prefixed pipe-less table) was not re-checked and is very low likelihood. None of the relevant files changed for these items (last commits b16a1e520, b27dd3276, bd6b1433a are refactors).

**Stale in the text below:** Nothing in the text is stale. Each item still needs an owner decision or a repro, as the Issue says. Item 2 is the most likely one for this owner (math directly under a paragraph or a callout line).

**Owner decision needed:** For each item (item 2, math directly under a paragraph or callout line, is the most likely for you): render it, keep it as is, or provide a repro first?

**Status:** needs-info

**Blocked by:** none

Priority: P3

Split out of Issue 04 at triage (2026-11-02). Evidence in `.scratch/live-preview-audit/repro/` (see `audit-2026-11-02.md`).

1. **INPUT option containing `]`.** `INPUT_RE` (src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:23) captures `[^\]]+`, so `option(good, [[good]])` ends the match early and the INPUT never becomes a control (CONFIRMED_BY_TEST, repro/inline/lp-redraw-inline-audit.test.ts). Decision: support it with a bracket-balanced scan, or document the limitation.
2. **`$$` block math right after a paragraph line** (including the first body line of a callout) renders as source; a blank line fixes it (CONFIRMED_BY_TEST, repro/block-vs-block/block-vs-block-extra.test.ts). Decision: check how Obsidian treats `$$` directly after a paragraph, then add an `endLeaf` for BlockMath or keep today's behavior.
3. **Stale embeds (PLAUSIBLE, traced only).** A note embed keeps old text after the target note changes elsewhere, a mermaid diagram keeps the old theme after a light/dark switch, and an image embed shows "not found" after the file appears, until the line is redrawn. Needs a repro before any fix.
4. **Pipe-less table starting with a zero-width character** (U+200B, U+00AD, U+FEFF) vanishes after a nearby edit (CONFIRMED_BY_TEST, very low likelihood, repro/block-vs-inline/block-vs-inline-redraw.test.ts). Decision: leave it, or start the table replace after leading special characters.

## Acceptance criteria

To be written at triage, per item picked up.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Each of the four items is handled only after its decision is recorded; an item decided 'keep as is' needs no code, and the decision is written in the Issue Notes (for item 1, the limitation is also documented where meta-bind INPUT syntax is documented, as the Issue allows).
- [ ] Item 1, if decided 'support': failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.test.ts: parsing the line text with the INPUT `INPUT[inlineSelect(option(good, [[good]])):x]` (in backticks) yields one INPUT match whose full text includes the inner ]]. It fails today because INPUT_RE (meta-bind-input.ts:23) stops at the first ]. The bracket-balanced scan keeps every existing parser test passing and does not match an unclosed INPUT[.
- [ ] Item 2, if decided 'render': failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/math.test.ts (findAllBlockMath) and plugins/block-math-field.test.ts: 'paragraph line\n$$\nx^2\n$$' and a callout whose first body line is directly followed by '$$' both produce a BlockMath range and a widget. It fails today because blockMathParser (math-extension.ts:63-111) has no endLeaf. The decision first records how Obsidian treats `$$` right after a paragraph line.
- [ ] Item 2 keeps today's behavior for a `$$` line inside a paragraph that is not alone on its line (for example '$$x$$ text'), and the existing math, block-math-field and combined-block-structures tests pass without edits.
- [ ] Item 3 starts with a repro: failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.test.ts (note embed after the target changes, image embed after the file appears) or plugins/mermaid-field.test.ts (diagram after a light/dark switch), asserting the widget shows the new content without a manual redraw. If no repro can be written, the Issue Notes record that the stale-embed case was not reproduced and no code changes.
- [ ] Item 4, if decided 'fix': failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/table.test.ts and plugins/table-field.test.ts: a pipe-less table whose first line starts with U+200B (also U+00AD and U+FEFF) keeps its table replace after a nearby edit. It fails today. If decided 'leave it', no code changes.
- [ ] Frontend gate: pnpm check + pnpm vitest run pass.
- [ ] Owner decision recorded in the Issue Notes: for each of items 1 to 4, render it, keep it as is, or provide a repro first.

## Comments

- 2026-11-06: migrated from `.scratch/live-preview-audit/issues/05-render-gaps-needing-a-decision.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
