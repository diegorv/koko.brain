# 12: Lossy frontmatter rewrites detected before any rewrite

**What to build:** `detectLossyFrontmatter(content)` in `src/lib/features/properties/properties.logic.ts` tells a caller, before it rewrites a note, whether the parse and re-serialize round trip would lose data, and names why (`unparseable`, `nested`, `comments`, `duplicate-keys`, `alias-collision`, `anchors`), or returns null. The coercions ADR-0029 defines as canonical are not reported as loss. A fixture-driven round-trip test proves the reason list is complete for the fixtures. The frontmatter writer (Task 12) and calendar creation from a template (Task 27) refuse on a non-null reason instead of dropping data.

**Plan reference:** Task 11 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 270-291). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 01

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/properties/properties.logic.ts` (modify)
- `src/tests/lib/features/properties/properties.logic.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [ ] `detectLossyFrontmatter(content): LossyFrontmatterReason | null` is added to `properties.logic.ts`, next to `parseFrontmatterProperties` (`:169`), with `LossyFrontmatterReason = 'unparseable' | 'nested' | 'comments' | 'duplicate-keys' | 'alias-collision' | 'anchors'` exported for the writer (Task 12). The function is pure and touches no store.
- [ ] Detection uses `parseDocument(raw, { uniqueKeys: false })` plus `visit`, as confirmed by the Task 1 (d) answer (ticket 01, recorded in the plan's Notes > Pre-flight log). If that answer is a "no", the raw-line heuristic fallback of Notes > Risks 4 (d) is used instead (any `#` outside quotes, `&`, `*`, indented `key:` under a list).
- [ ] Reasons: `unparseable` for a non-empty raw block with parse errors or one that is not a mapping; `nested` for a `YAMLMap` anywhere below the root mapping or a collection inside a `YAMLSeq`; `comments` for any comment on the document or a node; `duplicate-keys` for the same key twice in one mapping; `alias-collision` for two keys that canonicalize to the same name with both values non-empty (`dedupeCanonicalKeys` discards one, `:193-215`); `anchors` for any anchor or alias node, which the rewrite would expand.
- [ ] Null is returned for no frontmatter, an empty block, and the ADR-0029 canonical cases: `key:` / `key: null`, scalar list items, alias keys and quote style.
- [ ] One test case per reason: a list of maps, a nested list, `a: 1` twice, `color` + `_color` both set, `&x` / `*x`, a comment line, and a trailing comment.
- [ ] Non-case tests return null: `#` inside a quoted string, `color: ''` + `_color: red`, `[1, true]`, `key: null`, a block scalar, and empty and absent blocks.
- [ ] A fixture-driven round-trip test passes: for every non-refused fixture, `yamlParse(serializeProperties(parseFrontmatterProperties(c)))` equals the original parse after a test-local normalizer that applies only the accepted coercions. Its fixtures live in this test file, not in `src/tests/fixtures/event-notes.fixture.ts`.
- [ ] JSDoc on every new export; tabs for indentation.
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 11:54 — discovery — parseDocument + visit path planned, one feat commit; defaults in work/12/discovery.md — 45e2577e
