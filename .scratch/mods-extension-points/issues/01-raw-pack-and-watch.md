# 01: Raw pack on `ctx.app`, including `watch`

**What to build:** the plan's EP-01. Add unstable members to `MOD_APP`, with no contract edit: `addAfterSaveObserver`, `renameItem`, `moveItem`, `deleteItem`, `openOrCreateNote`, `railRegistryStore`, `settingsStore`, `saveFileByPath`, `syncExternalContentToEditor`, and `watch(read, onChange)`, which returns a disposer.

`watch` lives in a new `plugins/mods/mod-watch.svelte.ts` (pattern: `mod-theme.svelte.ts`) and follows the behavior in the plan: `$effect.root`, baseline read under `untrack`, `onChange` under `untrack`, both in try/catch, no call at subscribe, compare with `Object.is`.

Document each member in `help/documentation/28-mods.md`, including the risks the plan lists for `read`, `deleteItem`'s folder flag, and the `ctx.kb()` cost per index bump.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, in `src/tests/lib/plugins/mods/mod-app.service.test.ts`: each member is the real object; `watch` fires on change, not at subscribe, not when `updateContent` runs with `read` on `activeTabPath`; it survives a throw in `read` or `onChange` and stops after dispose.
- [ ] Host test: a mod's save observer sees a save and is gone after unload.
- [ ] No file under `core/` changes, and `layer-baseline.json` does not grow.
