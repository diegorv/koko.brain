# Scout: Empty editor, zoom and status bar cluster (P97, P99, P176)

Checked against HEAD `ab143a411` (main). Read-only: no app run, no tests run, nothing measured in a browser. The haiku raw notes (`research/raw/P97.md`, `P99.md`, `P176.md`) were treated as leads; every load-bearing claim below was re-read in the code. Corrections to the raw notes are listed at the end of each proposal.

Prototype for all three: `.scratch/design-review/prototypes/shell-tabs-navigation.html` (P97 section at line 515, JS 1412-1440; P99 at 527-535, JS 1477-1507, `.zoomchip` CSS 275-279; P176 at 559-570, `.sbar .slot` CSS 271). Only P97 has a real screenshot (`screens/editor-empty-state-light.png`).

## Code map (what runs today)

| File | Role |
|---|---|
| `src/lib/app/EditorView.svelte:153-158` | `{:else}` branch of `editorStore.activeTab`: a 40px drag strip plus `<p class="text-sm text-muted-foreground">Select a file to view its contents</p>` on `bg-editor-empty-bg` |
| `src/lib/core/layout/layout.logic.ts:23-38` | `hidesRightSidebar(path)` (returns `false` for `null` at :24, an explicit early return) and `isRightSidebarShown(visible, path)` |
| `src/lib/core/layout/layout.service.ts:30-34` | `toggleRightSidebar()`: no-op when `hidesRightSidebar(activeTabPath)`, else flips `layout.rightSidebarVisible` |
| `src/lib/app/AppShell.svelte:61,189-197,265-296,302-312` | `rightSidebarShown` derived, the absolute top-right toggle (rendered when `!hidesRightSidebar(...)`), the right sidebar mount (`data-right-sidebar`), the `<StatusBar>` with left (`SearchStatus`, `SemanticIndexStatus`) and right (`TodoistSyncStatus`, `SaveStatus`, `WordCount`) snippets |
| `src/lib/features/properties/PropertiesView.svelte:157-158` | "No file open" shown when `!editorStore.activeTab` (reachable today only because the sidebar mounts with no tab) |
| `src/lib/app/global-keybindings.ts:63-73,148-153,177-181,211-217` | Cmd+P (palette, binding has NO `command` id), Cmd+O (`quick-switcher:open`), Cmd+N (`quick-capture:create-note`), zoom handlers, and `shortcutFor(command)` which throws when no binding names the command |
| `src/lib/utils/keybindings.ts:40` | `formatShortcut(combo)` gives the mac glyph label (`⌘O`), used by the palette and context menus |
| `src/lib/core/zoom/zoom.service.ts` (30 lines) | `ZOOM_LEVELS` (11 steps, 0.5 to 2.0), module `let currentZoom = 1.0`, `zoomIn/zoomOut/resetZoom` -> `applyZoom` -> `getCurrentWebviewWindow().setZoom(f)`. No store, no persistence, no feedback. `currentZoom` is assigned before the `await`, so a rejected `setZoom` leaves it out of sync |
| `src/lib/core/status-bar/StatusBar.svelte:9` | `flex h-(--status-bar-height) ... text-xs`, two `status-bar-group` divs; `:global(:not(:first-child))::before` draws a 1px separator plus `margin-right: 12px` inside each non-first child |
| `src/lib/core/status-bar/SaveStatus.svelte:7-23` | `status` derived from `editorStore.activeTab` (`null` for no tab or virtual tab); `modified` renders a filled `Circle` with `animate-pulse` plus "Modified", `saved` a `CircleCheck` plus "Saved"; no width reserved |
| `src/app.css:211-212` | `--status-bar-height: 2rem` (only definition). Consumers: `StatusBar.svelte:9` and `SettingsPanel.svelte:116` (`bottom-(--status-bar-height)`) |
| `src/lib/core/editor/editor.service.ts:276-279` | `debounce(saveDirtyTabs, 2000, { maxWait: 10_000 })` (frontmatter edits 500 ms). "Modified" therefore spans first keystroke until the save, not "every autosave" |
| `src/routes/(app)/+layout.svelte:36` | `applyStoredTheme()` is called at layout setup, before any vault loads: the precedent for an app-level (not vault-level) value restored from `localStorage` |

Who reads what:
- `rightSidebarVisible`: only `AppShell.svelte` (derived at :61, button title at :194) and `layout.service.ts`/`LayoutSection` (settings UI). `hidesRightSidebar` has two production callers, AppShell:189 and layout.service:31.
- Zoom: nothing reads zoom state. There is no zoom key in `AppSettings`, no `zoom` text anywhere in `src-tauri/src`, and the only `setZoom` call is `zoom.service.ts:29`. The Tauri capability `core:webview:allow-set-webview-zoom` is already granted (`src-tauri/capabilities/default.json:17`).
- localStorage precedent for app-level state: `vault.store.svelte.ts` (recent vaults), `quick-switcher.store.svelte.ts` (`kokobrain:recent-files`), `command-palette.store.svelte.ts`, `theme.service.ts` (theme vars). All wrap access in try/catch.
- `src/lib/app/` is the composition root: `EditorView.svelte` and `AppShell.svelte` already import features and plugins, so a new component there adds no layer-baseline entry. A new component under `core/` importing `quickSwitcherStore` or `commandPaletteStore` (both `features/`) would.

## P97. Empty editor dead end

**Still real: partial (the symptom is real, the mechanism as written is a contract flip with wider blast radius than the proposal says).**

Current behaviour:
- `EditorView.svelte:153-158`: one muted line, no actions. The screenshot manifest agrees (`screens/MANIFEST.md:28`).
- With no tab, `hidesRightSidebar(null)` is `false` (`layout.logic.ts:24`), so `isRightSidebarShown(true, null)` is `true`, AppShell mounts the right sidebar (`:265`) and `PropertiesView.svelte:158` prints "No file open". The review's claim "`hidesRightSidebar(null)` returns true" is the PROPOSED state, not the current one. The symptom (three panel headers beside an empty editor) holds.
- Changing the null branch also (a) removes the AppShell toggle (`AppShell.svelte:189`) and (b) makes `toggleRightSidebar()` (Cmd+B, palette "Toggle Right Sidebar", the toggle button) a silent no-op with no tab (`layout.service.ts:31`). That is the same treatment canvas/tags/graph/tasks/calendar tabs already get, and the comment at `layout.service.ts:27-29` gives the reason ("a toggle would only flip the saved setting out of sight"), so it is consistent. The proposal just does not say it.
- The persisted `rightSidebarVisible` stays untouched (the prototype's readout "saved rightSidebarVisible: true | shown now: false" demonstrates this and it is what `isRightSidebarShown` already does for virtual tabs).
- The Properties panel branch "No file open" becomes unreachable through AppShell. `PropertiesView.test.ts:132-137` mounts the component directly and keeps passing; the branch stays as defensive text (do not delete: `.logic`/component is mounted by that test and rs-properties tickets own that file).

What the prototype wants:
- Right sidebar and its toggle hidden while no tab is open. Editor area shows a hint card: heading "No note open", subtitle "Pick one of these to start", three rows: Quick switcher (search icon, kbd Cmd+O), Command palette (command icon, Cmd+P), New note (file-plus icon, Cmd+N). Rows are clickable in the mock. No recent-notes card (review validation says so explicitly; `quickSwitcherStore.recentPaths` exists at `quick-switcher.store.svelte.ts:6` but is out of scope).

Design points a ticket must settle:
1. Mechanism: flip `hidesRightSidebar(null)` to `true` (the proposal) and update the JSDoc ("the tab at `activeTabPath`" becomes "the tab, or no tab"), the AppShell comment at :188 and the toggle docs. Recommended. Alternative (render-only: `rightSidebarShown = ... && activeTabPath !== null`) leaves a visible toggle that does nothing, which the existing comment says to avoid.
2. This flips deliberate, tested behaviour. Existing tests that encode it and must change on purpose (state this in the ticket so no one reads it as weakening a test):
   - `src/tests/lib/core/layout/layout.logic.test.ts:48-51` `follows the setting when no tab is open` (asserts `isRightSidebarShown(true, null) === true`).
   - `src/tests/lib/core/layout/layout.service.test.ts:140-161` `hides a visible right sidebar and persists` and `shows a hidden right sidebar and persists` run with `editorStore.reset()` and no tab (`resetAll`, :48-58); they need a note tab added first. A new null-tab no-op test sits beside the existing Calendar one at :163.
   - `src/tests/lib/app/commands.test.ts:513-525` `toggle right sidebar action updates settingsStore layout` runs tab-less; same fix. (:502 Calendar no-op test is the model.)
   - `src/tests/lib/app/AppShell.test.ts:211-218` `sets the row role as the size its panels inherit` mounts the shell with no tab and expects `[data-right-sidebar]`; it needs a note tab.
   - E2E: `e2e/specs/editor-empty-state.spec.ts:24,29,32` assert the old copy; the sidebar specs (`sidebars.spec.ts:60-73`, `rail-shell.spec.ts:326-356`, `note-action-bar.spec.ts:19`) open a note first and are unaffected.
3. Boot flash: after a vault opens, the shell renders before the daily note tab is added (comments at `app-lifecycle.service.ts:401-415` say the daily-note open is deferred one macrotask). With this change the hint card flashes first and the right sidebar then mounts, shifting the editor pane width. Today the sidebar is already there at boot. Recommended default: accept (it is the same pop-in canvas/tags tabs have when switching to a note) and check it once by eye; do not add a boot gate. Flag it to the owner (question 2).
4. Shortcut labels: take them from the single source `shortcutFor` + `formatShortcut` (gives `⌘O`, `⌘P`, `⌘N`), not hardcoded "Cmd+O". Cmd+P cannot be looked up today: the binding at `global-keybindings.ts:63-67` has no `command` id, and `shortcutFor` throws for an unknown command. Add `command: 'command-palette:toggle'` (no palette command needs to exist; the test at `global-keybindings.test.ts:761` iterates palette commands, not bindings). Raw note P97 missed this. The prototype's "Cmd+O" text differs from the app's glyph style on purpose; follow the app.
5. Actions: Quick switcher -> `quickSwitcherStore.open()`; Command palette -> `commandPaletteStore.open()`; New note -> `createNoteComposer()` (`plugins/quick-capture/note-composer.service.ts:20`, the Cmd+N path). Prefer `open()` over `toggle()` since a click happens while nothing is open. Wrap the async New note call like `global-keybindings.ts:152` (`.catch(err => error('EMPTY-EDITOR', ...))`) or toast; pick one and test it.
6. Placement: a new component `src/lib/app/EmptyEditorHint.svelte` (app layer, no baseline entry). Keep the 40px `data-tauri-drag-region` strip at `EditorView.svelte:154` as is (P18 in sh-view-headers-entry may replace that div with a shared band; this ticket only replaces the `<p>` at :156). Keep `bg-editor-empty-bg`; its help text (`help/documentation/26-theming.md:168`) quotes the old copy and must be updated.
7. Copy: "No note open" / "Pick one of these to start" per prototype (current copy is "Select a file to view its contents").
8. The 4 buttons need accessible names and focus order; rows are `<button>`s, not divs.

Test files and seams:
- `src/tests/lib/core/layout/layout.logic.test.ts`, `layout.service.test.ts` (real `settingsStore`, `editorStore`, Tauri fs mocked already), `src/tests/lib/app/AppShell.test.ts` (mounts the real shell; has `setupLocalStorage`, ResizeObserver stub), `src/tests/lib/app/commands.test.ts`, `src/tests/lib/app/global-keybindings.test.ts` (mocks the zoom and note-composer services at the top; `shortcutFor` cases at :324 and :774-780), `src/tests/lib/app/EditorView.test.ts` (no empty-state assertion today; the divider test at :375 is the nearest).
- New `src/tests/lib/app/EmptyEditorHint.test.ts`: real `quickSwitcherStore`, `commandPaletteStore` (assert `isOpen`), mock only `#lib/plugins/quick-capture/note-composer.service.js` (a side-effect service). Labels asserted as `formatShortcut(shortcutFor(...))`.
- E2E (`bash scripts/e2e.sh` only): update `e2e/specs/editor-empty-state.spec.ts` (new copy, `[data-right-sidebar]` count 0 with no tabs, returns after `openFile`).

## P99. Zoom feedback and persistence

**Still real: yes, both halves.**

Current behaviour:
- Silent: `zoom.service.ts` exports three async functions and no state; `global-keybindings.ts:177-181` discards the result. Nothing in the UI reacts. Zoom is keyboard-only: no palette command, no menu item (no `zoom` text in `src-tauri/src`, none in `commands.ts`).
- Not persisted: no zoom field in `AppSettings`/`DEFAULT_SETTINGS`, no restore call, so a relaunch comes back at the webview default. Confirmed from code only; WKWebView behaviour across relaunch was not observed.
- `currentZoom` is module state starting at 1.0 and never read back from the webview, so after any restore it must be set explicitly or the next `zoomIn` jumps from 1.0.

What the prototype wants:
- A pill chip (`aria-label="Reset zoom to 100%"`, zoom-in icon, percentage, "click to reset" on hover) floating at `right: 12px; bottom: 36px`, i.e. just above its 24px mock bar. Appears on every keyboard change for 1500 ms then fades (opacity transition, no pointer events needed when hidden). Click resets to 100%. After "Relaunch" the zoom is restored in the After window. Same 11 levels, accepts `=`/`+`, `-`, `0`. The prototype's chip example value is "110%" in review.md and "125%" in earlier research; irrelevant, the chip shows the real level.

Design points a ticket must settle:
1. Where the factor lives. The prototype caption says "factor kept in settings", but `settings.json` is per vault (`settings.service.ts:14-18`) and loads only inside `initializeVault` (`app-lifecycle.service.ts:210`), so a settings key would (a) differ per vault, (b) travel with a synced vault to a different machine or display, and (c) not apply to the vault picker screen. WebView zoom is a per-machine display preference. Recommended: `localStorage` key `kokobrain:zoom`, restored from `(app)/+layout.svelte` next to `applyStoredTheme()` (:36), wrapped in try/catch like every other store. This also removes the settings type/merge/store/test churn the raw note listed. Needs owner confirmation (question 1).
2. Restore validation: accept only values present in `ZOOM_LEVELS`; anything else (hand-edited, NaN, string) is ignored and leaves 100%. Restoring 1.0 or nothing makes no `setZoom` call. Reset removes the key (or writes 1.0).
3. Write only after `setZoom` resolves (CLAUDE.md: no partial state on error). Today `applyZoom` assigns `currentZoom` first (`zoom.service.ts:28`); move it after the await so a failure leaves state, store and storage consistent. Callers already `.catch` and log.
4. State for the chip: a new `zoom.store.svelte.ts` (reactive state only: `level`, `chipVisible`), written by the service; the 1500 ms hide timer belongs in the service, not the store. Each change restarts the timer. Reset to 100% still shows the chip briefly ("100%") as confirmation.
5. Chip component `ZoomChip.svelte` in `core/zoom/`, mounted once in `AppShell.svelte` inside the `relative` root (:187). Position it with `bottom-[calc(var(--status-bar-height)+0.75rem)]` so it follows the P176 height token. Render only while visible (not opacity 0 with live pointer events); a transition is fine but honour `prefers-reduced-motion`. `role="status"`/`aria-live="polite"` for the percentage; the click target is a `<button>` with the prototype's aria-label.
6. The chip lives inside the zoomed webview, so it scales with the level (huge at 200%, tiny at 50%). Recommended default: accept, the prototype does the same (`style.zoom` on the whole window).
7. The chip does not appear for the restore at startup (silent, only user changes trigger it).
8. The composer window (`src/routes/composer/+page.svelte`) is a separate webview and route group; restoring in `(app)/+layout.svelte` leaves it alone. Not verified in a running app.
9. Add Zoom commands to the palette? Not in the proposal; do not.
10. Help: `help/documentation/03-editor.md:157-165` (Zoom) must say the level is remembered and describe the chip; `20-keyboard-shortcuts.md:56-58` unchanged.

Test files and seams:
- `src/tests/lib/core/zoom/zoom.service.test.ts` (jsdom; mocks `@tauri-apps/api/webviewWindow` only, uses real module state): extend for persistence, restore, invalid value, rejection, chip trigger. Note `beforeEach` calls `resetZoom()` to reset module state; with the new key it also clears storage, which is fine, but add an explicit `localStorage.clear()`.
- New `src/tests/lib/core/zoom/zoom.store.test.ts` and `ZoomChip.test.ts` (real store, real service, mocked Tauri webview; fake timers for the 1500 ms).
- `src/tests/lib/app/AppShell.test.ts`: chip absent by default, present after `zoomIn()`.
- `src/tests/lib/app/global-keybindings.test.ts:57-59,668-692` mocks the service and asserts the handlers call it; handlers do not change, so no edit needed.
- Wiring in `(app)/+layout.svelte` has no unit test (no test file for it; `applyStoredTheme` is tested at `theme.service.test.ts`). The service-level `restoreZoom()` test is the seam; the layout call is a one-liner checked by `pnpm check` and by eye.
- E2E: `e2e/mocks/tauri-webview-window.ts:38` has `setZoom` as a no-op, and no spec covers zoom. A Playwright test would need that mock to record calls (not confirmed that the E2E bundle aliases this module). Optional; the chip appearing after Mod+= and disappearing after 1.5 s is checkable without it.

Corrections to the raw note: the touch list there includes `settings.types.ts`, `settings.store`, `settings.service` and `app-lifecycle.service.ts:210`; with the localStorage default none of those change. Raw note says an overlap with `030-session-whose-settings-json-was-never-loaded` is a dependency; it is not if zoom stays out of settings.json.

## P176. Status bar height and save indicator

**Still real: yes, with one correction to the problem statement.**

Current behaviour:
- `app.css:212` `--status-bar-height: 2rem` (32px at the default root size; no `html { font-size }` override found in `app.css`). `StatusBar.svelte:9` `h-(--status-bar-height)`, text `text-xs` (no override of `--text-xs` in `app.css`, so Tailwind's 12px/16px).
- `SaveStatus.svelte:16` `animate-pulse` on the Modified dot. The span is `inline-flex items-center gap-1` with no width, so Modified and Saved differ in width. The right group is right-anchored (`justify-between`), so `WordCount` to the right of the save item stays put; what moves on every flip is the save item's own left edge (icon and text) and, when Todoist sync is on, the Todoist item to its left. The prototype's readout measures the "33 words" element, which in the real DOM order would not move; the E2E must measure the save item's left edge instead. 
- Correction: "Modified" is shown from the first keystroke until the debounced save (2 s after the last edit, 10 s max wait, `editor.service.ts:276`), so it flips once per dirty episode, not on every autosave tick. The pulse runs for that whole span, which is the annoying part while typing.
- The save slot also vanishes (renders nothing) for virtual tabs and no tab (`SaveStatus.svelte:9`), and `WordCount` renders only for markdown (`word-count/WordCount.svelte:32`). That tab-type shift is separate from the Saved/Modified flip and out of scope unless the ticket chooses to reserve the slot always (see below).
- Nothing in the bar is clickable (no button, onclick or href in the five items or `StatusBar.svelte`).
- Settings panel ends at the bar: `SettingsPanel.svelte:116` `bottom-(--status-bar-height)` follows the token automatically; `e2e/specs/settings.spec.ts:23` asserts `toBeCloseTo(32, 0)` and must become 24 in the same change.

What the prototype wants:
- Bar 24px (`.sbar` 12px/16px font, `padding: 0 8px`), no pulse (dot still filled for Modified), and the save span gets a fixed `min-width: 76px` with `justify-content: flex-start` (`.sbar .slot`, CSS line 271). The prototype toggles Saved/Modified every 1400 ms and reports the horizontal shift of the "33 words" element. The 76px is a prototype value, not measured on the real markup.

Design points a ticket must settle:
1. The separator pseudo-element (`StatusBar.svelte` style block) lives INSIDE the first save span's box when `TodoistSyncStatus` renders before it (1px plus 12px margin plus a flex gap). So a `min-width` on the span must be chosen against the real Modified width including that separator, not the prototype's 76px. Measure it in the E2E (below) and pick a value in `rem` so it survives zoom (the bar scales with the webview).
2. Remove `animate-pulse` only; keep the filled circle versus check icon distinction. Do not add a different animation.
3. Whether the slot is also reserved when `status === null` (virtual tab). Recommended default: no, keep it minimal; the right group already changes with `WordCount`.
4. 24px: `1.5rem`. Check `text-xs` line-height 16px plus any mod chip fits (mod chips are free-form DOM injected into `.status-bar-group`; `help/examples/mods/status-chip/main.js:82` uses a 6px dot, so it fits; a mod with taller content would overflow, an accepted limit to state in the help page).
5. Unit tests cannot measure layout (jsdom). The width stability and bar height claim needs Playwright bounding boxes, or the test passes while the problem stays. Pair a class-level unit test with an E2E measurement.
6. Clickable status items are explicitly deferred by the review ("Clickable items are left for later"); do not add them.

Test files and seams:
- New `src/tests/lib/core/status-bar/SaveStatus.test.ts` (no test exists): real `editorStore`; tab with `content !== savedContent` renders "Modified" with no `animate-pulse` class on its icon and the min-width class on the root; saved tab renders "Saved" with the same min-width class; no tab and a virtual tab render nothing.
- `e2e/specs/settings.spec.ts:23`: 32 -> 24 (the existing test is the only place the value is encoded).
- New E2E in `e2e/specs/word-count.spec.ts` or `editor.spec.ts`: type in a note, read the bounding box x of the save item (icon plus label) while Saved, while Modified and after Saved again (2 s debounce, use `expect.poll`), assert the left edge is identical in all three, and the `[data-status-bar]` height is 24.
- `AppShell.test.ts:426-437` (status bar describe) does not touch height or save state; no edit needed.
- No snapshot includes `--status-bar-height` (`grep` in `src/tests` finds none; `theme-snapshot.test.ts.snap` only has `--status-bar-bg`).
- Help: `help/documentation/03-editor.md:141-151` describes Save status; the wording stays true.

## Candidate tickets

Grouping rationale: P99's chip is positioned from the status bar height token that P176 changes, both touch the bottom-of-window chrome and `settings.spec.ts`/`AppShell.test.ts`/`03-editor.md`, and together they are one fresh context. P97 shares nothing with them except `AppShell.svelte` and `global-keybindings.ts`, and carries its own contract flip, so it stays separate.

### T1. The empty editor becomes a launch point and drops the empty right sidebar (P97)

Size: M (small code, but a contract flip with five existing tests and an E2E spec to change on purpose).

Files touched:
- `src/lib/core/layout/layout.logic.ts` (null branch + JSDoc), `layout.service.ts` (JSDoc only)
- `src/lib/app/AppShell.svelte` (comment at :188 only; behaviour follows the function)
- `src/lib/app/EditorView.svelte:155-157` (replace the `<p>`), new `src/lib/app/EmptyEditorHint.svelte`
- `src/lib/app/global-keybindings.ts:63-67` (add `command: 'command-palette:toggle'`)
- Tests: `layout.logic.test.ts`, `layout.service.test.ts`, `commands.test.ts`, `AppShell.test.ts`, `global-keybindings.test.ts`, `EditorView.test.ts`, new `EmptyEditorHint.test.ts`, `e2e/specs/editor-empty-state.spec.ts`
- Docs: `help/documentation/26-theming.md:168` (the `editorEmptyBg` row quotes the old copy)

Blockers / shared files:
- `AppShell.svelte` and `layout.logic.ts`/`layout.service.ts` with P98 (sh-tabs, right sidebar toggle reserve) and P104 (sh-menus-settings, per-panel toggles in `layout.service.ts`). No hard ordering, but rebase on whichever lands first; P98 may move or restyle the toggle, which still obeys `hidesRightSidebar`.
- `EditorView.svelte:153-158` with P18 (sh-view-headers-entry, shared top band): this ticket only touches the `<p>`; keep the strip div as is.
- `global-keybindings.ts` with P35, P36, P37 (they add or touch bindings in the same array): conflicts are line-local.
- `PropertiesView.svelte` is NOT edited here; the "No file open" branch stays (rs-properties-* tickets own that file).

Acceptance criteria (each starts with a failing test):
1. `layout.logic.test.ts`: `hidesRightSidebar(null)` is `true`; `isRightSidebarShown(true, null)` and `(false, null)` are `false`; the old "follows the setting when no tab is open" case is replaced on purpose (the ticket text says the contract is flipped, not weakened). Red today.
2. `layout.service.test.ts`: `toggleRightSidebar()` with no tab leaves `rightSidebarVisible` unchanged and writes nothing; the two existing toggle tests and `commands.test.ts:513` open a note tab first and still pass.
3. `AppShell.test.ts`: with no tab, no `[data-right-sidebar]` and no right-sidebar toggle button even with `rightSidebarVisible: true`; adding a note tab brings both back (title "Hide right sidebar") and the saved setting is still `true`; the test at :211 gets a note tab.
4. `global-keybindings.test.ts`: `shortcutFor('command-palette:toggle')` equals `{ key: 'p', meta: true }` (throws today).
5. `EmptyEditorHint.test.ts`: renders "No note open" and three buttons named Quick switcher, Command palette and New note, each showing `formatShortcut(shortcutFor(...))`; clicking them sets `quickSwitcherStore.isOpen` / `commandPaletteStore.isOpen` and calls the mocked `createNoteComposer` once; a rejected `createNoteComposer` is logged or toasted and does not throw. `EditorView.test.ts`: the hint mounts with no tab and the old copy is gone; it is absent with a tab open.
6. E2E `editor-empty-state.spec.ts`: after closing all tabs the hint rows are visible with the Cmd+O / Cmd+P / Cmd+N labels and `[data-right-sidebar]` count is 0; opening `Welcome.md` removes the hint and the sidebar returns.
7. `pnpm check`, `pnpm vitest run`, `bash scripts/e2e.sh` green; help theming row updated; no recent-notes card.

### T2. Calmer status bar and a visible, remembered zoom (P176 + P99)

Size: M (P176 is S; P99 is S to M with a new store, chip component and restore wiring). Order inside the ticket: P176 first (token and save slot), then P99 (chip offset uses the token).

Files touched:
- `src/app.css:212`, `src/lib/core/status-bar/SaveStatus.svelte`, `e2e/specs/settings.spec.ts:23`
- `src/lib/core/zoom/zoom.service.ts` (persist, `restoreZoom`, set state after await, notify store), new `zoom.store.svelte.ts`, new `ZoomChip.svelte`
- `src/lib/app/AppShell.svelte` (mount the chip in the `relative` root), `src/routes/(app)/+layout.svelte` (call `restoreZoom()` beside `applyStoredTheme()`)
- Tests: new `SaveStatus.test.ts`, `zoom.service.test.ts` (extend), new `zoom.store.test.ts`, `ZoomChip.test.ts`, `AppShell.test.ts`, one E2E for width stability and bar height
- Docs: `help/documentation/03-editor.md` (Zoom section :157-165; Status Bar section :141-151 only if wording changes)

Blockers / shared files:
- `AppShell.svelte` with T1, P98, P104, P103: the chip is a one-line mount, low conflict.
- `e2e/specs/settings.spec.ts:23` is the only encoding of the 32px value; no other cluster found touching it.
- `help/documentation/03-editor.md` may also be touched by sh-tabs (P34) and view-header tickets; edit different sections.
- No hard blocker. open-itens 066 (note count) touches `SearchStatus` data only and does not conflict.

Acceptance criteria (each starts with a failing test):
1. `SaveStatus.test.ts`: a dirty tab renders "Modified" with no `animate-pulse` on its icon (red today); both Modified and Saved roots carry the same min-width class; no tab and a virtual tab render nothing.
2. E2E: with a note open, the `[data-status-bar]` height is 24 and the left edge (x) of the save item is identical while Saved and while Modified (`expect.poll` over the 2 s autosave); `settings.spec.ts:23` changed from 32 to 24 and the Settings panel still ends at the bar's top edge.
3. `zoom.service.test.ts`: after `zoomIn()` the key `kokobrain:zoom` holds `1.1`; `restoreZoom()` with `1.25` stored calls `setZoom(1.25)` once and a following `zoomIn()` goes to `1.5`; stored `abc`, `1.3` (not a level), `NaN`, or `1` / nothing make no `setZoom` call and leave 100%; `resetZoom()` clears the stored level; a `setZoom` that rejects leaves the module level, the store and storage unchanged and propagates the error. Red today (none of this exists).
4. `zoom.store.test.ts` and service test with fake timers: a zoom change sets `level` and `chipVisible`, hides after 1500 ms, and a second change within the window restarts the timer; `restoreZoom()` does not show the chip.
5. `ZoomChip.test.ts`: hidden (not in the DOM) until a change; shows "110%" after one `zoomIn()`; the button's accessible name is "Reset zoom to 100%"; clicking it calls the mocked `setZoom(1)` and shows "100%". `AppShell.test.ts`: chip absent by default, present after `zoomIn()`.
6. Chip bottom offset is derived from `var(--status-bar-height)` (class assertion) so it follows the 24px bar; honours `prefers-reduced-motion`.
7. `pnpm check`, `pnpm vitest run`, `bash scripts/e2e.sh` green; help Zoom section states the level is remembered and describes the chip.
8. Not checked by tests and flagged in the delivery note: WKWebView zoom actually persisting across a real relaunch, the chip scaling at 50% and 200%, and the vault picker screen starting at the stored zoom.

Alternative split if the breakdown wants smaller units: T2a = P176 alone (S), T2b = P99 alone (M, blocked by T2a only for the chip offset class, which can use the token as is). Recommended is the single ticket.

## Overlapping Issues

Checked each Status line (not only the ledger; the ledger lags: 066, 204, 205 and 220 all show `todo` there).

| Issue | Status (file) | Verdict |
|---|---|---|
| `.scratch/open-itens/issues/204-emptystate-inlinealert-badge-primitives-exist.md` | ready-for-agent | Exclude. The `EmptyState` primitive does not exist (`EmptyState` has no hit in `src/lib`). The P97 hint is a launcher with actions, not a true empty state; it should not wait for or use that primitive. |
| `.scratch/open-itens/issues/205-sidebar-panels-settings-use-empty-error-primitives.md` | ready-for-agent | No overlap with P97. Its migrate list is Backlinks, Outgoing links, TOC, Tags, Search, Trash and Appearance; it does NOT list `PropertiesView` "No file open" (raw note claimed it did). Not replaced. |
| `.scratch/open-itens/issues/066-status-bar-note-count-follows-notes-created.md` | ready-for-agent | Exclude. Same bar but about the index count data (`search.service.ts`, Rust IPC), not height, save slot or zoom. No replacement; no line conflict with T2. |
| `.scratch/open-itens/issues/220-search-panel-stops-repeating-index-status-status.md` | wontfix | Not replaced (already closed). |
| `.scratch/finders-ux/issues/04-search-panel-states-hints-labels.md` | resolved | Reference only (moved index status to the bar, left group). |
| `.scratch/open-itens/issues/030-session-whose-settings-json-was-never-loaded.md` | resolved | Irrelevant if zoom stays in localStorage; relevant only if the owner picks settings.json (question 1). |
| `.scratch/tasks-view-ux/issues/126-modified-marker.md` | wontfix | Different surface (Tasks list), no overlap. |

No live-folder Issue (tasks-view-ux, frontmatter-rules, vault-organization-v2, preview-channel, claude-code-integration, mods-host-robustness, finders-ux) covers the empty editor, `hidesRightSidebar`, zoom or the save indicator (grep over their `issues/` found only resolved status-bar mentions in finders-ux 04 and 10, tasks-view-ux 108/234/236/240). Nothing is replaced by T1 or T2.

Neighbour clusters in this batch (dependency, not duplicates): sh-tabs P98 (toggle placement, `AppShell.svelte`, `layout.logic.ts`), sh-menus-settings P104 (`layout.service.ts`, right-sidebar commands), sh-view-headers-entry P18 (top band, `EditorView.svelte:154`) and P36/P37 (`global-keybindings.ts` entries, P37 treats Cmd+0 as zoom reset, which this cluster leaves unchanged), rs-properties-layout (`PropertiesView.svelte`).

## Owner questions

1. Zoom persistence: should the remembered zoom be per machine (recommended: `localStorage`, `kokobrain:zoom`, also applies on the vault picker, never travels with a synced vault) or per vault in `settings.json` (what the prototype caption says, but it cannot apply before a vault opens)? Recommended default: localStorage.
2. P97 flips a deliberate rule: with no tab open, Cmd+B, the palette "Toggle Right Sidebar" and the toggle button do nothing (the toggle disappears), like on the Tasks or Graph tabs, and the right sidebar pops in when the first tab opens at boot. Confirm that is wanted; the alternative (keep the toggle and the setting flip working with no tab, only hide the sidebar visually) leaves a button that visibly does nothing. Recommended default: the proposal as written, accept the boot pop-in.
3. Should the empty-state hint rows run actions directly (click opens the quick switcher, palette or new note, recommended) or be plain text with shortcuts? The review says "a short hint listing ... with their shortcuts"; the prototype makes them clickable.
4. Should the save slot also be reserved when no save status shows (virtual tab or no tab), so the right group never shifts on tab type? Recommended default: no, only fix the Saved/Modified flip.
