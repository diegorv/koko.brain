# 008: A Properties panel commit that changes nothing does not arm the skip flag

**Origin:** `audit-2026-11-05` Issue 152, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 121 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 121 first; its Details and evidence apply here. Only the no-op-commit part of its "Properties panel skip flag" section: in commitChanges (src/lib/features/properties/properties.service.ts), return before arming skipNextParseFor (and before syncExternalContentToEditor) when `newContent === content`. Today such a commit arms the flag, the next editor edit to the frontmatter skips its only re-parse, and the next panel edit rebuilds from the stale store and deletes the typed line, with no undo (addToHistory false).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, split from Issue 121 by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/properties/properties.service.test.ts (real propertiesStore and editorStore, only Tauri mocked): A panel commit that leaves the content unchanged, followed more than 300 ms later by an editor edit that adds `status: draft` to the frontmatter, followed by another panel edit, keeps `status: draft` in the tab content and on disk It fails today.
- [ ] A panel commit with `newContent === content` does not arm `skipNextParseFor`
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes

- Size S. The timing variant of the same flag (a second edit within 300 ms) stays in Issue 121.

## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
