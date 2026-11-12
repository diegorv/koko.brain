---
summary: "Shared frontend helpers: mostly pure string, date, color, path, sanitize and keybinding functions, plus logging, debug output and dedupe modules that hold state."
---

## Responsibility

Frontend-only helpers imported by core, features, plugins, app and route code. Most files are pure functions, types or constants: date and template formatting (date.ts, template.ts, note-date.ts, capture-path.ts), path handling (path.ts), colors and tags (color.ts, color-presets.ts, tag-colors.ts, tag-extraction.ts), sanitizing (sanitize.ts, sanitize-url.ts), keybinding registration and formatting (keybindings.ts), fuzzy matching, font stacks, frontmatter key aliases, platform detection, text-role names (text-roles.ts), menu action types, debounce and clamp. A few cross-cutting modules hold module-level state or perform side effects: the session log writer (log.service.ts), the debug helpers (debug.ts), the in-flight promise wrappers (inflight.ts) and the last-indexed-content map (index-dedupe.ts). build-info.js and node-shims/ serve vite.config.js. It does not own vault, note or settings state; that lives under src/lib/core.

## Key files

- `src/lib/utils/log.service.ts`: Session log file writer: buffers lines, serializes writes, runs the optional heartbeat (with the native main-thread heartbeat), opens the log directory.
- `src/lib/utils/debug.ts`: debug(), error() and timing helpers; forwards Rust tauri-debug-log events to the console and log file and logs IPC queue wait; reports errors to Sentry.
- `src/lib/utils/inflight.ts`: dedupeInflight, serializeWithRerun and versionGated wrappers that collapse or order concurrent async calls, plus isStillCurrentPath.
- `src/lib/utils/index-dedupe.ts`: Map of the last indexed content per path, used to skip redundant per-file index updates.
- `src/lib/utils/path.ts`: String-based path normalization, vault-relative resolution and basename helpers.
- `src/lib/utils/keybindings.ts`: KeyBinding types, shortcut formatting and registerKeybinding, which attaches a document keydown listener.
- `src/lib/utils/app-channel.ts`: Reads the build-time __APP_CHANNEL__ define with a stable fallback.
- `src/lib/utils/build-info.js`: Plain-JS build metadata helpers imported by vite.config.js at config load time.
- `src/lib/utils/sanitize.ts`: DOMPurify wrappers for HTML, SVG, snippet HTML and Mermaid output.

## State

- log.service.ts module state: the active log path, the cached log directory, the serial write chain, the pending line buffer, the flush timer and the heartbeat interval handle, all in memory for the session. Log files are written to the Tauri app log directory.
- debug.ts module state: the unlisten handle for the tauri-debug-log listener.
- index-dedupe.ts module state: a Map from absolute path to the last content string sent through the shared index updaters. It holds references to the note content strings.
- inflight.ts holds no module state: each dedupeInflight wrapper keeps its own Map of in-flight promises keyed by the caller's key and clears each entry when it settles.

## Collaborators

- `src/lib/contracts`: debug.ts uses call(), on(), setInvokeTracking, takeQueueWait and EVENT_NAMES; log.service.ts uses call().
- `src/lib/core/settings`: debug.ts reads settingsStore flags and calls captureSentryException from sentry.service.ts; app-channel.ts imports the ReleaseChannel type. These are the known exceptions listed in layer-baseline.json.
- `src/lib/core`: Heavy consumer of debug.ts, log.service.ts, path.ts, index-dedupe.ts and the color, date and sanitize helpers.
- `src/lib/features`: Consumer of sanitize.ts, inflight.ts, path.ts, date and tag helpers.
- `src/lib/plugins`: Consumer of debug.ts, date.ts, path.ts and the shared helpers; the mods host uses inflight.ts.
- `src/lib/app`: Lifecycle, listeners and shell use log.service.ts, debug.ts, keybindings.ts, path.ts, debounce.ts, inflight.ts and index-dedupe.ts.
- `src/routes`: The (app) layout uses debug.ts and log.service.ts; src/lib/utils.ts imports TEXT_ROLES from text-roles.ts.
- `src-tauri/src/commands`: debug.rs holds the set_tauri_debug_mode, get_process_memory and set_main_thread_heartbeat handlers this folder invokes.
- `IPC:set_tauri_debug_mode`: debug.ts toggles Rust debug logging to the frontend.
- `IPC:get_process_memory`: debug.ts reads the process RSS for memory logging.
- `IPC:set_main_thread_heartbeat`: log.service.ts starts and stops the native main-thread heartbeat.
- `event:tauri-debug-log`: debug.ts listens once Tauri debug mode is on; the payload carries tag, message and timestamp from Rust.

## Subfolders

- `src/lib/utils/node-shims`: Browser stubs for the Node built-ins path and fs. vite.config.js aliases them so the Todoist SDK's multipart-upload module resolves; they are never meant to run.

## Gotchas

- debug.ts error() always calls captureSentryException and console.error, even when debug mode is off; only the log-file write depends on settings.
- Files here may import only utils, contracts and packages (utils->non-utils rule in scripts/import-graph.mjs, which also forbids importing src/lib/utils.ts). debug.ts and app-channel.ts import src/lib/core/settings and are listed as debt in src/tests/lib/architecture/layer-baseline.json. log.service.ts does file IO and Tauri IPC but imports only contracts and Tauri packages.
- log.service.ts buffers lines in memory and writes them on a timer or when the line cap is reached, so lines appended just before a crash can be lost.
- index-dedupe.ts skips a path whose content equals the last indexed string. clearIndexedEntry must run on file delete (src/lib/core/filesystem/note-change.service.ts) and clearAllIndexed on teardown (src/lib/core/editor/editor.hooks.ts), or a re-created file with identical content is skipped.
- dedupeInflight leaves the key choice to the caller. A key made only of the path can serve a slightly stale argument during the in-flight window (inflight.ts header comment).
- getBuildChannel returns 'stable' when __APP_CHANNEL__ is undefined, which is the case under vitest because the Vite define is not injected. The global is declared in src/app.d.ts and defined in vite.config.js.
- build-info.js must stay plain JS with JSDoc types because vite.config.js imports it at config load time without a TypeScript transpile step.
- node-shims/path.js and fs.js only satisfy imports from @doist/todoist-sdk; their functions are placeholders.
- path.ts normalizePath and resolveFilePath are string-only and never touch the filesystem; resolveFilePath throws when the result escapes the vault and adds .md when the last segment has no extension.
- The cn() helper is src/lib/utils.ts, a file beside this folder. #lib/utils.js resolves to that file, while this folder has no index and its modules are imported by full path such as #lib/utils/text-roles.js.
