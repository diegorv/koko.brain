# Verdict: Empty editor, zoom and status bar cluster (P97, P99, P176)

This is an adversarial check of `scout-sh-empty-zoom-status.md` against HEAD `ab143a411`. It was read-only. I opened every cited source and test line. I grepped every consumer of `hidesRightSidebar`, `isRightSidebarShown`, `rightSidebarVisible`, `data-right-sidebar`, `--status-bar-height` and `zoom.service` under `src`, `e2e` and `help`. I read the cited open-itens Issues, the neighbour scouts in this batch and `verdict-nl-empty-states.md`. I also read `mvp-claude:src/lib/app/AppShell.svelte` with `git show`, which changes no state.

## Proposals: still real?

| ID | Real | Verdict | Verified at |
|---|---|---|---|
| P97 | yes | **revise** | `EditorView.svelte:153-158`: a 40px drag strip and one `<p>` "Select a file to view its contents". `layout.logic.ts:24`: `hidesRightSidebar(null)` returns `false`, so `isRightSidebarShown(true, null)` is `true`, `AppShell.svelte:265` mounts the sidebar and `PropertiesView.svelte:157-158` prints "No file open". The review's "returns true" is the proposed state, not the current one, as the scout says. |
| P99 | yes | **revise** | `zoom.service.ts:1-30`: module `currentZoom`, no store, no persistence. `global-keybindings.ts:177-181` ignores the result. Zoom has no palette command, no `AppSettings` key and no `zoom` text in `src-tauri/src`. `capabilities/default.json:17` grants `allow-set-webview-zoom`. |
| P176 | yes | **keep, own ticket** | `app.css:212` sets `--status-bar-height: 2rem`. `StatusBar.svelte:9` uses `h-(--status-bar-height) ... text-xs`. `SaveStatus.svelte:16` has `animate-pulse`, and its two spans have no reserved width. `SettingsPanel.svelte:116` is the only other consumer of the token. `e2e/specs/settings.spec.ts:23` is the only place the value is encoded (`toBeCloseTo(32, 0)`). |

## Where the scout is wrong or incomplete

1. **P97 hides the Claude panel on `mvp-claude` with no tab open (missed live overlap).** On `mvp-claude` (PR #247, claude-code-integration Issue 03), `ClaudePanel` renders inside the same `{#if rightSidebarShown}` block (`mvp-claude:AppShell.svelte:278,290-292`). Issue 03 says the chat can run "with no notes, to work on the vault as a whole". After P97, opening the app with no tab hides the chat, which is the state where a vault-wide chat makes most sense. The chat is already hidden on canvas, kanban, Tags and Graph tabs on that branch, for the same reason. `layout.logic.ts:22` says every panel in the sidebar "covers notes only", and the Claude panel breaks that premise. This does not block P97 on `main`, because `claudeVisible` does not exist there. It is a merge decision for `mvp-claude` (owner question 1). Neither the scout nor the raw note found it.
2. **The `.txt` handoff from `verdict-nl-empty-states.md` was not picked up.** That verdict (Dropped, T2) hands this cluster an optional criterion. A non-binary, non-`.md` text file opens with `fileType` undefined (`editor.service.ts:186-189`), so every right-sidebar panel renders its note UI for it. Its one-line fix sits in the same function P97 rewrites. Two checks the handoff skipped:
   - (a) `layout.logic.test.ts:37-40` deliberately asserts that `.txt` "follows the setting". Flipping it changes a tested contract, just like the null case does.
   - (b) The rule must use `isMarkdownFile` (`fs.logic.ts:65-67`, which accepts `.md` and `.markdown`), not `isMarkdownNoteTab` (`.md` only). Otherwise a `.markdown` note loses its sidebar.
   - The TOC help (`help/documentation/16-table-of-contents.md:43`) describes a "Not available" state that no user can reach. If this criterion is taken, that page is rewritten in the same ticket.
   - I folded it into T1 as an owner-gated criterion (question 2).
3. **T2 bundles two unrelated changes.** P176 touches `app.css` and `SaveStatus.svelte` (CSS and one class). P99 adds a store, a component, a persisted key and startup wiring. They share no state and no component. Their only link is that the chip's offset reads `--status-bar-height`, and that works in either order. Splitting them keeps the low-risk CSS change apart from the persistence change, so each can be reviewed and reverted on its own. Final: three tickets.
4. **Mount the zoom chip in `AppOverlays.svelte`, not `AppShell.svelte`.** `AppShell.svelte:184-185` renders only `children` while no vault is open, so a chip mounted there never shows on the vault picker. The scout's own question 1 prefers per-machine zoom precisely because it applies on the picker. `AppOverlays.svelte` is mounted for both screens (`(app)/+layout.svelte:183`), already hosts the other overlays and has a test (`src/tests/lib/app/AppOverlays.test.ts`). This also removes P99 from the list of edits to `AppShell.svelte`, which T1, P98, P103 and P104 all touch.
5. **"Move `currentZoom` after the await" breaks key repeat.** The scout's design point 3 and criterion 3 ("a rejected `setZoom` leaves the module level unchanged") would make two quick presses of Cmd+= both read 1.0 before the first `setZoom` resolves. Both would then apply 1.1. Holding Cmd+= fires repeated keydowns, so this is the likely case, not a rare one. Today's assign-before-await steps correctly. The fix:
   - Keep the synchronous assignment.
   - Write `localStorage` and the store only after `setZoom` resolves.
   - On rejection, propagate the error and leave storage and the store unchanged.
   - A rejected IPC leaves the module level one step off the real webview until the next press. That glitch is rare, visible and recoverable, and it is not worth the extra code (global CLAUDE.md, section 2).
6. **One missed test.** `global-keybindings.test.ts` has three Cmd+B tests (`:588-618`). They all run with the note tab added in `beforeEach` (`:138-139`), so they keep passing. I checked them because the scout did not list them. `toc.service.ts:22-24` (`showTableOfContents`) is reached only from the note action bar (`EditorView.svelte:69`, which needs a tab), so it is not affected either.
7. **Help pages missing from T1.**
   - `help/documentation/07-sidebar-panels.md:13` and `03-editor.md:66` say Cmd+B and the toggle button show or hide the sidebar. Neither page says the sidebar and its toggle disappear on canvas, kanban, `.view`, Tags, Tasks, Graph and Calendar tabs, and, after this ticket, with no tab open. One sentence in `07-sidebar-panels.md` under "Opening and Closing the Sidebar" covers it.
   - `26-theming.md:168` (the old copy) was listed. These two were not.
8. **The `command` id on the Cmd+P binding contradicts its JSDoc.** `GlobalKeybinding.command` is documented as "Id of the palette command (`commands.ts`) whose label shows this shortcut" (`global-keybindings.ts:54`). No palette command for the palette exists. Adding `command: 'command-palette:toggle'` is still the simplest single-source option, and no test requires the id to exist in `commands.ts` (`global-keybindings.test.ts:761-779` iterates commands, not bindings). The JSDoc must be widened in the same change, or it goes stale.
9. **"New note" is Quick Capture.** Cmd+N calls `createNoteComposer()`. The palette labels it "Create Quick Capture Note" (`commands.ts:365-369`), and the help says "Create Quick Capture note" (`20-keyboard-shortcuts.md:41`). It writes to `_notes/YYYY/MM-MMM`, not to the lens folder like the note list's "New here" (see `scout-nl-header-creation.md:20,70`). "New note" is the prototype's label and fine as visible text. The row's `title` should say "Create a Quick Capture note" so it does not promise the lens folder.
10. **Use a toast for errors.** CLAUDE.md, Error Handling > Components: user-facing errors are shown by toast, not `console.error` alone. The hint is a component, so a rejected `createNoteComposer` gets `toast.error(...)` plus `error('EMPTY-EDITOR', ...)`. The scout left this open ("pick one").
11. **The save-width check must not depend on the separator.** The scout's `min-width` approach has to be tuned against the Modified width plus the divider pseudo-element (`StatusBar.svelte:24-33`). That divider appears only when an item precedes `SaveStatus`: Todoist sync, or a mod chip, which mods prepend to the right group (`help/documentation/mods/08-custom-ui.md:372,417`). The E2E vault has neither, so a tuned `min-width` can pass there and still shift with Todoist on. Two fixes, both measurement-free:
   - Stack both labels in one `inline-grid` cell inside the existing `inline-flex` span, with the inactive label `invisible` and `aria-hidden`. The divider stays a flex item outside the grid.
   - Or use a `rem` min-width checked by an E2E that has a preceding item.
   - The criterion below is behavioural, so either passes only if the edge truly holds still.
   - The E2E also needs a hook, `data-save-status`, on the span.
12. **Minor citation fixes.**
    - `app-lifecycle.service.ts` is at `src/lib/app/lifecycle/` (the scout gave a bare name). The deferral comment is at `:400-405` and the Step 9 call at `:532-543`.
    - P176 also has a real screenshot (`screens/landing-today-light.png`, cropped in the prototype at line 562), not only P97.
    - The E2E alias for the webview mock is confirmed (`vite.config.js:66`), so a zoom E2E could record `setZoom` calls through `e2e/mocks/tauri-webview-window.ts:38`.
13. **The boot pop-in now happens on every launch.** The right pane mounts only after the deferred daily note opens (Step 9), so PaneForge redistributes the panes at every launch, not only on Cmd+B. `handleRightSidebarResize` and its siblings (`AppShell.svelte:92-102`) write sizes on resize. Today's Cmd+B path already does this and the sizes come back from `defaultSize`, so I expect no drift. The existing guard `e2e/specs/sidebars.spec.ts:89-104` ("Default pane sizes") measures the right sidebar after boot, so it must stay green. It is named in T1's criteria.

Checked with no new finding:
- `layout.service.test.ts:140-161` and `commands.test.ts:513-525` are tab-less (`resetAll` at `:48-58`, `commands.test.ts:115-120`), as the scout says.
- `AppShell.test.ts:211-218` is the only tab-less right-sidebar test in that file. The other describes add a tab.
- `NoteActionBar.test.ts`, `EditorView.test.ts:241-253` and `toc.service.test.ts:39-43` all run with a tab or never mount the shell.
- e2e `rail-shell.spec.ts:328-356`, `event-calendar.spec.ts:115-125`, `note-action-bar.spec.ts:17-21` and `tasks-view.spec.ts:292` open a note first.
- `src` has no other `--status-bar-height` consumer, and no snapshot contains it.
- No ADR conflicts: ADR-0003 lists `zoom` and `status-bar` under `core/`. ADR-0005/0007 cover the getter store and the real-store tests. ADR-0028 confirms the composer webview shares `localStorage`, but it is a separate route (`src/routes/composer`) and does not run the `(app)` restore.
- `docs/agents/live-preview-rules.md` and `indexing-watcher-rules.md` do not apply: no decoration, save path or index is touched.

## Overlapping Issues

| Issue | Status (file) | Verdict |
|---|---|---|
| `open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md` | ready-for-agent | Not replaced here (nl-empty-states T1 replaces its EmptyState half). The P97 hint is a launcher with actions, not an empty state, and must not wait for that primitive. |
| `open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent | Not replaced. Its list does not include `PropertiesView` "No file open" (the raw note was wrong). It explicitly excludes "Not available". |
| `open-itens/issues/066-status-bar-note-count-follows-notes-created.md` | ready-for-agent | Not replaced. It covers `SearchStatus` data in the left group and does not share lines with T2. |
| `open-itens/issues/220-...`, `030-...` | wontfix, resolved | Not replaced. 030 is irrelevant while zoom stays out of `settings.json`. |
| `open-itens/issues/154-inline-title.md` | ready-for-agent | Not replaced. It edits the note branch of `EditorView.svelte` (`:92`), not the empty branch at `:153-158`. Rebase only. |
| `claude-code-integration/issues/03-claude-chat-panel.md` | ready-for-agent (code on `mvp-claude`) | **Dependency, not a replacement.** See finding 1 and owner question 1. |
| `finders-ux/issues/04-...` | resolved | Reference only. |

Nothing in open-itens is replaced by these three tickets.

Neighbours in this batch (shared files, no duplicates):
- **sh-tabs P98:** the toggle reserve in `EditorTabs`, which reads `hidesRightSidebar`. After T1 the toggle is absent with no tab, so the empty band at `EditorView.svelte:154` needs no reserve. That answers the open "check" in `scout-sh-tabs.md:94`.
- **sh-menus-settings P104 T4:** the all-hidden empty state in `AppShell.svelte:265-291`, plus per-panel helpers in `layout.service.ts` that must respect `hidesRightSidebar`. T1 only widens that rule.
- **sh-view-headers-entry P18:** may replace the strip div at `EditorView.svelte:154`. T1 replaces only the `<p>` and its wrapper at `:155-157`.
- **P36/P37 and sh-history P35:** add bindings to the same array in `global-keybindings.ts`. The conflicts are line-local.
- **nl-empty-states:** hands over the `.txt` case (finding 2).

## Tickets

Order: none required. T1, T2 and T3 share no file except the docs. T3's chip offset reads the token that T2 changes, and it is correct in either order.

### T1. The empty editor becomes a launch point and drops the empty right sidebar (P97, M)

**Touches:** `src/lib/core/layout/layout.logic.ts`, `src/lib/core/layout/layout.service.ts` (JSDoc), `src/lib/app/AppShell.svelte` (comment at `:188` only), `src/lib/app/EditorView.svelte:155-157`, new `src/lib/app/EmptyEditorHint.svelte`, `src/lib/app/global-keybindings.ts:52-67`, tests (`layout.logic.test.ts`, `layout.service.test.ts`, `commands.test.ts`, `AppShell.test.ts`, `global-keybindings.test.ts`, `EditorView.test.ts`, new `EmptyEditorHint.test.ts`), `e2e/specs/editor-empty-state.spec.ts`, and `help/documentation/26-theming.md:168`, `07-sidebar-panels.md:13`, `03-editor.md:66`. With question 2 answered yes, also `help/documentation/16-table-of-contents.md:41-43`.

**Blocked by:** none. Rebase on P98, P104 T4 or P18 if they land first.

**What to build:**
- `hidesRightSidebar(null)` returns `true`. Update its JSDoc to "the tab at `activeTabPath`, or no tab".
- Update the comments at `layout.service.ts:24-29` and `AppShell.svelte:188`.
- The persisted `rightSidebarVisible` is untouched. With no tab, Cmd+B, the palette "Toggle Right Sidebar" and the toggle button do nothing, and the toggle is not rendered, as on canvas or Tasks tabs.
- If question 2 is answered yes, `hidesRightSidebar` also returns `true` for any path whose file name is not `isMarkdownFile` (`.md` or `.markdown`). The virtual paths and the canvas, kanban and `.view` cases are then covered by that one rule. Simplify only if the existing cases stay green.
- Replace the `<p>` at `EditorView.svelte:156` with `<EmptyEditorHint />`. Keep the drag strip at `:154` and `bg-editor-empty-bg`.
- `EmptyEditorHint.svelte` lives in `src/lib/app/`, the composition root, so it adds no layer-baseline entry. It shows the heading "No note open" and the line "Pick one of these to start", then three `<button>` rows in this order:
  - Quick switcher: `quickSwitcherStore.open()`.
  - Command palette: `commandPaletteStore.open()`.
  - New note: `createNoteComposer()`, `title` "Create a Quick Capture note". A rejected call shows `toast.error` and logs with `error('EMPTY-EDITOR', ...)`.
- Each row shows `formatShortcut(shortcutFor(id))`. Add `command: 'command-palette:toggle'` to the Cmd+P binding at `:63-67`, and widen the `command` field JSDoc at `:54`, because this id is not a palette command.
- No recent-notes card.
- The PropertiesView "No file open" branch stays as defensive text. rs-properties tickets own that file.

**Acceptance criteria:**
- [ ] Failing test first, `layout.logic.test.ts`: `isRightSidebarShown(true, null)` and `(false, null)` are both `false`. This replaces `follows the setting when no tab is open` (`:48-51`) on purpose: the contract is flipped, not weakened, and the commit says so.
- [ ] `layout.service.test.ts`: `toggleRightSidebar()` with no tab leaves `rightSidebarVisible` unchanged and writes nothing, modelled on the Calendar case at `:163`. The two toggle tests at `:140-161` and `commands.test.ts:513-525` add a note tab first and still pass.
- [ ] `AppShell.test.ts`: with no tab and `rightSidebarVisible: true`, there is no `[data-right-sidebar]` and no button titled "Hide right sidebar". Adding a note tab brings both back, and `settingsStore.layout.rightSidebarVisible` is still `true`. The test at `:211-218` adds a note tab.
- [ ] `global-keybindings.test.ts`: `shortcutFor('command-palette:toggle')` equals `{ key: 'p', meta: true }` (it throws today). The "registers all 25" count is unchanged.
- [ ] New `src/tests/lib/app/EmptyEditorHint.test.ts`, with real `quickSwitcherStore` and `commandPaletteStore` and only `#lib/plugins/quick-capture/note-composer.service.js` mocked (a side-effect service):
  - It renders "No note open" and three buttons named Quick switcher, Command palette and New note, each showing `formatShortcut(shortcutFor(...))`.
  - The clicks set `quickSwitcherStore.isOpen` and `commandPaletteStore.isOpen` to `true` and call `createNoteComposer` once.
  - A rejected `createNoteComposer` does not throw.
- [ ] `EditorView.test.ts`: with no tab, the hint mounts and "Select a file to view its contents" is absent. With a note tab, the hint is absent.
- [ ] If question 2 is answered yes, in `layout.logic.test.ts`: `/vault/a.txt` hides the sidebar whatever the setting, replacing `:37-40` on purpose. `/vault/a.markdown` and `/vault/a.md` follow the setting, and `/vault/board.kanban/note.md` still follows it.
- [ ] E2E `editor-empty-state.spec.ts`:
  - After closing all tabs, the three rows are visible with ⌘O, ⌘P and ⌘N, and `[data-right-sidebar]` has count 0.
  - Clicking Quick switcher opens the switcher dialog.
  - Opening `Welcome.md` removes the hint and shows the sidebar.
  - `sidebars.spec.ts` "Default pane sizes" (`:89-104`) stays green.
- [ ] Help updated: the theming row copy, and one sentence in `07-sidebar-panels.md` saying the sidebar and its toggle hide with no note open and on canvas, kanban, `.view`, Tags, Tasks, Graph and Calendar tabs. With question 2 answered yes, the TOC "Non-Markdown Files" paragraph is updated too.
- [ ] `pnpm check`, `pnpm vitest run` and `bash scripts/e2e.sh` are green.

### T2. Calmer status bar: 24px, no pulse, a save slot that does not shift (P176, S)

**Touches:** `src/app.css:211-212`, `src/lib/core/status-bar/SaveStatus.svelte`, new `src/tests/lib/core/status-bar/SaveStatus.test.ts`, `e2e/specs/settings.spec.ts:23`, and one E2E (in `e2e/specs/word-count.spec.ts` or `editor.spec.ts`).

**Blocked by:** none.

**What to build:**
- Set `--status-bar-height` to `1.5rem` (24px). `SettingsPanel.svelte:116` follows the token on its own.
- Remove `animate-pulse` from the Modified icon. Keep the filled `Circle` versus `CircleCheck` distinction, and add no other animation.
- Give the save item a width that does not change between Saved and Modified. Recommended: a nested `inline-grid` stacking both labels, with the inactive one `invisible` and `aria-hidden="true"`, inside the existing `inline-flex` span so the bar's divider pseudo-element stays outside the grid. Alternative: a `rem` `min-width`, if the E2E below passes with an item before it.
- Add `data-save-status` to the span for the E2E.
- No tab or a virtual tab still renders nothing (owner question 4).
- No clickable items. The review defers them.

**Acceptance criteria:**
- [ ] Failing test first, `SaveStatus.test.ts` with the real `editorStore`: a dirty tab (`content !== savedContent`) renders "Modified" and no element with class `animate-pulse` (red today). Only the active label is exposed to assistive technology: the inactive one is `aria-hidden`, or absent. A saved tab renders "Saved". No tab and a virtual tab render nothing.
- [ ] E2E, failing first:
  - With a note open, `[data-status-bar]` has height 24 (±0.5).
  - The `x` and `width` of `[data-save-status]` are identical while Saved, after typing (Modified) and after the autosave (Saved again; `expect.poll` over the 2s debounce, `editor.service.ts:276-279`).
  - Run it once with Todoist sync's status item present if the E2E vault allows it. Otherwise say so in the PR, because the stacked-label approach does not depend on it.
- [ ] `settings.spec.ts:23` goes from 32 to 24, a requested value change and not a weakened check. The Settings panel still ends at the bar's top edge (same test).
- [ ] `pnpm check`, `pnpm vitest run` and `bash scripts/e2e.sh` are green. `help/documentation/03-editor.md:141-151` stays true. A taller mod chip can overflow a 24px bar. That limit is noted in `mods/08-custom-ui.md`'s status bar row (`:372`).

### T3. Zoom shows a chip and is remembered on this machine (P99, M)

**Touches:** `src/lib/core/zoom/zoom.service.ts`, new `src/lib/core/zoom/zoom.store.svelte.ts`, new `src/lib/core/zoom/ZoomChip.svelte`, `src/lib/app/AppOverlays.svelte` (mount), `src/routes/(app)/+layout.svelte:36` (restore call), tests (`zoom.service.test.ts`, new `zoom.store.test.ts`, new `ZoomChip.test.ts`, `AppOverlays.test.ts`), and `help/documentation/03-editor.md:157-165`.

**Blocked by:** none. This assumes owner question 3 is answered with `localStorage`. If the owner picks `settings.json`, the ticket grows by the settings type, merge, store and tests, and restore moves to `initializeVault` after `loadSettings` (`app-lifecycle.service.ts:210`). It then cannot apply on the vault picker.

**What to build:**
- `zoom.service.ts` keeps `ZOOM_LEVELS` and keeps the synchronous `currentZoom = factor` before the `await` (see finding 5).
- After `setZoom` resolves, the service:
  - writes `kokobrain:zoom` (or removes the key when the factor is 1.0);
  - sets `zoomStore.level`;
  - sets `chipVisible = true`;
  - (re)starts a 1500ms hide timer, which lives in the service.
- On rejection, the error propagates. Storage and the store are left unchanged, and the callers at `global-keybindings.ts:178-181` already log it.
- New `restoreZoom()`:
  - It reads the key in try/catch and accepts only a value in `ZOOM_LEVELS`.
  - On a valid value other than 1.0, it sets `currentZoom`, calls `setZoom` and sets `level` without showing the chip.
  - Anything else makes no call.
  - It is called next to `applyStoredTheme()` as `restoreZoom().catch((err) => error('ZOOM', ...))`.
- `zoom.store.svelte.ts` holds `level` and `chipVisible`, with getters only (ADR-0005).
- `ZoomChip.svelte` is mounted once in `AppOverlays.svelte`, so it works on the vault picker too:
  - It renders only while `chipVisible` is true.
  - It is a `<button aria-label="Reset zoom to 100%">` with a zoom icon and `Math.round(level * 100)%` in a `role="status"` / `aria-live="polite"` span.
  - It sits at `fixed right-3 bottom-[calc(var(--status-bar-height)+0.75rem)]`, uses `motion-reduce:transition-none`, and its click calls `resetZoom()` with a `.catch`.
  - The chip scales with the webview. That is accepted, and the prototype does the same.
- No palette commands for zoom.

**Acceptance criteria:**
- [ ] Failing test first, `zoom.service.test.ts` (jsdom, mocking only `@tauri-apps/api/webviewWindow`, `localStorage.clear()` in `beforeEach`):
  - After `zoomIn()`, `localStorage['kokobrain:zoom']` is `'1.1'`.
  - `restoreZoom()` with `'1.25'` stored calls `setZoom(1.25)` once, and a following `zoomIn()` calls `setZoom(1.5)`.
  - Stored `'abc'`, `'1.3'`, `'NaN'`, `'1'` or no key make no `setZoom` call, and the next `zoomIn()` goes to 1.1.
  - `resetZoom()` removes the key.
  - A `setZoom` that rejects propagates and leaves the stored key and `zoomStore.level` as they were.
  - Two `zoomIn()` calls started without awaiting the first end at 1.25, so key repeat does not lose a step.
- [ ] Fake timers, with the real `zoomStore` and real service: a change sets `level` and `chipVisible`. The chip hides after 1500ms. A second change at 1000ms keeps it visible until 2500ms. `restoreZoom()` never sets `chipVisible`.
- [ ] `ZoomChip.test.ts`:
  - It is not in the DOM before any change.
  - After one `zoomIn()` it shows "110%".
  - Its button's accessible name is "Reset zoom to 100%".
  - Clicking it calls the mocked `setZoom(1)` and then shows "100%".
- [ ] `AppOverlays.test.ts`: the chip appears after `zoomIn()` with no vault open.
- [ ] `pnpm check`, `pnpm vitest run` and `bash scripts/e2e.sh` are green. `help/documentation/03-editor.md` Zoom section says the level is remembered on this Mac and describes the chip.
- [ ] Not checked by tests (stated in the PR): WKWebView zoom after a real relaunch, the chip at 50% and 200%, and the composer window staying at 100%.

## Dropped

- **The T2 bundle (P176 + P99).** It is split into T2 and T3 (finding 3).
- **The criterion that the module level is unchanged on `setZoom` rejection.** It is replaced by the key-repeat test (finding 5).
- **Mounting the chip in `AppShell.svelte`.** It moves to `AppOverlays.svelte` (finding 4).
- **Recent-notes card, clickable status items, zoom palette commands.** These are excluded by the review's validation and the scout.

## Owner questions

1. **Claude panel and P97.** On `mvp-claude` the chat lives inside the right sidebar, so after T1 it disappears whenever no tab is open. It already disappears on canvas, kanban, Tags and Graph tabs. Recommended default: T1 ships on `main` as written. When `main` is merged into `mvp-claude`, the sidebar is shown whenever the Claude panel is visible (`claudePanelShown || isRightSidebarShown(...)`, and the toggle condition follows), because the chat is vault-wide and not tied to a note. Alternative: accept that the chat hides with the other panels.
2. **Non-Markdown text files (`.txt`, `.json`).** Hide the right sidebar for them, as for canvas and kanban, in the same `hidesRightSidebar` change? This was handed over by nl-empty-states. Recommended default: yes, using `isMarkdownFile` so `.markdown` keeps the sidebar. It flips the tested `.txt` case on purpose.
3. **Zoom persistence scope.** Per machine in `localStorage` (applies on the vault picker and never travels with a synced vault), or per vault in `settings.json` (the prototype caption, which cannot apply before a vault opens)? Recommended default: `localStorage`.
4. **Save slot for virtual tabs.** Reserve the save slot when no status shows (no tab, virtual tab)? Recommended default: no. Fix only the Saved and Modified flip.
5. **P97 with no tab.** Cmd+B, the palette toggle and the toggle button do nothing (the button disappears), and the right sidebar pops in when the daily note opens at launch. Recommended default: accept, as on Tasks and Graph tabs.

## Not checked

- I ran no app, test or browser. The key-repeat claim in finding 5 follows from the code (`registerKeybinding` fires per keydown, and `applyZoom` awaits an IPC promise), not from a measurement.
- I did not verify that the E2E vault can show the Todoist status item. That was not run.
- I did not open the mods source repo outside this checkout. A mod that sizes its chip to a 32px bar would overflow at 24px.
