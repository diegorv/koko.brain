---
summary: "Parses kokobrain:// URIs and dispatches open, new, search, daily and capture actions against the open vault."
---

## Responsibility

Owns the kokobrain:// contract: typed action and capture schemas, the URI parser, and pure helpers that render capture bodies, inject title and tags into frontmatter, and build open links. At runtime it listens to URLs from the Tauri deep-link plugin, serializes their dispatch, resolves the target vault by name, and executes open, new and search itself. Daily and capture are delegated to handlers registered from src/lib/app. It does not own vault switching, the editor, the quick-capture composer UI, or the Rust clipboard capture pipeline.

## Key files

- `src/lib/features/deep-link/deep-link.types.ts`: Discriminated unions DeepLinkAction and CaptureAction (by kind), and ParseResult.
- `src/lib/features/deep-link/deep-link.logic.ts`: parseDeepLinkUri, renderCaptureBody, injectTitleIntoContent, injectTagsIntoContent, buildOpenNoteDeepLink; no Tauri imports.
- `src/lib/features/deep-link/deep-link.service.ts`: Listener registration, URL dispatch queue, vault resolution, action execution, pending action execution, handler registry.
- `src/lib/features/deep-link/deep-link.store.svelte.ts`: deepLinkStore: single pending-action slot used across a vault switch.
- `src/lib/app/deep-link-actions.ts`: Registers the daily and capture handlers, because a feature may not import a plugin.
- `src-tauri/src/quick_capture/commands.rs`: Builds CaptureAction-shaped JSON from clipboard captures; field names must match deep-link.types.ts.

## State

- deepLinkStore.pendingAction: module-level $state, one slot, cleared by consumePendingAction and reset.
- dispatchQueue: module-level promise chain in deep-link.service.ts that serializes URL dispatch.
- actionHandlers: module-level Map holding the daily and capture handlers registered from src/lib/app.
- No persisted state of its own. new, append, prepend and overwrite write note files in the open vault through @tauri-apps/plugin-fs.

## Collaborators

- `event:onOpenUrl`: Frontend callback of the Tauri deep-link plugin, plus getCurrent for cold-start URLs. The event name belongs to the plugin.
- `src/lib/core/vault`: vaultStore.recentVaults and path; switchVault for cross-vault actions.
- `src/lib/core/editor`: openFileInEditor, saveFileByPath, syncExternalContentToEditor, and markRecentSave and notifyAfterSave from the hooks.
- `src/lib/core/note-creator`: openOrCreateNote and explicit-organization helpers for the non-silent new path.
- `src/lib/core/filesystem`: addToTree and isMarkdownFile after writing notes.
- `src/lib/core/settings`: settingsStore.explicitOrganization.
- `src/lib/core/frontmatter`: Parse, extract and rebuild helpers and the Property type.
- `src/lib/features/search`: openSearch for the search action. Part of a known feature cycle pinned in src/tests/lib/architecture/feature-cycle.test.ts.
- `src/lib/plugins/quick-capture`: quick-capture.service calls executeAction and imports CaptureAction and CaptureKind.
- `src/lib/features/note-action-bar`: Calls buildOpenNoteDeepLink to copy an open link.
- `src/lib/app`: deep-link-actions.ts registers handlers; boot registers them; app-lifecycle runs executePendingAction after vault init and resetDeepLink on teardown.
- `src/routes/(app)`: +layout.svelte calls registerDeepLinkListener and runs its cleanup.
- `src/lib/utils`: vaultRelativeKey and resolveFilePath from utils/path (deep-link.logic re-exports resolveFilePath); debug and error.

## Gotchas

- There is no Rust deep-link module. quick_capture builds CaptureAction JSON, so renaming a CaptureAction field needs a matching Rust change.
- Daily and capture handlers live in src/lib/app/deep-link-actions.ts because features may not import plugins. With no handler registered, runRegisteredAction throws and executeAction logs, toasts and returns false.
- Only URL events go through the dispatch queue. executeAction and executePendingAction do not, so the quick-capture composer path and pending-action path run outside it.
- A cross-vault action is stored in deepLinkStore before switchVault runs. If the switch is cancelled, the pending action is consumed and dropped so it never runs against the wrong vault.
- Vault resolution is a case-insensitive name match against vaultStore.recentVaults. A vault not in the recent list cannot be targeted.
- Before prepend, append or overwrite, the open tab of the target note is saved. If that save fails, the write is skipped.
- The new action writes with raw writeTextFile. src/tests/lib/raw-write-ratchet.test.ts allowlists each write site, so a new raw write needs a new allowlist entry.
- A silent new never overwrites an existing file; overwrite=true is required.
- parseDeepLinkUri rejects capture URIs without v=2. The staged flag for screenshots is set only by the in-app Quick Capture payload, never by the parser.
- The feature-to-feature edge to search is pinned by the feature cycle test, and the reverse edge would fail it.
