# Issue 04 discovery: rename rewrites path-qualified and .md wikilinks

No `spec.md` exists for audit-2026-11-04; the Issue and `findings.md` are the source.

## Files that change

- `src/lib/core/filesystem/link-updater.logic.ts:23-40` `replaceWikilinks`: the match at
  line 27 compares the whole trimmed target with the old stem. Change it to split the
  trimmed target into folder prefix (up to and including the last `/`), stem, and a
  `.md` / `.markdown` extension (case-insensitive), compare only the stem, and emit
  `prefix + newName + ext` plus the existing heading / alias tail.
- `src/tests/lib/core/filesystem/link-updater.logic.test.ts`: new cases (red first).
- `src/tests/lib/core/filesystem/link-updater.service.test.ts`: one service case for
  `[[folder/Old]]` through `updateLinksAfterRename('/v/folder/Old.md', '/v/folder/New.md')`,
  asserting `writeTextFile` content and the synced tab content.
- `link-updater.service.ts` does not change (affected set stays `get_backlinks_v2`).

## Plan

1. Write the failing logic tests: `[[folder/Old]]`, `[[Old.md]]`, `[[folder/Old.md#H|a]]`,
   `![[folder/Old]]`, block ref with prefix, and the non-matches `[[folder/Older]]`,
   `[[Old.png]]`, `[[#H]]` / `[[]]`. Plus the service test. Run, see red.
2. Implement the split in `replaceWikilinks`. Run both test files green, then `pnpm check`.

## Prior art

- Existing `replaceWikilinks` cases in the logic test (heading / alias / embed forms).
- `mockBacklinksV2` + `entry()` + `editorStore.addTab` in the service test
  ("reads from disk when tab is clean") for the service case.

## Defaults taken

- Only `.md` / `.markdown` count as an extension to strip (Issue Notes). Any other dot stays
  part of the stem, so `[[v1.2 notes]]` still matches a note `v1.2 notes.md` as today; the
  new rule only adds matches, it removes none of today's.
- Extension and prefix keep the case the user wrote; the stem compare stays case-insensitive.
- The trimmed target is rewritten (today `[[ Old ]]` already becomes `[[New]]`).
- The name-based filter stays: `[[otherfolder/Old]]` in a backlink source is also rewritten
  (Issue Notes; resolution-aware rewrite is the next ticket).

## Risks

- A prefix that names a different folder's `Old` is rewritten too (accepted above).
