# 07 discovery

No spec.md in the feature folder; the Issue is the spec.

## Files
- new `scripts/fix-feat-ratio.mjs`: pure `parseSubject`, `areaOf`, `aggregate`, plus a CLI guarded by
  the `runAsCli` check copied from `scripts/check-outdated-cargo.mjs:832`, `// @ts-nocheck` header as there.
- new `src/tests/scripts/fix-feat-ratio.test.ts`: fixture records only (pattern: `src/tests/scripts/check-outdated-cargo.test.ts`).
- new `docs/HOTSPOTS.md`: the three triggers (glob, 8-week threshold, action, how to read `--paths`).

## Plan
1. Tests first (parseSubject, areaOf, aggregate), see them fail on the missing module.
2. Script: `git log --no-merges --name-only --format=%x1e%cI%x1f%s` parsed into `{date, subject, files}`;
   `aggregate` buckets by month (`date.slice(0, 7)`) and area; TOTAL counts each fix/feat commit once.
   Table: one row per area, a `fix:feat` column per month, then total and ratio; `--top N` keeps the N
   areas with most fixes. `--paths <glob>` runs `git log -- ':(glob)<glob>'` and prints the `fix:` subjects
   (default window: last 8 weeks; `--since`/`--until` override).
3. Manual check `--since 2026-05-01 --until 2026-10-31T23:59:59` must print TOTAL 433:261
   (a raw `git log --format=%s | grep` already counts 433 fix and 261 feat in that range).
4. HOTSPOTS.md; first review 2026-12-27 (Issues 14 and 16 both merged 2026-11-01, + 56 days).

## Defaults taken
- `areaOf`: `src/lib/core/markdown-editor/extensions/live-preview/**` -> `core/live-preview`; `src/lib/{core,features,plugins}/<x>/**`
  -> `<layer>/<x>`; `src/lib/{utils,components,types,app,contracts}/**` and `src/lib/utils.ts` -> that name
  (app and contracts are product code the Issue did not name); `src/routes/**` -> `routes`;
  `src-tauri/src/<mod>/**` or `<mod>.rs` -> `rust/<mod>`. Tests: `src/tests/lib/<rest>` maps like `src/lib/<rest>`;
  `src-tauri/tests/<dir>/**` -> `rust/<dir>`, `src-tauri/tests/<stem>_test.rs` -> `rust/<first word>`
  (`error_monitoring`, `quick_capture` kept whole). Everything else (help/, docs, scripts, config) -> null,
  shown as "(no product code)".
- Breaking `fix(x)!:` counts as a fix. Non-conventional and other types are ignored.
- Month bucket uses the committer date (what `--since`/`--until` filter on), in the commit's own offset.

## Risks
- Hardcoded layer names go stale if a new `src/lib/<dir>` appears; it then reports as "(no product code)".
