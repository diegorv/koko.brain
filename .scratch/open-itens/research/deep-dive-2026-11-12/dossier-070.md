# Dossier: Issue 070, View writers refresh promptly and fail loudly

Checked at HEAD `afc0a9df8` (2026-11-12). Issue file: `.scratch/open-itens/issues/070-view-writers-refresh-and-fail-loudly.md`. Read-only research; no code was run.

## Verdict in one paragraph

Half present, half mostly moot. The "fail loudly" half is still present exactly, and is slightly bigger than the Issue says (the callers have no error handling at all). The "refresh promptly" half is mostly wrong for icons: the Views row and the rail pin read the icon from `fileIconsStore`, which the write path updates synchronously, not from the throttled index snapshot. A prompt refresh is only visible for the toolbar key writer, and only as the Views row count badge. Recommendation: low value for this owner; if done, do the narrow version (section 4), keep it late in the queue.

## 1. Still present?

### 1a. Missing `promptIndexRefresh` (Issue claim: partly true, mostly no visible effect)

Verified in code:
- `updateViewIcon` `type-definitions.service.ts:444-451`, `updateViewIconColors` `:454-456`, `removeViewIcon` `:490-492` (delegates to `updateViewIcon`), `updateViewToolbarKey` `:518-533`: none passes `{ promptIndexRefresh: true }`. The option is read at `:405` (`vaultStore.requestPromptIndexRefresh()`).
- The writers that do pass it: `setViewRailPin` `:467`, `showViewInViews` `:477`, `updateViewListProperties` `:486`, `editView` `:547`. Issue claim about them is correct. Issue line numbers are off by 1 to 10 at HEAD, content is the same.
- The throttle exists as described: `tauri-listeners.service.ts:298-304` (`takePromptIndexRefresh` skips the timer), `:140-148` and `vault-entries.service.ts:16` for the 2 s / 10 s rule.

Why the visible effect is mostly absent (facts, then inference):
- Fact: the Views row icon comes from `resolveIconForPath(path)` (`TypesNavigator.svelte:404`, view row), and the rail pin from `resolveIconForPath(pin.path)` (`Rail.svelte:167`, `:336`). `resolveIconForPath` reads `fileIconsStore.getFrontmatterIcon` (`icon-resolver.ts`, `resolveIconForPath`), a `$state` map (`file-icons.store.svelte.ts:12`).
- Fact: that map is updated by the `file-icons` note-change consumer (`file-icons.service.ts:299-306`, `updateFrontmatterIconForFile` `:243-246` uses `extractViewIcon` for `.view`), which `applyNoteChange` runs synchronously on `save` (`note-change.service.ts:90`, `consumers: 'deduped'`, content changed so it runs). Both rewrite paths reach `applyNoteChange` (tab path via `saveFileByPath` -> `notifyAfterSave`; file path at `type-definitions.service.ts:439`).
- Fact: an existing test already asserts the immediate row icon with no refresh: `type-definitions.service.test.ts:1148-1163` ("updateViewIcon indexes the written content, marks a recent save and sets the row icon").
- Fact: nothing in `src/lib` reads `_icon` / `_color` of a `.view` index entry. The only `fm '_icon'` reader is `extractTypeMetadata` (`type-definitions.logic.ts:108`), for Type definition notes, not `.view`.
- Inference: so for icon, color and remove-icon, a prompt refresh changes nothing the user can see. It is harmless but unproven value.
- Where it does matter: toolbar filter changes alter the Views row count badge. `TypesNavigator.svelte:84-105` recounts through `countViewNotes` (`view-lens.service.ts:22-48`) in an `$effect` whose triggers are `typeDefinitionsStore.entriesVersion` and `collectionStore.propertyIndex` (1 s debounce). `entriesVersion` bumps only when the throttled index refresh lands (`type-definitions.store.svelte.ts:66,90`). So after a rail filter edit, the badge of that view lags up to about 2 s (10 s inside a burst). The open rail list itself reloads at once (`RailNoteList.svelte:~346`, `loadView` at the end of `persistViewState`). Inference, not run in the app.
- Sort changes alter order, not count, so they gain nothing visible either.

### 1b. Silent no-op on broken YAML (still present exactly)

- `updateViewIconYaml` `type-sidebar.logic.ts:546-551`: `catch { return yamlString; }` after `parseYaml`. Before that, `extractViewIcon` (`file-icons.logic.ts:199-212`) swallows the parse error and returns null, so the early no-op guard does not fire and control reaches the parse.
- `updateViewColorsYaml` `:566-574`: `catch { return yamlString; }` at `:570-572`, and non-mapping returns the input at `:573`.
- `rewriteViewFileNow` then sees `updated === base` and returns `false` (`type-definitions.service.ts:~396`), the writers discard the result, nothing is written, nothing is shown.
- `updateViewRailYaml` `:592-604` is the model (throws `The .view file's YAML does not parse: <msg>` and `The .view file's YAML is not a mapping of keys`). `showViewInViewsYaml` `:615-627` and `updateViewListPropertiesYaml` `:635-` copy the same inline code. There is no shared helper.
- Bigger gap than the Issue states: the three picker handlers in `TypesNavigator.svelte:161-187` (`handleIconSelect`, `handleIconColors`, `handleIconRemove`) have no try/catch. `IconPicker.svelte:133-154` calls them without awaiting. So today ANY rejection of these writers (`ViewWriteError` missing / vault-changed / save-failed, a read error) is an unhandled promise rejection with no toast, not only broken YAML. "Let the caller toast" means adding that handling; throwing alone changes nothing the user sees except a console error. The pin handler shows the pattern to copy: `handleRailPin` `:195-203` (logs, skips toast on `ViewWriteError` `save-failed` because the editor already toasted).
- The toolbar path already fails loudly: `applyToolbarEdit` errors throw (`type-definitions.service.ts:520-528`) and `RailNoteList.svelte:~326-336` toasts "Could not save the view" / conflict.
- Not fixed by any commit: `git log` on both files shows no change touching this since `cf6fe6ef3` / `3635c8ef4` (2026-11-05); latest touch is `ca0ef2398` (2026-11-09, unrelated archived-notes change).

## 2. Impact for this owner

- Trigger for 1b: Change icon (right-click a view in Views) on a `.view` whose YAML does not parse, or whose top level is not a mapping. The owner hits this only if a hand or agent edit left the file broken. The view then already shows an error mark in the navigator and an error in the rail (`countViewNotes` error badge, `view-lens.service.ts:37-43`), so the user usually knows. Frequency: rare. Severity: annoyance (nothing saved, no message). No data loss: the file is untouched.
- Trigger for 1a: any rail Filter / Sort edit on a view while the navigator is visible. Frequent (daily if they use .view rail views) but the effect is a count badge that is correct about 2 s later. Annoyance at most. The owner said .view work is bugs only.
- Net: low impact. Ranking: below everything in the proposed queue that touches core editing or saving; it fits at the end or in the deferred pile. It is cheap and safe, so doing it is fine, but nothing breaks if it waits.

## 3. Complexity and risk

Size S. Files:
- `src/lib/features/type-definitions/type-sidebar.logic.ts` (`updateViewIconYaml` `:533-557`, `updateViewColorsYaml` `:566-583`). Pure logic. Readers: only `type-definitions.service.ts:20,450,455`.
- `src/lib/features/type-definitions/type-definitions.service.ts` (hotspot per `docs/HOTSPOTS.md:40`): add `{ promptIndexRefresh: true }` to at most four `rewriteViewFile` calls. No change to `rewriteViewFile` itself (core of the `.view` write path: tab-aware, `applyNoteChange` owner; do not touch).
- `src/lib/features/rail-shell/TypesNavigator.svelte:161-187`: try/catch + toast around the three handlers.
- Not core write paths for notes. `rewriteViewFile` is shared by pin, show, list properties, edit view and toolbar; the transform runs inside it and a throw propagates unchanged (documented: "what it throws propagates", `type-definitions.service.ts:~346`). The write queue survives a throw (`tail = run.catch(() => {})`, `:352-358`).
- Indexing rules (`docs/agents/indexing-watcher-rules.md` item 6 and 12): no new owner of note change is created; `requestPromptIndexRefresh` is the sanctioned way to skip the throttle and is already used by `createView`, `collection.service.ts:33`, `list-prefs.service.ts:43`, `lifecycle.service.ts`. Rule 12 says the snapshot is a cache, not a mirror; nothing here violates it.

What could regress:
- Burst cost: toolbar edits and the icon picker's color clicks (`IconPicker.applyColors` writes per click without closing) each become an immediate incremental refresh instead of one coalesced trailing refresh. Each is a one-path `get_index_delta` plus patches, then a 1 s debounced recount that re-reads every `.view` from disk. Bounded, but it is the cost the throttle was built to avoid. Another reason to apply the refresh only where it is visible (toolbar key).
- The flag is a single global boolean (`vault.store.svelte.ts:42,114-122`): if a write requests a refresh but no `vault-index-updated` follows (write skipped because bytes equal; `requestPromptIndexRefresh` at `:405` runs only after the equality check, so this is fine) the flag would stay set and promote the next unrelated event. Existing behavior; not new.
- Flipping the broken-YAML tests: `type-sidebar.logic.test.ts:886-892` currently asserts `updateViewColorsYaml('views: [', 'red')` returns the input and the non-mapping case too. Those assertions encode the bug and must change to `toThrow`. Per CLAUDE.md rule 4, changing an existing assertion needs the owner's approval; the Issue text is the request, so state it in the commit.

## 4. Implementation plan (test-first, one context)

Decisions to confirm with the owner first (surface, do not pick silently):
- D1. Scope of the refresh: (a) all four writers as the Issue says (zero value for icons, tiny burst cost), or (b) `updateViewToolbarKey` only (the one visible case). Recommended: (b), and say the icon trio gains nothing because the icon store updates synchronously.
- D2. Non-mapping top level: the Issue only says "YAML that does not parse". `updateViewColorsYaml:573` also silently no-ops on a non-mapping and `updateViewIconYaml` has no guard (overlaps deferred Issue 170 case 4). Recommended: throw `"The .view file's YAML is not a mapping of keys"` in both, matching `updateViewRailYaml`, since the Issue says "Throw as `updateViewRailYaml` does". Flag that this closes 170 case 4.

Steps:
1. Failing logic tests in `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts` (new `it`s in the `updateViewIconYaml` block at `:750` and the `updateViewColorsYaml` block at `:834`, copying `:924-927`):
   - `expect(() => updateViewIconYaml('views: [', 'lucide:star')).toThrow("The .view file's YAML does not parse")`; same with `icon` undefined (remove path) since removal skips the early guard.
   - `expect(() => updateViewColorsYaml('views: [', 'red')).toThrow(...)`. Replace the existing `:886-888` "returns YAML that does not parse as it is" with this. If D2 is yes, replace `:890-892` with a not-a-mapping throw test and add one for `updateViewIconYaml('- a\n- b\n', ...)`.
   - Run vitest on that file: they fail (functions return the input).
2. Failing service test (the Issue's first checkbox) in `update-view-toolbar-key.service.test.ts` (the existing harness mocks only plugin-fs and `invoke`; add `vaultStore` import from `#lib/core/vault/vault.store.svelte.js`, `vaultStore._reset()` in `beforeEach`): after a real `updateViewToolbarKey(VIEW, 'sort', ...)`, `expect(vaultStore.takePromptIndexRefresh()).toBe(true)`. Pattern at `edit-view.service.test.ts:102`. Add a negative: a conflict (`ViewWriteConflict`, nothing written) leaves it `false`. If D1 = (a), add the same assertion for `updateViewIcon`, `updateViewIconColors`, `removeViewIcon` in `type-definitions.service.test.ts` near `:1148` (note the real `vaultStore` must be reset there).
3. Failing service test that broken YAML reaches the caller: in `type-definitions.service.test.ts` `updateViewIcon` block (`:681`), `readTextFile` returns `'views: ['`, `await expect(updateViewIcon('/vault/test.view', 'lucide:star')).rejects.toThrow('does not parse')` and `expect(writeTextFile).not.toHaveBeenCalled()`. Same for `updateViewIconColors` and `removeViewIcon`.
4. Failing component test in `src/tests/lib/features/rail-shell/TypesNavigator.test.ts` (service is mocked there, `:32-34`; `toast` mocked `:38`): make `updateViewIcon` / `updateViewIconColors` / `removeViewIcon` mock reject with `new Error('The .view file\'s YAML does not parse: x')`, drive the picker as in `:792-808`, expect `toast.error` called with a message naming the cause (e.g. `Could not change the icon: ...`), and expect no toast when the rejection is `new ViewWriteError('save-failed', PROJECTS)` (copy `:865-872`). This is the half the Issue's checklist omits.
5. Implement:
   - `type-sidebar.logic.ts`: in both functions replace `return yamlString` in the catch with `throw new Error(\`The .view file's YAML does not parse: ${err instanceof Error ? err.message : String(err)}\`)` (same inline text as `:597`; a shared helper would also mean editing three adjacent functions, which the surgical rule says to skip). Update both doc comments (`:529-531`, `:561-564`), which currently promise the input comes back. Add the non-mapping throw if D2.
   - `type-definitions.service.ts`: per D1, add `{ promptIndexRefresh: true }` with the existing one-line comment style ("The Views row reads ... : skip the refresh throttle") to the chosen writers; for `updateViewToolbarKey` it goes as the third argument of the `rewriteViewFile` call at `:519-524`. Update the JSDoc of the changed writers to say they reject on broken YAML.
   - `TypesNavigator.svelte`: wrap the `isViewFile` branch of the three handlers in try/catch, `logError('TYPES-NAVIGATOR', ...)`, `toast.error(...)`, skip on `ViewWriteError` `save-failed`, and `return` before `trackRecentIcon` on failure. Keep the non-view branch as is (unrelated).
6. Gate (frontend only): `pnpm check` + `pnpm vitest run` (full suite per rule 6; per the memory note, a small direct edit may run touched tests plus check only if the owner asked for that). Commit with Context / Problem / Solution / Behavior / Files; not a `Test-Exempt`.

Acceptance criteria review (Issue 070 checklist):
- "after the write, the real `vaultStore` prompt-refresh request is set": testable and meaningful, but it proves the flag, not a visible effect. For the toolbar key the visible effect is the count badge; there is no test of that and none is cheap. Acceptable.
- "broken YAML throws from both icon writers": testable. Missing: the caller shows a toast (step 4), the file is not written, and the remove path (`icon` undefined) which bypasses the early guard.
- Wrong or untestable premise: the Issue's "Views row and pin wait for the throttle after an icon or toolbar change" is false for icon (section 1a). A test cannot show an icon improvement because the icon is already immediate.
- Missing: decisions D1 and D2 above.

## 5. Run order and shared files

- Blockers: none (Issue says none; `ledger.md:107` has it as `todo`).
- Hot-code group: `priority-2026-11-08.md:63` puts it in the `RailNoteList` / `lens.logic.ts` / `CollectionView.svelte` group: "VE-12 (070) never beside VD-02..07, VE-09 or audit 97 (071)". Actual files touched here are `type-sidebar.logic.ts`, `type-definitions.service.ts`, `TypesNavigator.svelte`, not `RailNoteList` (it only calls `updateViewToolbarKey`, no change needed there).
- Queue neighbors: after 009 (`009-rail-view-follows-tab-rename.md` cites `type-sidebar.logic.ts:426-440`; no function overlap with the two icon writers but the same file, so do not run in parallel). No file overlap with 010 (`RailNoteList`), 012, 067, 068, 028, 003, 002 (grep of their Issue text, inference from text only). 004, 015 and 062 touch editor and widget files, not these, so they can run in the same wave.
- Overlaps with deferred Issues, to sequence if those ever run: 071 (same two `*Yaml` writers, comment preservation), 170 (`updateViewIconYaml` non-mapping guard; see D2), 011 (Edit view saves only what changed, same service), 131-135 (`TypesNavigator` / `type-definitions.service.ts`), 043, 089, 093, 105, 076. Run 070 before 071 and 170: it fixes the throw contract they build on.
- Cargo: none. Single frontend commit, S.
