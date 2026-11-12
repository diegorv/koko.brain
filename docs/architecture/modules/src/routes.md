---
summary: "SvelteKit route tree for the main window and the quick-capture composer window; the pages are thin and own no stores."
---

## Responsibility

The SvelteKit route tree, client-only because src/routes/+layout.ts disables SSR. The root +layout.svelte imports the global stylesheet. There are two entry points: the (app) group, served as the main window, whose layout is the runtime caller of the composition root in src/lib/app, and the /composer page loaded by the separate composer popover window that src-tauri/src/lib.rs builds. The (app) layout registers app ports, configures properties diagnostics, applies the stored theme, registers global keybindings, the Tauri listeners, the deep-link listener and the quick-capture listener, starts and tears down the vault from the vault store, and runs the debounced backlinks, index-update and search effects. The (app) page is the start screen, which AppShell renders in place of the shell while no vault is open. The composer page is a textarea that hands its text to Rust and waits for the main window to report the written note. Routes own no stores and no business logic.

## Key files

- `src/routes/+layout.ts`: Disables SSR for every route, so the app runs as a client-only SPA.
- `src/routes/+layout.svelte`: Root layout: imports the global stylesheet and renders the child route.
- `src/routes/(app)/+layout.svelte`: Main-window layout: calls registerAppPorts, registers keybindings and listeners, drives vault init and teardown, runs the debounced backlinks, index and search effects, and renders AppOverlays and AppShell.
- `src/routes/(app)/+page.svelte`: Start screen shown while no vault is open: open a vault or pick a recent one.
- `src/routes/composer/+page.svelte`: Quick-capture composer: draft textarea that submits to Rust and waits for the written-note result.

## State

- localStorage key kokobrain:composer-draft holds the unsaved composer text in the composer webview's origin (src/routes/composer/+page.svelte).
- localStorage key kokobrain:theme-vars (THEME_VARS_STORAGE_KEY in src/lib/core/settings/theme.service.ts) is read by the composer and the (app) layout through applyStoredTheme; the routes only read it.
- No Svelte store is defined under src/routes. The (app) layout keeps only effect-scoped timers for the backlinks refresh, the index update and the search debounce.
- The composer keeps its text, saved and problem flags, saving and dismissing guards, pending save request and show counter in component state that persists across hide and show, because its window is hidden, not closed.

## Collaborators

- `src/lib/app`: Composition root that the (app) layout calls into: boot.ts, AppShell.svelte, AppOverlays.svelte, global-keybindings.ts, tauri-listeners.service.ts and lifecycle/.
- `src/lib/contracts`: The composer page uses call(), on() and EVENT_NAMES for every Rust command and event it uses.
- `src/lib/core`: The (app) layout uses the vault and editor stores, the theme service and configurePropertiesDiagnostics; the start page uses vault.service for openVaultDialog and openRecentVault and the BuildInfo component; the composer uses the theme service.
- `src/lib/features`: The (app) layout runs performSearch and reads searchStore (search), calls fetchBacklinksV2 and writes backlinksStore (backlinks), resets outgoingLinksStore (outgoing-links) and registers registerDeepLinkListener (deep-link).
- `src/lib/plugins`: The (app) layout registers registerQuickCaptureListener, the main-window side of the composer round trip, which handles qc:capture-detected.
- `src/lib/utils`: debug and log helpers are used by the (app) layout.
- `src/lib/components/ui`: The start page uses the Button primitive.
- `src-tauri/src`: lib.rs build_composer_window loads the /composer route into the composer webview; the main window from tauri.conf.json loads the app root served by the (app) group.
- `IPC:submit_composer_capture`: The composer page sends its text and a request id to Rust.
- `IPC:dismiss_composer`: The composer page hides the composer window on Escape, on an empty submit and after a confirmed save.
- `event:qc:open-composer`: The composer page resets its draft, theme and focus on each summon.
- `event:qc:composer-capture-result`: The composer page learns whether the main window wrote the note for its request id.

## Subfolders

- `src/routes/(app)`: Main-window route group: the layout that is the composition root's runtime caller, and the start-screen page.
- `src/routes/composer`: The /composer page for the quick-capture popover window: draft, submit, wait for result, dismiss.

## Gotchas

- The composer is a second webview with its own JavaScript state. It reads the theme from localStorage, writes only its draft there and never touches the main window's stores; the note is written by the main window's quick-capture listener (src/lib/plugins/quick-capture/quick-capture.service.ts), which reports back through report_composer_capture_result.
- The composer hides rather than closes (dismiss_composer hides the window in src-tauri/src/quick_capture/commands.rs), so the page's state survives between summons. Each summon is reset by the qc:open-composer handler (resetForShow), which must keep re-reading the draft and theme.
- A composer save is confirmed only when qc:composer-capture-result arrives within RESULT_TIMEOUT_MS. On timeout or failure the text stays in the textarea and a retry sends the same text again; the page does not check whether the earlier attempt was written.
- src/routes/(app)/+layout.svelte must call registerAppPorts() synchronously at component init, not inside a vault-scoped effect, because initializeVault unregisters vault-lifetime registrations (boot.ts doc).
- src/routes is the only production code that may import #lib/app. scripts/import-graph.mjs does not scan src/routes, and its app-inbound rule flags any file under src/lib outside src/lib/app that imports it (layer-rules.test.ts).
- Routes must reach Rust only through call() and on() from src/lib/contracts/ipc.ts; raw-invoke.test.ts and event-listen.test.ts scan src/lib and src/routes for direct imports.
- Palette color classes are forbidden in src/lib and src/routes except under src/lib/components/ui (palette-classes.test.ts). Route styling must use the theme tokens.
- The (app) layout owns the debounce delays for backlinks, index updates and search inline in its effects. They are not configurable in a service, so changing them changes the main window's behaviour.
- The start page hard-codes the allowed vault locations (~/Documents/kokobrain-vaults/ and ~/kokobrain-vaults/) in its markup, inside the recent-vaults block. The real limits are the fs scopes in src-tauri/capabilities/default.json and src-tauri/tauri.conf.json, so the text must be updated by hand when those change.
