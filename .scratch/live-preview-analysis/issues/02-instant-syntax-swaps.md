# 02: Syntax appears and disappears instantly (ADR 0008 amendment)

**What to build:** Hidden markdown syntax swaps instantly instead of animating. Block marks (`#` prefix, setext underline, quote marks) are hidden today with a `Decoration.mark` + `font-size: 0.01em` + `transition: font-size 0.2s`; inline marks (`**`, `_`, `~~`, `==`, code ticks, link brackets, escapes, `%%`) animate `max-width`/`scaleX`. Animating glyph width makes text slide while CodeMirror measures the vertical-motion goal column, which is the main suspect for the bullet <-> H1 arrow glitch. Hidden syntax becomes `Decoration.replace({})`; the transition CSS and `-visible` classes are deleted. The user removed animation as a requirement (2026-10-29). Amend ADR 0008 (it rejected `Decoration.replace` for losing the animation) and CLAUDE.md live-preview rule 1 with the new evidence: animated width breaks vertical navigation; the same mark + `font-size` family already caused the editor freeze fixed in `b4aa9028` and the duplicate bullets fixed in `a404aebb`; SilverBullet, Zettlr, atomic-editor and ink-mde all swap instantly.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (modify; `.cm-formatting-block` :47-56 and the inline animation rules)
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/` (modify; heading, blockquote, mark, link, escape, comment handlers)
- `docs/adr/0008-codemirror-live-preview-architecture.md` (modify; :23, :53, :68 and the Animation discipline paragraph)
- `CLAUDE.md` (modify; Live Preview rule 1)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Handler tests: off the cursor line the syntax ranges are `Decoration.replace`; on the cursor line no replace is emitted
- [ ] No CSS `transition` remains on hidden-syntax classes; the `-visible` classes are gone
- [ ] ADR 0008 has an amendment section dated 2026-10-29 with the evidence above; CLAUDE.md rule 1 matches it
- [ ] Manual check: arrowing between a bullet and an H1 no longer shows text sliding
