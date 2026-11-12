# 070: Change icon on a broken .view says why nothing changed

**Origin:** `view-engine-fixes` Issue 12, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:**
- `updateViewIconYaml` (`src/lib/features/type-definitions/type-sidebar.logic.ts:546-551`) and `updateViewColorsYaml` (`:568-573`) give back their input when the `.view` YAML does not parse or its top level is not a mapping, so Change icon, a color swatch or Remove icon on such a file writes nothing and says nothing. Throw instead, with the messages `updateViewRailYaml` uses (`:597`, `:599`): `The .view file's YAML does not parse: <parser message>` and `The .view file's YAML is not a mapping of keys`. `updateViewIconYaml` has no mapping guard today: a scalar top level throws a raw `TypeError` from `setViewIconKey` and a list is a silent no-op; both become the not-a-mapping error. Keep the code inline as the three sibling writers do (no shared helper). Update both doc comments, which promise the input comes back.
- `handleIconSelect`, `handleIconColors` and `handleIconRemove` in `src/lib/features/rail-shell/TypesNavigator.svelte:161-187` have no error handling, and `IconPicker` calls them without awaiting, so a throw from the writers would still show the user nothing. Wrap the `isViewFile` branch of each in try/catch like `handleRailPin` (`:198-206`): log with `logError('TYPES-NAVIGATOR', ...)`, no toast for a `ViewWriteError` with reason `save-failed` (the editor already toasted), otherwise `toast.error` with a message that names the cause, such as `Could not change the view's icon: <message>`. In `handleIconSelect`, return before `trackRecentIcon` when the write failed. Leave the type-definition branch (`setIconForPath` and friends) as it is.
- Out of scope: `promptIndexRefresh` on the icon writers and on `updateViewToolbarKey`. The Views row icon and the rail pin icon read `fileIconsStore`, which the save updates at once (`file-icons.service.ts:299-305`, test `type-definitions.service.test.ts:1148-1163`). Filter values write on every keystroke (`FilterRow.svelte:177`), so a prompt refresh on the toolbar writer would refresh the index and re-run `RailNoteList`'s `loadView` per keystroke, to update a count badge that is right 2 s later anyway.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: drop the "refresh promptly" half, and rescope to failing loudly with a TypesNavigator toast. Replacing the tests at `type-sidebar.logic.test.ts:886-892`, which expect the input back on broken YAML, with throwing versions is approved.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `src/tests/lib/features/rail-shell/TypesNavigator.test.ts` (the service and `toast` are already mocked, `:25-38`; `ViewWriteError` is the real class): with the `updateViewIcon`, `updateViewIconColors` and `removeViewIcon` mocks rejecting `new Error("The .view file's YAML does not parse: x")`, driving the picker as the test at `:801-807` does shows `toast.error` with a message containing `does not parse`, and a failed icon select does not record a recent icon. A rejection with `new ViewWriteError('save-failed', PROJECTS)` shows no toast (as the test at `:865` does). Fails today: the handlers have no try/catch.
- [ ] `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`: `updateViewIconYaml('views: [', 'lucide:star')`, `updateViewIconYaml('views: [')` (the remove path) and `updateViewColorsYaml('views: [', 'red')` throw `The .view file's YAML does not parse`. For each of `just text\n`, `42\n` and `- a\n- b\n`, both writers throw `new Error("The .view file's YAML is not a mapping of keys")` (copy the test at `:929-935`). Replace the two tests at `:886-892` that expect the input back with the throwing versions, and name them in the commit message.
- [ ] `src/tests/lib/features/type-definitions/type-definitions.service.test.ts`: with `readTextFile` resolving to `'views: ['`, `updateViewIcon`, `updateViewIconColors` and `removeViewIcon` reject with `does not parse`, and `writeTextFile` is not called.

## Notes

- `type-definitions.service.ts` is a hotspot (`docs/HOTSPOTS.md:40`): this Issue changes only JSDoc there (the three icon writers now reject on broken YAML). Do not touch `rewriteViewFile` or `rewriteViewFileNow`; a transform's throw already propagates (`:346-348`) and the write queue survives it (`:357-358`).
- This closes Issue 170 case 4 (`updateViewIconYaml` has no non-mapping guard). After delivery, strike that case from 170.
- The toolbar path already fails loudly (`RailNoteList.svelte:326-333`).
- **Run order:** views chain, in series (`priority-2026-11-08.md:63`). Never beside 071 (same two `*Yaml` writers), 011, 131-135 or 136 (`TypesNavigator.svelte`, `type-definitions.service.ts`, `type-sidebar.logic.ts`). Run it before 071 and 170, which build on this throw contract. It shares no file with 009. relay-lite does not enforce this.
- **Size:** S.

## Comments

- 2026-11-12, owner decision: dropping the "refresh promptly" half and replacing the tests at `type-sidebar.logic.test.ts:886-892` with throwing versions are approved.
- 2026-11-12, deep dive (`research/deep-dive-2026-11-12/refute-070.md`, `cross-tests-relay.md` M5): retitled and rescoped. The refresh half is gone (icons already update at once, and the toolbar writer writes per keystroke). The fail-loudly half now covers the non-mapping case and the missing try/catch in the three TypesNavigator handlers, and the TypesNavigator component test is the first failing criterion, because a logic-only test passes while the user still sees nothing. The hotspot note now says only JSDoc changes in the service; added the Issue 170 overlap and the run-order note with local numbers.
