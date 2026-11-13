# 04: Rename rewrites path-qualified and .md wikilinks

**What to build:** When a user renames folder/Old.md to folder/New.md, backlinks written as [[folder/Old]], [[Old.md]], [[folder/Old.md]] (with heading, block ref, alias or embed) are rewritten so they keep pointing at the note: [[folder/New]], [[New.md]], [[folder/New.md]]. Today replaceWikilinks (src/lib/core/filesystem/link-updater.logic.ts:27) compares the whole target with the old stem, so these sources are visited but left dangling. The fix lives in link-updater.logic.ts: a target matches when its basename stem (getNoteName semantics, the same rule Rust note_name_from_target uses) equals the old stem. The fix keeps the target's folder prefix and its extension and swaps only the stem. updateLinksAfterRename stays as it is (the affected set already comes from get_backlinks_v2).

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing test first: src/tests/lib/core/filesystem/link-updater.logic.test.ts expects replaceWikilinks('See [[folder/Old]]', 'Old', 'New') to be 'See [[folder/New]]' and replaceWikilinks('See [[Old.md]]', 'Old', 'New') to be 'See [[New.md]]'. Both are red today.
- [x] Heading, block ref, alias and embed forms are kept with a path prefix and with .md ([[folder/Old.md#H|a]] becomes [[folder/New.md#H|a]], ![[folder/Old]] becomes ![[folder/New]]).
- [x] Non-matches stay unchanged: [[folder/Older]], [[Old.png]] (a different file, not a note stem match for a markdown rename), and empty-target links.
- [x] A service test in link-updater.service.test.ts (invoke and plugin-fs mocked, real editorStore) sends a source containing [[folder/Old]] through updateLinksAfterRename('/v/folder/Old.md', '/v/folder/New.md') and asserts the written content and the synced tab content contain [[folder/New]].
- [x] The frontend gate is green: pnpm check, pnpm vitest run, pnpm build.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `link-path-qualified`:** real, medium. Root cause: replaceWikilinks compares the whole trimmed target with the old stem. The affected set comes from Rust backlinks, and Rust resolves [[folder/Old]] and [[Old.md]] to the note through the exact-file step or the basename fallback. So these sources are visited but their text is never rewritten. After the stem changes, the basename 'old' no longer exists and the links dangle.
  Evidence: link-updater.logic.ts:27 `(target as string).trim().toLowerCase() !== oldNameLower` returns fullMatch for 'folder/old' and 'old.md'. index.rs:142-170 resolve_with_cache resolves both forms to the note (the exact-file step for .md, the basename fallback for a path prefix), so get_backlinks_v2 at link-updater.service.ts:28 returns the source. With no text change, link-updater.service.ts:39 skips the write. After the rename, cache.get('old') misses and the link resolves to nothing. The app's own completion inserts bare names (completion.ts:90-105), so this hits hand-typed and imported Obsidian-style links. No test in link-updater.logic.test.ts covers either form.
- Assumption: keep the link's original form (prefix and extension) and replace only the stem. That is the conventional reading and needs no product decision. Leave [[Old.png]]-style non-markdown targets alone: the extension match must be .md or .markdown only. Rewriting only links that resolve to the renamed file is the next ticket. This one deliberately keeps the existing name-based filter, which still rewrites a [[otherfolder/Old]] in a source that is a backlink. That matches today's bare-name behaviour.
- **Size:** S.

## Comments

- 2026-11-04, branch issue/04-rewrite-path-qualified-links: replaceWikilinks (link-updater.logic.ts) now splits each target into path prefix, stem and .md/.markdown extension, matches on the stem, and keeps prefix, extension, heading, block ref, alias and embed form. Round 1 fix: a stem that itself ends in .md (e.g. [[notes.md]] for notes.md.md) still matches on the whole file name. Tests: link-updater logic + service 52/52; pnpm check 0 errors; full suite vitest 495 files, 11754 passed, 1 skipped, 1 todo; pnpm build OK (exit=0). Reviews: round 1 APPROVED (one minor finding, fixed), round 2 APPROVED (one nit, no change needed).
