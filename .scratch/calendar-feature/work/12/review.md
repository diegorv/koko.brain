VERDICT: APPROVED

# 12 review: detectLossyFrontmatter

Reviewed `git diff main...HEAD` (e63d42a1, df65c5bf, 784db96d) against the Issue, plan Task 11 (`plan-2026-10-28.md:270-291`), the Pre-flight log (d) (`:1342`), ADR-0029 and CLAUDE.md.

## Checks I ran

- `./node_modules/.bin/vitest run src/tests/lib/features/properties/`: 9 files, 419/419 passed. The test verdict rests on `src/tests/lib/features/properties/properties.logic.test.ts` (the only test file in the diff, and the test file of the only changed source file). The other 8 files in that folder cover the rest of the properties feature that imports `properties.logic.ts`.
- `pnpm check`: 192 files, 0 errors, 0 warnings.
- A throwaway probe test (35 edge inputs through `detectLossyFrontmatter` and the `parse -> serialize -> parse` round trip; deleted, not committed). It found the gaps in findings 1-3. Everything else agreed: multi-document and directive blocks, tab indents, and a `~` root are `unparseable`. Comments after an empty value, at the end of a block list and after a flow list are `comments`. `!!set` and merge keys are `nested`. Keep-chomp block scalars, CRLF, `...` doc-end, a flow-map root, `[~]` / `false` alias twins and two empty twins all match `dedupeCanonicalKeys`.
- No space-indented lines in the diff.

## Acceptance criteria

- [x] **Export and signature.** `LossyFrontmatterReason` with the six members is exported at `properties.logic.ts:195-201`. `detectLossyFrontmatter(content): LossyFrontmatterReason | null` is at `:229`, right after `parseFrontmatterProperties` (`:181-184`). The function is pure: it imports no store and does not call `appendLog`.
- [x] **Detection method.** It uses `parseDocument(raw, { uniqueKeys: false })` plus `visit` (`:233`, `:240-255`). The Pre-flight log (d) answered yes, so the fallback is not used.
- [x] **Reasons.**
  - `unparseable`: errors, or a non-null root that is not a map (`:235`).
  - `nested`: a non-root map, a collection key, or a collection whose nearest collection ancestor is a seq (`:244-253`).
  - `comments`: on the document (`:238`) and on every visited node (`:242`).
  - `duplicate-keys` and `alias-collision`: from the root-map walk (`:257-271`). `isEmptyYamlNode` matches `isEmptyPropertyValue`, which I checked against the `[~]` and `false` twins.
  - `anchors`: `:243`.
  - Gap: the duplicate-key check misses a null key next to `""` (finding 1).
- [x] **Null cases.** Null for no frontmatter, an empty or whitespace-only block, `key:` / `key: null`, scalar list items, alias keys and quote style. Tests are at test `:857-896`.
- [x] **One case per reason.** Covered at test `:785-855`:
  - a list of maps, a nested list, `a: 1` twice, `color` + `_color`, and `&x` / `*x`;
  - a comment line and a trailing comment;
  - extra cases: a nested map, a collection key, two aliases, a comment-only block, a comment inside a flow list, and three unparseable inputs.
- [x] **Non-case tests.** All present: `#` in a quoted string, `color: ''` + `_color: red`, `[1, true]`, `key: null`, a block scalar, and empty and absent blocks (test `:857-896`).
- [x] **Fixture round-trip test.** Test `:899-966`. The fixtures are inline in the test file, not in `event-notes.fixture.ts`. The normalizer applies only the null-to-`""` and list-item-to-string coercions plus the alias / placeholder rule. Every other top-level value is compared unchanged.
- [x] **JSDoc and tabs.** JSDoc is on the type, the reason-order constant, `isEmptyYamlNode` and `detectLossyFrontmatter`, and the diff uses tabs.
- [ ] **Gate green, one commit.** The commit half is met: df65c5bf has Context, Problem, Solution, Behavior, Files with line ranges, and the Co-Authored-By line. The gate half is open, because the full gate is the deliver step's to run.

The Issue's checkboxes are still unticked. Closing the Issue is the deliver step's job.

## Scope and rules

- Scope:
  - Only the two Touches files changed in `src/`.
  - The `nested` default for a collection key is a sound extension: the parse stringifies such a key, and discovery records it.
  - Nothing beyond the ticket was added.
- Layer rules: `.logic.ts` imports only `yaml` and `$lib/utils/` (`appendLog` was already imported).
- Tests: no mocks of stores or `.logic.ts`. The assertions are on return values. Happy, empty/null and error inputs are covered.

## Findings

1. **Low. False negative in duplicate-key detection** (`src/lib/features/properties/properties.logic.ts:263`).
   - The check keys on `String(pair.key.value)`, but the parse's `toJS` maps a null key (`~`) to `""`.
   - So `~: 1` followed by `"": 2` returns null, while `yamlParse(..., { uniqueKeys: false })` gives `{"": 2}` and the `1` is lost on rewrite. The probe confirmed this.
   - Fix: build the key the way the parse does, e.g. `pair.key.value === null ? '' : String(pair.key.value)`, and add that case under "refuses".
2. **Low. Unsafe integers are rewritten without a refusal** (`src/lib/features/properties/properties.logic.ts:229-274`).
   - A value such as `id: 12345678901234567890` (snowflake-style IDs are 18-19 digits) parses to a rounded JS number. The rewrite emits `12345678901234567000`, and the detector returns null.
   - The fixture round trip cannot see this, because it compares parsed values on both sides.
   - Fix (pick one):
     - Have `visit` report `unparseable` for a scalar where `typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)`, with a test.
     - Record it as an accepted limitation in discovery.md and leave it for a follow-up Issue. The reason union is fixed by the ticket.
3. **Low. Unresolved custom tags are dropped without a refusal** (`src/lib/features/properties/properties.logic.ts:235`).
   - `a: !custom value` produces a `TAG_RESOLVE_FAILED` warning in `doc.warnings`, and the detector returns null. The rewrite emits `a: value`, so the tag is lost.
   - The discovery default ("explicit tags round-trip unchanged") holds for core tags such as `!!str`, but not for unknown ones.
   - Fix: treat `doc.warnings.length > 0` like `doc.errors` (`unparseable`), with a test. Or record it as an accepted limitation in discovery.md.
4. **Low (test). Reason precedence is untested** (`src/lib/features/properties/properties.logic.ts:203-211`, `:273`).
   - The JSDoc says the first reason in the list wins when a block has several, but every test input has a single reason.
   - Task 12's error reason depends on this order.
   - Fix: add one multi-reason case in `src/tests/lib/features/properties/properties.logic.test.ts` near `:781-855`, e.g. `'# c\na: 1\na: 2'` expected to be `comments`.
5. **Info. The fixture test proves no lost cases, but not that refusals are needed** (`src/tests/lib/features/properties/properties.logic.test.ts:957`).
   - Refused fixtures skip the round-trip assertion, so the test cannot catch a reason that refuses a lossless block.
   - The ticket does not require this. Optional fix: for refused fixtures, assert that the round trip does not equal `normalizeAccepted(original)`. The `comments` fixtures would need an exception, because comments are invisible after a parse.

None of these blocks delivery. Findings 1 and 4 are cheap and worth folding into the fix step. Findings 2 and 3 need either a small check or a recorded decision.
