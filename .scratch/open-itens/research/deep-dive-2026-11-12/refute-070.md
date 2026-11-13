# Refute: Issue 070, View writers refresh promptly and fail loudly

Checked at HEAD `318b6e9b5` (2026-11-12). Read-only. Nothing in `src/` that this Issue touches changed between the dossier's `afc0a9df8` and HEAD (`git diff --stat afc0a9df8 HEAD -- src` shows palette files only). One node one-liner was run to confirm how the `yaml` package and strict mode handle a top level that is not a mapping. No tests, check or build were run.

## Verdict

**Run after edits.** Half of the Issue is wrong and the other half is incomplete.

- **"Refresh promptly" for the icon trio is a false premise.** The Views row icon and the rail pin icon never read the throttled index snapshot, so adding `promptIndexRefresh` to `updateViewIcon` / `updateViewIconColors` / `removeViewIcon` changes nothing the user can see. Only `updateViewToolbarKey` has a visible lag (the Views row count badge). Adding the prompt refresh there has a real cost: filter value edits write on every keystroke, and each prompt refresh would also re-run `loadView` in `RailNoteList`. For an owner who wants low-risk changes, the right move is to drop the refresh half.
- **"Fail loudly" is real but incomplete.** Both YAML writers do return their input on broken YAML. But "let the caller toast" names a caller that has no error handling at all. If the writer throws, the user still sees nothing: the rejection is unhandled. The fix has to add try/catch and a toast in `TypesNavigator.svelte`, and the Issue's test list does not cover that.
- **Impact for this owner: low.** It needs a `.view` file whose YAML is broken, and that view already shows an error badge in Views. Complexity S, risk low once the refresh half is gone.
- **Relay-readiness: not ready as written.** A fresh agent would add three options objects with no visible effect, throw from the logic, and never touch the component. Its tests would pass while the user-facing bug stayed. It would also hit an existing test that encodes the bug (`type-sidebar.logic.test.ts:886-888`) and a non-mapping case the Issue does not decide.

## Facts verified in code

### Refresh half

- The writers without the option: `updateViewIcon` `type-definitions.service.ts:444-451`, `updateViewIconColors` `:454-456`, `updateViewToolbarKey` `:518-533` (the `rewriteViewFile` call is `:524-529`). `removeViewIcon` `:490-492` has no `rewriteViewFile` call of its own. It delegates to `updateViewIcon`, so there are **three** options objects, not four.
- The writers with the option: `:467`, `:477`, `:486`, `:547`. The option is read at `:405`, after both equality checks (`:390`, `:401`).
- The view row icon comes from `resolveIconForPath(path)` (`TypesNavigator.svelte:404`, `:419-424`, including `titleColor` at `:424`). The rail pin icon comes from `resolveIconForPath(pin.path)` (`Rail.svelte:167`, `:336`, `:347-348`). Both read `fileIconsStore.getFrontmatterIcon` (`icon-resolver.ts:64-77`).
- `fileIconsStore` is updated by the `file-icons` note-change consumer (`file-icons.service.ts:299-305`, `.view` branch `:243-244`), which is registered at app start (`app-lifecycle.service.ts:263`). `applyNoteChange` runs it on `save` (`note-change.service.ts:90`, `:230`). Both write paths reach it: the file path at `type-definitions.service.ts:439`, and the tab path through `saveFileByPath` -> `notifyAfterSave` -> `editor.hooks.ts:81`.
- An existing test already shows the row icon is set right after the write with no index refresh: `type-definitions.service.test.ts:1148-1163`.
- `pinnedRailItems` (`lens.logic.ts:219-241`) reads only `_rail`, the label, `_order` and `opensInEditor` from the snapshot. It reads no icon or color.
- The only snapshot-driven effect of a toolbar write is the Views row count. The recount `$effect` (`TypesNavigator.svelte:96-110`) depends on `typeDefinitionsStore.entriesVersion` and `collectionStore.propertyIndex`. A `.view` save updates neither at once: the collection consumer skips non-Markdown files (`collection.service.ts:185-187`), and both arrive with the throttled refresh (`tauri-listeners.service.ts:245`, `:248-255`). The throttle is 2 s after an isolated event and at most once every 10 s (`tauri-listeners.service.ts:106`, `:109`, `:280-283`).
- Cost of a prompt refresh on toolbar writes:
  - `FilterRow.svelte:177` (`oninput`) -> `onUpdate` -> `FilterPanel.svelte:136/198` -> `RailNoteList.svelte:357-365` -> `persistViewState` -> `updateViewToolbarKey` (`:325`). There is no debounce, so every keystroke in a filter value is a write.
  - Each prompt refresh bumps `entriesVersion`, and that re-runs the `RailNoteList` `$effect` at `:209-222` (`loadView`, which reads the file and runs the query), plus the `Rail.svelte:60`, `:82` and `AppShell.svelte` derivations.
  - The throttle comment at `tauri-listeners.service.ts:296-297` justifies a prompt refresh for "a user's own click that changes what the sidebar lists". A keystroke that changes a count badge does not fit that.

### Fail-loudly half

- `updateViewIconYaml` `type-sidebar.logic.ts:546-551` does `catch { return yamlString; }`. Before that, `extractViewIcon` (`file-icons.logic.ts:203-207`) swallows the parse error and returns null, so the early no-op guard (`:535-545`) does not return and control reaches the catch.
- `updateViewColorsYaml` `:568-572` does the same. A top level that is not a mapping also returns the input (`:573`).
- `rewriteViewFileNow` then returns `false` at `:390` and nothing is written.
- `updateViewIconYaml` has no guard for a top level that is not a mapping. Verified with node, `yaml` package, strict mode:
  - `just text\n` and `42\n` make `setViewIconKey` (`:516-523`) throw `TypeError: Cannot create property '_icon' on string 'just text'`. Today that is already an unhandled rejection with an unreadable message.
  - `- a\n- b\n` stringifies back to the same bytes, so it is a silent no-op.
  - With no icon (the remove path), a scalar top level also comes back unchanged.
- The model to copy is `updateViewRailYaml` `:592-604`: the parse error message at `:597`, the not-a-mapping message at `:599`. `showViewInViewsYaml` (`:614-627`) and `updateViewListPropertiesYaml` (`:635-`) repeat the same inline code.
- **There is no caller toast.** `handleIconSelect`, `handleIconColors` and `handleIconRemove` (`TypesNavigator.svelte:161-187`) have no try/catch. `IconPicker.svelte:135`, `:145`, `:148` and `:153` call them without awaiting. The repo has no `unhandledrejection` handler (searched `src/lib` and `src/routes`), so a throw from the logic is a console error only. `handleRailPin` (`TypesNavigator.svelte:198-206`) is the pattern to copy: it logs, skips the toast on `ViewWriteError` `save-failed`, and toasts otherwise.
- **An existing test encodes the bug:** `type-sidebar.logic.test.ts:886-888` asserts that `updateViewColorsYaml('views: [', 'red')` returns its input. `:890-892` asserts the same for `- a\n- b\n`. Under the Issue these must change from returning the input to throwing. The Issue does not say so, and CLAUDE.md/global rule "never weaken ... tests ... change it only with approval" makes a fresh agent stop or guess here.
- The toolbar path already fails loudly: `RailNoteList.svelte:326-333`.

### Failing tests: do they really fail today?

- "`update-view-toolbar-key.service.test.ts`: the real `vaultStore` prompt-refresh request is set": yes, it would fail today, because nothing on the toolbar path calls `requestPromptIndexRefresh`. But the harness never resets `vaultStore` (`update-view-toolbar-key.service.test.ts:31-47` has no `vaultStore` import), so the test must add `vaultStore._reset()` (`vault.store.svelte.ts:149-157`). That only matters if the refresh half is kept.
- "Broken YAML throws from both icon writers": yes, it fails today for `'views: ['`, for both functions, including the remove path (`updateViewIconYaml('views: [')`). It proves the logic contract only. A test like this passes while the user-visible bug (nothing shown) stays, because the component swallows nothing and shows nothing. A component test is required.

## Must-fix edits to the Issue text

### M1. Drop the refresh half (false premise for icons, a cost with no matching gain for the toolbar)

Replace the title line:

```
# 070: Change icon on a broken .view says why nothing changed
```

Replace the whole **What to build** section with:

```
**What to build:**
- `updateViewIconYaml` (`src/lib/features/type-definitions/type-sidebar.logic.ts:546-551`) and `updateViewColorsYaml` (`:568-573`) give back their input when the `.view` YAML does not parse or its top level is not a mapping, so Change icon, a color swatch or Remove icon on such a file writes nothing and says nothing. Throw instead, with the same messages as `updateViewRailYaml` (`:597`, `:599`): `The .view file's YAML does not parse: <parser message>` and `The .view file's YAML is not a mapping of keys`. `updateViewIconYaml` has no mapping guard today: a scalar top level throws a raw `TypeError` from `setViewIconKey` and a list is a silent no-op; both become the not-a-mapping error. Keep the code inline as the three sibling writers do (no shared helper). Update both doc comments, which promise the input comes back.
- `handleIconSelect`, `handleIconColors` and `handleIconRemove` in `src/lib/features/rail-shell/TypesNavigator.svelte:161-187` have no error handling, and `IconPicker` calls them without awaiting, so any rejection from the three `.view` icon writers is an unhandled rejection with no message. Wrap the `isViewFile` branch of each in try/catch like `handleRailPin` (`:198-206`): `logError('TYPES-NAVIGATOR', ...)`, no toast for `ViewWriteError` with reason `save-failed` (the editor already toasted), otherwise `toast.error(\`Could not change the view's icon: ${message}\`)`. In `handleIconSelect`, return before `trackRecentIcon` when the write failed. Leave the type-definition branch (`setIconForPath` and friends) as it is.
- Out of scope: `promptIndexRefresh` on the icon writers and on `updateViewToolbarKey`. The Views row icon and the rail pin icon read `fileIconsStore`, which the save path updates at once (`file-icons.service.ts:299-305`, test `type-definitions.service.test.ts:1148-1163`), so a prompt refresh changes nothing visible there. The only visible lag is the Views row count after a rail filter edit (2 s, up to 10 s in a burst), and filter values write on every keystroke (`FilterRow.svelte:177`), so a prompt refresh there would refresh the index and re-run `RailNoteList`'s `loadView` per keystroke. Not worth that cost.
```

### M2. Replace the test checklist

```
- [ ] Failing tests first:
  - `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`: `updateViewIconYaml('views: [', 'lucide:star')`, `updateViewIconYaml('views: [')` (the remove path) and `updateViewColorsYaml('views: [', 'red')` throw `The .view file's YAML does not parse`; for each of `just text\n`, `42\n`, `- a\n- b\n`, both writers throw `new Error("The .view file's YAML is not a mapping of keys")` (copy `:929-935`). The two existing tests at `:886-892` that expect the input back encode this bug: replace them with the throwing versions (owner-approved by this Issue).
  - `src/tests/lib/features/type-definitions/type-definitions.service.test.ts`: with `readTextFile` resolving to `'views: ['`, `updateViewIcon`, `updateViewIconColors` and `removeViewIcon` reject with `does not parse`, and `writeTextFile` is not called.
  - `src/tests/lib/features/rail-shell/TypesNavigator.test.ts` (service and `toast` are already mocked, `:25-38`): with the `updateViewIcon`, `updateViewIconColors` and `removeViewIcon` mocks rejecting `new Error("The .view file's YAML does not parse: x")`, driving the picker as at `:802-807` shows `toast.error` with a message containing `does not parse`; a rejection with `new ViewWriteError('save-failed', PROJECTS)` shows no toast (copy `:866`).
```

### M3. Fix the hotspot note

Replace `- \`type-definitions.service.ts\` is a hotspot (\`docs/HOTSPOTS.md\`): keep the change to the four options objects.` with:

```
- `type-definitions.service.ts` is a hotspot (`docs/HOTSPOTS.md:40`): this Issue changes only JSDoc there (the three icon writers now reject on broken YAML). Do not touch `rewriteViewFile` / `rewriteViewFileNow`; a transform's throw already propagates (`:346-348`) and the write queue survives it (`:357-358`).
```

## Should-fix edits

- **S1. Overlap with Issue 170 case 4.** Add to Notes: `Closes Issue 170 case 4 (updateViewIconYaml has no non-mapping guard); after delivery, strike that case from 170.` Issue 170 (`170-file-icon-saves-that-cannot-happen-tell.md:16`) describes the same silent no-op on `- a\n- b\n`.
- **S2. Run-order note.** The Notes "Other feature" paragraph refers to view-editor and view-engine numbers. Add the local numbers from `priority-2026-11-08.md:63`, `:345`: never in parallel with 009 (same `type-sidebar.logic.ts`), 071 (same two `*Yaml` writers), 131-135 (`TypesNavigator.svelte`, `type-definitions.service.ts`). Run 070 before 071 and 170.
- **S3. Line numbers.** The Issue cites `type-sidebar.logic.ts:533-537`, `:555-560`, `:579-591` and service `:444-456`, `:490-492`, `:518-533`. At HEAD the catches are `:546-551` and `:568-573`, the model is `:592-604`, and the service lines are as cited. M1 already uses HEAD numbers.
- **S4. Gate.** Frontend: `pnpm check` + `pnpm vitest run` is correct (no `src-tauri`, no deps). This is a `fix:` commit with tests, not `Test-Exempt`.
- **S5. Size.** Stays S: two logic functions, three handlers, and JSDoc.

## Dossier errors and gaps

- Mostly correct. Its core finding, that the icon refresh is moot and the caller has no toast, is verified above.
- "keep the change to the four options objects" is not challenged in the dossier's section 3. `removeViewIcon` has no options object of its own, so at most three exist.
- It does not mention the per-keystroke write path (`FilterRow.svelte:177` `oninput`, no debounce), which is the main argument against even its recommended narrow version D1(b) (toolbar key only). With that path known, D1(b) should be "drop" rather than "toolbar only".
- It says the toolbar prompt refresh is "bounded" and costs "a 1 s debounced recount". It misses that each refresh also re-runs `RailNoteList`'s `loadView` effect (`RailNoteList.svelte:209-222`).
- D2 (non-mapping) leaves out a fact: on a scalar top level, `updateViewIconYaml` already throws a raw `TypeError` (verified with node), so the "silent" claim holds only for a list top level.
- The latest commit it names on these files is wrong. It says `ca0ef2398` (2026-11-09). `8afcfb42e` (2026-11-11, file-icons default color) also touched `TypesNavigator.svelte`, though not these handlers.
- It leaves D1 and D2 open as owner decisions. M1 settles both from the code: drop the refresh, throw on non-mapping as the three sibling writers do. Nothing is left for a relay agent to stop on.
