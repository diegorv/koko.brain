# 26: Rust reads frontmatter with a real YAML parser

**What to build:** The Rust frontmatter parser (`parse_frontmatter` / `parse_frontmatter_raw_yaml` in `src-tauri/src/vault/parsing.rs:526-770`) is a hand-rolled YAML subset, and it misreads bytes the app itself writes:
- A multi-line value the TS serializer writes as `notes: |-` is read as the string `"|-"`.
- A list item that contains a comma, which `yaml@2.9.1` quotes (`aliases: ["Smith, John", JS]`), is split into `"Smith`, `John"`, `JS`. Relationships to notes whose names contain a comma drop out of the Rust index.
- Double-quoted escapes keep their backslashes.

Collections, QueryJS, relationship backlinks, wikilink alias completion, the type sidebar and the event calendar all read this Rust view. The Properties panel reads the TS `yaml` view. So the same note shows different values depending on where you look.

Replace the line scanner with `yaml-rust2`, driven by a `MarkedEventReceiver` (`Parser::new_from_str` + `load`). Never use `YamlLoader`: it errors on duplicate keys, and its `Yaml::from_str` turns `Null`/`NULL` into strings and `0x1F` / `0o14` / `+5` into integers. Keep the same function signatures and the current projection contract:
- nested maps become `null`;
- keys go through `canonicalize_key`;
- duplicate keys are last-wins;
- plain scalars resolve through the existing `parse_scalar` rules.

Buffer the parser events and throw them away on `Err`, because `load` delivers events before it returns the error. If the real parser rejects the block, fall back to the existing subset parser for the whole block, so malformed notes that work today (`title: foo: bar`) keep their current values. Log every fallback with `debug_log("FRONTMATTER", ...)`. A single bad line (for example `tags: [#foo, #bar]`) sends the entire note back to the subset parser, `|-` values and comma lists included, so the log is the only signal.

A shared fixture file pins both sides:
- TS checks that `serializeProperties` emits the fixture bytes, and that `yaml.parse` reads them as the expected value.
- Rust checks that `parse_frontmatter` reads the same bytes as the same value.

Bump `INDEX_SCHEMA_VERSION` so cached snapshots are parsed again. On a cache hit, entries with a matching mtime are reused without being parsed again (`commands/vault.rs` ~1218).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:**
- Both suites: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Run cargo one build at a time (`CARGO_BUILD_JOBS=2`, `nice -n 19`).
- No E2E: Playwright runs against `e2e/mocks/vault-index.ts`, which already parses with `yaml`.

**Source:**
- Rust: `src-tauri/src/vault/parsing.rs:526-770` (subset parser and module comment), `src-tauri/src/vault/entry.rs:229-249,374-421` (NoteEntry projection, relationship extraction), `src-tauri/src/vault/index_cache.rs:13-16` (`INDEX_SCHEMA_VERSION` and its doc comment), `src-tauri/src/vault/aliases.rs:32`.
- TS: `src/lib/features/properties/properties.logic.ts:388-404` (`serializeProperties`), `e2e/mocks/vault-index.ts:96-136`.
- ADRs: 0029 (canonical write form; block-scalar row "Contains `\n` or `\r` -> `|-`"), 0025 (scoped the Rust subset), 0027 (key aliases via `canonicalize_key`).
- Commit a2aece22 (`src-tauri/tests/vault_event_frontmatter_test.rs`).
- Line numbers are as of dad4c4c6, re-checked at 404fabe0: none of the cited files changed in between except `e2e/mocks/vault-index.ts` (Issue 22 added 31 lines; the `yaml.parse` call is at line 102).

- [ ] **Fixture first.** Add `src/tests/fixtures/frontmatter-parity.fixture.json`. Each case is `{ name, properties?, yaml, expected, rustExpected?, tsExpected?, tsThrows?, rustOnly? }`. Values JSON cannot hold (`.inf`) use a documented sentinel. Add `src-tauri/tests/vault_frontmatter_parity_test.rs`: it reads the fixture with `include_str!` and asserts that `parse_frontmatter("---\n" + yaml + "\n---\n") == rustExpected ?? expected`. Run it and see the cases below fail before touching `parsing.rs`.
- [ ] **TS side.** Add `src/tests/lib/features/properties/frontmatter-parity.test.ts`:
  - For every case with `properties`: `serializeProperties(properties) === yaml`.
  - For every case that is not `rustOnly`: when `tsThrows` is set, `yaml.parse` throws. Otherwise `yaml.parse(yaml, { uniqueKeys: false })`, projected (keys through `canonicalizeKey`, nested maps to `null`), deep-equals `tsExpected ?? expected`.
- [ ] **Block scalars:**
  - `notes: |-\n  line one\n  line two\nafter: x` gives `notes = "line one\nline two"`, `after = "x"` (today: `"|-"`).
  - `notes: |\n  a\n  b` as the last frontmatter line gives `"a\nb\n"`.
  - `notes: |2-\n    a\n  b` gives `"  a\nb"`.
  - Hand-written `d: >\n  one\n  two` gives `"one two\n"` (today: `">"`).
- [ ] **Flow lists:** `aliases: ["Smith, John", JS]` gives `["Smith, John", "JS"]` (today: `["\"Smith", "John\"", "JS"]`).
- [ ] **Relationships:** `_related_to: ["[[Smith, John]]", "[[C]]"]` gives `NoteEntry.related_to == ["Smith, John", "C"]` (today: only `C`), and `get_relationship_backlinks_v2` on `Smith, John.md` returns the source note.
- [ ] **Escapes:**
  - `t: "it's: \"bar\""` gives `it's: "bar"`.
  - `t: "a: \\b"` gives `a: \b`.
  - `t: 'it''s'` gives `it's`.
  - `t: "a\nb"` gives a real newline.
  - `"42": x` gives key `42`.
- [ ] **Projection kept**, so the existing tests pass unchanged:
  - a nested map gives `null` and its siblings are kept;
  - `start:` gives `null`; `start: ""` gives `""`;
  - `Null` / `NULL` / `~` give `null`; `True` / `TRUE` give `true`;
  - `yes`, `"42"` and `2026-04-28` stay strings;
  - duplicate keys are last-wins;
  - `: orphan value` is skipped;
  - keys go through `canonicalize_key`.
- [ ] **Plain scalars** keep the numeric rules of `parse_scalar`. `0x1F`, `0o14` and `.inf` stay strings in Rust (`rustExpected`). Integers above 2^53 stay exact; these cases are `rustOnly`, because `JSON.parse` rounds them.
- [ ] **Unquoted wikilinks.** Rule: a sequence holding exactly one sequence holding exactly one string `X` projects to `"[[X]]"`.
  - `related: [[[A]], [[B]]]` still gives `["[[A]]", "[[B]]"]`.
  - `related: [[A]]` gives `"[[A]]"` (today: `["[A]"]`, so no relationship is found).
  - A block item `- [[A]]` is covered too.
- [ ] **Fallback.** Input that the real parser rejects goes through the old subset parser with identical results, and emits one `FRONTMATTER` debug log. Cover `title: foo: bar`, `tags: [a, b`, `tags: [a, , b]`, `valid: yes\nthis is not valid yaml\nanother: ok`, `tags: [#foo, #bar]`, and tab indentation (mark each as `tsThrows` where `yaml.parse` throws).
- [ ] **Behaviour changes.** The owner approved every change below (2026-11-01). Each changed test gets its reason in the commit message, and no other existing test may change:
  - `parse_comments_after_value_are_kept_as_part_of_string`: `key: value # c` now gives `"value"`.
  - `vault_event_frontmatter_test.rs::inline_comment_is_kept_in_the_value`: `start: 09:30 # standup` now gives `"09:30"`.
  - `parse_block_array_terminates_when_indent_decreases`: now `next = "hello - skipped"`.
  - A map inside a list now gives `null`. Today `- name: x` gives `"name: x"`, and `.view` `views:` becomes `[null]` instead of `["type: table"]`. No TS code reads `views` from the Rust index (`grep` for `frontmatter.views` over `src/lib` and `e2e` at 404fabe0 finds nothing); confirm that again before merging.
  - `desc: foo\n  bar` now gives `"foo bar"` (today `"foo"`).
  - `tags:\n- a` now gives `["a"]` (today `null`).
  - Anchors and aliases (`&x` / `*x`): resolve `*x` to the anchored value, the same as `yaml.parse`, and pin it in the fixture. A resolved nested map still projects to `null`.
- [ ] **Known divergences from yaml@2.9.1.** List them in the fixture and in the ADR amendment: `: orphan value`, `null: z`, `[[[A]], [[B]]]`, `!!str 42`, and the numeric forms above.
- [ ] **`.view` files** (`parse_frontmatter_raw_yaml`) use the same parser and projection.
- [ ] **Schema version.** `INDEX_SCHEMA_VERSION` goes from 3 to 4. A test through `scan_vault_v2_cached_inner` (tests/commands/vault_test.rs) with a literal `schema_version: 3` snapshot asserts that the snapshot is discarded. Update the doc comment at index_cache.rs:13 to say "bump on `NoteEntry` shape changes or on parser output changes".
- [ ] **Dependency.** Use `yaml-rust2 = { version = "0.13", default-features = false }`. The default `encoding` feature would force the shared `encoding_rs` (used by reqwest) down from 0.8.42 to below 0.8.40, and lockfile downgrades are not accepted. The `Cargo.lock` diff adds only `yaml-rust2` and `arraydeque` (check with `cargo tree --locked`).
- [ ] **Docs.** Rewrite the `parsing.rs` module comment. Add an ADR 0029 amendment saying the Rust read path accepts the whole canonical form, and list the divergences and the fallback behaviour.
- [ ] **Follow-up issue filed:** re-evaluate the event-calendar `trailing-comment` rule (`event-calendar-event.logic.ts:33-34,137-139`). After this change it still fires, but only for fallback notes and quoted values. Also align `src/tests/fixtures/event-notes.fixture.ts:35` (`rustFrontmatter`) there, not in this issue.
- [ ] **Tests** follow docs/TESTING.md: happy path, empty input (`---\n---\n`), and error/fallback cases.

## Notes

- **Reproduced on the TS side** with the real `yaml@2.9.1` and the exact `serializeProperties` options. The Rust outputs come from tracing `parse_yaml_lines` (579-660), `parse_inline_array` (664, `split(',')`) and `parse_scalar` (681-713). Rust was not executed.
- **Triggers.**
  - Common: a list item with a comma (the Properties list input, relationships to notes with commas in their names).
  - Rare: multi-line values. They come from a deep link `title=` containing `%0A` (`deep-link.logic.ts:385-405`) and from block scalars written outside the app. `detectLossyFrontmatter` does not flag block scalars, so any rewrite from the UI emits `|-` again.
- **Not affected:** the graph (title, links and tags only) and the lifecycle filter (booleans). Plain backlinks scan the raw content.
- **Options rejected:**
  - (b) TS never emits anything outside the subset. That changes the ADR 0029 form and still fails on external YAML.
  - (c) A lossy flag only.
  - (d) Widen the hand-rolled parser, which means reimplementing YAML.
- **Crate status** (crates.io, 2026-11-01): yaml-rust2 0.13.0 (2026-09-11) is in "basic maintenance". saphyr is still churning. serde_yaml and serde_yml are deprecated.
- **Unverified:** whether yaml-rust2 rejects `title: foo: bar` and tab indentation. The fixture will show it.
- **Out of scope:** recording full-scan build time on a real vault. The owner can measure it after merge using the `VAULT-CACHE full scan ... build Nms` log.
- **Size:** M. The contract inversions cannot be split from the parser swap, because any real YAML parser strips comments.
