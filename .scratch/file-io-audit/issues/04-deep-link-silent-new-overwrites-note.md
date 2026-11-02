# 04: Silent deep-link new overwrites an existing note, with empty content when none is given

**Status:** ready-for-agent

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

**What to build:** The silent create branch of `executeNewAction` (src/lib/features/deep-link/deep-link.service.ts:329-335) runs `mkdir` and `writeTextFile(fullPath, content)` with no `exists()` check, so a `kokobrain://new?...&silent=true` URL without append, prepend or overwrite replaces an existing note, and with no `content` (resolveContent returns '' at :216-226) truncates it to 0 bytes. The non-silent branch goes through `openOrCreateNote`, which never overwrites (note-creator.service.ts:86-89).

Fix: in the silent create branch, check `exists(fullPath)` first. When the file exists, write nothing, call no `notifyAfterSave`, and show an info toast naming the note ("<name> already exists; not overwritten. Use overwrite=true to replace it."), so the silent path matches the non-silent one, which leaves an existing note untouched. Do not pick a unique name. Replacing stays the job of `overwrite=true` (deep-link.types.ts:35). Leave the append, prepend and overwrite branches as they are.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/features/deep-link/deep-link.service.ts:216-226,329-335, src/lib/core/note-creator/note-creator.service.ts:86-89, src/lib/features/deep-link/deep-link.types.ts:35, src/tests/lib/features/deep-link/deep-link.service.test.ts

- [ ] Failing test comes first. Move `.scratch/file-io-audit/repro/o03-deep-link/deep-link-silent-new-overwrites.test.ts` under `src/tests/` (next to deep-link.service.test.ts) and see both cases fail
- [ ] `new` with `silent=true` and `content=hello` naming an existing note leaves its bytes unchanged on disk and shows the info toast
- [ ] `new` with `silent=true` and no content naming an existing note does not truncate it
- [ ] `new` with `silent=true` naming a note that does not exist still creates it with the given content (current behavior, covered by deep-link.service.test.ts:287-304)
- [ ] `new` with `overwrite=true` still replaces an existing note, and append and prepend are unchanged

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
