# 03: Captioned style and the Settings picker

**What to build:** the second form and the control that picks it. PRD § Captioned holds the values: 84 px rail, 72 px buttons, 20 px icon above the title, `gap-1.5`, `py-2.5`, dividers but no section titles. The owner rejected a tighter version, so keep these spacings. The look is the prototype's `rowB` form.

- **Setting:** `railStyle: 'labeled'` in the layout defaults and `LayoutSettings`. In `rail-items.logic.ts`: `RAIL_STYLES` (key, name, description), `parseRailStyle(saved: unknown)` (only `'captioned'` gives captioned, anything else `labeled`), and `railFormWidth`, the rail's width in px for a style and saved width (84 for captioned). The labeled description is "Titles, sections and counts; drag the edge to resize"; the captioned one is "A caption under each icon".
- **`Rail.svelte`:** draw the same data through the one row snippet from Issue 01, with the classes of the form, and `data-rail-form="captioned"`. Same hooks, same focus ring, same tint, same colors, same busy mark, whole-rail scroll. Titles use `text-rail`, so both forms match. Long names truncate, with the full name in `title`. The Inbox badge sits absolutely on the button at 11 px (`text-label`). No resize handle in this form.
- **Header pad:** `AppShell.svelte` computes `--rail-header-pad` through `railHeaderPad(railFormWidth(...))`.
- **`LayoutSection.svelte`:** a `SettingItem` "Rail style" with one `Button` per style (`data-rail-style-picker`, `aria-pressed`), above the "Rail top" group, with no new `h3`. Its first `h3` now has rows above it, so all of them take the top margin. Writes `updateLayout({ railStyle })`.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/focus-ring.spec.ts e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests were written first and seen failing, for each item below.
- [ ] `parseRailStyle`: `labeled`, `captioned`, the prototype's `A` and `B`, a number, `null`. `railFormWidth` for both styles. `railHeaderPad` of the captioned width is 36.
- [ ] `mergeLayout` keeps `railStyle` from a saved file, and an old file gets `labeled`.
- [ ] `Rail.test.ts` runs its form-independent cases against both forms (`describe.each`): hooks, divider token, tint, active title class, focus ring, whole-rail scroll, pin behavior, busy mark.
- [ ] `Rail.test.ts` covers a registered action in captioned: `[data-rail-actions] [aria-label="Tasks"]`, the title shown, `run` on click, `onSelect` not called, no `aria-current`, no tint.
- [ ] `Rail.test.ts`: captioned has no `[data-rail-section-title]` and no `[data-rail-resize]`, and a saved `railWidth` of 300 does not change its width.
- [ ] `LayoutSection.test.ts`: the picker shows both styles, `aria-pressed` follows the real store, a click writes the real store, and its existing heading list passes unchanged.
- [ ] E2E: picked through Settings > Layout, the rail is 84 px, the buttons 72 px; the file on the mock FS holds `railStyle`; a restart from that saved file (`restartWithSettings` in `e2e/specs/rail-shell.spec.ts`) opens captioned; a hand-edited unknown value opens labeled.
- [ ] E2E: title font family, size, weight and letter spacing are equal in labeled and captioned, idle and active; every built-in caption fits with no truncation.
- [ ] E2E, in captioned: header clearance, divider contrast of at least 1.5 and active title contrast of at least 4.5 on Lavender Haze and the default dark theme, and the 600 px height case from Issue 01.

## Notes

- `git diff main...scratch/testes -- src/tests/lib/features/rail-shell/RailPrototypeVariant.test.ts` shows the form cases; move them into `Rail.test.ts`, not into a file named for the prototype.

## Comments
