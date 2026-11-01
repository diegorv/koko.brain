VERDICT: APPROVED

## Acceptance criteria

- [met] Keybinding tests for the three shortcuts in both shells — `src/tests/lib/core/keybindings/global-keybindings.test.ts` drives the real handlers against the real `settingsStore`: Cmd+Shift+B toggles `railPanelsVisible` in the rail shell and leaves `leftSidebarVisible` alone, and leaves the rail flag alone in classic; Cmd+1 / Cmd+2 hide and show in the rail shell (persisted payload asserted) and do nothing in classic (both flags unchanged in both directions). `layout.service.test.ts` covers `hideRailPanels` / `showRailPanels` / `toggleLeftSidebar` in both shells. The e2e `rail-shell.spec.ts` has one test per shell (lines 156 and 188); I ran it and both passed.
- [met] The hidden state persists across restarts — `layout.railPanelsVisible` lives in `LayoutSettings` (`settings.types.ts:62`, default `true` in `settings.store.svelte.ts:56`) and the loader spreads `parsed.layout` over the defaults (`settings.service.ts:79-82`). `settings.service.test.ts` checks that a missing key loads as `true` and a saved `false` comes back as `false`. The persistence tests read the written JSON, and the e2e polls `settings.json` for `false` and then `true`.
- [met] With the panels hidden the editor takes the space, and the macOS traffic lights still have room — `AppShell.svelte:135-153` renders the note-list pane and its handle only when `railPanelsVisible` is true. Otherwise it renders a 24 px spacer next to the 48 px rail. `trafficLightPosition` is x 8 (`tauri.conf.json:19`), so the three buttons end near x 62, and the tabs start at x 72. The e2e checks that the note list is gone, the rail is visible, the spacer is at x 48 and the tab is at x >= 72.
- [met] The shortcut list and help pages list the new bindings — `RESERVED_KEYBINDINGS` gains Cmd+1 / Cmd+2 (`keybindings.logic.ts:109-110`, tested in `keybindings.logic.test.ts`). `help/documentation/20-keyboard-shortcuts.md` covers them in the table, the "do nothing in Classic" note and the printable card (columns still aligned), and `01-getting-started.md:85` and `06-search-and-navigation.md:61` mention them too. The "Settings > Sidebar > Layout" path is real: `SettingsPanel.svelte:73` maps `sidebar` to `GeneralSection`, which holds the Layout select.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — only Tauri fs is mocked, and the stores and `keybindings.logic.ts` are real. Assertions read `settingsStore.layout.*` and the persisted JSON. The e2e checks rendered rows, the rail, the spacer box and the tab box. Happy path: hide, show and toggle. Empty case: the key is missing from old settings. The guard / no-op case: the classic shell, plus repeated hide and show. Load failures are already covered by `settings.service.test.ts`. No new store getter was added: the flag is a plain field read through the existing `layout` getter.
- [met] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme — the spacer uses only `bg-tab-bar`, `var(--divider)` and `bg-editor-bg`, the same tokens and structure as the classic traffic-light spacer (`AppShell.svelte:160-163`) and the right-sidebar header strip (`:217`). Those already render in every theme, and `src/app.css` defines all three. I did not check the themes by eye; see "Not verified".

## Findings

1. minor — `src/lib/core/layout/AppShell.svelte:130-133`: when the panels are hidden, clicking a rail item still changes `railItem` / `railLens`, but nothing visible happens. The rail highlight moves, the note list stays hidden, and the user may not connect this to Cmd+1. The Issue and PRD do not cover this. Fix: decide with the owner, then either call `showRailPanels()` in `onSelect` or record "rail clicks do not reveal" in the PRD decisions log. Not a blocker.
2. nit — `src/lib/core/keybindings/keybindings.logic.ts:109-110` vs `help/documentation/20-keyboard-shortcuts.md:17-18,132-133`: the conflict labels say "Hide/Show Navigator and Note List", but the help card says "Hide/Show Panels" and the table says "the panels between the rail and the editor". Fix: optionally use one name for the pair in both places.
3. nit — `src/lib/features/command-palette/command-palette.service.ts:200`: in the rail shell, the "Toggle Left Sidebar" palette command now toggles the rail panels, but its label does not say so. Only the help table explains it. Fix: optionally rename it or add a rail-aware label later (the classic shell is removed in Issue 25).

## Checks I ran (worktree HEAD 4f737b16)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/keybindings src/tests/lib/core/layout src/tests/lib/core/settings src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts src/tests/lib/features/command-palette src/tests/lib/features/rail-shell`: exit 0, 34 files and 680 tests passed. My test verdict rests on these files: `global-keybindings.test.ts`, `keybindings.logic.test.ts`, `layout.service.test.ts`, `settings.service.test.ts`, `settings.store.test.ts`, the command-palette and rail-shell suites, and `event-calendar-keys.logic.test.ts` (it reads the help docs).
- `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts`: exit 0, 9/9 passed, including both new tests.
- I did not run the full suite or `pnpm build`; deliver runs those.
- I checked for clashes: nothing else in `src/lib` binds Cmd+1 / Cmd+2 (CodeMirror, canvas and tab bar included), and `src-tauri` registers no native accelerator on them.

## Not verified

- How the spacer looks in each built-in theme. I only checked that it reuses tokens that already render in those themes.

## Resolution

1. Deferred to the owner, not changed. Whether a rail click should reveal hidden panels is a product decision the Issue and PRD leave open; the reviewer asks for an owner decision first, so neither `showRailPanels()` in `onSelect` nor a PRD decision entry was added here. Current behavior: a rail click while hidden changes the lens and the panels stay hidden until Cmd+2 or Cmd+Shift+B.
2. Fixed. The `RESERVED_KEYBINDINGS` labels for Cmd+1 / Cmd+2 are now "Hide Panels" / "Show Panels", matching the help card; `keybindings.logic.test.ts` asserts the new labels.
3. Not changed. The label is optional per the review, the help table documents the rail behavior, and the classic shell (and the reason for a dual label) is removed in Issue 25.
