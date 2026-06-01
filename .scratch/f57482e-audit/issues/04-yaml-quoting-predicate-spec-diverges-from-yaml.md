Status: ready-for-agent

# yaml-quoting predicate (and normative spec) diverge from yaml@2.9.0 on numeric/indicator edge cases

Severity: medium. Found in the f57482e6 blast-radius audit.

## What to build

Commit f57482e6 extracted `shouldQuoteScalar` / `canonicalizeScalar` into
`yaml-quoting.logic.ts` as the "documented contract + parity safety net" with 130 parity
tests and a normative spec (`docs/specs/frontmatter-canonical-form.md`).

IMPORTANT scope: these functions have ZERO non-test callers (verified by grep). The app
write path (`serializeProperties`) delegates to `yaml.Document`, NOT this predicate. So
these bugs do NOT corrupt notes saved through the Kokobrain UI. They make the parity
safety net false, and the spec (which external producers like the Python person-note
generator follow) carries the same errors -> an external producer following the spec
emits non-round-tripping or invalid YAML.

Divergences vs yaml@2.9.0 (empirically confirmed against the pinned version):

| input | predicate says | yaml@2.9.0 real | effect if produced bare |
|---|---|---|---|
| `"012"`, `"007"`, `"00"` | bare | quoted | re-parses as a number |
| `".NaN"`, `".Inf"`, `".INF"` | bare | quoted | re-parses wrong (NaN/Inf/null) |
| lone `"-"` | bare | quoted | INVALID YAML (parse error) |
| `"1."` | bare | quoted | re-parses as number 1 |
| `a[b]c` (flow-item ctx) | bare | quoted | malformed flow collection |
| `"+.nan"` / `"-.nan"` | quoted | bare | over-quote (perpetual diff) |

Root cause: `NUMERIC_LIKE_REGEX` is narrower than yaml's number resolver (rejects
leading-zero runs, trailing dots, non-lowercase inf/nan); leading/lone indicator
handling omits lone `-`/`?` and flow-interior brackets. Each case is green only because
the parity set omits exactly these input classes.

Fix direction (predicate + spec together, same rule set):
- broaden `NUMERIC_LIKE_REGEX` for leading-zero ints, trailing-dot floats, case-insensitive inf/nan
- restrict the nan alternative to unsigned
- quote lone `-` / `?`
- flow-item context: force-quote values containing `[ ] { }`

## Acceptance criteria

- [ ] Predicate matches yaml@2.9.0 for all 6 rows above
- [ ] Parity test set extended with those 6 input classes (mapping + flow)
- [ ] `docs/specs/frontmatter-canonical-form.md` pseudocode + worked-examples table updated to match
- [ ] `pnpm check` + `pnpm vitest run` green

## Blocked by

None. App-impact low (predicate unused in write path); contract/spec/external-producer impact is the real cost.
