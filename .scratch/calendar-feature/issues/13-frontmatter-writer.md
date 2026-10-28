# 13: Dirty-safe, path-addressed frontmatter writer in features/properties

**What to build:** a shared `updateNoteFrontmatter(path, mutate)` in `features/properties` rewrites one note's frontmatter by path without losing data. When the note is open it patches the tab's content, keeping unsaved body edits, and saves it immediately. When the note is closed it writes the file and runs the full after-save path. It refuses lossy frontmatter, throws `vault-changed` across a vault switch and `missing` instead of re-creating a note that vanished during the read, and reports save failures as a typed `FrontmatterWriteError` so callers can roll back and never toast twice. This is the single write path the calendar uses for moves, resizes and edits (D5). Saving a dirty open tab flushes its pending body edit about 2 s earlier than autosave would; Task 33 documents this.

**Plan reference:** Task 12 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 292-325). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. The Pre-Change Checklist answers are Notes C2 (lines 965-980). Per Notes > Dependencies (line 938), re-run this ticket's tests after `.scratch/p2p-sync/plan-2026-08-25.md` Task 1 rewrites the external-reload loop in `editor.service.ts`.

**Blocked by:** 12

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/properties/frontmatter-write.service.ts` (new)
- `src/tests/lib/features/properties/frontmatter-write.service.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [x] `frontmatter-write.service.ts` exports `FrontmatterWriteError`, with `reason: LossyFrontmatterReason | 'save-failed' | 'vault-changed' | 'missing'`, and `updateNoteFrontmatter(path, mutate: (props: Property[]) => Property[]): Promise<string>`, which returns the written content
- [x] `vaultStore.path` is captured at entry; after every later `await`, a changed path throws `vault-changed` before the next side effect (test: vault switched during the read, nothing written)
- [x] The base is the open tab's `content` when a tab has that path, otherwise `readTextFile(path)`, whose errors propagate (test: missing file at read time)
- [x] A non-null `detectLossyFrontmatter(base)` throws with that reason, writes nothing and leaves the tab untouched (one test per reason); otherwise `next = rebuildContent(mutate(parseFrontmatterProperties(base)), extractBody(base))`, and `next === base` returns without writing (no-op test)
- [x] Tab branch calls `syncExternalContentToEditor(path, next, false, 'none')` then `await saveFileByPath(path)`; tests cover a clean open tab and a dirty open tab (body edit preserved, tab clean afterwards, merged content asserted)
- [x] When `saveFileByPath` returns `false` (it toasts instead of throwing), the tab is restored with `syncExternalContentToEditor(path, base, false, 'none')` and `save-failed` is thrown, so callers never toast twice (test: tab restored to base, `save-failed` thrown)
- [x] No-tab branch re-checks `exists(path)` immediately before writing; false throws `missing` and writes nothing (test: deleted between read and write, `exists` resolves false on the re-check, the reason is `missing`, the mocked fs holds no file at the old path)
- [x] No-tab branch re-checks for a tab with no `await` between that check and the write, and restarts once from step 2 on the tab branch (test: a tab opened while the read is pending takes the tab branch and ends up holding `next` and clean)
- [x] Otherwise it calls `writeTextFile(path, next)`, `syncExternalContentToEditor(path, next, true, 'none')`, then `notifyAfterSave(path, next)`; the closed-file test asserts the disk bytes and the `notifyAfterSave` effects through the real dedupe and consumer path
- [x] Tests mock only `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` (`invoke`) and `svelte-sonner`, use the real `editorStore` and `vaultStore`, and the dirty-tab preservation, open-during-read and deleted-between-read-and-write tests are written first (Notes C2, Q5)
- [x] `editor.service.ts` and the disk-direct writers in `src/lib/features/file-icons/frontmatter-icon.service.ts` are not edited (rerouting them is a follow-up)
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:27 — discovery — plan in work/13/discovery.md: new frontmatter-write.service.ts with vault guard after every await, tab/no-tab branches, one restart; race tests first — 44bcee52
- 2026-10-28 12:30 — implement — frontmatter-write.service.ts + 16 tests (race cases first, each guard mutation-checked); pnpm check 0 errors, properties + core/editor tests 644 passed; gate left to deliver — 735d739d
- 2026-10-28 12:33 — review — VERDICT: APPROVED; 4 low/nit findings (save-failed restore clobbers edits made during the save, JSDoc on mutate re-run / per-path serialization / vault-changed after write, untested post-await vault guards, localStorage stub scope) in work/13/review.md — 954f923b
- 2026-10-28 12:35 — fix — 4 review findings fixed (conditional save-failed restore, JSDoc caveats, 5 new tests, scoped localStorage stub); 21 tests pass, pnpm check 0 errors — c5bcd74b
