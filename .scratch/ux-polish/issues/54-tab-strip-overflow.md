# 54: The tab strip shows overflow and hides the .md extension

**What to build:** After Issue 07 keeps the active tab visible, the strip still gives no cue that more tabs exist off screen. Add an edge fade on the overflowing side and a tab-list menu button listing every open tab, and hide the `.md` extension in tab labels and the breadcrumb (other extensions stay).

**Blocked by:** 07

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A component test asserts the `.md` suffix is not rendered for Markdown tabs and is rendered for `.canvas`
- [ ] The tab-list menu lists every open tab and activates the chosen one (test)
- [ ] The fade appears only when the strip overflows (test on the overflow state)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 1; `work/layout.md` P13.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
