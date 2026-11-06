# 07: An empty --- --- frontmatter block is matched, and writers never stack a second block

**Migrated from:** `.scratch/file-io-audit/issues/30-empty-frontmatter-block.md` (audit 2026-11-05). Priority: content safety (bucket 1-content). Content/medium. The first icon on a folder without a folder note writes '---\n---\n', and later writers then stack a second block on disk.

**Audit check at `5f8003d67`:** still_present (content, medium). ensureFolderNote still writes '---\n---\n' (src/lib/features/file-icons/file-icons.service.ts:100), reached from setIconForPath / setIconColors for a folder without a folder note. FRONTMATTER_REGEX is unchanged (src/lib/core/frontmatter/properties.logic.ts:38) and needs a newline before the closing fence, so extractRawFrontmatter (:45-48) and extractBody (:54-58) miss the empty block; rebuildContent (:677) then prepends a new block above it. ensureFrontmatterLink (:518) special-cases the empty block, the other writers do not. Setting an icon on a folder is a normal action.

**Stale in the text below:** Line numbers moved: placeholder at file-icons.service.ts:100 (Issue :97), regex at properties.logic.ts:38 (Issue :37), extractBody :54-58 (Issue :53-56), rebuildContent :677 (Issue :615-621), ensureFrontmatterLink at :518 (Issue :531-532). The repro test is still under .scratch.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: fidelity-2

**How a user hits it.** Default settings. Happens the first time an icon is set on a folder without a folder note, and on any rewrite of a note or template that starts with an empty block. One time only: later writes do not grow it.

**Recoverable from.** No content is lost. The two stray --- lines are visible and can be deleted by hand.

**Root cause.** src/lib/core/frontmatter/properties.logic.ts:37 (FRONTMATTER_REGEX needs a newline before the closing fence). extractBody returns the full content on no match (:53-56). rebuildContent prepends a block (:615-621).

**Evidence.** file-icons.service.ts:97 writes the placeholder '---\n---\n'. detectLossyFrontmatter returns null (raw === null). ensureFrontmatterLink special-cases this shape (:531-532), but the other writers do not. file-icons.service.test.ts 'routes directories' asserts only the placeholder write.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/empty-frontmatter-block.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: "---\n_icon: lucide:folder\n_color: \"#0000ff\"\n---\n---\n---\n": expected 4 to be 2. Also: "---\n_favorite: true\n---\n---\n---\n# Title\n": expected 4 to be 2
```

**Fix sketch.** Make the frontmatter regex accept an empty block (^---\r?\n(?:([\s\S]*?)\r?\n)?---), or treat the empty block in extractRawFrontmatter and extractBody the way ensureFrontmatterLink does.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/frontmatter/properties.logic.test.ts (rebuildContent describe, next to the extractRawFrontmatter and extractBody cases): rebuildContent over the content '---\n---\n' and over '---\n---\n# Title\n', with a property set (_icon plus _color, and _favorite), returns exactly one frontmatter block, so the output has two '---' lines and the body is kept. It fails today (four '---' lines). The repro .scratch/file-io-audit/repro/o10-frontmatter-fidelity/empty-frontmatter-block.test.ts is moved under src/tests as this red test.
- [ ] extractRawFrontmatter and extractBody recognise '---\n---\n' and the CRLF form '---\r\n---\r\n' as an empty block: raw is an empty string (not null) and extractBody returns only the text after the block. Cases for non-empty blocks, no frontmatter and an unclosed fence keep their current results.
- [ ] Folder flow, in src/tests/lib/features/file-icons/file-icons.service.test.ts: after setIconForPath writes the '---\n---\n' placeholder for a folder without a folder note, a following setIconColors on the same path produces content with a single block holding _icon and _color, not a stacked second block.
- [ ] ensureFrontmatterLink on an empty block keeps its current output (existing ensureFrontmatterLink cases in properties.logic.test.ts stay green, unchanged).
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/30-empty-frontmatter-block.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
