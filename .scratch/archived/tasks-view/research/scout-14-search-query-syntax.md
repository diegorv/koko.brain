# Scout 14: search-query-syntax

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

Findings are below. I did not write the report file: the subagent rules here say to return findings directly, and this file is the return value. Everything is from reading code. Nothing was built, tested, or run.

**Summary:** The search feature has a tiny text-operator grammar, `tag:` and `path:`, parsed by one regex each (`search.logic.ts:6-26`). It is not a general query language. Operators are dropped in hybrid and semantic modes, the tag filter runs after a top-50 FTS cut, and `tag:` matches nested tags in one path but not the other. The better reuse candidate is the collection expression language (`features/collection/expression` plus `filter.logic.ts`), which already has structured and/or/not filters and a visual row editor. Other pieces are not reusable as-is.

## Facts

**Operator grammar (text, `search.logic.ts`)**
- Regexes: `TAG_OPERATOR_REGEX = /tag:(\S+)/g`, `PATH_OPERATOR_REGEX = /path:(\S+)/g` (`search.logic.ts:6-7`).
- `parseSearchQuery` (`:9-26`) collects all matches, strips them from the text, trims. Returns `{text, tags[], paths[]}`. Tags AND together. Paths are OR (`paths.some`, `:209`).
- No word boundary: `hashtag:x` yields tag `x`. `filepath:x` yields path `x`. Quoted values with spaces are not supported (`\S+`). A bare `tag:` stays as literal text. No negation, no OR, no `-`, no ranges.
- Tests: `src/tests/lib/features/search/search.logic.test.ts:16-61` cover only the basic cases (no boundary, quotes, or empty-value tests).
- No operator help or autocomplete in the UI. `grep` for `tag:`/`path:` in `SearchPanel.svelte` and `SearchSection.svelte` returned nothing.

**Tag matching, two implementations**
- Content path: `matchesTagFilter` (`search.logic.ts:102-142`). Checks frontmatter tags with nested-prefix match (`tLower.startsWith(tag + '/')`, `:109`), then inline `#tag` after stripping frontmatter, fences, and inline code (`:115-117`), requiring whitespace or punctuation boundaries (`:131-133`).
- Index path: `matchesIndexTag` (`:149-155`) does the same nested-prefix match over `entry.tags`.
- FTS path: `search.service.ts:209-216` builds `tagSet` from `entry.tags` and uses exact `tagSet.has(tag)` (line 215). No nested-prefix match. So `tag:project` in text+tag mode misses `project/alpha`, but operator-only mode (`performOperatorOnlySearch`, which uses `matchesIndexTag`) matches it. Verified by reading both.

**Path matching**
- `matchesPathFilter` (`search.logic.ts:189-191`): case-insensitive substring over the vault-relative path. No globs, no prefix anchoring.

**Service routing (`search.service.ts`)**
- Empty query: early return (`:130-141`).
- Hybrid mode: `:145-173`. Calls `search_hybrid` with `parsed.text` only, then returns. The `tags`/`paths` are never applied. Operators are silently ignored.
- Text mode, operator-only (no text): `:185-197`. Reads `get_all_vault_entries_v2` and runs `performOperatorOnlySearch` (no content read).
- Text mode with text: `:199-202` calls `search_fts` with `maxResults: 50` and `fuzzy` from the store. Then post-filters (`:209-219`). Gap: the filter runs after the top-50 BM25 cut, so tag-filtered results beyond rank 50 are never returned.
- Semantic mode: `:243-262` strips operators (`:246`) and applies no filter.
- FTS-failure fallback: `:231-238` uses `performSearchOverFiles` (content-based, slow path).
- Fuzzy toggle: `SearchPanel.svelte:46`, `:165-167`. Store default `search.store.svelte.ts:22`.

**Result ordering and caps**
- `performOperatorOnlySearch`: cap 100 (`search.logic.ts:168`), sorted by file name (`:185`).
- `performSearchOverFiles`: cap 100 default (`:201`), sorted by match count then name (`:245-248`).
- Filename match is a substring check (`searchFileName`, `:52-55`). Text search requires a content or filename hit (`:225`).

**Rust FTS (`src-tauri/src/`)**
- `search_fts` command: `commands/search_index.rs:153-168`. Trims, default limit 50, `fuzzy` default false.
- `build_fts_query`: `commands/search_index.rs:371-402`. Splits on whitespace, quotes each term, joins with space (FTS5 implicit AND). With fuzzy, each term becomes `("t1" OR "t2" ...)`.
- `sanitize_fts_term`: `search/fts_logic.rs:193-195`. Strips `"` only. Other FTS syntax (`*`, `:`, `NEAR`, `OR`) is neutralized by the quoting.
- `search_match`: `db/fts_repo.rs:78-100`. BM25 weights `(0, 2, 1, 1.5, 1)` over path, title, content, headings, tags. Snippet with `<mark>`. Ordered by score.
- Fuzzy: `search/fuzzy.rs:35-40` `auto_distance` (0-2 chars: 0 edits, 3-5: 1, 6+: 2). `expand_fuzzy_terms` (`:46-`) pulls vocabulary terms that share the first character, limit 500. So a typo in the first letter is never expanded.
- Tag extraction in Rust: `search/fts_logic.rs:91-` (frontmatter and inline, skips code). This is the source of `entry.tags`.

**Structured filter language (reuse candidate)**
- Parser: `features/collection/expression/parser.ts:1-10` (recursive descent; precedence `||`, `&&`, comparison, additive, multiplicative, unary, member/call, primary). Tokenizer and evaluator alongside, plus `methods.logic.ts`.
- Filter object: `{and?, or?, not?}` with item = string expression or nested filter object. `collection.logic.ts:317-333` `evaluateFilter`. Note `not` is `every(!x)`.
- Visual model: `features/collection/toolbar/filter.logic.ts`. `parseExpressionToRow` (`:20-35`), `filterRowToExpression` (`:37-60`, maps operators to `==`, `!=`, `contains()`, `startsWith()`, `endsWith()`, `!contains()`). `parseFilterToGroups` (`:94-`), `filterGroupsToFilter` (`:146-`). Unknown shapes fall back to a raw JSON row.
- Other filter helpers: `rail-shell/list-search.logic.ts:8-18` (`normalizeListQuery`, `noteMatchesListQuery`), `type-definitions/type-note-list.logic.ts:72-115`.

## Problems and gaps

1. Hybrid and semantic modes silently drop `tag:`/`path:` (`search.service.ts:145-173`, `:243-262`).
2. Tag filter runs after `search_fts` top-50 cut (`search.service.ts:199-216`). Missed results with no warning.
3. Two tag-match semantics: exact in FTS path (`:215`) vs nested-prefix in index path (`search.logic.ts:149-155`). Same query, different results.
4. Operator regex has no boundary and no quoting (`search.logic.ts:6-7`). `hashtag:` false positives, no values with spaces.
5. Fuzzy typo expansion skips first-character typos (`fuzzy.rs` prefix candidate set).
6. The `search.service.ts` operator-filter path appears untested. Grep of `src/tests` for `parseSearchQuery|matchesTagFilter|matchesPathFilter` found only `search.logic.test.ts`. The service-level filter path was not searched in full (from memory on the exact test coverage).
7. No operator help or validation in the UI, so a typo is silent.
8. Text-only search has no field-scoped predicates (status, priority, date, file mtime). The Tasks view's 7d/30d filter is not expressible in this grammar.

## Ideas worth keeping

- Keep the operator syntax as a shorthand for the search box, but parse it with a boundary (`(?:^|\s)tag:(\S+)`) and support quoted values.
- Reuse `matchesIndexTag` semantics (nested prefix) everywhere, including the FTS filter at `search.service.ts:215`.
- For task rules, reuse the collection expression language and filter-group model (`and`/`or`/`not` plus expression strings). It already has a serializer, a visual row editor, and a round-trip fixed point (`filter.logic.ts:37-60`). Task rules would be a filter over task records instead of notes.
- Apply operators to the candidate set before ranking (index-level filter, then FTS restricted to those paths) to avoid the top-50 cut.
- Keep the operator-only path (no content read, from `entry.tags`) for cheap tag and path rules.

## Open questions

- Does the collection expression `EvalContext` (`collection.logic.ts`, not read in depth) expose per-task fields (status, priority, due, recurrence) or only note properties? If only notes, task rules need a second context type.
- Should task rules be stored as the same `and/or/not` YAML shape as collection filters, so one editor serves views, collections and tasks?
- Is the hybrid operator drop intended? Could `search_hybrid` accept a candidate path set?
- Which tag semantics should win (nested prefix or exact)? The owner's Todoist and tag habits (meta-bind, kanban) may decide this. Not verified.
- From memory: the in-memory FTS fallback (`performSearchOverFiles`) reads every note's content and will be slow on large vaults. Not measured.
