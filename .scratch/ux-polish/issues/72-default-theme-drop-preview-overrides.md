# 72: The Default theme drops its Catppuccin preview overrides

**What to build:** `theme.logic.ts` (about lines 168-192) keeps Catppuccin-derived preview overrides in the Default theme that bypass its own palette. Remove them so the preview colors come from the theme tokens, in its own commit so the screenshot diff is reviewable.

**Blocked by:** 41

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Theme snapshot tests are updated on purpose; the contrast guard passes
- [ ] The theme preview card in Settings > Appearance renders from the theme tokens (test)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Surfaces" (color.md proposal).
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/194-default-theme-drops-catppuccin-preview-overrides.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
