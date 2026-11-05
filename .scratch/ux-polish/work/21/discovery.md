# Issue 21 discovery

No `spec.md` for ux-polish; the Issue is the source. Issues 19 and 20 are on main. Same shape as `work/20` (one palette line plus snapshot); what differs is listed below.

## Files that change

- `src/lib/core/settings/theme.logic.ts:121` Default `popoverBg: '#171a26'` -> `'#333745'`, with a comment: `mixColors('#2a2e3d', '#F8F8F2', 0.05)` (probed, it returns `#333745`).
- `src/lib/components/ui/dialog/dialog-content.svelte:30` `bg-background` -> `bg-popover text-popover-foreground`, `rounded-lg` -> `rounded-xl`.
- `src/tests/lib/core/settings/theme.logic.test.ts:339` area (`describe('built-in themes')`): Default popover case (lighter than `ui.editorBg` and `ui.background`; `contrastRatio(ui.mutedForeground, ui.popover) >= 4.5`).
- `src/tests/lib/core/settings/theme.logic.test.ts:321` asserts `heading6 === '#8a96b1'`, the old lifted muted color; it moves to the new lifted value (decision 1, intended).
- New `src/tests/lib/components/ui/dialog/dialog-content.svelte.test.ts`: mounts a Dialog open (jsdom, `mount`/`flushSync`/`tick` as in `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`), asserts the classes on `[data-slot="dialog-content"]`.
- `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`: `-u`, the diff must be `--popover` plus the muted-derived text tokens only.

## What differs from work/20

Issue 20 pinned Lavender's `mutedFg` so the snapshot stayed popover-only. Here the Issue asks for the opposite (decision 1): let `readableCore` (`theme-builder.logic.ts:181-189`) lift Default's `mutedFg` (`#8a96b1` is 4.547:1 on the editor; the new popover is lighter, so it drops below 4.5 and gets lifted). Expected movers: `--muted-foreground`, `--status-bar-fg`, `--syntax-strikethrough`, `--type-gray`, `--syntax-heading2..6`, `--file-explorer-muted-fg`, and any other `p.mutedFg` reader. The commit lists the exact set from the snapshot diff.

## Plan

1. Failing theme test, run, see it fail. Failing dialog component test, run, see it fail.
2. Palette line + dialog classes; rerun both; update the heading6 literal; `-u` the snapshot; read the `.snap` diff and confirm no surface or border token moves.
3. Targeted checks: `pnpm check`, `theme.logic.test.ts`, `theme-snapshot.test.ts`, the new dialog test, plus test files that render dialogs or name the Default palette (`theme-builder.logic`, `theme-css-contract`, `ThemeEditor`, `AppearanceSection`, `theme-package.logic`, `settings.service`).

## Risks / defaults

- `src/app.css` `.dark` fallbacks mirror Default: `theme-css-contract.test.ts` requires `--type-gray` to equal Default's, and the H2 to H6 ramp was written to match (Issue 64), so both move to the new derived values. The older oklch `--popover` / `--muted-foreground` fallbacks there never matched Default and stay.
- `bg-popover` on every `Dialog.Content`: callers passing their own `bg-*` keep winning through `cn` (tailwind-merge).
- Visual check (criterion 4) needs the running app; this build step cannot drive it. Left for deliver/owner; the commit names the surfaces to check.
