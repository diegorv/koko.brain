# 13 discovery: dirty-safe, path-addressed frontmatter writer

## Files that change

- `src/lib/features/properties/frontmatter-write.service.ts` (new): `FrontmatterWriteError` (`reason: LossyFrontmatterReason | 'save-failed' | 'vault-changed' | 'missing'`) and `updateNoteFrontmatter(path, mutate)`.
- `src/tests/lib/features/properties/frontmatter-write.service.test.ts` (new).
- Nothing else. `editor.service.ts` and `file-icons/frontmatter-icon.service.ts` stay untouched.

## Reused APIs

- `properties.logic.ts`: `detectLossyFrontmatter` (`:231`), `parseFrontmatterProperties` (`:180`, returns clones of the cached parse, so `mutate` may mutate in place), `extractBody` (`:33`), `rebuildContent` (`:389`).
- `editor.service.ts`: `syncExternalContentToEditor` (`:38-59`; `'none'` arms no timer, `:184-192`), `saveFileByPath` (`:132-149`; returns `true` without writing for a clean tab, `false` + toast on write failure).
- `editor.hooks.ts:69-95` `notifyAfterSave`; `vaultStore.path` (`vault.store.svelte.ts:54`).
- `properties.service.ts:1-2` already imports `editorStore` and `editor.service` from this folder, so no new layer edge.

## Plan

1. Tests first (red: module missing), the three race tests first per Notes C2 / Q5: dirty-tab preservation, tab opened while the read is pending, deleted between read and write. Then the rest of the plan's list.
2. Implementation: an internal `attempt(path, mutate, vault, mayRestart)`. Steps 2-6 of plan Task 12 in order; a `assertVault(vault)` after every `await` (read, `exists`, `writeTextFile`, `saveFileByPath`). No-tab branch: `await exists` -> vault check -> synchronous tab lookup -> `writeTextFile`. A tab found there restarts `attempt` once with `mayRestart = false` (the tab branch has no await before its sync, so a second restart cannot be needed).
3. One `feat(properties)` commit (the ticket asks for one), then the implement comment.

## Test seams

- Mock `@tauri-apps/plugin-fs` (`readTextFile`, `writeTextFile`, `exists`) over an in-memory `Map` so "the fs holds no file at the old path" is a real assertion; `@tauri-apps/api/core` `invoke`; `svelte-sonner`. Real `editorStore`, `vaultStore` (`open` / `_reset`).
- `notifyAfterSave` effects: `isAlreadyIndexed(path, next)` (dedupe), `areAllRecentSaves([path])`, `invoke('update_note_in_index', ...)`, an `addAfterSaveObserver` observer receiving `next`, and a consumer registered with `registerNoteChangeConsumer`. Prior art: `note-change.service.test.ts:46-70`, `editor.service.test.ts:48-90`.
- Races: a deferred `readTextFile` / `exists` promise; the test adds a tab, deletes the file or calls `vaultStore.open(other)` before resolving.

## Defaults for open questions

- After `writeTextFile` resolves on a switched vault, `vault-changed` is thrown and no sync / `notifyAfterSave` runs (the rule "before the next side effect" applied literally).
- After a failed `saveFileByPath`, the vault check runs first; on a switched vault `vault-changed` wins over the restore (the tabs belong to the old vault).
- Read errors at step 2 propagate unwrapped (not a `FrontmatterWriteError`), as the ticket says.

## Risks

- `editor.service` import pulls in queryjs / kanban modules; the editor.service test already loads them in vitest.
- `recentSaves` and the dedupe map are module state: `resetHooks()` and `clearAllIndexed()` in `beforeEach`, distinct paths per case.
