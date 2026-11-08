# 28: A rail click on a pinned `_open_in_editor` view goes through `selectRailItem`, so the rule lives in one place

**What to build:** The rule "a pinned view with `_open_in_editor` opens in the editor and leaves the layout as it is" is written twice: in `Rail.svelte`'s pin button (`onclick={() => (pin.opensInEditor ? openFileInEditor(pin.path) : onSelect(pin.key))}`, `features/rail-shell/Rail.svelte:134`) and in `selectRailItem` (`app/rail-navigation.ts:18-21`), which the palette's Go to commands call. Make the rail click hand the whole item to its owner: `Rail` calls `onSelect(key, pin)` for every pin, `AppShell` passes `onSelect={(key, pin) => selectRailItem({ key, pin })}`, and the `_open_in_editor` branch exists only in `rail-navigation.ts`. Behaviour does not change: clicking such a pin still opens it in the editor and still leaves `railItem` and the panels untouched.

**Blocked by:** 23

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] `Rail.svelte`'s pin button calls `onSelect(pin.key, pin)` (the pin's `RailItem['pin']`), with no `openFileInEditor` call and no `editor.service` import left in `Rail.svelte` for this purpose; the `onSelect` prop type in `Rail.svelte` gains the optional second argument and its JSDoc says so
- [x] `AppShell.svelte` (`onSelect` at about line 192) forwards both arguments: `selectRailItem({ key, pin })`
- [x] `Rail.test.ts` "opens a pinned _open_in_editor view in the editor instead of selecting it" (about line 303) is rewritten on purpose, not deleted: it now asserts `onSelect` is called with the pin key and a pin whose `opensInEditor` is true and whose `path` is the `.view`. The behaviour it used to pin (opens in the editor, layout unchanged) is asserted where it now lives: an `AppShell.test.ts` case that clicks the pinned `_open_in_editor` view and checks `openFileInEditor` was called with its path and that `settingsStore.layout.railItem` and `railPanelsVisible` are unchanged (real settings store, editor service mocked as the existing AppShell tests do)
- [x] A plain pinned view and a pinned type still pick their lens and show the panels through `selectRailItem` (existing tests stay green)
- [x] The active highlight rule (`Rail.svelte:126`, a pin is current when its key is `activeItem` or, for an `_open_in_editor` pin, when its path is the active tab) is not part of this change and keeps its tests
- [x] `rail-navigation.ts`'s JSDoc no longer implies a second copy exists

## Notes

- **Source:** review of Issue 23 (`.scratch/rail-shell-ux/work/23/review.md`, finding 1, minor), deferred there because criterion 1 of Issue 23 required `Rail.test.ts:303` to stay unchanged. Owner asked for this follow-up on 2026-11-04.
- **Why now:** Issue 24 (Settings > Rail, hide and reorder items) touches the same click path; a later change to the pin rule would otherwise have to be made in both copies.
- **Layer rule:** `features/rail-shell` must not import `app/`; the fix keeps `Rail` calling a prop and `AppShell` (in `app/`) owning the call to `selectRailItem`, so no new import edge appears.
- **Out of scope:** Issue 23's finding 3 (two `.view` files with the same label get identical "Open view" rows) is a separate owner decision.
- **Type scale:** no UI text changes here.
- **Size:** S.

## Comments

- 2026-11-04 (issue/28-one-owner-for-the-pinned-open-in-editor-rule): the Rail pin button now calls `onSelect(pin.key, pin)` and AppShell forwards it to `selectRailItem({ key, pin })`, so the pinned `_open_in_editor` rule lives only in `selectRailItem`. Rail.test.ts case rewritten; AppShell.test.ts case added (asserts `toHaveBeenCalledExactlyOnceWith`, from review round 1). Tests: pnpm check 0 errors; full suite at 5ea12e6ed, vitest 489 files, 11639 passed / 1 skipped / 1 todo, plus pnpm build, exit=0. Reviews: round 1 APPROVED (one fix applied), round 2 APPROVED (no findings).
