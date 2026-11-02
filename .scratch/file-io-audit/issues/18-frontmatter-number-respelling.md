# 18: Every frontmatter rewrite re-spells numbers (01234 to 1234, 1.10 to 1.1)

**Status:** needs-triage

**Blocked by:** 17

The ledger row for this Issue still says `none`: re-sync the ledger (`relay ledger`, never by hand) before any relay run, or 18 can start before 17.
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

**Every number and boolean scalar, not only leading and trailing zeros.** The same rewrite re-spells core-schema booleans: `True`, `TRUE`, `False` and `FALSE` parse to JS booleans (convertToProperty keeps them, properties.logic.ts:184-186) and serializeProperties writes them back lowercase, so `done: True` becomes `done: true`. Hex and octal (`0x1F`, `0o17`) and exponent forms (`1e3`) are re-spelled too: the fresh node is written from the JS number. A detector that checks only number scalars, or compares with String(value) only for numbers, lets the boolean spellings through.

**In-place Document edit alone is not enough.** A read-only check with yaml 2.9.1 (see Audit evidence) shows that parseDocument + doc.set on one key + toString keeps `price: 9.90` and `done: True`, but still writes `id: 0042` as `42`, `0x1F` as `0x1f` and `1e3` as `1e+3`. Whichever option is chosen, the source-token comparison below is still needed for those spellings.

**Dependency on 17.** The Properties panel (commitChanges, src/lib/features/properties/properties.service.ts:82) and meta-bind (dispatchMetaBindUpdate, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:756) check only isFrontmatterUnparseable and never call detectLossyFrontmatter. A detector change here reaches the updateNoteFrontmatter writers (frontmatter-write.service.ts:121) but leaves those two rewriting scalars until issue 17 runs the detector in them, so this issue is blocked by 17.

**Fix, extended.** In detectLossyFrontmatter, walk every number and boolean scalar and compare its source token with the form serializeProperties would write for its parsed value; report a lossy reason when they differ (leading zeros, trailing fraction zeros, `True` / `TRUE` / `False` / `FALSE`, hex, octal, exponent). Writers that run the detector then refuse with the toast. The in-place Document edit may be combined with it to keep comments and nested maps (issue 17), but does not replace the comparison.

**Acceptance.**

- [ ] Failing test comes first. Move `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/number-respelling.test.ts` under `src/tests/`
- [ ] toggleFavoriteForPath on a closed note with `done: True` keeps `done: True` byte for byte, or refuses with the toast and writes nothing; the same holds for `TRUE`, `False`, `FALSE`, `0x1F`, `0o17` and `1e3`
- [ ] detectLossyFrontmatter compares every number and boolean scalar's source token with its re-stringified form, and a unit test covers each spelling listed above plus `0042` and `9.90`
- [ ] A meta-bind control on a note with `price: 9.90` changing another key keeps `price: 9.90` byte for byte, or refuses with the toast and leaves the bytes unchanged

## Audit evidence (editor-data-safety, 2026-11-02)

Findings from `.scratch/editor-data-safety/audit-2026-11-02.md`, cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md`. Code paths re-read at 1351a35d. The repro tests live under `.scratch/editor-data-safety/repro/` and must be copied to `src/tests/audit-repro/<group>/` to run (see the README there).

- F53 (P1, occasional): Favorite on a closed note rewrites `phone: 0612345678`, `id: 0042`, `version: 1.0` and `done: True` as `612345678`, `42`, `1` and `true`, with no refusal and no toast. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/f53-favorite-scalar-bytes.test.ts` (cases `id: 0042`, `zip: 01234`, `phone: 0612345678`, `version: 1.0`, `price: 9.90`, `mask: 0x1F`, `done: True`, `exp: 1e3`, plus a passing control that an unsafe integer is refused). Code: toggleFavoriteForPath reaches updateNoteFrontmatter, whose guard (src/lib/core/frontmatter/frontmatter-write.service.ts:121-122) passes because detectLossyFrontmatter checks number scalars only for unsafe integers (properties.logic.ts:427-434) and never looks at booleans; convertToProperty keeps booleans and numbers (:184-190); serializeProperties writes a fresh node with doc.set(p.key, p.value) (:569-585).
- F103 (P1, rare, meta-bind half): `price: 9.90` is written back as `9.9` by a meta-bind control on another key. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/meta-bind-lossy.test.ts` ("keeps price: 9.90 byte for byte when only status changes", through the inline select). Code: dispatchMetaBindUpdate (widgets.ts:754-769) runs only isFrontmatterUnparseable (:756), hence the dependency on issue 17. The unsafe-integer half of F103 is in issue 17.
- Read-only check against node_modules/yaml 2.9.1 (not a repo test): parseDocument(raw) + doc.set('favorite', true) + doc.toString() kept `price: 9.90` and `done: True`, and wrote `id: 0042` as `id: 42`, `mask: 0x1F` as `mask: 0x1f`, `exp: 1e3` as `exp: 1e+3` and `tweet_id: 1234567890123456789` as `1234567890123456800`. With `{ intAsBigInt: true }` the tweet_id digits survived and `0042` still became `42`.
- Read-only check of the current serializer shape (yaml 2.9.1 parseDocument(raw, { uniqueKeys: false }).toJS(), then a new Document with doc.set per key and toString({ lineWidth: 0, flowCollectionPadding: false })): `0o17` became `15`, `FALSE` became `false`, `True` became `true`, `0x1F` became `31` and `1e3` became `1000`.
