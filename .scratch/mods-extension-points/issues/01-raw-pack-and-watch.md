# 01: `ctx.watch`, `ctx.onNoteSaved`, vault path methods and a raw pack

**What to build:** the plan's EP-01, as changed by its section 12: what can have a stable shape goes in contract v1, and only the app's internals stay raw.

## Contract v1 (additive, frozen by `mod-api-contract.test.ts`)

```ts
ctx.watch: <T>(read: () => T, onChange: (value: T) => void) => () => void;
ctx.onNoteSaved: (callback: (path: string) => void) => () => void; // vault-relative path
ctx.vault.rename: (path: string, newName: string) => Promise<string>; // resolves to the new path
ctx.vault.move: (path: string, targetFolder: string) => Promise<string>; // resolves to the new path
ctx.vault.delete: (path: string) => Promise<void>; // file or folder, detected by the host
```

- **`ctx.watch`:** a new `plugins/mods/mod-watch.svelte.ts` (pattern: `mod-theme.svelte.ts`). `$effect.root`, baseline read under `untrack`, `read` tracked, `onChange` under `untrack`, both in try/catch, no call at subscribe, compare with `Object.is`. Removed at unload. Document the plan's warnings: reading `activeTab.content` re-runs per keystroke, and `ctx.kb()` in a handler rebuilds every page per index bump.
- **`ctx.onNoteSaved`:** wraps `addAfterSaveObserver`. It defers with `setTimeout(0)`, so a slow callback cannot delay the other observers, catches a throw into the mod's debug log, and is removed at unload. Document that a callback using `ctx.vault.write` can loop, since write has no equality guard, and that the Labs switch stops it.
- **`ctx.vault.rename`, `move`, `delete`:** over `renameItem`, `moveItem` and `deleteItem` (`core/filesystem/fs.service.ts:280,307,246`), converting vault-relative paths in and out and validating them like the other `ctx.vault` methods. They add no new write path. `delete` detects a folder itself, because `deleteItem(path)` defaults to file and then skips the child re-key. Read what `moveItem` resolving to `null` means: `move` must not hand a mod a silent `null`.

## Raw on `ctx.app` (unstable, in `MOD_APP`)

`railRegistryStore`, `settingsStore`, `openOrCreateNote`, `saveFileByPath`, `syncExternalContentToEditor`. The contract imports nothing from the app, so these cannot go in it as they are.

## Docs

Update `help/documentation/28-mods.md`: the new contract members, and one table row per raw member.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first. `ctx.watch`: fires on change, not at subscribe, not when `updateContent` runs with `read` on `activeTabPath`; survives a throw in `read` or `onChange`; stops after its disposer and after unload.
- [ ] `ctx.onNoteSaved`: gets the vault-relative path of a real save, after the sync observers ran; a throw does not reach the others or Sentry; gone after unload.
- [ ] `ctx.vault.rename`, `move`, `delete`, with Tauri mocked: relative paths in and out; an invalid path rejects; `delete` on a folder re-keys its children; a call after unload rejects.
- [ ] `mod-api-contract.test.ts` freezes the new members. Each raw member in a new `mod-app.service.test.ts` is the real object.
- [ ] No file under `core/` changes, and `layer-baseline.json` does not grow.
