# 40 discovery

Checked at `13dcc76c9` (after the split: items 3 and 4 and criterion (c) moved to Issue 53, so the earlier conflict with the Issue 05 bold test no longer applies). No `spec.md` exists for ux-quick-wins.

## Files that change

- `src/lib/core/settings/theme.logic.ts:155`: delete `tabBar: '#5a5c79'`. The builder derives `tabBar: p.sidebarBg` (`theme-builder.logic.ts:238`), and Default `sidebarBg` is `#21222e` (`theme.logic.ts:119`).
- `src/app.css:236`: `.dark` fallback `--tab-bar: #21222e`.
- `src/lib/core/markdown-editor/EditorTabs.svelte:213`: inactive tab `hover:bg-muted/30` becomes `hover:bg-tab-text-inactive/10`.
- Tests: `theme-builder.logic.test.ts` (new cases (a) and (b) over `BUILTIN_THEMES`), `EditorTabs.test.ts` (class pin), snapshot `theme-snapshot.test.ts.snap:120`, `theme.logic.test.ts:40`, `theme.service.test.ts:25`.

## Hover token (open question, default taken)

The Issue's example `hover:bg-editor-bg/60` does not clear 1.1:1 on either theme, so it is not used (the Issue allows any token that clears 1.1:1 on both). Measured composites over the new `tabBar` (WCAG ratio to `tabBar`):

| class | Default (`#21222e`) | Lavender (`#edeaf2`) |
|---|---|---|
| `editor-bg/60` | 1.09 | 1.04 |
| `muted/30` (today) | 1.02 | 1.07 |
| `foreground/10` | 1.34 | 1.20 |
| `tab-text-inactive/10` | 1.19 | 1.14 |

Picked `tab-text-inactive/10`: the strip's own text token, which `READABILITY_PAIRS` already holds at 4.5:1 on `tabBar` (`theme-builder.logic.ts:119`), so its tint stays visible on user themes too. Lavender's current hover (1.07) also misses the 1.1 bar, so Lavender's hover changes too (slightly stronger), contrary to the Issue's "Lavender Haze is unaffected".

## Plan

1. Tests first: (a) `contrastRatio(tabBar, editorBg) <= 1.5` per built-in theme (Default 2.08 today, fails); (b) `flatten(alpha(tabTextInactive, '1a'), tabBar)` vs `tabBar` >= 1.1 (Tailwind `/10` is 10% alpha; `1a` is 0.102). EditorTabs: an inactive tab's class contains `hover:bg-tab-text-inactive/10` and not `hover:bg-muted/30` (fails today).
2. Implement the three source edits; move the three pinned `#5a5c79` assertions and the snapshot to `#21222e`.
3. Targeted checks: `pnpm check`, the five test files above, `theme-css-contract.test.ts`.

## Prior art

`theme-builder.logic.test.ts:239` ("holds for every pair in every built-in theme") for the loop over `BUILTIN_THEMES`; `EditorTabs.test.ts:541` describe block for mounting tabs.

## Risks

- `--tab-bar` backs ten pane header bands, the resize handle gradient and the tab fades (Issue item 3); all get darker on Default. No by-eye check is possible in this run (no app launched); the commit says so.
- `e2e/specs/rail-styles.spec.ts:76` selects `.bg-tab-bar` by class only; no selector changes, so no E2E run.
