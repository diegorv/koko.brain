# 05: Live-preview render gaps that need an owner decision or a repro first

**Status:** needs-triage

**Blocked by:** none

Priority: P3

Split out of Issue 04 at triage (2026-11-02). Evidence in `.scratch/live-preview-audit/repro/` (see `audit-2026-11-02.md`).

1. **INPUT option containing `]`.** `INPUT_RE` (src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:23) captures `[^\]]+`, so `option(good, [[good]])` ends the match early and the INPUT never becomes a control (CONFIRMED_BY_TEST, repro/inline/lp-redraw-inline-audit.test.ts). Decision: support it with a bracket-balanced scan, or document the limitation.
2. **`$$` block math right after a paragraph line** (including the first body line of a callout) renders as source; a blank line fixes it (CONFIRMED_BY_TEST, repro/block-vs-block/block-vs-block-extra.test.ts). Decision: check how Obsidian treats `$$` directly after a paragraph, then add an `endLeaf` for BlockMath or keep today's behavior.
3. **Stale embeds (PLAUSIBLE, traced only).** A note embed keeps old text after the target note changes elsewhere, a mermaid diagram keeps the old theme after a light/dark switch, and an image embed shows "not found" after the file appears, until the line is redrawn. Needs a repro before any fix.
4. **Pipe-less table starting with a zero-width character** (U+200B, U+00AD, U+FEFF) vanishes after a nearby edit (CONFIRMED_BY_TEST, very low likelihood, repro/block-vs-inline/block-vs-inline-redraw.test.ts). Decision: leave it, or start the table replace after leading special characters.

## Acceptance criteria

To be written at triage, per item picked up.
