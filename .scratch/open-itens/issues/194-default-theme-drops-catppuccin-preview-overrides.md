# 194: The Default theme drops its Catppuccin preview overrides

**Origin:** `audit-2026-11-05` Issue 93, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/ux-polish/issues/72-default-theme-drop-preview-overrides.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Design polish. Its blocker 41 is resolved.

**Audit check at `5f8003d67`:** design_or_refactor (polish, low). src/lib/core/settings/theme.logic.ts:149 starts the KOKOBRAIN_DEFAULT_THEME overrides and :187-232 hold the preview block with Catppuccin Mocha hexes (#1e1e2e, #313244, #181825, #a6adc8, #f38ba8, #cdd6f4) for codeblockBg, tableBorder, tableHeaderBg, collection*, embed* while editorBg is #2a2e3d. Blocker Issue 41 is done (53418bf0b). Removing them changes the daily-visible code block, table and embed colors in the Default theme, so it needs the owner screenshot review the Issue already calls for.

**Stale in the text below:** Lines 168-192 are now 187-232 (the override object begins at line 149); the preview block has grown to about 36 tokens.

**What to build:** `theme.logic.ts` (about lines 168-192) keeps Catppuccin-derived preview overrides in the Default theme that bypass its own palette. Remove them so the preview colors come from the theme tokens, in its own commit so the screenshot diff is reviewable.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Only the Catppuccin preview values are removed from theme.logic.ts:187-220: #1e1e2e, #313244, #181825, #a6adc8, #f38ba8, #cdd6f4 and #262637, used by codeblockBg, tableBorder, tableHeaderBg, tableAlt, collection* , embed* and taskCheckmark. Non-Catppuccin entries such as wikilink #a78bfa and olMarker stay. theme-snapshot.test.ts and theme.logic.test.ts are updated on purpose, and the commit body records a by-eye check of code blocks, tables and collections in the Default theme.
- [ ] The theme preview card in Settings > Appearance renders from the theme tokens (test)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Surfaces" (color.md proposal).
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/72-default-theme-drop-preview-overrides.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: the keys to remove are named after the order review.
