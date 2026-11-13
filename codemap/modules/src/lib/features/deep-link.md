# module card src/lib/features/deep-link
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/deep-link ' codemap/modules
module src/lib/features/deep-link features files 4 in-modules 4 out-modules 8 pub 14/33 ipc 0/0 card ~1.8k
## neighbors
dep src/lib/app -> src/lib/features/deep-link 4
dep src/lib/features/note-action-bar -> src/lib/features/deep-link 1
dep src/lib/plugins/quick-capture -> src/lib/features/deep-link 2
dep src/routes -> src/lib/features/deep-link 1
dep src/lib/features/deep-link -> src/lib/core/editor 2
dep src/lib/features/deep-link -> src/lib/core/filesystem 2
dep src/lib/features/deep-link -> src/lib/core/frontmatter 2
dep src/lib/features/deep-link -> src/lib/core/note-creator 2
dep src/lib/features/deep-link -> src/lib/core/settings 1
dep src/lib/features/deep-link -> src/lib/core/vault 2
dep src/lib/features/deep-link -> src/lib/features/search 1
dep src/lib/features/deep-link -> src/lib/utils 2
in2 src/lib/features/deep-link 0 modules: -
out2 src/lib/features/deep-link 4 modules: src/lib/contracts(4) src/lib/core/markdown-editor(1) src/lib/core/trash(1) src/lib/features/rail-shell(1)
## entry files
entry src/lib/features/deep-link/deep-link.service.ts ext-in4 src/lib/app/deep-link-actions.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/plugins/quick-capture/quick-capture.service.ts src/routes/(app)/+layout.svelte
entry src/lib/features/deep-link/deep-link.logic.ts ext-in2 src/lib/app/deep-link-actions.ts src/lib/features/note-action-bar/note-action-bar.service.ts
entry src/lib/features/deep-link/deep-link.types.ts ext-in2 src/lib/app/deep-link-actions.ts src/lib/plugins/quick-capture/quick-capture.service.ts
## files
file src/lib/features/deep-link/deep-link.logic.ts logic L455 module src/lib/features/deep-link in3 t4
file src/lib/features/deep-link/deep-link.service.ts service L370 module src/lib/features/deep-link in4 t8
file src/lib/features/deep-link/deep-link.store.svelte.ts store L36 module src/lib/features/deep-link in1 t5
file src/lib/features/deep-link/deep-link.types.ts types L175 module src/lib/features/deep-link in5 t0
## public
sym src/lib/features/deep-link/deep-link.logic.ts:256 fn renderCaptureBody(action: CaptureAction): string L26 | Renders the markdown body for a v2 capture action.
sym src/lib/features/deep-link/deep-link.logic.ts:328 fn buildOpenNoteDeepLink(vaultName: string, vaultPath: string, notePath: string): string | null L5 | Builds the `kokobrain://open` link that opens `notePath` in the vault named `vaultName` (the inverse of the `open` branch of `parseDeepLinkUri`).
sym src/lib/features/deep-link/deep-link.logic.ts:385 fn injectTitleIntoContent(content: string, title: string): string L22 | Injects a `title` property into content's YAML frontmatter.
sym src/lib/features/deep-link/deep-link.logic.ts:419 fn injectTagsIntoContent(content: string, tags: string[]): string L37 | Injects tags into content's YAML frontmatter.
sym src/lib/features/deep-link/deep-link.service.ts:56 fn registerDeepLinkAction<T extends RegisteredDeepLinkActionType>(type: T, handler: DeepLinkActionHandler<T>): () => void L11 | Registers the handler of a deep-link action that needs code outside this feature (`daily`, `capture`); `src/lib/app/` wires them in.
sym src/lib/features/deep-link/deep-link.service.ts:85 fn registerDeepLinkListener(): () => void L31 | Registers a listener for deep-link URL events from the Tauri deep-link plugin.
sym src/lib/features/deep-link/deep-link.service.ts:182 fn executeAction(action: DeepLinkAction, vaultPath: string): Promise<boolean> L35 | Executes a deep-link action against the currently open vault.
sym src/lib/features/deep-link/deep-link.service.ts:223 fn resolveContent(action: { content?: string; clipboard?: boolean }): Promise<string> L11 | Resolves the actual content for a deep-link action.
sym src/lib/features/deep-link/deep-link.service.ts:242 fn saveOpenNoteBeforeWrite(path: string): Promise<boolean> L5 | Saves the open tab of `path` when it has unsaved typing, before a deep link writes the note from its disk copy and marks the tab saved (which would otherwise d…
sym src/lib/features/deep-link/deep-link.service.ts:353 fn executePendingAction(): Promise<void> L13 | Executes a pending deep-link action after vault initialization completes.
sym src/lib/features/deep-link/deep-link.service.ts:368 fn resetDeepLink(): void L3 | Resets all deep-link state.
sym src/lib/features/deep-link/deep-link.types.ts:49 interface DailyAction L11 | kokobrain://daily?vault=X — open or create today's daily note
sym src/lib/features/deep-link/deep-link.types.ts:72 type CaptureKind L1 | Capture kinds in the v2 capture schema.
sym src/lib/features/deep-link/deep-link.types.ts:162 type CaptureAction L6 | Discriminated union of v2 capture actions, branched by `kind`.
## stores
store src/lib/features/deep-link/deep-link.store.svelte.ts:11 deepLinkStore esc:0
## effects
fx-count tauri-clipboard-manager.readText 1
fx-count tauri-deep-link.getCurrent 1
fx-count tauri-deep-link.onOpenUrl 1
fx-count tauri-fs.exists 3
fx-count tauri-fs.mkdir 2
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.writeTextFile 4
## debt
-
