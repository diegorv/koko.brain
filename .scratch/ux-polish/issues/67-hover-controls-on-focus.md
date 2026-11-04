# 67: Hover-only controls also appear on keyboard focus

**What to build:** About 12 controls appear only on `group-hover:opacity-100`, so keyboard users never see them. Add `group-focus-within:opacity-100` to each. Remove `transition-all` (use `transition-colors duration-100`) and `hover:scale` from chrome.

**Blocked by:** 37

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A grep-style test fails on `group-hover:opacity-100` without a matching `group-focus-within` outside `components/ui`
- [ ] No `transition-all` or `hover:scale` left in chrome components (same test)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "State styles"; `work/states.md`.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
