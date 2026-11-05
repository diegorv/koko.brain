# 03: Every `.view` write goes through one tab-aware, serialized writer

**What to build:** `writeViewFile` writes to disk only (`type-definitions.service.ts:287-291`). A dirty tab ignores disk on reload (`editor.service.ts:403`), and its autosave then writes the buffer over `_rail`, `_icon` or a toolbar edit. The window is the autosave wait: 2 s, up to 10 s during continuous edits. Every `.view` writer also does read, await, write with no per-path ordering, so a Pin and a toolbar write can interleave.

Replace `writeViewFile` with `rewriteViewFile(path, transform)` in `type-definitions.service.ts`:

- Serialized per path by a promise chain.
- Waits for a tab save in flight on that path. `saveFileByPath` writes with no lock today (`editor.service.ts:166-171`), so add the smallest per-path ordering that lets the writer wait for it. The owner chose to fix this rather than record it as a risk.
- Reads disk first. Then, with no await: `base = tab dirty ? tab.content : disk`.
- `updated === base` returns without writing.
- With a tab: `syncExternalContentToEditor(path, updated, false, 'none')`, then `saveFileByPath(path)`, reverting on failure. This is the idiom of `frontmatter-write.service.ts:131-140`.
- Without a tab: copy the rest of that idiom too (`:122,143-158`): `assertVault`, the `exists` check, `{ create: false }` with a refusal on a missing file, and the sync for a tab opened during the write. Then `markRecentSave` and `applyNoteChange` with no `vaultPath`. Without this, a queued write can recreate a deleted file, or index an old vault's path after a vault switch.
- `transform` stays pure. `requestPromptIndexRefresh` is called after `updated !== base`, not inside it.

Callers: `updateViewIcon`, `updateViewIconColors`, `setViewRailPin`, `updateViewListProperties`, `editView` and `updateViewQuery` pass their YAML updater as `transform`. `removeViewIcon` delegates and needs no edit. `editView` keeps its refresh.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first, with real stores and only `plugin-fs` and `invoke` mocked:
  - Dirty tab, `setViewRailPin`, run the autosave timers: disk holds both the buffer and `_rail`, and the tab is clean.
  - Clean tab with an older buffer: the base is disk, and the tab matches afterwards.
  - Hold `readTextFile`, fire Pin and an icon write together: both keys survive.
  - Hold a tab save, fire Pin: Pin's write lands after it, and `_rail` survives.
  - Delete the file while a write is queued: the file is not recreated.
- [ ] No `.view` writer calls `writeTextFile` except through `rewriteViewFile`. `raw-write-ratchet.test.ts` keeps one site, with its reason string updated.
- [ ] An open tab shows the result immediately.
- [ ] The doc comment no longer implies a `.view` write always skips the after-save observers.

## Notes

- **New behavior to check:** the tab branch runs `notifyAfterSave`, like any tab save today. That means a file history snapshot and `notifyContentInvalidated`. Issue 02 already stops Auto Move. Search is unaffected: its observer is `.md` / `.markdown` only.
- **Risks:** `CollectionView.svelte:163-175` wipes formula rows being edited on a non-self YAML change. `MarkdownEditor` source mode receives an external doc replace; `MarkdownEditor.svelte:608-630` was not read. A failed tab save toasts from `saveFileByPath` and from the caller, so avoid the double toast.
- **Do not reuse from another folder:** `features/collection/` has no import of `type-definitions`, and adding one closes a cycle `feature-cycle.test.ts` should reject.
- **Size:** M. This is the riskiest Issue in Phase 1. Ask for a refuting review before commit.
