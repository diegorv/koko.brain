# 18 Every frontmatter rewrite re-spells numbers (01234 to 1234, 1.10 to 1.1)

Status: needs-triage
Priority: P1
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity corruption)
- Claims covered: fidelity-7

**How a user hits it.** Default settings. Any rewriting action (sidebar favorite, icon, lifecycle, Properties panel, meta-bind) on a note with an unquoted leading-zero or trailing-zero number, such as a zip code, a version or an ID. The strict updateNoteFrontmatter guard lets it through.

**Recoverable from.** File History only if the app saved the earlier version. Otherwise git or Time Machine. Nothing in the UI warns.

**Root cause.** src/lib/core/frontmatter/properties.logic.ts:580 (serializeProperties writes a fresh node from the JS number). detectLossyFrontmatter (:427-434) flags only unsafe integers.

**Evidence.** parseDocument + toJS (:249) turns core-schema ints and floats into JS numbers. convertToProperty keeps the number (:188-190). doc.set(p.key, p.value) emits the canonical number. The repro runs toggleFavoriteForPath on a closed note.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/number-respelling.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: ---\nzip: 1234\nversion: 1.1\nratio: 1\nh: 31\n_favorite: true\n---\nBody\n: expected '---\nzip: 1234\nversion: 1.1\nratio: …' to contain 'zip: 01234'
```

**Fix sketch.** In detectLossyFrontmatter, flag a number scalar whose source text differs from String(value). Or keep untouched scalars' source nodes when re-serializing (edit the parsed Document instead of building a new one).
