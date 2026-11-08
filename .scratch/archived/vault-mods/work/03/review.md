VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first: — every sub-item has a passing test in the branch (evidence per sub-item under "Sub-item evidence" below); red-first order is the builder's claim, not re-verified, though the builder states the icon test fails without the preload call.

## Sub-item evidence

- `rail-registry.store.test.ts`: `registerAction` adds; unregister by identity removes only that entry. — `src/tests/lib/features/rail-shell/rail-registry.store.test.ts` "registers actions in order, replaces one by key, and unregisters only that entry by identity": the replaced entry's unregister (`offOld`) leaves the new same-key entry; `rail-registry.store.svelte.ts:79-84`.
- `rail-registry.store.test.ts`: `reset()` also clears actions. — "reset() also clears the actions", plus the initial-empty check; `rail-registry.store.svelte.ts:92`.
- `Rail.test.ts`: an action button renders its label, calls `run` on click, never `onSelect`, and has no `aria-current`; an unknown icon falls back. — `Rail.test.ts` "labels the button, calls run on click, never onSelect, and has no aria-current" (mounted with `activeItem` = the action key, so a highlight would show) and "falls back to the puzzle glyph for an unknown or invalid icon"; `Rail.svelte:182-198`.
- Icon loading in a **new test file without the `file-icons.icon-data.js` mock** that `Rail.test.ts:4-8` installs (with that mock, the test passes even if `preloadPacks` is never called): a `lucide:` button in a vault where no note uses lucide renders the fallback first, then its SVG after the real `preloadPacks(['lucide'])` resolves. — new `src/tests/lib/plugins/mods/mod-rail-icon.test.ts`, no icon-data mock, real host + real Rail: asserts `lucide-puzzle` after start, then a non-fallback SVG and `packVersion > 0` after the real load; host call at `mods-host.service.ts:145-148`, wiring through the `file-icons.service.ts` re-export.
- `mods-host.service.test.ts`: after load the registry holds `mod:hello:main`; after unload it is empty; a duplicate action id records an error. — "registers the rail button under mod:<mod>:<button> and removes it at unload", "a duplicate action id records a load error and leaves no button behind" (error row, toast, empty registry), plus duplicate button id, disposers, malformed input and post-unload throws.
- `mod-picker.store.test.ts`: open, close, the current actions, every getter. — new `mod-picker.store.test.ts` covers `isOpen`, `modId`, `title`, `actions` closed/open/after close, replace on second open, empty list, `closeForMod` both ways.
- Picker component test (jsdom, real stores): lists the actions; picking one runs it; a throwing action shows the error toast; unloading the mod while its picker is open closes it. — new `ModActionPicker.test.ts` with the real host, registry and picker store (only plugin-fs and sonner mocked): rows with title and description, click runs and closes, `toast.error('Hello mod: Explode failed: kaboom')`, `disableMod('hello')` closes it and empties the registry.
- Palette: the commands list has no entry for a mod button. — `commands.test.ts` "has no command for a rail action button (a mod button)": command ids unchanged after `registerAction`.
- E2E (extend `vault-mods.spec.ts`): click `[data-rail-item="mod:hello:main"]`, pick "Say hello", assert the toast text in `[data-sonner-toast]`. — `e2e/specs/vault-mods.spec.ts:79-97` clicks the button, picks the row, asserts `[data-sonner-toast]` with "Hello mod: Hello from the rail" and no `aria-current`; I ran `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts e2e/specs/rail-shell.spec.ts`: 41 passed.

## Findings

1. minor, `src/lib/plugins/mods/mods-host.service.ts:147`: `preloadPacks` calls `onPacksLoaded` every time, even when the pack is already cached, so each `addRailButton` (each mod load or reload) bumps `fileIconsStore.packVersion`. Every icon that reads `packVersion` resolves again (file tree, note icons) for no reason. Fix: skip the preload when the pack is already loaded (`getIconSync(icon.iconPack, icon.iconName) !== undefined`, or a cached-pack check in `file-icons.icon-data.ts`), or accept it and say why. A handful of mods makes this cheap, so it does not block.
2. nit, `src/lib/plugins/mods/mods-host.service.ts:20`: the `ModRuntime.disposers` JSDoc still says "Cleanups collected through `ctx.register`". It now also holds the `addAction` and `addRailButton` disposers. Fix: "Cleanups from `ctx.register`, `addAction` and `addRailButton`, run in reverse at unload".
3. nit, `src/lib/plugins/mods/mod-picker.store.svelte.ts:56`: `reset()` is documented as "(tests, vault switch)", but no production code calls it. A vault switch closes the picker through `stopModsHost` -> `unloadMod` -> `closeForMod`. Fix: document it as "(tests)".
4. nit, `src/tests/lib/plugins/mods/mod-rail-icon.test.ts:77`: the "fallback first" assertion passes only while lucide-static's dynamic import is slower than `startModsHost`'s microtasks (the discovery lists this risk). It passes today. If it turns flaky, hold the import with a deferred instead of relying on timing.

## Other checks

- Typecheck: `taskpolicy -c background pnpm check`: 0 errors, 0 warnings.
- Targeted vitest, run by me: `src/tests/lib/features/rail-shell`, `src/tests/lib/plugins/mods` (includes the new `ModActionPicker.test.ts`, `mod-picker.store.test.ts`, `mod-rail-icon.test.ts`, plus `mods-host.service.test.ts` and `mod-api-contract.test.ts`), `src/tests/lib/features/file-icons`, `src/tests/lib/app` (`AppOverlays.test.ts`, `commands.test.ts`), `src/tests/lib/architecture` (layer rules): 80 files, 2052 tests passed. Deliver runs the full suite and `pnpm build`.
- E2E gate: 41 of 41 passed (run by me).
- The build report says "In jsdom the 'No actions.' empty text is in the DOM even when rows are listed". I probed this with a throwaway jsdom test, since deleted. bits-ui's `Command.Empty` is present on the first render, then gone once the filter pass runs (`filtered.count > 0`). With zero rows it stays. So the real picker does not show "No actions." next to rows. The report's claim that CommandPalette uses `Command.Empty` the same way is wrong: CommandPalette renders it in an `{:else}` branch. The result holds either way.
- Spec decisions: P5 (opens even for one action; `actions` defaults to all), P6 (own block after pinned, before bottom; not in `railItems()`), P9 (toast + `debug`, never `error()`; asserted in `mods-host.service.test.ts`) all hold. Issue 06's `busy` is typed and not rendered, as the Issue says.
- Layer rules: `plugins/mods` -> `features/` only; no baseline entry added, `BASELINE_SIZE` unchanged, no composition root added.
- Scope: no scope creep; every changed file traces to the Issue.
- Not verified by hand: whether `Command.Dialog` traps Cmd+P while open (Issue Notes ask for a manual check).

## Resolution

1. Fixed. `addRailButton` preloads the pack only when `getIconSync(pack, name)` finds no icon, so a load or reload with the pack cached no longer bumps `packVersion`. A name the cached pack lacks still triggers a preload (and a bump) per load; that is rare and harmless, so it is left as is. New test in `mod-rail-icon.test.ts` ("a load with the pack already cached leaves packVersion alone"), seen failing without the change.
2. Fixed. `ModRuntime.disposers` JSDoc names `ctx.register`, `addAction` and `addRailButton`.
3. Fixed. `modPickerStore.reset()` JSDoc says "(tests)".
4. No change. It passes today; the review itself says to act only if it turns flaky.
