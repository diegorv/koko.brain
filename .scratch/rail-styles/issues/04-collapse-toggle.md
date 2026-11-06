# 04: Collapse toggle and Settings switch

**What to build:** the third form, its toggle next to the traffic lights and its switch in Settings. PRD § Collapsed and § Toggle hold the values. The look is the prototype's `rowSmall` form and its `data-rail-collapse` button.

- **Setting:** `railCollapsed: false` in the layout defaults and `LayoutSettings`. `parseRailCollapsed(saved: unknown)` in `rail-items.logic.ts`: only the boolean `true` collapses. `railFormWidth` takes it into account and gives 48.
- **`Rail.svelte`:** collapsed form with `data-rail-form="collapsed"`, 48 px, 16 px colored icons, `p-2`, no titles, native tooltip only, through the same row snippet: hooks, focus ring, tint, colors, busy mark and scroll as the others. The Inbox badge sits absolutely on the button at 11 px (`text-label`). No resize handle. Collapsing keeps `railStyle` and `railWidth`, and expanding returns to them.
- **Toggle:** in `Rail.svelte`, outside the `nav` so it never scrolls: `PanelLeft` at `size-3.5` in a `size-6` button, same classes as the right sidebar toggle (`AppShell.svelte:190`), `fixed` at `left: 88px; top: 7px`, above the handle, `data-rail-collapse`. `title` and `aria-label` are "Collapse rail" or "Expand rail". In every form, so a second click undoes the first. No new keybinding, and Cmd+Shift+B stays "Toggle Rail Panels".
- **Header pad:** collapsed gives 72 px, so header text starts at 120 px, 8 px past the toggle.
- **Note list header:** collapsed at 1440 px with the default list size, the sort arrow touches the search icon in `RailNoteList.svelte`'s header. Fix it by hiding `[data-note-list-count]` through a container query when the header is narrow (the header already has `@container`).
- **`LayoutSection.svelte`:** a `SettingItem` "Collapse rail" with a `Switch` under the style picker, no new `h3`. Description: "Show the small rail with colored icons. The toggle next to the window controls does the same."
- **`e2e/specs/focus-ring.spec.ts:61`** clicks the center of `[data-rail] [data-tauri-drag-region]` to start tabbing. At 192 px that point is under the toggle, so Playwright's click fails on the intercepting element. Click a `position` near the strip's left end, keeping the test's intent.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/focus-ring.spec.ts e2e/specs/vault-mods.spec.ts e2e/specs/rail-list-toolbar.spec.ts`.

- [ ] Failing tests were written first and seen failing, for each item below.
- [ ] `parseRailCollapsed`: `true`, `false`, `"true"`, `1`, `null`. `railFormWidth` gives 48 for each style when collapsed. `railHeaderPad(48)` is 72.
- [ ] `mergeLayout` keeps `railCollapsed` from a saved file, and an old file gets `false`.
- [ ] `Rail.test.ts`'s form-independent cases from Issue 03 run against all three forms, including the Inbox badge hidden by `railInboxBadge: false` and the actions block's placement and removal.
- [ ] `Rail.test.ts` covers a registered action in collapsed: `[data-rail-actions] [aria-label="Tasks"]`, no `[data-rail-title]`, `run` on click, `onSelect` not called, no `aria-current`, no tint.
- [ ] `Rail.test.ts`: the toggle is outside `[data-rail]`, its label follows the real store, a click flips `railCollapsed` in the real store and leaves `railStyle` and `railWidth` alone.
- [ ] `LayoutSection.test.ts`: the switch follows and writes the real store; its existing heading list passes unchanged.
- [ ] E2E: from labeled and from captioned, collapsing gives 48 px and expanding returns to that style and, for labeled, to the dragged width; the toggle's bounding box is identical before and after, and a second click undoes the first; a restart from the saved file (`restartWithSettings` in `e2e/specs/rail-shell.spec.ts`) opens collapsed.
- [ ] E2E, in collapsed: with a real mod loaded, clicking `[data-rail-actions] [aria-label="<title>"]` opens the picker and shows the mod's action.
- [ ] E2E: toggle stays at left 88 and top 7 in every form; its bottom is above the 40 px where the rail's edge starts; it never overlaps the rail's edge (in captioned and collapsed its left is past the rail's right edge); header text starts past the toggle's right edge in every form and with the navigator open.
- [ ] E2E: with the panels hidden (Cmd+1), the editor tabs start past the toggle in collapsed and captioned.
- [ ] E2E: collapsed at 1440 px with the default list size, the sort trigger and the search icon in the note list header do not overlap.
- [ ] E2E, in collapsed: divider contrast of at least 1.5 on Lavender Haze and the default dark theme, and the 600 px height case from Issue 01.
- [ ] `e2e/specs/sidebars.spec.ts` and the Cmd+Shift+B test in `rail-shell.spec.ts` pass unchanged.

## Notes

- The traffic lights exist only in Tauri. E2E proves the toggle's position, not its look beside them; the owner checks that after Issue 06.

## Comments
