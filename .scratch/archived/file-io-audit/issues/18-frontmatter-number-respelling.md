# 18: Every frontmatter rewrite re-spells numbers (01234 to 1234, 1.10 to 1.1)

**Status:** resolved

**Blocked by:** 17

Priority: P1
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

**What to build (owner decision 2026-11-02: preserve, do not refuse).** A rewrite that changes one property must keep every OTHER number and boolean scalar byte for byte: `version: 1.0`, `zip: 01234`, `id: 0042`, `price: 9.90`, `done: True`, `TRUE`, `False`, `FALSE`, `mask: 0x1F`, `0o17`, `exp: 1e3` stay as written. Refusing with the toast (the Issue 17 model) is not the fix here: the owner edits properties through meta-bind every day, and a refusal would make every note holding such a value read-only in meta-bind, Properties and the favorite toggle.

- The writers build the new block with `rebuildContent(properties, body)` -> `serializeProperties` (src/lib/core/frontmatter/properties.logic.ts:560-575), a fresh `Document` with `doc.set(p.key, p.value)`, so the source spelling is gone. Give the serializer access to the original raw frontmatter, and for a key whose parsed value is unchanged, emit the original scalar's source token instead of a node built from the JS value. A key whose value the writer changed is written in the canonical form (that is the user's edit).
- Callers of `rebuildContent` that rewrite an existing note: `frontmatter-write.service.ts:128` (updateNoteFrontmatter: favorite, icon, lifecycle), `features/properties/properties.service.ts:99` (Properties panel), `core/markdown-editor/extensions/live-preview/widgets.ts:778` (meta-bind), plus `features/event-calendar/event-calendar.service.ts:998`, `event-calendar-event.logic.ts:355` and `features/deep-link/deep-link.logic.ts:398-454`. Each one that has the original content passes it through; a caller that builds a new note has nothing to preserve.
- Keep the Issue 17 behavior: `detectLossyFrontmatter` (properties.logic.ts:403) still refuses comments, nested maps, anchors, duplicate keys and unsafe integers. Add a number/boolean spelling check to it only for a case the preserving serializer cannot keep; if the serializer keeps every spelling above, the detector does not need a new reason.
- The 2026-11-02 yaml 2.9.1 check below still holds: an in-place `parseDocument` + `doc.set` alone re-spells `0042`, `0x1F` and `1e3`, so copying the source token is required, not only reusing the parsed Document.

Issue 17 is done (40ef2752): the Properties panel and meta-bind now run the detector, so the dependency note below is history. Line numbers in this Issue are from c4bfee07 and 1351a35d; re-read them.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

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

- [x] Failing test comes first. Move `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/number-respelling.test.ts` and `.scratch/editor-data-safety/repro/frontmatter-roundtrip/f53-favorite-scalar-bytes.test.ts` under `src/tests/` and see them fail on the bug assertions
- [x] toggleFavoriteForPath on a closed note keeps each of `id: 0042`, `zip: 01234`, `phone: 0612345678`, `version: 1.0`, `price: 9.90`, `mask: 0x1F`, `0o17`, `exp: 1e3`, `done: True`, `TRUE`, `False`, `FALSE` byte for byte, adds `_favorite: true`, and shows no refusal toast
- [x] A meta-bind control on a note with `price: 9.90` and `done: True` changing another key keeps both lines byte for byte (the F103 repro in `.scratch/editor-data-safety/repro/frontmatter-roundtrip/meta-bind-lossy.test.ts`)
- [x] A Properties panel edit of one key keeps the other keys' number and boolean spellings byte for byte
- [x] Changing the value of a key itself writes the new value (for example setting `version` to `2` writes `version: 2`)
- [x] The Issue 17 refusals (comments, nested maps, anchors, duplicate keys, unsafe integers) still refuse with the toast; their existing tests pass
- [x] Notes created from scratch (no original frontmatter) serialize as before; existing properties.logic, frontmatter-write, properties.service and meta-bind writer tests pass

## Audit evidence (editor-data-safety, 2026-11-02)

Findings from `.scratch/editor-data-safety/audit-2026-11-02.md`, cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md`. Code paths re-read at 1351a35d. The repro tests live under `.scratch/editor-data-safety/repro/` and must be copied to `src/tests/audit-repro/<group>/` to run (see the README there).

- F53 (P1, occasional): Favorite on a closed note rewrites `phone: 0612345678`, `id: 0042`, `version: 1.0` and `done: True` as `612345678`, `42`, `1` and `true`, with no refusal and no toast. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/f53-favorite-scalar-bytes.test.ts` (cases `id: 0042`, `zip: 01234`, `phone: 0612345678`, `version: 1.0`, `price: 9.90`, `mask: 0x1F`, `done: True`, `exp: 1e3`, plus a passing control that an unsafe integer is refused). Code: toggleFavoriteForPath reaches updateNoteFrontmatter, whose guard (src/lib/core/frontmatter/frontmatter-write.service.ts:121-122) passes because detectLossyFrontmatter checks number scalars only for unsafe integers (properties.logic.ts:427-434) and never looks at booleans; convertToProperty keeps booleans and numbers (:184-190); serializeProperties writes a fresh node with doc.set(p.key, p.value) (:569-585).
- F103 (P1, rare, meta-bind half): `price: 9.90` is written back as `9.9` by a meta-bind control on another key. Repro: `.scratch/editor-data-safety/repro/frontmatter-roundtrip/meta-bind-lossy.test.ts` ("keeps price: 9.90 byte for byte when only status changes", through the inline select). Code: dispatchMetaBindUpdate (widgets.ts:754-769) runs only isFrontmatterUnparseable (:756), hence the dependency on issue 17. The unsafe-integer half of F103 is in issue 17.
- Read-only check against node_modules/yaml 2.9.1 (not a repo test): parseDocument(raw) + doc.set('favorite', true) + doc.toString() kept `price: 9.90` and `done: True`, and wrote `id: 0042` as `id: 42`, `mask: 0x1F` as `mask: 0x1f`, `exp: 1e3` as `exp: 1e+3` and `tweet_id: 1234567890123456789` as `1234567890123456800`. With `{ intAsBigInt: true }` the tweet_id digits survived and `0042` still became `42`.
- Read-only check of the current serializer shape (yaml 2.9.1 parseDocument(raw, { uniqueKeys: false }).toJS(), then a new Document with doc.set per key and toString({ lineWidth: 0, flowCollectionPadding: false })): `0o17` became `15`, `FALSE` became `false`, `True` became `true`, `0x1F` became `31` and `1e3` became `1000`.

## Comments

- 2026-11-02, branch issue/18-frontmatter-number-respelling: serializeProperties keeps the source spelling of unchanged unquoted numbers and booleans (leading zeros, trailing fraction zeros, True/FALSE, hex, octal, exponent, NaN); changed keys write the new value. Review round 1 APPROVED with 3 findings, fixed (ADR-0029 amendment, Object.is guard for NaN with a test, exact-line meta-bind assertion); round 2 APPROVED, no findings. Tests: pnpm check 0 errors; targeted vitest 635 passed; full suite at a291db9a exit=0, 10043 passed, 1 skipped, 1 todo, build OK.
