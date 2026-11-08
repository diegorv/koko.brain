# Issue 03 discovery

## Decisions
- Plan section 12 wins: extend the existing unstable `ctx.labs.place` with menu placement, retaining palette opt-in. No `when`, icons, submenu, or mod calls during render.
- Keep the optional stable-shaped `run.target` typed in contract v1 (section 12 decision 1b); omit the property on rail/palette runs.
- Reuse `.scratch/mods-extension-points/work/02/`: action key, lazy output, input picker and unload ownership stay unchanged. Differences are menu registration, target capture, and menu focus coverage.

## Files and reactive chain
- `src/lib/features/rail-shell/rail-registry.store.svelte.ts:13-93` and `rail-shell.types.ts:202-230`: raw menu list, getter, identity unregister and reset; data-only entries with note/folder scope and markdown default.
- `src/lib/plugins/mods/mods-host.service.ts:34-39,127-138,223-267,290-309,329-365`: validate placement at the JavaScript boundary, own its disposers, pass target through input/run, remove placements when actions disappear.
- Host writes `modCommandsStore.place`, registry registration, runs start/log/progress/finish/fail/cancel and picker open/askInput/showRun. Existing run/picker getters feed `ModActionPicker.svelte`; preserve these writes and lazy reveal.
- Registry `menuItems` getter feeds `RailNoteList.svelte:821` via `NoteRowMenu.svelte:32-41,256-260`, and `FilesNavigator.svelte:356-360` directly. Note rows filter markdown and translate paths; folders use `target.isRoot ? '' : getRelativePath(...)`.
- `src/lib/plugins/mods/contract/mod-api.v1.ts:51-67`: optional target with vault-relative path. Contract runtime assertions distinguish optional menu target from rail's existing keys.
- `help/documentation/28-mods.md:198-245`: placement options, filtering, disposal, target and shared busy key.
- `e2e/specs/vault-mods.spec.ts`: real host fixture actions, written-note assertions and prompt focus after menu close.

## Plan
1. Write failing registry/host tests, then implement menu registration, cleanup and target propagation. Run registry, host, contract, dependent mods tests and typecheck; commit.
2. Write failing mounted menu tests, wire both surfaces and RailNoteList, document the API and add browser flows. Run touched/dependent tests, architecture checks, typecheck and vault-mods E2E; commit.

## Prior art and risks
- Copy registry identity tests, host `recordingMod`/watcher reload tests, `NoteRowMenu.test.ts` menu helpers, `FilesNavigator.menu.test.ts` root/folder helpers and vault-mods E2E filesystem boundary.
- Real registry tests cover zero-item labels/separators, canvas filtering, inset, root and relative targets; host tests cover malformed/unknown placement, disposal/reload/unload, busy reuse and target-free other origins.
- Capture target before async input; menu-to-dialog focus requires browser evidence. Default markdown filtering protects binary/non-markdown rows.
- Targeted checks replace the full suite in build. Full suite and native verification are deferred to deliver; Issue and ledger remain untouched.

## Build evidence
- Registry, host placement, both mounted menus and RailNoteList wiring each failed before implementation. A trailing-slash vault test reproduced an absolute note target; stripping the root suffix fixed it.
- Fresh worktree tests initially could not resolve the generated `$app/tsconfig`; `pnpm exec svelte-kit sync` generated it without a configuration change. An intermediate typecheck caught two test API mistakes, both corrected before committing.
- Final typecheck: 0 errors, 0 warnings. Targeted dependent selection: 46 files passed, 1274 tests passed, 53 existing conditional Rail variants skipped, 0 failures. Earlier host/registry gate: 22 files, 540 tests passed.
- Vault-mods browser suite: 14 passed twice, including clicked-target note creation and direct prompt focus/typing after menu close. No dialog timing workaround was needed.
