# Issue 04 discovery

## Scope and evidence
- `src/lib/plugins/mods/contract/mod-api.v1.ts:198-211`: add generic `ui.pick` to contract v1, as EP-04 and owner decision 12.1 require.
- `src/lib/plugins/mods/mods-host.service.ts:141-195`: validate untyped options, snapshot display fields, retain originals by id, and enqueue pick. `:467` already cancels this mod's dialogs on unload.
- `src/lib/plugins/mods/mod-dialogs.store.svelte.ts:5-32,47-92`: add pick spec, id-or-null result, and null cancellation. `open`, `answer`, `dismiss`, `closeForMod` write the queue; `current` and `dialogs` read it.
- `src/lib/plugins/mods/ModDialogHost.svelte:24,69-159`: sole production consumer of `current`; add Command branch and host-owned fuzzy filtering before the 100-row cap.
- `help/documentation/28-mods.md:320-350`: document arguments, object identity, filtering, cancellation and duplicate-id rejection.
- Tests: `src/tests/lib/plugins/mods/{ModDialogHost,mod-dialogs.store,mods-host.service,mod-api-contract}.test.ts`.

## Plan and checks
1. Commit discovery, then test through `ctx.ui.pick` and rendered host using real stores.
2. Extend contract, queue and host; verify original-object return, malformed/duplicate rejection, empty inputs and cancellation including actual host unload.
3. Render a bounded Command list, snapshot mod display data once, and test all 1000 items remain searchable (item 900), keyboard selection, Esc, and queued query reset.
4. Freeze the new member, document it, run `pnpm check` plus targeted test files before the implementation commit. Full suite belongs to deliver.

## Prior art and defaults
- Copy the existing prompt/confirm tests in `ModDialogHost.test.ts:198-274` and host lifecycle tests at `mods-host.service.test.ts:1613-1755`; store tests already assert both getters.
- Command API comes from local wrappers and `features/command-palette/CommandPalette.svelte`; use `shouldFilter={false}` and the existing `utils/fuzzy-match.ts` scorer.
- Search title and optional description, rank matches by score, preserve supplied order for an empty query. Default placeholder: `Search items...`. Empty list displays `No items found.`
- Store only plain display strings and return a selected id to the host, which resolves the caller's original object, including extra fields. Snapshotting prevents mod getters from executing during filtering/rendering.
- No core, indexing, watcher, or QueryJS changes; no new architecture baseline entries.

## Risks and unverified work
- Command keyboard selection and focus must survive list replacement and queued dialogs; cover these at the rendered seam.
- Browser E2E/native Tauri validation is not a build-step targeted gate; deliver must run the issue's E2E gate and full suite.
