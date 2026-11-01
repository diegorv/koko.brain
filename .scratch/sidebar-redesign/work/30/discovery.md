# Issue 30 discovery: bound YAML nesting depth and anchor cost

No `spec.md` for sidebar-redesign (only PRD.md); the Issue is self-contained. Same code as work/26.

## Files that change
- `src-tauri/src/vault/parsing.rs:550-556` module comment (fallback wording + examples), `:580` new `MAX_YAML_NESTING_DEPTH` next to `MAX_ALIAS_EXPANSION_NODES`, `:586-610` `parse_yaml_block` (depth rejection), `:621-670` `YamlNode` / `Anchors` (shared anchored nodes), `:674-712` `build_node`, `:739-754` `project_value`, `:715-735` `project_document` (peel shared keys/root).
- `src-tauri/src/vault/parsing.rs` test module (~:3253): depth tests (small-stack thread), at-limit test, nested-anchor test.
- `src/tests/fixtures/frontmatter-parity.fixture.json`: `a: 1\n...` non-fallback case; a just-past-the-limit fallback case (`rustOnly`, so its log is counted by the existing self-exec test).
- `src-tauri/tests/vault_frontmatter_parity_test.rs`: pin the `.view` multi-document fallback (`a: 1\n---\nb: 2\n`, `a: 1\n---\n`) values and its one log.
- `docs/adr/0029-frontmatter-yaml-canonical-form.md:105` amendment wording.

## Plan
1. Depth: in `parse_yaml_block`, after the documents count, scan the buffered events once with a counter (+1 on `SequenceStart`/`MappingStart`, -1 on the ends); max > 128 is a rejection (`nesting deeper than 128`) that takes the existing fallback path and its one log. Chosen over a depth parameter in `build_node` because `build_node`'s `None` means "empty map", not "fall back"; the pre-scan keeps one rejection path and guarantees `build_node` never recurses past the limit. Depth = open collections, root map included, so `a:` + 127 `- ` levels is exactly 128.
2. Anchors: new variant `YamlNode::Shared(Rc<YamlNode>, usize)` (node + size computed once). `build_node` wraps an anchored node in it and `register` stores a clone of the `Rc`; `resolve` returns a `Shared` clone (O(1)) and still charges the cached size to `MAX_ALIAS_EXPANSION_NODES`, null past the budget. `size()` of a `Shared` is the cached value, so sizes are computed once per node: linear. `project_value`, the `[[X]]` match, keys and root peel `Shared` via a `deref` helper. Drop `#[derive(Clone)]` if nothing clones.
3. Fixture cases, `.view` test, docs.

## Prior art
- Self-exec log count: `vault_frontmatter_parity_test.rs:108-148` (fallback fixture cases log exactly once).
- Alias budget: `nested_alias_expansion_is_capped` (unchanged, must pass unedited).

## Defaults taken
- Limit 128 (Issue's suggestion); deep test uses 50 000 levels in a 256 KiB-stack thread.
- `.view` multi-document: keep the current behaviour (fallback, `{a:1,b:2}` / `{a:1}`, one log) and pin it; TS `parseCollectionYaml` throwing is a known difference, recorded in the ADR amendment.

## Risks
- Alias chains can still nest a projected tree deeper than 128 (each anchor may wrap an alias of the previous one); the alias budget bounds that at roughly sqrt(2 * 127 * 10 000), about 1 600 levels, which `project_value` / drop handle on a normal stack. Not bounded further (not asked).
- yaml-rust2's own parser must not recurse on 50 000 block levels; the small-stack test checks it.
- serde_json's 128-level recursion limit: the at-limit case lives in a Rust test, not the fixture.

## Found while implementing
- `a: - - x` on one line is not YAML (yaml-rust2 rejects it); the deep input is `a:\n  - - - … x`.
- yaml-rust2's `Parser::load` itself recurses once per level (parser.rs:417-475 in 0.13.0) and overflowed a 256 KiB stack at 50 000 levels, so the pre-scan over buffered events could not work. `read_events` drives `next_token()` instead and rejects as it goes (depth, second document); `load` and `EventBuffer` are gone.
