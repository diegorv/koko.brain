# Issue 23 discovery: the rail shell becomes the default

No `spec.md`; the source is `PRD.md` (Rollout step 3, Risks: Width, Q22) and ADR 0033. Blocker
`.scratch/sidebar-fixes/issues/08` says `**Status:** resolved` on main.

## Files that change
- `core/settings/settings.types.ts:54-110`: `LayoutSettings.railMigrated: boolean` (the one-time
  Classic-to-Rail move has run). Dropped with `layout.shell` in the contract ticket.
- `core/settings/settings.store.svelte.ts:53-73`: default `shell: 'rail'`, `railMigrated: true`, pane sizes
  re-checked (`noteListSize`, `navigatorSize`, `rightSidebarSize`).
- `core/settings/settings.logic.ts`: pure `migrateShellToRail(layout, savedLayout)`: a saved layout
  without `railMigrated: true` gets `shell: 'rail'`, `railMigrated: true`; otherwise untouched.
- `core/settings/settings.service.ts:79-82` (`loadSettings`): applies it to the merged layout.
- E2E: `e2e/fixtures/test-vault.ts` gains a `shell` option (default `classic`, so the specs that drive
  the classic tree keep running until the contract ticket); the test vault settings, `live-preview.ts`
  and `queryjs-basic.spec.ts` pin `shell: 'classic', railMigrated: true`. `sidebars`, `file-explorer`,
  `calendar-plugin` and `search` specs `test.use({ shell: 'rail' })` and drive the rail.
  `rail-shell.spec.ts` gains the 1440 px width check.
- Help: `02-file-explorer.md`, `25-types-and-relationships.md`, `27-calendar.md` (+ `08` where it names
  the sidebar calendar) describe the rail shell; the classic shell is a Settings > Sidebar > Layout option.
- ADR 0033 -> `active`, code citations to shipped files; ADR 0026 dated amendment; `docs/adr/README.md`.

## Plan (test-first)
1. `settings.logic.test.ts`: migrate (no marker, marker false, non-object), keep Classic with marker,
   keep Rail. `settings.service.test.ts`: fresh install -> rail; classic file migrates once; reload after a
   switch back stays classic; corrupt file -> rail. Then flip the defaults and fix tests that assumed classic.
2. Measure the editor at 1440 px (E2E, every panel open), choose sizes, assert a floor in the spec.
3. E2E fixture option + specs; help pages; ADRs.

## Defaults taken
- Existing saved pane sizes are kept (only the defaults change): migration moves the shell only.
- The four named specs move to rail; the rest of the E2E suite stays pinned to classic, which still ships.
- The 1440 px floor in the spec: editor pane >= 600 px with navigator, note list and right sidebar open.

## Risks
- Unit tests that relied on the classic default through `DEFAULT_SETTINGS` (AppShell-adjacent, keybindings,
  open-search) may now take rail branches; each gets an explicit `shell` where it meant classic.
