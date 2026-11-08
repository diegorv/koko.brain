# 077: Rename link rewrite skips links inside code blocks and updates self links

**Origin:** `audit-2026-11-05` Issue 108, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/file-io-audit/issues/27-link-rewrite-scope.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Partially fixed: the path-qualified and extension halves are done (99bffdf66, fdf1479c2). What remains needs links inside code blocks.

**Audit check at `5f8003d67`:** partially_fixed (content, low). Fixed: path-qualified and .md/.markdown targets (99bffdf66; splitTarget at src/lib/core/filesystem/link-updater.logic.ts:25-33 matches on the stem and keeps prefix and extension), and only links that resolve to oldPath are rewritten (fdf1479c2; resolveWikilinkCached check at link-updater.logic.ts:105). Still present at HEAD 47ecf60ef: (a) replaceWikilinks (link-updater.logic.ts:86-118) is one global regex over the whole content with no fence or inline-code skip, so a literal [[Old Note]] inside a code block that resolves to oldPath is rewritten. (b) link-updater.service.ts:47 filters oldPath out of affectedPaths, so a self-link such as [[Old#Heading]] inside the renamed note is never rewritten and dangles after the rename. (Rust lookup_backlinks at src-tauri/src/vault/index.rs:753-763 returns the note itself when it links to itself.) (c) Sources come only from get_backlinks_v2 (service.ts:46). A link that exists only in a dirty tab is missed, but the window is the 2 s autosave debounce, so (c) is near-theoretical. (d) Per-file failures are only logged through error() (service.ts:75-79), with no toast. Triggers for (a) and (b) need a self-link or a literal wikilink in code, which is uncommon. (d) needs a write error.

**Stale in the text below:** Line refs are stale: replaceWikilinks is now logic.ts:86-118 (Issue says :23-39 and :27), the oldPath filter is service.ts:47 (Issue says :28), sources are at service.ts:46 (Issue says :27), and the failure log is service.ts:75-79 (Issue says :56-60). The whole path-qualified and .md-suffix half of section 2, and its fix sketch, are done and should be removed. The repro test calls the old replaceWikilinks(content, oldName, newName) signature and no longer compiles. It must be rewritten against replaceWikilinks(content, buildRenameResolution(...)). Remaining scope: code fences and code spans, self-links in the renamed note, a user-facing surface for write failures, and optionally dirty-tab sources (low value).

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) h03-search-links (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: the code-block part was graded P1. Downgraded to P2: it needs a literal [[Old]] inside a fenced block, and the change is visible in the diff of the rename.

## Rename rewrites [[Old]] inside fenced code blocks, silently changing note bytes

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity corruption)
- Claims covered: fidelity-13

**How a user hits it.** A note that documents wikilink syntax inside a fenced code block (or inline code) whose quoted name matches a note being renamed. Uncommon but realistic for dev and wiki notes. Happens silently on every such rename, with default settings.

**Recoverable from.** Partly. The pre-rename bytes are in File History if it is enabled (default not verified), since the last save took a snapshot via the after-save observer. The rewritten bytes are not snapshotted: updateLinksAfterRename writes directly with writeTextFile and calls applyNoteChange, not the after-save observers. Editor undo may not cover a disk write.

**Root cause.** src/lib/core/filesystem/link-updater.logic.ts:23-39 (replaceWikilinks): a global regex over the whole content, with no fence or inline-code awareness. link-updater.service.ts:36-47 writes the result to disk.

**Evidence.** Repro src/tests/repro/h03-search-links/link-rewrite.test.ts: replaceWikilinks('```md\n[[Old Note]]\n```\n','Old Note','New Note') returns the fence with [[New Note]]. The frontmatter half of the claim is REFUTED: properties.logic.ts:290 is inside parseFrontmatterProperties (computeAndCache), a read-only parse building a Property list. The rename path never parses or re-serializes frontmatter: link-updater.logic.ts imports only stem, and replaceWikilinks is a text regex, so frontmatter key reordering is not reachable from rename.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h03-search-links/link-rewrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected '```md\n[[New Note]]\n```\n' to be '```md\n[[Old Note]]\n```\n'
```

**Fix sketch.** Skip fenced code blocks and inline code spans when rewriting, so only real links change. Add a test for fenced and inline-code cases.

## Link rewrite on rename skips path-qualified, extension-qualified, self and unsaved links, which then dangle silently

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: rename-move-delete-4

**How a user hits it.** Any rename of a note that other notes link to with a folder prefix (e.g. [[Work/Plan]]), with a .md suffix, from inside the renamed note itself, or via a link typed but not yet saved. Realistic in folder-structured vaults. No warning is shown.

**Recoverable from.** Yes. The user fixes the links by hand. No bytes are destroyed.

**Root cause.** src/lib/core/filesystem/link-updater.logic.ts:27 (replaceWikilinks): compares the whole target 'Work/Plan' with the bare note name, so path-qualified links are never rewritten. src/lib/core/filesystem/link-updater.service.ts:28 filters out oldPath, so self-links in the renamed note are not rewritten. link-updater.service.ts:27 takes sources only from the saved Rust index (get_backlinks_v2), so a new unsaved link is never found. Per-file failures are only logged (service.ts:56-60).

**Evidence.** Repro: replaceWikilinks('See [[Work/Plan]]','Plan','Roadmap') returns the input unchanged; resolveWikilink of the result against ['/vault/Work/Roadmap.md'] returns null (src/tests/repro/h03-search-links/link-rewrite.test.ts). The link did resolve before: wikilink-resolution.logic.ts:24-31 falls back to the basename. [[Plan.md]]: TS getNoteName (lines 4-8) strips the extension, so it resolves and is not rewritten; Rust note_name_from_target not read (PLAUSIBLE on that side). Self-link and unsaved-link cases: CONFIRMED_BY_TRACE from service.ts:27-28 and the saved-index source set.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h03-search-links/link-rewrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected null to be '/vault/Work/Roadmap.md' (path-qualified link does not resolve after rewrite)
```

**Fix sketch.** Rewrite the basename part of any target whose basename equals the old name, keeping the path prefix, and handle .md suffix. Include the renamed note's own content and the open dirty tabs in the rewrite set, not only saved-index sources. Surface per-file write failures to the user.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/filesystem/link-updater.logic.test.ts (replaceWikilinks resolution describe, built with buildRenameResolution as the neighbouring cases do): replaceWikilinks over '```md\n[[Old Note]]\n```\n' returns the fenced block unchanged, with [[Old Note]] still inside it. It fails today (the fence is rewritten to [[New Note]]).
- [ ] Inline code spans are skipped: 'Use `[[Old Note]]` and [[Old Note]]' rewrites only the second link, leaving the span unchanged.
- [ ] Real links next to code are still rewritten, including alias, heading and path-qualified forms outside code (existing replaceWikilinks cases stay green).
- [ ] Self-links, in src/tests/lib/core/filesystem/link-updater.service.test.ts (updateLinksAfterRename describe): when get_backlinks_v2(oldPath) lists the renamed note itself and its content holds [[Old#Heading]], the self-link is rewritten to [[New#Heading]] in the note at newPath. The note was already moved by diskOp and its tab by updateTabAfterRenameOrMove, so the read, the write, the open-tab sync and the applyNoteChange upsert all use newPath, and nothing is read from or written to oldPath (no file is recreated there).
- [ ] A per-file write failure during the link rewrite is shown to the user in a toast naming the note, in addition to the existing error('LINK_UPDATER', ...) log. A failure on one file does not stop the others from being rewritten (existing allSettled behavior, asserted).
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/27-link-rewrite-scope.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
