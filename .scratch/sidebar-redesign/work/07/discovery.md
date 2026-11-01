# Issue 07 discovery: rail shell with the Inbox lens

No `spec.md`; the source is `PRD.md` (Layout, Rail, Lenses, Code placement, Rollout 1) and ADR 0033.

## Files that change
- `core/settings/settings.types.ts:47-71`, `settings.store.svelte.ts:52-63`: `LayoutShell = 'classic' | 'rail'`,
  `layout.shell` (default `classic`), `layout.noteListSize` (rail note list pane, default 22). The loader already
  spreads `parsed.layout` over the defaults (`settings.service.ts:79-82`), so old files load as Classic.
- `core/settings/sections/GeneralSection.svelte`: a "Layout" select (Classic / Rail) at the top of the Sidebar section.
- `features/type-definitions/inbox-workflow.logic.ts`: export `isInboxEntry`, used by `getInboxCount` (dock badge)
  and the Inbox lens, so the rail badge, dock badge and list share one predicate.
- NEW `features/rail-shell/lens.logic.ts`: `resolveLens(lens, ctx, providers)` -> `{ label, rule, notes }`; Inbox
  built in (system folder excluded via `excludeSystemFolder`, type definitions via the predicate, modified desc),
  other kinds looked up in registered providers. `noteSubtitle(entry, vaultPath)`: type (or "Note"), `noteDateKey`
  day (Issue 01 rule; entries carry seconds, the rule wants ms), vault-relative folder.
- NEW `features/rail-shell/rail-shell.types.ts` + `rail-registry.store.svelte.ts`: register/unregister navigators,
  lens providers and Today sections (each `register*` returns its unregister function).
- NEW `features/rail-shell/Rail.svelte` (48 px, `bg-background`, h-10 drag strip for the traffic lights, Inbox with
  badge, active highlight) and `RailNoteList.svelte` (header strip with label, rule line, `NoteRowMenu` + `NoteRow`
  in a VList, active-tab highlight, empty state).
- `features/note-list/NoteRow.svelte`: optional `subtitle` (replaces the date line) and `italic` props; the classic
  list passes neither, so it renders as before.
- `core/layout/AppShell.svelte:91-196`: `{#if shell === 'rail'}` Rail + note-list pane, `{:else}` the classic blocks
  unchanged (left toggle, traffic-light spacer, sidebar pane, middle pane, right symmetry spacer). Editor pane and
  right sidebar (with `isRightSidebarShown` auto-hide) are shared by both branches.

## Plan (test-first)
1. `lens.logic.test.ts` + `inbox-workflow.logic.test.ts`: label, rule, predicate, type defs / system folder excluded,
   badge count == list length, subtitle with note date, empty entries, unknown kind -> null, provider dispatch.
2. Registry store test (every getter, unregister, same id replaces).
3. Settings: `GeneralSection.test.ts` select writes `layout.shell`; `settings.service.test.ts` default + load.
4. `RailNoteList.test.ts` / `Rail.test.ts`: rendered rows, subtitle, italics, active row, empty state, badge, menu.
5. Boundary test: no file under `features/rail-shell` or `features/note-list` imports `#lib/plugins`.
6. E2E `e2e/specs/rail-shell.spec.ts`: switch to Rail in Settings, list shows inbox notes, click opens; rename,
   favorite, trash asserted on the virtual fs; Tasks tab hides the right sidebar; back to Classic shows the tree;
   settings.json carries `"shell": "rail"`.

## Prior art
`TypeNoteList.view.test.ts` (VList ResizeObserver shim, mocked fs services), `NoteRowMenu.test.ts` (menu helpers),
`note-action-bar.spec.ts` (virtual fs reads), `GeneralSection.test.ts`.

## Defaults taken
- Rail item and lens are local state for now (ticket 11 persists them); the rail ignores `leftSidebarVisible` and
  hides the classic left toggle (ticket 10 retargets Cmd+Shift+B).
- Registered navigators and Today sections are stored, not rendered yet: their consumers come with tickets 17/19/20.
  Registered lens providers are consulted by `resolveLens`.
- Inbox sort: modified, newest first (as the classic Inbox nav item), without the `_order` pins.
- The rail badge shows the count whether or not the dock badge setting is on.

## Risks
- Paneforge: the rail pane uses `order={1}` like the classic left pane; switching shells remounts the group's panes.
- Traffic lights (x 8, ~60 px wide) overflow the 48 px rail into the list header; the label is padded to clear them.
