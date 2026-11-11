# 08: Mods get `ctx.onNoteCreated` for new notes

**What to build:** a mod can subscribe to note creation with `ctx.onNoteCreated(({ path }) => ...)`, a stable member next to `ctx.onNoteMoved` (brain Issue 05). Item 5 of the owner's list asked for create, move and rename events; brain Issue 05 and mods Issue 04 ship move and rename only, because creation has two open owner questions (below). This Issue holds those questions until the owner answers them. Its contract half becomes mods Issue 05 (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/05-...`) only after the owner answers.

```js
ctx.onNoteCreated(({ path }) => ctx.log('Created:', path));
```

**Blocked by:** 05

**Requires first (other repo):** mods Issue `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/.scratch/mods-power/issues/05-note-created-event.md` delivered and pushed (it adds `ModNoteCreatedV1` and `ModContextV1.onNoteCreated`), with its full SHA in its Comments. This Issue adopts that SHA per `docs/MOD-CORE.md` "Updating the dependency", in the same commit as the host code: the freeze tests fail on the new SHA until the host implements the member.

**Status:** resolved

Owner decisions taken on 2026-11-11 (see "Owner questions"). Mods Issue 05 is filed. Set this Issue `ready-for-agent` when that Issue's full SHA is in its Comments. Launch by explicit number only.

**Gate:** frontend with a dependency change: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus the mods workspace's `pnpm check:package <temp consumer>` and `KOKOBRAIN_HOST_ROOT=<this checkout> pnpm verify` (`docs/MOD-CORE.md` steps 2 and 6). If question 1 adds notifier calls in `app/` or `features/` write paths, follow `docs/agents/indexing-watcher-rules.md`.

## Owner questions (answered 2026-11-11)

- **Answer to 1: no.** Quick Capture captures, deep links, the icon picker's folder note and empty template files are not reported; they reach mods through `onNoteSaved`. No notifier is added to those write paths. The docs list which creators are covered.
- **Answer to 2: after.** Each creator calls the created-note notifier only when it is done, including its tab-open step (for `openOrCreateNote`, after `openFileInEditor`; for `createFile` callers that open the file, after they open it), so a mod's write reaches the open tab and is not lost to its autosave.

The questions as asked:


1. **Do Quick Capture captures count as created notes?** Quick Capture does not use `create_note`. `executeCaptureAction` (`src/lib/app/deep-link-actions.ts:213-225`) and the deep-link overwrite and silent-create paths (`src/lib/features/deep-link/deep-link.service.ts:306-317, 325-337`) create the file with `writeTextFile` + `notifyAfterSave` + `addToTree`, so they fire `onNoteSaved`, not a created event. The file-icon folder note (`src/lib/features/file-icons/file-icons.service.ts:99-104`) and empty template files (`src/lib/plugins/templates/templates.service.ts:118`) do the same. Covering captures means notifier calls at about three more write sites: a behavior change in write paths (`item-05-validation.md:24-30`, R1). Until then `onNoteSaved` covers captures.
2. **Should the event fire after each creator's tab-open step?** Firing from the `create`/`fs` branch of `applyNoteChange` runs the mod before `openOrCreateNote` opens the tab (`src/lib/core/note-creator/note-creator.service.ts:118-127`, `src/lib/core/editor/editor.service.ts:125-141`). A mod's `ctx.vault.write` in that gap finds no tab, and the tab then opens clean with the bytes read before the write, so the user's next autosave overwrites the mod's write (`item-05-validation.md:32-40`, R2). Firing after each creator's open step closes the gap for that creator; `createFile` callers open the file after it returns (`src/lib/app/commands.ts:134`, `QuickSwitcher.svelte:49`), so the end of `createFile` is not enough.

## Shape (from the validation, `item-05-validation.md:64-79`)

- Payload `{ path }`, an object with a vault-relative path, like `ModNoteMovedV1` (additive later).
- A created-note notifier in core (a registry in `note-change.service.ts` or `editor.hooks.ts`), called from the creators after each has finished; for `openOrCreateNote`, after `openFileInEditor`. Not from `applyNoteChange`.
- Delivery through `callModCallback('onNoteCreated', ...)` (brain Issue 06) in a `setTimeout(0)` with the same liveness checks as `onNoteMoved` (brain Issue 05).
- Docs state which creators are covered.
- Tests per covered creator.

## Notes

- **Research:** `.scratch/mods-power/research/item-05-host.md`, `item-05-contract.md`, `item-05-validation.md` (R1, R2, 5b; the validation wins). Code read at `c2bed3463`.
- **Ordering:** after brain 05, so `onNoteMoved` sets the delivery pattern and the contract order stays linear (mods 05 after mods 04). Full order: `.scratch/mods-power/PRD.md`.
- **Related:** `.scratch/mods-host-robustness/issues/03-note-saved-fires-for-mod-creates.md` (`ctx.vault.create` does not notify save observers). If that Issue makes `create` notify, it must also count toward the own-write marker of brain Issue 02.
- **Not verified:** whether Tauri resolves `exists` before an earlier `readTextFile` in practice (R2 depends on IPC ordering; `item-05-validation.md:101`).

## Comments

- 2026-11-11, branch `issue/08-on-note-created`: mods get `ctx.onNoteCreated` for notes made by the covered creators; docs note that notes made at vault open are not reported. Full suite at a16fb6745: 614 files, 15500 tests passed, 54 skipped, 1 todo, exit=0. Targeted: `pnpm check` 0 errors; help and sync-wiki-docs tests passed. Reviews: round 1 APPROVED, round 2 APPROVED (one nit: the Issue has no acceptance-criteria checklist, so `relay review-ticks` ticked nothing and left the status line).
