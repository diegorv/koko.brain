# 043 discovery

No `spec.md` in `.scratch/open-itens/`. Read: the Issue, docs/agents/indexing-watcher-rules.md rule 12.

## Files that change

- `src/lib/features/note-list/NoteRowMenu.svelte`: `handleDuplicate` (:77-79), `commitRename` (:123-136, the F2 path ends here too), `handleDelete` (:155-163). Call `vaultStore.requestPromptIndexRefresh()` right before the fs call: in rename after the empty/unchanged/illegal checks, in delete inside `if (confirmed)`. `vaultStore` is already imported.
- `src/lib/plugins/quick-capture/note-composer.service.ts:20`: request after the `!vaultPath` return, before `openOrCreateNote`.
- `src/lib/features/rail-shell/new-note.service.ts:24`: request at the top of the `try`, before either branch.
- `docs/agents/indexing-watcher-rules.md` rule 12: the list of prompt-refresh callers gains these entry points.

No change to `fs.service.ts`, `applyPathChange`, `createFile`, `duplicateItem` or the listener.

## Tests (test-first)

- `src/tests/lib/features/note-list/NoteRowMenu.test.ts` (real vaultStore, fs.service mocked): rename on Enter, confirmed Trash, Duplicate each leave `takePromptIndexRefresh()` true, and the request is already set when the fs mock runs (probe pattern from `tasks.service.test.ts:1451`: take, then re-request). Declined Trash, empty and unchanged rename leave it false.
- `src/tests/lib/plugins/quick-capture/note-composer.service.test.ts`: true after `createNoteComposer()`, set when `openOrCreateNote` runs; false without a vault.
- `src/tests/lib/features/rail-shell/new-note.service.test.ts`: true after `createNoteHere` for a plain and a typed rule, set before `create_note` is invoked.
- `src/tests/lib/core/filesystem/fs.service.test.ts`: guard, new describe: `renameItem`, `moveItem`, `deleteItem`, `duplicateItem`, `createFile` called directly leave it false (passes today).

## Risks / defaults

- Illegal-name rename requests nothing (the check returns before the fs call); the Issue names only empty/unchanged, this is the natural placement.
- Known limits in the Issue's Notes (request consumed by an earlier event, a failed op leaves it set) are accepted, no extra code.
- E2E gate (`bash scripts/e2e.sh ...`) named in the Issue: run in build if time allows and report.
