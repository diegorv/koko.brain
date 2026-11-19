# 39 discovery

Line numbers are at `5741efb62` (12 has landed, so the kanban lines moved from the Issue's).

## Files that change

1. `src/lib/utils/color-presets.ts`: new `COLOR_PRESET_CHIP_TEXT` (`color-mix(in oklab, rgb(...) 30%, var(--editor-fg))`). Used by `KanbanCardText.svelte:34,43` and `KanbanTableView.svelte:66`; the chip `background` keeps `COLOR_PRESET_BG`, the swatches (`KanbanCard.svelte:292,323`) keep `COLOR_PRESET_TEXT`.
2. `CollectionLinearCalendarView.svelte:199` drops `text-white`; the `style` block (`:200-206`) gains `color: {barTextColor(getBarColor(event.colorValue))}`.
3. `rail-items.logic.ts`: new `railBadgeTextColor(color)` (black or white by `contrastRatio`, `var(--primary-foreground)` when unparseable). `Rail.svelte:396` drops `text-white`, adds `style:color`.

## Tests

- `src/tests/lib/utils/color-presets.test.ts`: parse each map value's rgb and share, `mixColors(rgb, ui.editorFg, 1 - share)`, check >= 4.5 on `flatten(COLOR_PRESET_BG[tag], surface)` for surface = `ui.background` and each card preset over `muted`@30% over `editorBg`, on every `BUILTIN_THEMES` entry. Fails today: the map does not exist.
- `rail-items.logic.test.ts`: `#3b82f6` -> `#000000`, navy -> `#ffffff`, `var(--x)` -> `var(--primary-foreground)`. `Rail.test.ts:451-457` moves: no `text-white`, `style.color` is black.
- New `CollectionLinearCalendarView.svelte.test.ts` (mount pattern from `CollectionTableView.svelte.test.ts`): light `COLOR_PALETTE` bar has `color: #000000`, no-colour-property bar has `color: var(--primary-foreground)`.
- `KanbanView.test.ts` tag chips block: chip `style` has `color-mix` and `--editor-fg`; a swatch keeps the full `rgb(...)`.

## Risks and defaults

- Tailwind `/30` mixes in oklab with `transparent`; the tests composite in sRGB with `flatten` (same as the Issue's figures).
- jsdom keeps `color-mix` in a `style` attribute (`Rail.test.ts:53` already reads it); tests read the attribute.

## Scope

The owner split the Issue on 2026-11-18: items 4 and 5 (note list chips, archived rows, search snippet) and the theme-builder criterion moved to Issue 52. This Issue is items 1 to 3, built in the first run; the retry reuses those commits.
