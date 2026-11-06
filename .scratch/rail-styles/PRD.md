# Rail styles

The rail stops being a 48 px column of monochrome icons, where an item can only be identified through its tooltip. It gets titles, sections and one color per item, in three forms the owner picks between per vault. ADR-0033's rail stays: every pick is still a lens, and the flat structure and hooks stay.

## Source of truth for the look

The owner judged a throwaway prototype in the real app: local branch `scratch/testes`, tip `0a998c9b`, worktree `.worktrees/scratch-testes`, not pushed. Read it, never merge or cherry-pick it:

```
git show scratch/testes:src/lib/features/rail-shell/RailPrototypeVariant.svelte
git show scratch/testes:src/lib/features/rail-shell/rail-prototype.svelte.ts
git show scratch/testes:e2e/specs/prototype-rail.spec.ts
git diff main...scratch/testes -- src/tests
git log --format=%B main..scratch/testes
```

It is a primary source for look and behavior, not code to copy. It ignores the store, service and logic split. `rail-prototype.svelte.ts`, `RailPrototypeVariant.svelte` and `e2e/specs/prototype-rail.spec.ts` must not reach main. Its commit messages record why each choice was made.

**The prototype predates vault-mods Issue 06.** Main's action button has `aria-busy` and a `[data-rail-busy]` mark, read from `action.busy?.()` (`src/lib/features/rail-shell/Rail.svelte`, `snippet actionButton`). The prototype does not. Every form keeps them.

## Decisions

These are made. Do not reopen them or turn them into open questions.

1. **Three forms.** Labeled is the default. Captioned and Collapse rail are options in Settings > Layout. A toggle next to the traffic lights also collapses and expands.
2. **Saved per vault.** Style, collapsed state and width go in `layout.*` in the vault's `.kokobrain/settings.json`, not in localStorage.
3. **Icon colors are the prototype's palette**, one color per built-in item and the same on every theme. Customizing them in Settings > Appearance is Issue 07, not built here.
4. **The whole rail scrolls when items do not fit**, in every form, and the scrollbar never shows. This reverses the ADR-0033 rule that only the pins scroll.
5. **The editor keeps its 600 px floor.** Labeled at 192 px with the old defaults left the editor at 575 px at 1440 px with Types and the right sidebar open. The default navigator and note list sizes go down until `e2e/specs/sidebars.spec.ts` passes unchanged. The 600 does not go down.
6. **A mod chooses its own icon color**, one value for light themes and one for dark, fixed per mod, not per button, declared in `manifest.json`.

## Behavior

### Settings

| Key | Default | Read through | Rule |
|---|---|---|---|
| `layout.railStyle` | `labeled` | `parseRailStyle` | `labeled` or `captioned`; anything else reads as `labeled` |
| `layout.railCollapsed` | `false` | `parseRailCollapsed` | collapsed only for the boolean `true` |
| `layout.railWidth` | `192` | `parseRailWidth` | a finite number, rounded and clamped to 140-320; anything else reads as `192` |

The parse functions live in `rail-items.logic.ts` next to `parseRailInboxBadge`, because settings.json can be hand-edited. `mergeLayout` (`src/lib/core/settings/settings.logic.ts:17`) keeps only keys that have a default, so each key gets a default in `settings.store.svelte.ts` and a field in `settings.types.ts`.

**Width persistence.** `updateLayout` mutates the store and `settings-persistence.svelte.ts` re-serializes every setting on each mutation, then debounces the write by 500 ms. So a mid-drag pause would write to disk, and every pointer move would re-serialize. The drag keeps its live width in local state in `Rail.svelte` and calls `updateLayout({ railWidth })` once, when the drag ends.

### All forms

- **Hooks stay.** Main's flat structure and every hook: `data-rail`, `data-rail-item`, `data-rail-divider`, `data-rail-pinned-divider`, `data-rail-pinned`, `data-rail-actions-divider`, `data-rail-actions`, `data-rail-bottom`, plus `aria-label`, `title`, `aria-current`, `aria-busy` and `data-rail-busy` as main has them. Owner mods click `[data-rail-actions] [aria-label="Tasks"]`, so that selector works in every form.
- **Focus ring.** Every rail button has main's `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset`. The prototype lost it by mistake.
- **Whole-rail scroll.** The `nav` has `overflow-y-auto`, `overflow-x-hidden`, `[scrollbar-width:none]` and `[&::-webkit-scrollbar]:hidden` (Tauri runs WebKit on macOS). Every child is `shrink-0`, the pinned group included. Archive scrolls with the rest and keeps `mt-auto`.
- **Top strip.** `h-10`, `bg-tab-bar`, the same `inset 0 -1px 0 var(--divider)` shadow as the neighbouring headers, `data-tauri-drag-region`, sticky at the top so icons never pass under the traffic lights. The rail's right edge starts below it. The edge and the resize handle live in a frame around the `nav`, so they do not scroll.
- **Colors by item.** Search `#64748b`, Inbox `#3b82f6`, Today `#f97316`, Favorites `#eab308`, Types `#8b5cf6`, Calendar `#f43f5e`, Files `#14b8a6`, Archive `#78716c`. Any other registered navigator uses `#0ea5e9`. A pin uses its resolved icon color, else `#0ea5e9`, and passes that color to `IconRenderer` as main does. A mod button uses `#d946ef` until it declares its own.
- **Active item.** 18% tint of its color through `color-mix(in oklch, <color> 18%, transparent)`, `aria-current="page"`, icon in the item color. Its title uses the full `text-file-explorer-fg`, never the item color: an item color on its own tint measured 1.53 to 3.42 on Lavender Haze, and the full text color measured 9.83 to 12.33 across both themes. Idle titles use `text-file-explorer-fg/85`.
- **Dividers** use `bg-file-explorer-fg/25`, not `bg-file-explorer-border`, which measured 1.07 contrast on the default dark theme.
- **Action buttons.** `action.run()` on click, never `onSelect`, never `aria-current`, never a highlight. `actionIcon` is main's unchanged, with `Puzzle` as the fallback.
- **Inbox badge** still obeys `parseRailInboxBadge`. Numeric badges are 11 px, the `label` text role.

### Labeled

Section titles Workspace, Browse, Pinned and Actions with the `section-label` utility; each group after the first follows a divider. Icon plus title on one line, 28 px rows, Inbox count as a pill on the right. The width drags from the right edge and a double-click returns it to 192. Native `dragstart` is blocked during the resize: as the rail shrinks, a draggable note row ends up under the pressed point and its native drag cancels the pointer.

### Captioned

84 px rail, 72 px buttons, 20 px icon above the title, `gap-1.5`, `py-2.5`, dividers but no section titles. Long names truncate with the full name in `title`. The owner rejected a tighter version, so these spacings stay.

### Collapsed

48 px, 16 px colored icons, `p-2`, no titles, native tooltip only. Collapsing keeps the chosen style, and expanding returns to it.

### Type

Row titles are 13 px with an 18 px line height, weight 500 when active, the same in labeled and captioned. The owner rejected 14 px as too big. No existing role in `src/app.css` has that size and the file says to use roles instead of `text-[Npx]`, so this adds a `rail` role (`--text-rail: 13px`, line height `calc(18 / 13)`) and lists it in `src/lib/utils/text-roles.ts`.

### Values by form

The prototype's values at `0a998c9b`, written here so a review can compare against them. The owner approved this spacing in the real app, so a change needs a reason from a failing test.

| | Labeled | Captioned | Collapsed |
|---|---|---|---|
| Frame width | saved width, 192 by default | `w-[84px]` | `w-12` |
| `nav` | `flex-col gap-0.5` | `flex-col items-center gap-1.5` | `flex-col items-center gap-1` |
| After the strip | `h-1.5` spacer | none | none |
| Section title | `section-label px-4 pb-0.5` | none | none |
| Row | `mx-2 flex h-7 items-center gap-2 rounded-md px-2` | `flex w-[72px] flex-col items-center gap-1.5 rounded-lg px-1 py-2.5` | `rounded-md p-2` |
| Icon | `size-4` | `size-5` | `size-4` |
| Title | `min-w-0 flex-1 truncate text-left` | `w-full truncate text-center` | none |
| Divider | `mx-2 my-2 h-px` | `my-1.5 h-px w-10` | `my-1 h-px w-6` |
| Pinned and actions groups | `flex-col gap-0.5` | `flex-col items-center gap-1.5` | `flex-col items-center gap-1` |
| Bottom group | `mt-auto flex-col gap-0.5 py-2` | `mt-auto flex-col items-center pt-1.5 pb-3` | `mt-auto flex-col items-center gap-1 pb-2` |
| Inbox badge | in the row, `rounded-full px-1.5` | `absolute top-1 right-3 rounded-full px-1` | `absolute -top-0.5 -right-0.5 rounded-full px-1` |

In every form: buttons are `cursor-default`, an idle row has `hover:bg-file-explorer-accent/60`, an active row has no hover color, the `nav` is `bg-background`, the strip is `z-10`, and a badge is `text-label tabular-nums text-white` on the item color. The resize handle has `transition-colors hover:bg-file-explorer-primary/40`, and the toggle is `z-40`.

### Toggle

`PanelLeft` at `size-3.5` in a `size-6` button, styled like the right sidebar toggle in `AppShell.svelte`, fixed at `left: 88px; top: 7px` in every form, so a second click always undoes the first. 88 px puts it past the captioned rail's edge and clear of the traffic lights. Its label is "Collapse rail" or "Expand rail". It is not Cmd+Shift+B, "Toggle Rail Panels", which hides the panels and not the rail. No new keybinding.

### Header clearance

The five `pl-6` headers (`RailNoteList`, `SearchPanel`, `FilesNavigator`, `TypesNavigator`, `CalendarNavigator`) and the panels-hidden spacer in `AppShell.svelte` clear the lights and the toggle at any rail width, through one CSS variable, `--rail-header-pad`, equal to `max(12px, 120px - railWidth)`. `AppShell.svelte` sets it as an inline style on its root from a pure `railHeaderPad` in `rail-items.logic.ts`, and the headers read it by class. A CSS variable carries no import, so `CalendarNavigator` in `plugins/` adds no layer violation, and no `document.documentElement` write is needed.

### Settings > Layout

A style picker (Labeled, Captioned) and a "Collapse rail" switch above the existing "Rail top" group, with no new `h3`, because `LayoutSection.test.ts` lists the headings.

### Mod color

An optional `color: { light, dark }` in `manifest.json`, validated in `parseModManifest` with an error naming the field, both values required, hex only since it reaches inline styles. `RailAction` gets an optional color, `mods-host.service.ts` passes it for all of that mod's buttons, and the rail picks by `appliedThemeStore.isDark`, following a live theme change. `ModRailButtonV1` does not change. No `apiVersion` bump: the contract's rule is about `ModContextV1` members (`contract/mod-api.v1.ts:15-17`), `ModInfoV1` does not gain the color, and `parseModManifest` already ignored unknown keys.

## Known limits

- **Saved pane sizes win over the new defaults.** `onResize` writes `navigatorSize` and `noteListSize` to settings.json and `mergeLayout` keeps them, so a vault that already saved 14 and 20 keeps them and shows the editor at about 575 px at 1440 px with every panel open until the panes are dragged. The owner sets these; no migration.
- **E2E runs Chromium.** The WebKit scrollbar rule is checked by class only, and the traffic lights exist only in Tauri. The owner confirms the toggle and top strip in the real app after Issue 06.

## Issues

| # | Issue | Why here |
|---|---|---|
| 01 | Labeled rail as the default at a fixed 192 px | Everything visible except the options |
| 02 | Resizable width saved in `layout.railWidth` | Labeled only |
| 03 | Captioned style and the Settings picker | The first choice of form |
| 04 | Collapse toggle and Settings switch | Needs both styles to prove it keeps the style |
| 05 | Mod color from the manifest | Reads every form |
| 06 | Docs | Describes the final state |
| 07 | Future: icon colors in Settings > Appearance | Not launched |

They share `Rail.svelte`, so they run one at a time, in order, with explicit numbers. `e2e/specs/rail-styles.spec.ts` starts in 01 and grows with each Issue. The full E2E suite runs once, in the main session, after 06.
