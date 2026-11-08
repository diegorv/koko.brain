## Verdict
CHANGES PLAN (minor: one test-list addition and one wording fix in EP-02; EP-02 design, M2 and EP-09 stand as written).

Everything below was read at HEAD in /Users/diegorv/Dev/pet-projects/koko/brain. Nothing was run.

## Verified changes

1. Plan EP-02, "Test" bullet (plan line 85): missing a pinned existing test.
   - `src/tests/lib/app/commands.test.ts:515-521` ("has no command for a rail action button (a mod button)") registers a rail action `mod:hello:main` and asserts `getBuiltInCommands()` ids are unchanged and no id or label contains `mod:hello` / `Hello mod`.
   - It stays green only if the new rows come from the separate `modCommandsStore`, never from `railRegistryStore.actions`. The plan already does it that way (plan line 73), but the test list does not say so, and an implementer who "simplifies" to read the rail registry breaks it.
   - Proposed change: add to the Test bullet: "`commands.test.ts:515` stays green (rail buttons get no row); a new test registers a mod action and sees `mod:<id>:action:<aid>`-style id and label `<Mod name>: <title>`; the existing id-prefix filter `rail:go-to:` is unaffected."

2. Plan EP-02, "Risk and bound" (plan line 81): "Reactivity rests on a comment" is stronger than the code supports, and the proving test is a different one than the plan implies.
   - `AppOverlays.svelte:18` passes `commands={getBuiltInCommands()}`; `CommandPalette.svelte:16-18` reads `commands` only inside a `$derived`. A non-static prop expression is a getter in Svelte 5, so store reads inside `getBuiltInCommands()` are tracked by that derived. This is the mechanism `railGoToCommands` already relies on in production (late navigator registration).
   - The repo test that "proves" it is `commands.test.ts:501-513`, which only rebuilds by calling the function again. It is not a mounted test. `AppOverlays.test.ts` mounts the overlays but never changes a command store.
   - Proposed change: keep the mounted test, but word the risk as "shipped mechanism, no mounted test yet", and put the test in `AppOverlays.test.ts` (it already mounts with the needed jsdom shims at lines 8-24): open the palette, register a mod command, assert the row text in the DOM.

## Scout claims refuted

- "`getBuiltInCommands()` walks the whole file tree on each rebuild, a hot-path risk": true of the code (`commands.ts:75`, `collectViewFiles`), but the list is read only through the child's lazy `$derived` (`CommandPalette.svelte:16-18`) and a mod load fires O(25) registry changes at startup. The plan's "no hot path" holds. Not run.
- Scout API sketch `palette?: { category?, when? }` on `ModActionV1`: conflicts with plan decisions (no contract edit, no `when`). Its "no apiVersion bump" is right (`mod-api.v1.ts:14-16`) but it omits that any new `ModActionV1` field forces an edit of the frozen table in `mod-api-contract.test.ts` (Sonnet's `:150-157`, not re-read by me). Plan avoids it with the raw store; no change.
- "A mod run from the palette must go through `runAction` or it loses progress, log, Stop": correct and already in the plan (EP-02 routes through `runAction` with a non-rail key, `mods-host.service.ts:204`). Not a gap.
- "A text-input step in the palette would make it L": the plan never adds one. Input actions open the picker's own input step (`openPicker`, `mods-host.service.ts:256-275`, `askInput` in `mod-picker.store.svelte.ts`). Cost stays S.
- Scout line cites are mostly right (`host:118,318-320`, `commands.ts:56-85`, `CommandPalette.svelte:27-37`). "`unloadMod` ~395-420" is off: it is `385-406`. Harmless.

## Facts in the recovered report that the plan already has

Layer rule (registry outside `features/command-palette`, `app/` as bridge), `$state.raw` registry by identity (`rail-registry.store.svelte.ts:79-84`), disposal via `live.disposers` (`mods-host.service.ts:399`, all mods unload at `:561` and `:701`), stale recents dropped (`command-palette.logic.ts:11-14`), id-prefixed rows. Only item 1 above was absent.

## Minor additions, no plan change needed

- Palette ranking matches `label` only (`command-palette.logic.ts:24`), while the picker also matches `description` through `keywords` (`ModActionPicker.svelte:172`). A row's description is not searchable in the palette. The plan's `<Mod name>: <title>` label is enough to find an action. `AppCommand` has no description field. Mention in `28-mods.md` only.
- Plan's synthetic run key `mod:<id>:action:<aid>` can equal a rail key `mod:<id>:<buttonId>` if a button id is literally `action:<x>`. `modsRunsStore.start` replaces a run with the same key (`mods-runs.store.svelte.ts:78-84`). Rare and visible; no guard, per the plan's own rule.

## Still unverified

- That Dialog content, and so the `filteredCommands` derived, is built only while the palette is open (bits-ui Presence, `command-dialog.svelte` renders `Dialog.Content`). Read, not run. Affects only how often the list is rebuilt, not correctness.
- Focus handoff from the closing palette to the picker or run view (no E2E exists). Plan already schedules one.
- Duplicate row ids in the keyed `{#each}` (`CommandPalette.svelte:51`): ids are `mod:<modId>:<actionId>`, and `addAction` throws on a duplicate action id per mod (`mods-host.service.ts:316`), so the case needs two mods whose ids join to the same string. Not tested.
- M2 and EP-09: the recovered report says nothing about hotkeys. I checked only that the `hotkeys` mod already registers actions in the picker and runs chords directly with no run view (`hotkeys/src/index.ts:10-19`, `hotkeys.service.ts:36-59`), which matches the plan's "Removes" lines. Sonnet's CodeMirror `Mod-Shift-u` claim was not re-read.
