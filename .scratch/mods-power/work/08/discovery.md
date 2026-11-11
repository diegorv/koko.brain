# Issue 08 discovery: `ctx.onNoteCreated`

No `spec.md` in `.scratch/mods-power/`; the Issue is the spec. Same SHA-bump-plus-host-member pattern as `work/05` (`ctx.onNoteMoved`); only the differences are listed.

## Precondition checked

- Mods Issue 05 Comments record `fdfcc9032ccdef3cd7f0d33cb71edeec8cc69b5c`, on the mods `origin/main`. Its contract diff adds only `ModNoteCreatedV1 { path }` and `ModContextV1.onNoteCreated`.

## Files that change

- `package.json:81`, `pnpm-lock.yaml`: pin `fdfcc90...` (MOD-CORE.md step 3), inspect the lockfile.
- `src/lib/core/editor/editor.hooks.ts:51-101`: created-note registry `addNoteCreatedObserver` + `notifyNoteCreated(path)`, cleared by `resetHooks`. Same isolation as the after-save observers.
- Creators (call after the tab-open step, per owner answer 2):
  - `core/note-creator/note-creator.service.ts:126`: after `openFileInEditor`, only when the note was created. Covers wikilinks (`app/editor-host.ts:161`), periodic notes, templates, Cmd+N composer, "New <Type>", one-on-one, and a deep link's default (non-silent) create.
  - `app/commands.ts:134-135` (command palette New File), `features/quick-switcher/QuickSwitcher.svelte:49-50`, `features/rail-shell/FilesNavigator.svelte:123-127` (file explorer New menu), `features/rail-shell/new-note.service.ts:35` (note list "+ New here").
- `src/lib/plugins/mods/mods-host.service.ts:625-652`: `onNoteCreated` after `onNoteMoved`, delivery copied from `onNoteSaved` (`vaultRelativeKey`, `setTimeout(0)`, `pending`, liveness checks, `callModCallback('onNoteCreated', ...)`); `:135` JSDoc lists it.
- `src/lib/plugins/mods/mods.store.svelte.ts:25`: union gains `'onNoteCreated'`.
- `help/examples/mods/kokobrain-mod.d.ts`: `ModNoteCreatedV1` + member, copied from the contract.
- Docs: `help/documentation/28-mods.md`, `mods/07-events-and-reactivity.md`, `13-api-reference.md`, `12-types-build-and-test.md`, `15-errors-and-debugging.md`, `mods/README.md` (the files work/05 touched).

## Plan

1. Commit A: core registry, test-first in `editor.hooks.test.ts`.
2. Commit B: creator calls, test-first per creator: `note-creator.service.test.ts` (created vs existing, after the tab), `commands.test.ts`, `QuickSwitcher.test.ts`, `FilesNavigator.test.ts`, `new-note.service.test.ts`.
3. Commit C: SHA bump + host member + store union + `mod-api-contract.test.ts` / `mods-types.test.ts` / `mods-example.test.ts` + `.d.ts`, with a new `mod-note-created.test.ts` red first (copy `mod-note-moved.test.ts` / `mod-note-saved.test.ts`).
4. Commit D: docs.

## Risks and defaults

- Default: `openOrCreateNote` notifies for every caller, so a deep link's default create (it goes through `openOrCreateNote`) is reported. Owner question 1 scoped "deep links" to the `writeTextFile` paths (`deep-link.service.ts:306-317, 325-337`: overwrite, silent create); those stay unreported. Docs say so precisely; the mods JSDoc says "deep links" more broadly.
- Default: the file explorer reports every file its New menu makes (note, canvas, table, plugin creators), as `onNoteSaved`/`onNoteMoved` report any file.
- Not covered (docs list them): `createTypedNote` without an open (event calendar, mods), New type definition, `.view` creation, note action bar, event copy, Auto Organize, `ctx.vault.create`, duplicate, Trash restore, external creates, and the direct-write paths of owner answer 1.
- `openFileInEditor` toasts its own failure and does not reject, so the event still fires when the open failed; accepted (the note exists).
- Out of the build gate: `pnpm build`, full suite, the mods workspace `check:package` / `verify` belong to deliver.
