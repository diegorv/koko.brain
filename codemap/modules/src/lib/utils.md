# module card src/lib/utils
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/utils ' codemap/modules
sections: neighbors, entry files, files, public, effects, debt
module src/lib/utils utils files 29 in-modules 42 out-modules 2 pub 84/103 ipc 3/0 card ~9.2k
## neighbors
dep src/lib/app -> src/lib/utils 17
dep src/lib/core/editor -> src/lib/utils 7
dep src/lib/core/filesystem -> src/lib/utils 12
dep src/lib/core/frontmatter -> src/lib/utils 2
dep src/lib/core/markdown-editor -> src/lib/utils 22
dep src/lib/core/note-creator -> src/lib/utils 3
dep src/lib/core/settings -> src/lib/utils 16
dep src/lib/core/trash -> src/lib/utils 1
dep src/lib/core/vault -> src/lib/utils 4
dep src/lib/features/auto-organize -> src/lib/utils 6
dep src/lib/features/backlinks -> src/lib/utils 2
dep src/lib/features/canvas -> src/lib/utils 2
dep src/lib/features/collection -> src/lib/utils 9
dep src/lib/features/command-palette -> src/lib/utils 2
dep src/lib/features/copy-block-link -> src/lib/utils 1
dep src/lib/features/deep-link -> src/lib/utils 2
dep src/lib/features/dock-badge -> src/lib/utils 1
dep src/lib/features/event-calendar -> src/lib/utils 3
dep src/lib/features/file-history -> src/lib/utils 2
dep src/lib/features/file-icons -> src/lib/utils 2
dep src/lib/features/note-action-bar -> src/lib/utils 4
dep src/lib/features/note-list -> src/lib/utils 2
dep src/lib/features/outgoing-links -> src/lib/utils 2
dep src/lib/features/properties -> src/lib/utils 7
dep src/lib/features/quick-switcher -> src/lib/utils 1
dep src/lib/features/rail-shell -> src/lib/utils 11
dep src/lib/features/search -> src/lib/utils 7
dep src/lib/features/tags -> src/lib/utils 5
dep src/lib/features/tasks -> src/lib/utils 16
dep src/lib/features/todoist-sync -> src/lib/utils 9
dep src/lib/features/type-definitions -> src/lib/utils 1
dep src/lib/plugins/calendar -> src/lib/utils 3
dep src/lib/plugins/graph-view -> src/lib/utils 2
dep src/lib/plugins/kanban -> src/lib/utils 10
dep src/lib/plugins/mods -> src/lib/utils 9
dep src/lib/plugins/one-on-one -> src/lib/utils 5
dep src/lib/plugins/periodic-notes -> src/lib/utils 2
dep src/lib/plugins/queryjs -> src/lib/utils 8
dep src/lib/plugins/quick-capture -> src/lib/utils 3
dep src/lib/plugins/templates -> src/lib/utils 1
dep src/lib/utils.ts -> src/lib/utils 1
dep src/routes -> src/lib/utils 2
dep src/lib/utils -> src/lib/contracts 3
dep src/lib/utils -> src/lib/core/settings 3
in2 src/lib/utils 5 modules: src/lib/components(54) src/lib/core/layout(2) src/lib/core/status-bar(1) src/lib/plugins/table-of-contents(1) src/lib/plugins/word-count(1)
out2 src/lib/utils 0 modules: -
## entry files
entry src/lib/utils/debug.ts ext-in73 src/lib/app/LabsSection.svelte src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/app/global-keybindings.ts src/lib/app/lifecycle/app-lifecycle.service.ts more importers 68 not shown: src/lib/features/todoist-sync(7) src/lib/core/settings(6) src/lib/core/filesystem(5) +30 modules: q importers src/lib/utils/debug.ts
entry src/lib/utils/path.ts ext-in27 src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/core/editor/editor.logic.ts src/lib/core/filesystem/delete-note.service.ts src/lib/core/filesystem/fs.logic.ts more importers 22 not shown: src/lib/core/filesystem(3) src/lib/features/search(3) src/lib/features/tasks(3) +9 modules: q importers src/lib/utils/path.ts
entry src/lib/utils/date.ts ext-in15 src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts src/lib/features/collection/calendar.logic.ts src/lib/features/file-history/file-history.logic.ts src/lib/features/tasks/TaskLists.svelte src/lib/features/tasks/TasksView.svelte more importers 10 not shown: src/lib/features/tasks(4) src/lib/plugins/kanban(3) src/lib/plugins/calendar(1) +2 modules: q importers src/lib/utils/date.ts
entry src/lib/utils/log.service.ts ext-in13 src/lib/app/AppShell.svelte src/lib/app/boot.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/core/editor/editor.service.ts src/lib/core/note-creator/note-creator.service.ts more importers 8 not shown: src/lib/features/rail-shell(2) src/lib/plugins/queryjs(2) src/lib/core/settings(1) +3 modules: q importers src/lib/utils/log.service.ts
entry src/lib/utils/clamp.ts ext-in10 src/lib/core/editor/open-note-at.service.ts src/lib/core/settings/sections/FileHistorySection.svelte src/lib/core/settings/settings.logic.ts src/lib/features/auto-organize/AutoOrganizeSection.svelte src/lib/features/collection/expression/evaluator.ts more importers 5 not shown: src/lib/plugins/kanban(2) src/lib/plugins/queryjs(2) src/lib/features/rail-shell(1): q importers src/lib/utils/clamp.ts
entry src/lib/utils/color.ts ext-in7 src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts src/lib/core/settings/sections/ThemePreview.svelte src/lib/core/settings/theme-builder.logic.ts src/lib/core/settings/theme.logic.ts src/lib/core/settings/theme.service.ts more importers 2 not shown: src/lib/features/collection(1) src/lib/plugins/graph-view(1): q importers src/lib/utils/color.ts
entry src/lib/utils/tag-extraction.ts ext-in7 src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts src/lib/features/collection/collection.logic.ts src/lib/features/search/search.logic.ts src/lib/features/tasks/task-headings.logic.ts more importers 2 not shown: src/lib/features/tasks(1) src/lib/features/todoist-sync(1): q importers src/lib/utils/tag-extraction.ts
entry src/lib/utils/color-presets.ts ext-in6 src/lib/features/collection/expression/evaluator.ts src/lib/plugins/kanban/KanbanCard.svelte src/lib/plugins/kanban/KanbanCardText.svelte src/lib/plugins/kanban/KanbanListView.svelte src/lib/plugins/kanban/KanbanTableView.svelte more importers 1 not shown: src/lib/plugins/queryjs(1): q importers src/lib/utils/color-presets.ts
entry src/lib/utils/fuzzy-match.ts ext-in6 src/lib/core/filesystem/file-entries.logic.ts src/lib/core/markdown-editor/extensions/tag/completion.logic.ts src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts src/lib/core/markdown-editor/extensions/wikilink/completion.ts src/lib/features/command-palette/command-palette.logic.ts more importers 1 not shown: src/lib/plugins/mods(1): q importers src/lib/utils/fuzzy-match.ts
entry src/lib/utils/sanitize.ts ext-in6 src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts src/lib/features/canvas/canvas-markdown.logic.ts src/lib/features/collection/CollectionTableView.svelte src/lib/features/collection/collection-block-widget.ts src/lib/features/file-icons/IconRenderer.svelte more importers 1 not shown: src/lib/features/search(1): q importers src/lib/utils/sanitize.ts
entry src/lib/utils/font-stacks.ts ext-in5 src/lib/core/markdown-editor/extensions/live-preview/styles.ts src/lib/core/markdown-editor/highlight-styles.ts src/lib/core/markdown-editor/setup/editor-theme.ts src/lib/core/settings/sections/EditorSection.svelte src/lib/plugins/queryjs/kb-ui.ts
entry src/lib/utils/frontmatter-aliases.ts ext-in5 src/lib/core/frontmatter/properties.logic.ts src/lib/core/markdown-editor/extensions/live-preview/widgets.ts src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/auto-organize.logic.ts src/lib/features/properties/properties.service.ts
entry src/lib/utils/inflight.ts ext-in5 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/core/vault/vault-entries.service.ts src/lib/features/backlinks/backlinks.service.ts src/lib/features/outgoing-links/outgoing-links.service.ts src/lib/plugins/mods/mods-host.service.ts
entry src/lib/utils/keybindings.ts ext-in5 src/lib/app/global-keybindings.ts src/lib/core/markdown-editor/MarkdownEditor.svelte src/lib/core/markdown-editor/setup/editor-extensions.ts src/lib/features/command-palette/CommandPalette.svelte src/lib/features/note-list/NoteRowMenu.svelte
entry src/lib/utils/platform.ts ext-in5 src/lib/core/markdown-editor/MarkdownEditor.svelte src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts src/lib/core/markdown-editor/extensions/live-preview/widgets.ts src/lib/core/markdown-editor/wikilink-click-target.ts src/lib/plugins/queryjs/kb-api.ts
entry src/lib/utils/sanitize-url.ts ext-in5 src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts src/lib/core/markdown-editor/extensions/live-preview/widgets.ts src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts src/lib/features/canvas/LinkNode.svelte src/lib/features/tasks/tasks.logic.ts
entry src/lib/utils/debounce.ts ext-in4 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/core/editor/editor.service.ts src/lib/features/rail-shell/TypesNavigator.svelte src/lib/features/tags/tags.service.ts
entry src/lib/utils/tag-colors.ts ext-in4 src/lib/features/properties/PropertyField.svelte src/lib/features/tags/TagColorPicker.svelte src/lib/features/tags/TagItem.svelte src/lib/features/tags/TagsView.svelte
entry src/lib/utils/capture-path.ts ext-in3 src/lib/features/rail-shell/lens.logic.ts src/lib/plugins/calendar/day-lens.logic.ts src/lib/plugins/quick-capture/note-composer.logic.ts
entry src/lib/utils/index-dedupe.ts ext-in3 src/lib/app/lifecycle/index-updater.service.ts src/lib/core/editor/editor.hooks.ts src/lib/core/filesystem/note-change.service.ts
entry src/lib/utils/note-date.ts ext-in3 src/lib/features/rail-shell/lens.logic.ts src/lib/plugins/calendar/day-lens.logic.ts src/lib/plugins/one-on-one/one-on-one.logic.ts
entry src/lib/utils/task-tokens.ts ext-in3 src/lib/features/tasks/TasksView.svelte src/lib/features/tasks/task-row-edit.logic.ts src/lib/features/todoist-sync/task-line.logic.ts
entry src/lib/utils/menu-action.types.ts ext-in2 src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/rail-shell.types.ts
entry src/lib/utils/template.ts ext-in2 src/lib/core/note-creator/note-creator.service.ts src/lib/plugins/quick-capture/note-composer.logic.ts
entry src/lib/utils/app-channel.ts ext-in1 src/lib/core/settings/settings.service.ts
entry src/lib/utils/build-info.js ext-in1 src/lib/core/settings/BuildInfo.svelte
entry src/lib/utils/text-roles.ts ext-in1 src/lib/utils.ts
## files
file src/lib/utils/app-channel.ts other L17 module src/lib/utils in1 t1
file src/lib/utils/build-info.js other L162 module src/lib/utils in1 t1
file src/lib/utils/capture-path.ts other L14 module src/lib/utils in3 t1
file src/lib/utils/clamp.ts other L9 module src/lib/utils in10 t1
file src/lib/utils/color-presets.ts other L30 module src/lib/utils in6 t1
file src/lib/utils/color.ts other L159 module src/lib/utils in7 t6
file src/lib/utils/date.ts other L170 module src/lib/utils in16 t3
file src/lib/utils/debounce.ts other L55 module src/lib/utils in4 t4
file src/lib/utils/debug.ts other L166 module src/lib/utils in73 t53
file src/lib/utils/font-stacks.ts other L56 module src/lib/utils in5 t5 | Font stacks shared by every place that sets a `font-family` from TypeScript, so code and app text render in one face per role on every machine.
file src/lib/utils/frontmatter-aliases.ts other L31 module src/lib/utils in5 t6
file src/lib/utils/fuzzy-match.ts other L41 module src/lib/utils in6 t2
file src/lib/utils/index-dedupe.ts other L39 module src/lib/utils in3 t33
file src/lib/utils/inflight.ts other L173 module src/lib/utils in5 t1
file src/lib/utils/keybindings.ts other L81 module src/lib/utils in5 t4
file src/lib/utils/log.service.ts service L236 module src/lib/utils in14 t46
file src/lib/utils/menu-action.types.ts types L21 module src/lib/utils in2 t0
file src/lib/utils/node-shims/fs.js other L3 module src/lib/utils in0 t0
file src/lib/utils/node-shims/path.js other L4 module src/lib/utils in0 t0
file src/lib/utils/note-date.ts other L57 module src/lib/utils in3 t1
file src/lib/utils/path.ts other L123 module src/lib/utils in27 t1
file src/lib/utils/platform.ts other L40 module src/lib/utils in5 t4
file src/lib/utils/sanitize-url.ts other L15 module src/lib/utils in5 t1
file src/lib/utils/sanitize.ts other L86 module src/lib/utils in6 t1
file src/lib/utils/tag-colors.ts other L44 module src/lib/utils in4 t1
file src/lib/utils/tag-extraction.ts other L152 module src/lib/utils in7 t4
file src/lib/utils/task-tokens.ts other L128 module src/lib/utils in3 t3 | Due date and priority token patches on a task text (Rust `Task.text`, the part after `[ ] `).
file src/lib/utils/template.ts other L216 module src/lib/utils in2 t4
file src/lib/utils/text-roles.ts other L6 module src/lib/utils in1 t1
## public
sym src/lib/utils/app-channel.ts:15 fn getBuildChannel(): ReleaseChannel L3 | Read the build-time `__APP_CHANNEL__` define safely.
sym src/lib/utils/capture-path.ts:9 fn buildCaptureFolder(vaultPath: string, baseFolder: string, folderFormat: string, date: dayjs.Dayjs): string L6 | The folder a quick note (Cmd+N) lands in: vaultPath / baseFolder / folderFormat(date).
sym src/lib/utils/clamp.ts:7 fn clamp(value: number, min: number, max: number): number L3 | Clamps `value` into the inclusive range `[min, max]`.
sym src/lib/utils/color-presets.ts:23 const COLOR_PRESET_BG: Record<string, string> L3 | Named color presets with background (low opacity) variant.
sym src/lib/utils/color-presets.ts:28 const COLOR_PRESET_TEXT: Record<string, string> L3 | Named color presets with full opacity for text/bars.
sym src/lib/utils/color.ts:48 fn flatten(color: string, base: string): string | null L7 | Composites `color` (alpha honored) over the opaque `base` into a 6-digit hex; null when either is unparseable.
sym src/lib/utils/color.ts:71 fn isDarkColor(color: string): boolean | null L4 | True when a background color is dark (WCAG relative luminance below 0.2), false when light, null when the value is not a hex, rgb() or oklch() color.
sym src/lib/utils/color.ts:81 fn contrastRatio(a: string, b: string): number | null L8 | WCAG contrast ratio of foreground `a` on background `b`, with a translucent `a` composited over `b` (`b`'s own alpha is ignored; flatten it first).
sym src/lib/utils/color.ts:127 fn ensureContrast(fg: string, bg: string, min: number): string L20 | Returns `fg` moved in OKLab toward white or black by the smallest 1% step that reaches `min` contrast on `bg`, keeping its hue family and any 8-digit alpha suf…
sym src/lib/utils/color.ts:152 fn mixColors(a: string, b: string, t = 0.5): string | null L8 | OKLab mix of two colors as a 6-digit hex (alpha ignored): `t` is the share of `b`, 0.5 (the midpoint) by default.
sym src/lib/utils/date.ts:15 fn formatNow(outputFormat: string, offsetDays: number = 0): string L3 | Returns the current datetime formatted, with an optional day offset.
sym src/lib/utils/date.ts:42 fn formatDate(date: dayjs.ConfigType, format: string): string L3 | Formats a date value (string, Date, dayjs, etc.) into the given format string.
sym src/lib/utils/date.ts:92 fn formatToCapturingRegex(format: string): RegExp L36 | Converts a dayjs format string into an anchored regex (`^...$`) with named capture groups.
sym src/lib/utils/date.ts:136 fn formatDateWithOffset(referenceDate: string, inputFormat: string, outputFormat: string, offsetDays: number, useCurrentTime: boolean = false)… L35 | Parses a reference date string using the given input format, applies a day offset, and returns the result in the output format.
sym src/lib/utils/debounce.ts:12 fn debounce<T extends (...args: any[]) => void>(fn: T, delay: number, options: DebounceOptions = {}): ((...args: Parameters<T>) =>… L44 | Creates a debounced version of a function that delays execution until after the given delay in ms.
sym src/lib/utils/debug.ts:16 fn debug(tag: string, ...args: unknown[]): void L7 | Logs a debug message to the console when debug mode is enabled in settings.
sym src/lib/utils/debug.ts:27 fn error(tag: string, ...args: unknown[]): void L7 | Logs an error message to the console.
sym src/lib/utils/debug.ts:41 fn timeAsync<T>(tag: string, label: string, fn: () => Promise<T>): Promise<T> L11 | Times an async operation and logs the elapsed time via debug().
sym src/lib/utils/debug.ts:57 fn timeSync<T>(tag: string, label: string, fn: () => T): T L11 | Times a synchronous operation and logs the elapsed time via debug().
sym src/lib/utils/debug.ts:73 fn perfStart(): number L4 | Starts a performance measurement.
sym src/lib/utils/debug.ts:80 fn perfEnd(tag: string, label: string, start: number): void L5 | Ends a performance measurement and logs the elapsed time via debug().
sym src/lib/utils/debug.ts:90 fn perfBaseline(label: string, start: number): void L5 | Writes a stable PERF-BASELINE log line consumed by `scripts/perf-baseline.py`.
sym src/lib/utils/debug.ts:105 fn setTauriDebugMode(enabled: boolean): Promise<void> L14 | Enables or disables Tauri backend debug logging.
sym src/lib/utils/debug.ts:148 fn stopTauriDebugListener(): void L7 | Stops listening for Tauri debug log events.
sym src/lib/utils/debug.ts:159 fn logProcessMemory(): Promise<void> L8 | Queries the Rust backend for the current process RSS and logs it via debug().
sym src/lib/utils/font-stacks.ts:7 const MONO_FONT_STACK L1 | Monospace stack for inline code, code blocks and code-like labels.
sym src/lib/utils/font-stacks.ts:13 const APP_SANS_FONT_STACK L1 | App sans stack.
sym src/lib/utils/font-stacks.ts:39 fn quoteFontFamily(value: string): string L8 | Makes a `font-family` value safe for CSS.
sym src/lib/utils/font-stacks.ts:53 fn editorFontFamily(value: string): string L4 | The editor `font-family`: the user's value (quoted when it is a single name) followed by the app sans stack, so a font the machine lacks falls back to the syst…
sym src/lib/utils/frontmatter-aliases.ts:29 fn canonicalizeKey(key: string): string L3 | Returns the canonical key name if the input matches a known alias, otherwise returns the input unchanged.
sym src/lib/utils/fuzzy-match.ts:8 fn fuzzyMatch(query: string, target: string): FuzzyMatchResult L34 | Performs a fuzzy match of query against target.
sym src/lib/utils/index-dedupe.ts:19 fn isAlreadyIndexed(path: string, content: string): boolean L3 | Returns true if the given (path, content) was the most recent input to the shared updaters.
sym src/lib/utils/index-dedupe.ts:26 fn markIndexed(path: string, content: string): void L3 | Records that the given (path, content) has just been sent through the shared updaters.
sym src/lib/utils/index-dedupe.ts:32 fn clearIndexedEntry(path: string): void L3 | Removes the signature for a path.
sym src/lib/utils/index-dedupe.ts:37 fn clearAllIndexed(): void L3 | Drops every signature.
sym src/lib/utils/inflight.ts:27 fn dedupeInflight<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>, keyFn: (...args: TArgs) => string): (...ar… L21 | Wraps an async function so that concurrent calls sharing the same derived key collapse into a single in-flight Promise.
sym src/lib/utils/inflight.ts:65 fn serializeWithRerun(task: () => Promise<void>): () => Promise<void> L23 | Wraps an async task so runs never overlap.
sym src/lib/utils/inflight.ts:124 fn versionGated<T>(fn: () => Promise<T>, versionOf: () => number): VersionGated<T> L32 | Memoizes a single-value async read, keyed on a monotonic version the caller supplies.
sym src/lib/utils/inflight.ts:171 fn isStillCurrentPath(fetchedPath: string, currentPath: string | null): boolean L3 | Returns true when the IPC result fetched for `fetchedPath` is still relevant to `currentPath` (the active tab): either no tab is active (e.g. headless tests) o…
sym src/lib/utils/keybindings.ts:2 interface KeyBinding L9 | Describes a keyboard shortcut with modifier keys and a handler callback.
sym src/lib/utils/keybindings.ts:13 type KeyCombo L1 | The key and modifiers of a binding, without its handler.
sym src/lib/utils/keybindings.ts:19 fn toCodeMirrorKey(combo: KeyCombo & { key: string }): string L9 | Writes a combo as a CodeMirror keymap key (`Mod-Shift-l`).
sym src/lib/utils/keybindings.ts:40 fn formatShortcut(combo: KeyCombo): string L15 | Writes a combo as the macOS hint shown next to a command or menu item (`⌘⇧L`): modifiers in the order Ctrl, Cmd, Shift, Option, then the key.
sym src/lib/utils/keybindings.ts:57 fn registerKeybinding(binding: KeyBinding): () => void L25 | Registers a global keyboard shortcut.
sym src/lib/utils/log.service.ts:58 fn initLogSession(): Promise<void> L17 | Initializes a log session by creating the logs directory and setting the active log file path.
sym src/lib/utils/log.service.ts:79 fn appendLog(tag: string, ...args: unknown[]): void L11 | Appends a tagged log entry to the active log file.
sym src/lib/utils/log.service.ts:111 fn teardownLogSession(): void L6 | Tears down the active log session: writes the buffered lines, then clears the log file path and cached directory.
sym src/lib/utils/log.service.ts:131 fn startHeartbeat(): void L18 | Starts a 250 ms heartbeat that emits a `[HB]` log line each tick.
sym src/lib/utils/log.service.ts:159 fn stopHeartbeat(): void L10 | Stops the heartbeat.
sym src/lib/utils/log.service.ts:218 fn isLogSessionActive(): boolean L3 | Returns whether a log session is currently active.
sym src/lib/utils/log.service.ts:229 fn openLogDir(): Promise<void> L8 | Opens the system log directory in the file manager.
sym src/lib/utils/menu-action.types.ts:10 interface MenuActionItem L12 | A flat action in note-row or folder menus; rendering reads data only.
sym src/lib/utils/note-date.ts:31 fn parseDateKey(value: unknown): string | null L14 | Parses a frontmatter date value into a 'YYYY-MM-DD' key in local time.
sym src/lib/utils/note-date.ts:51 fn noteDateKey({ date, created, diskCreatedAt }: NoteDateSources): string | null L7 | The day a note belongs to (the PRD's "note date"): frontmatter `date`, else frontmatter `created`, else the disk creation time.
sym src/lib/utils/path.ts:5 fn normalizePath(path: string): string L14 | Normalizes a path by resolving `.` and `..` segments.
sym src/lib/utils/path.ts:33 fn resolveFilePath(vaultPath: string, file: string): string L21 | Resolves a relative file path against a vault root, normalizing path segments and ensuring the result stays within the vault.
sym src/lib/utils/path.ts:64 fn basename(path: string): string L3 | Extracts the last segment of a path, extension included.
sym src/lib/utils/path.ts:79 fn stem(path: string): string L5 | Extracts the last segment of a path without its extension.
sym src/lib/utils/path.ts:98 fn relativePath(vaultPath: string, filePath: string): string L6 | Strips the vault root prefix from an absolute path to produce a vault-relative path.
sym src/lib/utils/path.ts:120 fn vaultRelativeKey(vaultPath: string, filePath: string): string | null L4 | Derives the vault-relative key that the FTS5 and semantic tables index on.
sym src/lib/utils/platform.ts:23 const IS_MAC = detectMac(…) L1 | True when the app runs on macOS.
sym src/lib/utils/platform.ts:30 fn isOpenLinkModifier(e: LinkClickModifiers, mac: boolean): boolean L3 | True when a click carries the platform's "open link" modifier: Cmd on macOS, Ctrl on Windows/Linux.
sym src/lib/utils/platform.ts:38 fn isMacContextClick(e: LinkClickModifiers, mac: boolean): boolean L3 | True for a macOS Ctrl+click.
sym src/lib/utils/sanitize-url.ts:5 fn isSafeUrl(url: string): boolean L11 | Returns true if the URL is safe to open or use as a resource src
sym src/lib/utils/sanitize.ts:7 fn sanitizeHtml(html: string): string L25 | Sanitizes arbitrary HTML allowing a safe rich-text subset.
sym src/lib/utils/sanitize.ts:38 fn sanitizeSvgContent(svgInner: string): string L14 | Sanitizes SVG inner content (paths, circles, etc.) for use inside a trusted <svg> element.
sym src/lib/utils/sanitize.ts:57 fn sanitizeSnippetHtml(html: string): string L16 | Sanitizes an FTS5 snippet string that may contain <mark> tags.
sym src/lib/utils/sanitize.ts:77 fn sanitizeMermaidSvg(svg: string): string L10 | Sanitizes mermaid SVG output.
sym src/lib/utils/tag-colors.ts:12 const TAG_COLOR_PRESET_ENTRIES L1 | All preset color entries as [name, hex] tuples for iteration
sym src/lib/utils/tag-colors.ts:19 fn getTagColor(tagPath: string, colorMap: Record<string, string>): string | undefined L6 | Looks up the color for a tag from the color map.
sym src/lib/utils/tag-colors.ts:31 fn setTagColor(colorMap: Record<string, string>, tagPath: string, color: string | undefined): Record<string, string> L14 | Returns an updated color map with the given tag color set or removed.
sym src/lib/utils/tag-extraction.ts:7 const INLINE_TAG_NAME_SOURCE L1 | The tag name after `#` in the inline tag rule (a letter or `_`, then letters, digits, `_`, `/` and `-`), as a `u`-flag regex source.
sym src/lib/utils/tag-extraction.ts:49 fn extractFrontmatterTags(content: string): string[] L43
sym src/lib/utils/tag-extraction.ts:125 fn findInlineTags(text: string): InlineTagMatch[] L11 | Every inline `#tag` in `text`, in order, duplicates included, by the indexer's rule (`vault/parsing.rs::extract_inline_tags` mirrors it): `#` at line start or …
sym src/lib/utils/tag-extraction.ts:137 fn extractAllTags(content: string): string[] L16
sym src/lib/utils/task-tokens.ts:17 type PriorityEmoji L1 | One of the priority signifier emojis.
sym src/lib/utils/task-tokens.ts:43 fn trailingBlockId(text: string): string | null L3 | The block id that ends a task text (` ^id`, trailing whitespace allowed), without its space; null without one.
sym src/lib/utils/task-tokens.ts:61 interface Span L6 | A `[from, to)` span of task text.
sym src/lib/utils/task-tokens.ts:69 fn removeSpans(text: string, spans: readonly Span[]): string L3 | Removes the given spans, right to left so offsets stay valid.
sym src/lib/utils/task-tokens.ts:91 fn insertToken(text: string, token: string): string L11 | Inserts a token before the first `🆔`; without one, before a block id that ends the text, so `^id` stays last and keeps resolving; otherwise at the end before …
sym src/lib/utils/task-tokens.ts:108 fn setDueToken(text: string, date: string | null): string L7 | Sets the `📅 YYYY-MM-DD` due date, or removes every one when `date` is null.
sym src/lib/utils/task-tokens.ts:122 fn setPriorityToken(text: string, emoji: PriorityEmoji | null): string L7 | Sets the priority emoji, or removes every one when `emoji` is null.
sym src/lib/utils/template.ts:22 fn processTemplate(template: string, fileTitle: string, customVariables?: Record<string, string>, contextDate?: Dayjs): string L10 | Processes a Templater-compatible template string.
sym src/lib/utils/text-roles.ts:6 const TEXT_ROLES L1 | Named font sizes of the app chrome, defined as `--text-<role>` in the `@theme` block of `src/app.css` (which holds the values and their meaning).
## effects
fx-count dom.keydown 1
fx-count dom.pointerdown 1
fx-count dom.visibilitychange 1
fx-count tauri-api-path.appLogDir 1
fx-count tauri-fs.exists 2
fx-count tauri-fs.mkdir 2
fx-count tauri-fs.writeTextFile 1
fx-count tauri-opener.openPath 1
fx-count timer.requestAnimationFrame 1
fx-count timer.setInterval 1
fx-count timer.setTimeout 4
ipc-count ipc:get_process_memory 1
ipc-count ipc:set_main_thread_heartbeat 1
ipc-count ipc:set_tauri_debug_mode 1
## debt
debt src/lib/utils/app-channel.ts -> src/lib/core/settings/settings.types.ts
debt src/lib/utils/debug.ts -> src/lib/core/settings/sentry.service.ts
debt src/lib/utils/debug.ts -> src/lib/core/settings/settings.store.svelte.ts
