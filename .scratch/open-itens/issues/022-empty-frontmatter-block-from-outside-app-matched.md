# 022: An empty --- --- frontmatter block from outside the app is matched, and writers never stack a second block

**Origin:** `audit-2026-11-05` Issue 156, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 07 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 07 first; its Details and evidence apply here. The shared regex change: FRONTMATTER_REGEX, extractRawFrontmatter and extractBody recognise an empty block, keeping the string|null contract (raw is an empty string, not undefined) and the ensureFrontmatterLink case.

**Blocked by:** 005

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: the repro .scratch/file-io-audit/repro/o10-frontmatter-fidelity/empty-frontmatter-block.test.ts is moved under src/tests as the red test, with only the Tauri APIs mocked (plugin-fs as an in-memory disk) and the real stores and services. Case 1, in src/tests/lib/features/file-icons/file-icons.service.test.ts: setIconForPath('/vault', '/vault/Projects', 'lucide', 'folder', '#0000ff', undefined, true) on a folder with no folder note leaves /vault/Projects/Projects.md with exactly two '---' lines holding _icon and _color. Case 2, in src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts: toggleFavoriteForPath on a note whose disk content is '---\n---\n# Title\n' writes exactly two '---' lines, with _favorite: true in the block and '# Title' as the body. Both fail today (four '---' lines), because extractRawFrontmatter and extractBody (properties.logic.ts:45-58) miss the empty block and rebuildContent (:677) prepends a new one.
- [ ] extractRawFrontmatter and extractBody recognise '---\n---\n' and the CRLF form '---\r\n---\r\n' as an empty block: raw is an empty string (not null) and extractBody returns only the text after the block. Cases for non-empty blocks, no frontmatter and an unclosed fence keep their current results.
- [ ] Folder flow, in src/tests/lib/features/file-icons/file-icons.service.test.ts: after setIconForPath writes the '---\n---\n' placeholder for a folder without a folder note, a following setIconColors on the same path produces content with a single block holding _icon and _color, not a stacked second block.
- [ ] ensureFrontmatterLink on an empty block keeps its current output (existing ensureFrontmatterLink cases in properties.logic.test.ts stay green, unchanged).

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
