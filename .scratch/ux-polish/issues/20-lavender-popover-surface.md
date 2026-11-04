# 20: Lavender Haze menus and popovers sit above the page instead of matching content blocks

**What to build:** Lavender Haze's `popoverBg` is `#DDD8E8` (`src/lib/core/settings/theme.logic.ts` about line 209), darker than the `#F3F0F8` page and identical to the theme's code block, table header, frontmatter, embed, collection, setting item and active-line gutter fills (explicit overrides, about lines 252-277), so menus read as one more content block. Set `popoverBg` to `#FFFFFF`. Only `--popover` changes: nothing else derives from `popoverBg` (`theme-builder.logic.ts:229` maps it to `ui.popover`, and `readableCore` at about line 181 only raises text that falls short, while every text token gains contrast on white; for example muted `#645c74` goes from 4.53:1 to 6.32:1).

**Blocked by:** 19

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, in `src/tests/lib/core/settings/theme.logic.test.ts`: Lavender's `ui.popover` is lighter than its `ui.editorBg` (compare `contrastRatio(x, '#000000')` from `utils/color.ts`) and differs from `preview.codeblockBg`, `preview.frontmatterBg` and `ui.settingItemBg`
- [ ] The Lavender snapshot diff changes `--popover` only; the Default snapshot is unchanged
- [ ] Visual check in Lavender, noted in the commit: a dropdown menu, a context menu, a select, the command palette list, the kanban date and tag popovers, the editor autocomplete, and the Quick Capture composer, whose background is `color-mix(in srgb, var(--popover) 92%, transparent)` (`src/routes/composer/+page.svelte:128`) and so turns near white

## Notes

- **Source:** review section 1 item 5 and section 2 "Surfaces" row; `.scratch/ux-polish/work/shadow.md` P2; `.scratch/ux-polish/work/overlays.md` P6.
- **Why after Issue 19:** a white surface on a light page needs the new ring and tinted shadow to separate, and both tickets rewrite the same snapshot file.
- **Out of scope:** custom and catalog themes keep their own `popoverBg` (a core palette input, not derived); the accent highlight contrast inside menus (contrast guard work).
- **Size:** S.
