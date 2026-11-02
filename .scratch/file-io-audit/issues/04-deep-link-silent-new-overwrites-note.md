# 04: Silent deep-link new overwrites an existing note, with empty content when none is given

Status: needs-triage

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-4, feature-writers-3

**How a user hits it.** kokobrain://new?...&silent=true with no append/overwrite, naming an existing note: for example a 'create if missing' automation, a repeat clip with the same title, or clipboard=true with a non-text clipboard. Default settings.

**Recoverable from.** File History only, if the note was saved in the app in the last 7 days (history is on by default, 7-day retention, one snapshot per save). Nothing goes to Trash. Otherwise none.

**Root cause.** src/lib/features/deep-link/deep-link.service.ts:309-315

**Evidence.** The silent branch calls mkdir then writeTextFile(fullPath, content) with no exists() check. resolveContent returns '' by default (:214-224). The non-silent branch, openOrCreateNote, never overwrites (note-creator.service.ts:86-89). deep-link.types.ts:35 documents overwrite as the replace flag. deep-link.service.test.ts:287-304 covers only a new file.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-silent-new-overwrites.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
2 failed: AssertionError: expected '' to be '# Journal\nYears of entries.\n'; AssertionError: expected 'hello' to contain 'Years of entries.'
```

**Fix sketch.** In the silent create branch, check exists(fullPath) and skip (or pick a unique name) when the file exists. Leave replacing to overwrite=true.
