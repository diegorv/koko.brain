# 077: Rename link rewrite skips links inside code blocks and updates self links

**Origin:** `audit-2026-11-05` Issue 108, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/27-link-rewrite-scope.md` (audit 2026-11-05). The path-qualified and extension halves of that Issue are done (99bffdf66, fdf1479c2) and are not part of this one.

**What to build:** Three gaps remain in the rename link rewrite.
- (a) Code. `replaceWikilinks` (src/lib/core/filesystem/link-updater.logic.ts:86-118) runs one global regex over the whole content, with no fence or code-span skip. A literal `[[Old Note]]` inside a fenced block or inline code that resolves to oldPath is rewritten, which silently changes the bytes of a note that only quotes the syntax. Code-only mentions do reach the rewrite: Rust `extract_outgoing_links` scans the whole content on purpose (src-tauri/src/vault/parsing.rs:1060-1066), so such a note is a `get_backlinks_v2` source. Skip fenced code blocks and inline code spans in `replaceWikilinks`; real links outside code keep their current rewrite.
- (b) Self links. `updateLinksAfterRename` (link-updater.service.ts:46-47) filters oldPath out of the `get_backlinks_v2` sources, so `[[Old#Heading]]` inside the renamed note is never rewritten and dangles. Rust `lookup_backlinks` returns the note itself when it links to itself (src-tauri/src/vault/index.rs:753-763). By the time this runs, `applyPathChange` has already run diskOp and `updateTabAfterRenameOrMove` (path-change.service.ts:175-184), so the self note lives at newPath on disk and in its tab, while `fsStore.fileTree` still lists oldPath, so `buildRenameResolution` still resolves `[[Old#Heading]]` to oldPath.
- (c) Failures. Per-file failures are only logged through `error('LINK_UPDATER', ...)` (link-updater.service.ts:75-79). Show them in a toast.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** first wave, picked by the owner on 2026-11-06. Owner, 2026-11-12: approved as a deep-dive addition to the queue. The 004 blocker the deep dive proposed is dropped, because 004 no longer hooks `updateTabAfterRenameOrMove` (its rename leg moved to its Notes as a known limit). Nothing open.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/filesystem/link-updater.logic.test.ts (`replaceWikilinks resolution` describe, built with `buildRenameResolution` as the neighbouring cases do): `replaceWikilinks` over '```md\n[[Old Note]]\n```\n' returns the fenced block unchanged, with `[[Old Note]]` still inside it. It fails today (the fence is rewritten to `[[New Note]]`). Do not move the archived repro test: it calls the old `replaceWikilinks(content, oldName, newName)` signature and no longer compiles.
- [ ] Inline code spans are skipped: 'Use `[[Old Note]]` and [[Old Note]]' rewrites only the second link, leaving the span unchanged. A `~~~` fence is skipped like a backtick fence.
- [ ] Real links next to code are still rewritten, including alias, heading and path-qualified forms outside code (existing `replaceWikilinks` cases stay green).
- [ ] Self links, in src/tests/lib/core/filesystem/link-updater.service.test.ts (`updateLinksAfterRename` describe): when `get_backlinks_v2(oldPath)` lists the renamed note itself and its content holds `[[Old#Heading]]`, the self link is rewritten to `[[New#Heading]]` in the note at newPath. The read, the dirty-tab lookup, the write, the open-tab sync and the `applyNoteChange` upsert all use newPath, and nothing is read from or written to oldPath (no file is recreated there).
- [ ] The rewritten self link reaches the Rust index. `applyNoteChange` sends `update_note_in_index` at once (note-change.service.ts:239), while `applyPathChange` awaits `rename_note(from, to)` only after `updateLinksAfterRename` returns (path-change.service.ts:221), and `rename_note_inner` re-inserts the pre-rewrite entry at `to` (src-tauri/src/commands/vault.rs:1302-1335). So an upsert of newPath sent before `rename_note` is overwritten with the old links. Test through `applyPathChange` with a recording invoke mock: an `update_note_in_index` for newPath with the rewritten content is sent after `rename_note`, and none is sent before it.
- [ ] A per-file write failure during the link rewrite is shown to the user in a toast naming the note, in addition to the existing `error('LINK_UPDATER', ...)` log. A failure on one file does not stop the others from being rewritten (existing `Promise.allSettled` behavior, asserted). link-updater.service.test.ts mocks only `#lib/utils/debug.js`, `@tauri-apps/api/core` and `@tauri-apps/plugin-fs`, so add a `vi.mock('svelte-sonner')` (a DOM service, allowed by docs/TESTING.md) and assert the toast text.

## Notes

- **Impact:** low to medium (deep dive 2026-11-12, validate-s5+s6). Rename is a daily action, but the bug needs a note that quotes `[[Old]]` in code, or a self link with a heading in the renamed note. The change is silent and shows up only in the diff of the rename or in File History.
- **Recoverable from:** partly. The pre-rename bytes are in File History if it is enabled, from the last save's after-save snapshot. The rewritten bytes are not snapshotted: `updateLinksAfterRename` writes with `writeTextFile` and calls `applyNoteChange`, not the after-save observers.
- **Frontmatter is not affected:** the audit's frontmatter claim was refuted. The rename path never parses or re-serializes frontmatter; `replaceWikilinks` is a text regex.
- **Self-link index ordering (criterion 5):** read from code, not run. The index-dedupe mark that the early upsert sets can also turn the watcher's later upsert of the same bytes into a no-op, so the index would keep the old self link until the next edit. Keep the fix inside `updateLinksAfterRename` and `applyPathChange`; add no new hook or consumer.
- **Out of scope:** (d) a link that exists only in a dirty tab of a note the saved index does not list as a source. The window is the 2 s autosave debounce, so it is near-theoretical.
- **Run order:** last in slot 1 (015, 004, 028, 043, 077). 028 edits path-change.service.ts, which criterion 5 also touches (043 no longer does: its refresh request sits in the user entry points). 089 (todo, not queued) edits link-updater.service.ts too; never run the two together.
- **Source metadata:** file I/O audit, deep-dive group h03-search-links (raw reports in `.scratch/archived/file-io-audit/deep/raw/`), verified at c4bfee07. Audit priority P2, severity corruption; the code-block part was graded P1 and downgraded because it needs a literal `[[Old]]` inside code and the change is visible in the rename's diff. Re-checked by audit 2026-11-05 at `5f8003d67` and by the 2026-11-12 deep dive at `318b6e9b5`; line numbers above are from `3ab6de999`.

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/27-link-rewrite-scope.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-12: deep dive (`.scratch/open-itens/research/deep-dive-2026-11-12/`) confirmed (a), (b) and (c) at HEAD; owner approved it as a queue addition. Rewrote the Issue into the repo format: removed the done path-qualified and extension half, the stale line references and the stale-text header, and put the remaining scope in What to build. Kept `Blocked by: none` (the 004 blocker is dropped with 004's rename leg). Added the `svelte-sonner` mock to the toast criterion (cross-tests-relay L3), the note against moving the archived repro test, and a criterion that the self-link upsert is not overwritten by `rename_note`.
- 2026-11-12: consistency review: the run-order note no longer says 043 edits path-change.service.ts (043 requests the refresh from the user entry points only).
