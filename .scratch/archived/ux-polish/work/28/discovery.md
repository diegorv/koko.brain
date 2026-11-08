# Issue 28 discovery: Settings drawer chrome

## Already done by Issue 10 (ac69710df)

- `--status-bar-height: 2rem` exists in `src/app.css:187`; `StatusBar.svelte:9` already uses `h-(--status-bar-height)` and carries `data-status-bar`.
- `e2e/specs/settings.spec.ts:11-23` already asserts the panel bottom equals the status bar top (both sides, 0.5px). It is green on main, so the "fails today by 8px" part of that criterion is stale. Per the Issue Notes, reuse the variable and skip the app.css / StatusBar steps.

## Files that change

- `src/lib/app/SettingsPanel.svelte`
  - `:114-117` root: drop the inline `style`; add `bottom-(--status-bar-height) w-[min(820px,80vw)]` to the class. Shadow and `fly` unchanged.
  - `:122-132` nav: `py-5` becomes `pb-5`; header row becomes `flex h-14 shrink-0 items-center px-3` with only the `h2` (classes unchanged); the close `<button>` leaves the nav.
  - `:140-146` nav item: `aria-current={active ? 'page' : undefined}`; selected `bg-settings-hover-bg font-medium`, unselected `hover:bg-settings-hover-bg/60`; keep `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50` (and the existing `ring-inset`); remove `!bg-settings-hover-bg` and `bg-accent`.
  - `:151-156` content: wrap in `flex min-w-0 flex-1 flex-col`; first child `flex h-14 shrink-0 items-center justify-end px-4` holding the shadcn `Button` (`variant="ghost" size="icon-sm" aria-label="Close settings"`, `onclick` closes); `ScrollArea class="min-h-0 flex-1"`, inner div `max-w-3xl px-10 pb-8`.
- `src/tests/lib/app/SettingsPanel.test.ts`: new `describe` blocks, same mount setup as the type-scale block.

## Plan

1. Tests first (red): aria-current single + follows `setSection('editor')`; selected has `font-medium`, no `!` token, no `hover:bg-settings-hover-bg/60`, unselected have it; close button not in `nav`, `data-slot="button"`, click sets `isOpen` false; root has no inline `bottom` / `width`. Commit.
2. Implement in `SettingsPanel.svelte` (green). Commit.

## Prior-art tests

- `SettingsPanel.test.ts` "SettingsPanel type scale" block (real store, `mount` + `flushSync`).
- `e2e/specs/settings.spec.ts:11-23` (Issue 10) covers the bottom edge; no new E2E case needed.

## Risks

- Type-scale test reads `nav h2` and `nav button` with text; the h2 stays in nav and the close button has no text, so both stay green.
- E2E specs find nav items with `getByRole('button', { name })`; `aria-current` does not change the accessible name.
- jsdom computes no layout: the "same y" goal for the title is by construction (both columns start under an `h-14` band), not tested.

## Defaults taken

- Kept `focus-visible:ring-inset` on nav items (the Issue lists the focus classes to add, not to drop it; it keeps the ring inside the nav's overflow clip).
