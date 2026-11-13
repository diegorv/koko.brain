VERDICT: APPROVED

Re-review (round 2) of the fix commit a291db9a: `git diff 36de8292..HEAD`, which touches docs/adr/0029-frontmatter-yaml-canonical-form.md, src/lib/core/frontmatter/properties.logic.ts (one line), src/tests/lib/core/frontmatter/properties.logic.test.ts, src/tests/lib/features/properties/frontmatter-number-spelling.test.ts, plus the Resolution section of review.md.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | ADR-0029 silent on source-token preservation | resolved | docs/adr/0029-frontmatter-yaml-canonical-form.md:109 adds a dated amendment (file-io-audit issue 18): unchanged unquoted numbers/booleans keep their source spelling, points to `plainScalarsByKey` / `SOURCE_TOKEN_TAG` in properties.logic.ts, and states that changed values, type changes, quoted/string scalars and notes without original frontmatter stay canonical. That matches the code at properties.logic.ts:605-621. |
| 2 | nit | `===` re-spells unchanged `.NaN` | resolved | properties.logic.ts:616 now reads `Object.is(source.value, p.value)`. New test properties.logic.test.ts:877-881 round-trips `x: .NaN` byte for byte. With the old `===`, NaN !== NaN sent the value to `doc.set(NaN)`, which yaml writes as `.nan`, so the test would fail; it passes now. `Object.is` differs from `===` only for NaN and +/-0, and both differences go the right way (an unchanged `-0` keeps its token; a 0 to -0 change is written canonically). |
| 3 | nit | toggle test assertion too weak (`not.toBe`) | resolved | frontmatter-number-spelling.test.ts:122 now asserts `toBe('done: "false"')`, the exact line; the test passes, so that is the real written line. No assertion was weakened or removed. |

## Acceptance criteria re-checked

- [met] toggleFavoriteForPath on a closed note keeps each of `id: 0042`, `zip: 01234`, `phone: 0612345678`, `version: 1.0`, `price: 9.90`, `mask: 0x1F`, `0o17`, `exp: 1e3`, `done: True`, `TRUE`, `False`, `FALSE` byte for byte, adds `_favorite: true`, and shows no refusal toast — the guard change is NaN/+-0-only, so these values compare the same as before; frontmatter-number-spelling.test.ts passes unchanged in that case.
- [met] A meta-bind control on a note with `price: 9.90` and `done: True` changing another key keeps both lines byte for byte (the F103 repro in `.scratch/editor-data-safety/repro/frontmatter-roundtrip/meta-bind-lossy.test.ts`) — the meta-bind cases in frontmatter-number-spelling.test.ts pass; the toggle case now pins `done: "false"` exactly and `version: 1.0` kept.
- [met] Changing the value of a key itself writes the new value (for example setting `version` to `2` writes `version: 2`) — `Object.is(1, 2)` is false like `===`, so the changed-value path is unchanged; the "writes a changed value in canonical form" and `version: 2` tests pass.
- [met] Notes created from scratch (no original frontmatter) serialize as before; existing properties.logic, frontmatter-write, properties.service and meta-bind writer tests pass — with no `originalRaw`, `original` is null and the guard is never reached; properties.logic.test.ts passes (full suite and build are deliver's to run).

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/frontmatter/properties.logic.test.ts src/tests/lib/features/properties/frontmatter-number-spelling.test.ts`: exit 0, 2 files, 244 tests passed.
- Scope: the fix diff is limited to the three findings; no source change beyond the one-line guard, no baseline or BASELINE_SIZE change, no new composition root. Worktree clean before writing this file.

## Findings

None open or new.
