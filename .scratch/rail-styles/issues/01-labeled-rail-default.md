# 01: Labeled rail as the default at a fixed 192 px

**What to build:** replace the 48 px icon rail with the labeled rail at a fixed 192 px, for every vault, with no setting yet. PRD § All forms, § Labeled, § Type and § Header clearance hold the values. The look comes from the prototype's labeled form (`git show scratch/testes:src/lib/features/rail-shell/RailPrototypeVariant.svelte`, the `railPrototype.style === 'A'` branch, and the snippets `dragStrip`, `edge` and `icon`). Rewrite it in `Rail.svelte`; do not add the prototype's files.

Line numbers below were read at `6abe2f2db`; check them, main keeps moving.

- **Pure logic in `rail-items.logic.ts`:** the palette and `railItemColor(key)` (a built-in key gives its color, any other key, such as another registered navigator, gives `#0ea5e9`), the pin fallback `#0ea5e9`, the action color `#d946ef`, a `RAIL_WIDTH` constant with `default: 192`, and `railHeaderPad(railWidth)` returning `Math.max(12, 120 - railWidth)`.
- **`Rail.svelte`:** keeps its data (`items`, `showsInboxBadge`, `inboxCount`, `BUILT_IN_ICONS`, `actionIcon`) and draws one form for now, with `data-rail-form="labeled"` on the `nav`. Later Issues add forms to this file, so flatten items, pins and actions into one row shape with a color (the prototype's `Row`) and draw them through one row snippet, instead of a copy per group. Do not create a second component to delegate to unless the file calls for it.
- **Frame and strip:** a `relative flex shrink-0` frame with `style:width`, holding the `nav`, then a `pointer-events-none absolute top-10 right-0 bottom-0 w-px bg-file-explorer-border` edge with `data-rail-edge`. The sticky strip is the `nav`'s first child, `data-rail-strip`, `data-tauri-drag-region`. Remove the `nav`'s `border-r`.
- **Rows:** `data-rail-title` on the title span, `data-rail-section-title="<text>"` on the section titles. The Workspace and Browse titles are children of the `nav`; the Pinned and Actions titles are inside `data-rail-pinned` and `data-rail-actions`, so the divider and the group stay siblings as main has them.
- **Busy mark on action rows.** Keep `aria-busy={busy || undefined}` and `[data-rail-busy]` from main. The prototype predates them. The button needs `relative` for the dot.
- **Inbox pill:** only when `showsInboxBadge`, right-aligned, `text-label`, `tabular-nums`, `text-white`, background the item color, `data-rail-badge`. With no `text-[10px]` left in `Rail.svelte`, delete its entry from `BELOW_FLOOR` in `src/tests/lib/chrome-type-scale.test.ts` (it only tightens the rule).
- **Text role:** add `rail` to `@theme` in `src/app.css` (with a line in the comment above the roles) and to `TEXT_ROLES` in `src/lib/utils/text-roles.ts`. Titles use `text-rail`, plus `font-medium` when active.
- **Header clearance:** `AppShell.svelte` sets `style:--rail-header-pad="{railHeaderPad(RAIL_WIDTH.default)}px"` on its root `div`. Replace `pl-6` in `RailNoteList.svelte:709`, `SearchPanel.svelte`, `FilesNavigator.svelte`, `TypesNavigator.svelte` and `CalendarNavigator.svelte:88` with `pl-[var(--rail-header-pad)]`, and the spacer's `w-6` at `AppShell.svelte:254` with `w-[var(--rail-header-pad)]`. Replace the comments that say "48 px".
- **Default pane sizes:** at 1440 px the panes share what the rail leaves, 1248 px, so the editor gets `1248 * (100 - navigator - list - right) / 100`. Start at `navigatorSize: 13`, `noteListSize: 18`, `rightSidebarSize: 20`, which computes to about 611 px, and adjust only if `e2e/specs/sidebars.spec.ts` says so. Do not edit that spec or lower the 600. Update the comment at `settings.store.svelte.ts:67-68`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/sidebars.spec.ts e2e/specs/focus-ring.spec.ts e2e/specs/vault-mods.spec.ts e2e/specs/rail-list-toolbar.spec.ts e2e/specs/file-explorer.spec.ts e2e/specs/file-operations.spec.ts`.

- [ ] Failing tests were written first and seen failing, for each item below.
- [ ] `rail-items.logic.test.ts`: `railItemColor` for every built-in key and an unknown key; `railHeaderPad` at 48, 84, 108, 140 and 192 px.
- [ ] `Rail.test.ts` adapted from `git diff main...scratch/testes -- src/tests/lib/features/rail-shell/Rail.test.ts`, keeping every case's intent and deleting none. Assertions that named a prototype or old class assert the approved look instead: divider token `bg-file-explorer-fg/25`, active tint, whole-rail scroll with every `nav` child `shrink-0`.
- [ ] Every "not highlighted" check asserts the tint too (the prototype's `tinted()`), since `.not.toContain('bg-file-explorer-primary/25')` can no longer fail.
- [ ] `Rail.test.ts` asserts the focus ring classes on an item, a pin and an action row.
- [ ] `Rail.test.ts` covers a registered action in this form: found through `[data-rail-actions] [aria-label="Tasks"]`, `data-rail-item` and `title` set, no `aria-current`, no tint, `Puzzle` fallback, `run` called on click and `onSelect` not called. The two busy cases from Issue 06 pass unchanged.
- [ ] `Rail.test.ts`: the Browse, Pinned and Actions titles disappear with their group, so no title shows alone.
- [ ] `RailNoteList.test.ts`, `SearchPanel.test.ts` and `AppShell.test.ts` assert the new header class only as the first pane. `AppShell.test.ts` also asserts the root's `--rail-header-pad` value.
- [ ] Settings default test covers the new `navigatorSize` and `noteListSize`.
- [ ] `layer-rules.test.ts`, `chrome-type-scale.test.ts` and `text-roles.test.ts` pass, with no baseline entry added.
- [ ] `e2e/specs/sidebars.spec.ts` passes with no edit to the file.
- [ ] `e2e/specs/rail-shell.spec.ts:296-298` asserts the spacer starts at the rail's right edge and the tab starts past the spacer, without naming 48 or 72.
- [ ] `e2e/specs/focus-ring.spec.ts` passes.
- [ ] New `e2e/specs/rail-styles.spec.ts`, for this form: rail is 192 px; the four section titles show (Actions with a mod loaded); the header text in the strip beside the rail starts past the rail; the top strip matches the neighbouring header's background and the edge starts at 40 px and is 1 px wide; the `nav` and the strip have a 0 px right border.
- [ ] Same spec: with a real mod loaded, clicking `[data-rail-actions] [aria-label="<title>"]` opens the picker and shows the mod's action.
- [ ] Same spec, on Lavender Haze and the default dark theme, measured by compositing through a canvas: divider contrast of at least 1.5, and active title contrast of at least 4.5 for Inbox, Today, Favorites, Types, Calendar, Files and Archive.
- [ ] Same spec, at 600 px height with 2 pins and 5 mod buttons: the rail scrolls, Archive is reachable, pins keep their height, strip and edge stay put, `scrollbarWidth` is `none`, `offsetWidth - clientWidth` is 0, and there is no sideways scroll. The prototype spec's `mod rail buttons` block shows how to load the mod.
- [ ] `rail-prototype.svelte.ts`, `RailPrototypeVariant.svelte` and `prototype-rail.spec.ts` are not on the branch.

## Notes

- `AppShell.test.ts` mounts with real stores; the header class alone proves nothing about clearance, so the E2E measures it.
- The WebKit `::-webkit-scrollbar` rule can only be checked by class here, since E2E runs Chromium.
- This Issue removes the 48 px form on main. Issue 04 brings it back as Collapsed.

## Comments
