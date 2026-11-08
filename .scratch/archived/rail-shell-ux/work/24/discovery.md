# Issue 24 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Builds on Issue 23 (`work/23`): `railItems` in `features/rail-shell/rail-items.logic.ts` is already the one list the rail and the Go to commands read, so nothing has to move out of `Rail.svelte` first.

## Files that change

- `core/settings/settings.types.ts:48-92`: `LayoutSettings` gains `railHidden`, `railOrder`, `railInboxBadge` (JSDoc: loaded unvalidated, read through the parse helpers); `SettingsSection` (:313) gains `rail`.
- `core/settings/settings.store.svelte.ts:52-67`: defaults `[]`, `[]`, `true`.
- `core/settings/settings.logic.ts:217-225`: `{ id: 'rail', label: 'Rail' }` after Sidebar.
- `features/rail-shell/rail-items.logic.ts`: `parseRailHidden`, `parseRailOrder`, `parseRailInboxBadge`; pure `arrangeRailGroups(groups: string[][], hidden, order): string[][]` (the rules); `railItems(navigators, pins, hidden = [], order = [])` applies it to the top, navigator and bottom groups (pins untouched); `moveRailItem(items, key, delta)` gives the full order of the listed items after a move.
- `features/rail-shell/lens.logic.ts:187-202`: `restoreRailItem(saved, navigators, neighbourhoodPath, hidden = [])`: a built-in or navigator key in `hidden` (not Search, not Today) falls back to Today. Pins and Neighbourhood are not hideable, so they ignore it.
- `features/rail-shell/Rail.svelte:55-58,90`: pass parsed hidden/order; badge only while `parseRailInboxBadge(...)`.
- `app/commands.ts:55-63`: `railGoToCommands` passes the same parsed lists.
- `app/AppShell.svelte:103`: passes `parseRailHidden(settingsStore.layout.railHidden)`.
- New `features/rail-shell/RailSection.svelte`; `app/SettingsPanel.svelte` imports it, `sectionIcons.rail = PanelLeftDashed`, `sectionComponents.rail`.
- Docs: ADR 0033 amendment, help 19 (groups line + a Rail section).

## Tests (prior art)

- `settings.logic.test.ts` (`mergeLayout` keeps the keys), `settings.service.test.ts:575-660` (defaults fill + round trip + hand-edited values).
- `rail-items.logic.test.ts`: parse helpers, one case per arrange rule, `railItems` with hidden/order, `moveRailItem`.
- `lens.logic.test.ts:836`: `restoreRailItem` with hidden.
- `Rail.test.ts`: hidden item not rendered, order applied, badge switch (real settings store).
- `commands.test.ts:473`: Go to commands skip a hidden item and follow the order.
- New `RailSection.test.ts` (mount like `GeneralSection.test.ts`): rows per group, no switch for Search/Today, no move for Search, switch and move write layout, a mounted `Rail` follows.
- `calendar-rail.service.test.ts`: hiding `CALENDAR_RAIL_ITEM` drops the button/command, navigator and `day` provider stay registered.
- `SettingsPanel.test.ts` unchanged and green.

## Defaults / risks

- Move buttons: "Move <label> up/down", disabled at the group ends; Inbox's up is disabled (Search is fixed first). Switches carry `aria-label="Show <label>"`.
- A move writes every listed key (Search included, harmless since Search is forced first) as `railOrder`.
- The page shows labels only (no icons), so the icon map stays in `Rail.svelte`.
- `parseRailHidden` and `parseRailOrder` share one body (a string array); two names so each JSDoc names its key.
