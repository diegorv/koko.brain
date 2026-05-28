# Fix .view / .collection format in docs and examples

The `.view` (and `.collection`) file format is a single pure-YAML document with
top-level keys: sidebar metadata (`_sidebar_label`, `_icon`, `_color`, `_order`,
`_sort`, `_list_properties_display`) sit alongside `views:` and `filters:`.

- TS query path: `parseCollectionYaml(content)` reads top-level `views:` / `filters:`.
- Rust sidebar metadata: `.view` is parsed by `parse_frontmatter_raw_yaml`
  (entry.rs:230), which reads top-level YAML keys (NOT `---` frontmatter fences).

Both halves consume the same pure-YAML top-level structure, so there is no parser
change needed. The bug is purely in the documentation and the example files, which
show a frontmatter (`---...---`) + body filter format that `parseCollectionYaml`
rejects ("Source contains multiple documents") and that was never the real format.

A prior attempt to add a frontmatter+body `parseViewFile` was reverted — it solved
a non-existent problem.

## Tasks

- [x] Task 1: Rewrite the two example `.view` files to pure YAML
      (`views:` + `filters:` + top-level `_*` metadata), using `&&` not `and`.
- [x] Task 2: Fix doc 25 "View Files" section to show the pure-YAML format
      (currently shows frontmatter + body). Keep the `and`->`&&` / `=`->`==` fixes.
- [ ] Task 3: Commit doc 12 fixes (`&&`/`||`/`!` operator table, `and`->`&&` example).

## Notes

- Verified end-to-end: pure-YAML `.view` parses via parseCollectionYaml and filters
  correctly via executeQuery (probe). Rust `parse_frontmatter_raw_yaml` extracts
  top-level `_icon`/`_color`/`_order` (parsing.rs tests).
- Expression grammar supports only `&&`/`||`/`!`, not `and`/`or`/`not` keywords.
- `.collection` files: `is_view_filename` is false for them, so Rust uses standard
  `parse_frontmatter` — but their metadata is not read by the type sidebar, so no
  impact. Doc 12 `.collection` examples already use correct top-level YAML.
