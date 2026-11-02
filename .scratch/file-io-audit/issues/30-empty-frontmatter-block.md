# 30: An empty --- --- frontmatter block is not matched; writers stack a second block

**Status:** needs-triage

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
