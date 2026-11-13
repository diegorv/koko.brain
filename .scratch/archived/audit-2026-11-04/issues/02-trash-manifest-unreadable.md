# 02: Unreadable or corrupt trash manifest must not be replaced by a partial list

**What to build:** If .kokobrain/trash/trash-manifest.json exists but cannot be read, or does not parse to an array, the Trash must not act as if it were empty and must not overwrite that file. Today the next Move to Trash writes [newItem] over it, and Empty Trash deletes every items/<uuid>/ folder, including the ones the user can no longer see. parseTrashManifest (src/lib/core/trash/trash.logic.ts:58-66) must tell 'invalid' apart from 'empty', for example by returning null or { ok: false }. loadTrash (src/lib/core/trash/trash.service.ts:24-43) records a manifestBroken state in trashStore, logs it and shows a toast. The write paths that rebuild the manifest from the store (moveToTrash :79, restoreItem :139, deletePermanently :192, emptyTrash :208-214) first back up the unreadable manifest to trash-manifest.broken-<stamp>.json and only then write a new manifest. The Trash settings section shows the error state.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/core/trash/trash.service.test.ts. With exists resolving true and readTextFile resolving to '[{"id":"a",' (truncated), run await loadTrash(VAULT), then await moveToTrash(VAULT, `${VAULT}/note.md`, false). writeTextFile must not be called on the manifest path with content that lacks the original bytes, unless a backup copy of the manifest succeeded first. It fails today.
- [ ] The same holds when readTextFile rejects.
- [ ] emptyTrash after a corrupt load does not remove items/ folders that the user never saw listed.
- [ ] parseTrashManifest returns a failure result for invalid JSON and for a non-array root, and [] only for a valid empty array. Update the trash.logic.test.ts cases at :117-129 to the new contract and record that change in the commit message.
- [ ] A missing manifest still loads as empty and the first trash op creates it (existing test).
- [ ] The user sees a toast naming the manifest problem.
- [ ] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `trash-manifest`:** real, high. Root cause: loadTrash and parseTrashManifest treat a read error, unparseable JSON and a non-array root the same as a missing manifest (empty list). Nothing records that the file on disk was not loaded, so every later manifest write starts from that empty list and replaces the original.
  Evidence: src/lib/core/trash/trash.logic.ts:58-66: parseTrashManifest returns [] when JSON.parse throws or the root is not an array, with no signal. src/lib/core/trash/trash.service.ts:33-39: readTextFile then setItems(parse), and the catch at :37-39 also calls setItems([]). The next write uses that empty base: moveToTrash :79 saveManifest([item, ...trashStore.items]), restoreItem :139, deletePermanently :192, and emptyTrash :214. emptyTrash :208-210 first runs remove(itemsDir, {recursive:true}), which deletes the orphaned items/<uuid>/ folders the user can no longer see. Callers: app-lifecycle.service.ts:291 and TrashSection.svelte:19. Tests: trash.service.test.ts:105-113 and trash.logic.test.ts:117-129 assert the silent-empty result. Nothing tests a later write. writeTextFile in saveManifest (:276) is not atomic, so a crash during a write can produce a truncated manifest, which is a realistic trigger.
- **Owner decision (2026-11-04):** D2 (a): back up the unreadable manifest to `trash-manifest.broken-<stamp>.json`, then start a new manifest. Old trashed files stay on disk but are not listed; Empty Trash leaves unlisted `items/` folders alone. Dropping invalid entries inside a valid array is out of scope unless trivial; if left, say so in the commit.
- parseTrashManifest also silently drops entries that are not valid TrashItems inside a valid array (trash.service.test.ts:115). That drop is then persisted on the next write. Decide whether that is in scope: it is a smaller form of the same loss. Do not mock trash.store or trash.logic.
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/092-unreadable-corrupt-trash-manifest-backed-up-never.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
