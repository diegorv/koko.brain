# 27: Rename link rewrite edits links inside code blocks and misses path-qualified, extension and self links

**Status:** wontfix

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

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/077-rename-link-rewrite-skips-links-inside-code.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
