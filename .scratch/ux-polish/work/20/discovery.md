# Issue 20 discovery

No `spec.md` for ux-polish; the Issue is the source. Issue 19 (elevation tokens) is on main.

## Files that change

- `src/lib/core/settings/theme.logic.ts:236` Lavender `popoverBg: '#DDD8E8'` -> `'#FFFFFF'`.
- `src/lib/core/settings/theme.logic.ts:239` Lavender `mutedFg: '#8A80A0'` -> `'#645c74'` (see below).
- `src/tests/lib/core/settings/theme.logic.test.ts` `describe('built-in themes')` (line 330): new Lavender popover case.
- `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`: `-u`, diff must be `--popover` only.

## Correction to the Issue's premise

"Nothing else derives from `popoverBg`" does not hold. `readableCore` (`theme-builder.logic.ts:182-192`) lifts `mutedFg` to 4.5:1 on every surface in turn, popover included; `#DDD8E8` is today the darkest surface, so it is what lifts `#8A80A0` to `#645c74`. Probe with only `popoverBg` changed: the snapshot also moves `--muted-foreground`, `--status-bar-fg`, `--syntax-strikethrough`, `--type-gray`, `--syntax-heading6` to `#6c637d` and `--syntax-heading2..5` lighter (the H2-H6 ramp mixes toward `mutedFg`, line 226). That breaks criterion 2.

Smallest change that keeps every criterion: set the Lavender core `mutedFg` input to the value it derives to today, `#645c74`. It already clears 4.5:1 on every remaining surface, so `ensureContrast` returns it unchanged and every derived token stays byte-identical. Probe: snapshot diff is `--popover` only. No token reads the raw (pre-lift) `mutedFg` (`p` at line 219 is the lifted palette; `meta` is its own input). `coreFromColors` (line 311) already reads the derived `ui.mutedForeground`, so the theme editor sees no change.

## Plan

1. Failing test: Lavender `ui.popover` lighter than `ui.editorBg` (`contrastRatio(x, '#000000')`), differs from `preview.codeblockBg`, `preview.frontmatterBg`, `ui.settingItemBg`. Run, see it fail.
2. Change the two palette lines, rerun, update snapshot with `-u`, check `git diff` of the `.snap` is the one `--popover` line.
3. Targeted checks: `pnpm check`, `theme.logic.test.ts`, `theme-snapshot.test.ts`, the other files naming Lavender (`theme-css-contract`, `theme-package.logic`, `settings.service`, `AppearanceSection`, `theme-builder.logic`, `ThemeEditor`).

## Risks / defaults

- Visual check (criterion 3) needs the running app; this build step cannot drive it. Left for deliver/owner and stated in the report; the commit names the surfaces to check.
- The pinned `mutedFg` is a palette input choice beyond the Issue text; it is what makes criterion 2 hold. The alternative (accept the lighter muted text) would need the criterion changed.
