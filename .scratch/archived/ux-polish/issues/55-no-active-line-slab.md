# 55: Live preview draws no active-line slab above the note title

**What to build:** With the frontmatter hidden, the cursor line inside it paints `.cm-activeLine` (`src/lib/core/markdown-editor/setup/editor-theme.ts`, about line 52) as an empty slab above the title. Stop painting the active line in live preview (or only while the editor is focused), and place the cursor at the start of the body when the frontmatter is hidden on open.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: an editor test asserts the cursor lands after the frontmatter when it is hidden
- [ ] No active-line background is applied in live preview (test on the theme spec or an E2E style check)
- [ ] Source mode keeps its current active-line behavior

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 8.
- ADR 0008 applies (live preview architecture).
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/60-live-preview-paints-no-active-line-background.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
