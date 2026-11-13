# file card src-tauri/src/vault/parsing.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/parsing.rs ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src-tauri/src/vault/parsing.rs rust L3606 module src-tauri/src/vault in4 t5 t:inline | Markdown parsing primitives for the canonical `NoteEntry`.
## imports
imp src-tauri/src/vault/parsing.rs:15 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/vault/parsing.rs:16 -> src-tauri/src/vault/aliases.rs canonicalize_key
imp src-tauri/src/vault/parsing.rs:17 -> src-tauri/src/vault/entry.rs WikiLink
imp src-tauri/src/vault/parsing.rs:18 -> src-tauri/src/vault/task.rs RecurrenceRule,Task,TaskHeading,TaskMetadata,TaskPriority,TaskStatus
## imported-by
imp src-tauri/src/commands/vault.rs:6 -> src-tauri/src/vault/parsing.rs parse_task_line,rewrite_type_in_frontmatter,set_task_status_in_content,set_task_text_in_content
imp src-tauri/src/vault/entry.rs:13 -> src-tauri/src/vault/parsing.rs extract_outgoing_links,extract_tags_strict,extract_tasks_and_headings,normalize_type_casing,parse_frontmatter,parse_frontmatter_raw_yaml,strip_frontmatter
imp src-tauri/src/vault/index.rs:15 -> src-tauri/src/vault/parsing.rs find_plain_text_mention_positions,strip_non_body_content
imp src-tauri/src/vault/task_lines.rs:7 -> src-tauri/src/vault/parsing.rs detect_code_fence,HEADING_RE,ID_RE
## reach
in2 src-tauri/src/vault/parsing.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src(1)
out2 src-tauri/src/vault/parsing.rs 2 files in 2 modules: src-tauri/src/utils(1) src-tauri/src/vault(1)
## tests
test src-tauri/tests/utils_fs_test.rs imports src-tauri/src/vault/parsing.rs
test src-tauri/tests/vault_event_frontmatter_test.rs imports src-tauri/src/vault/parsing.rs
test src-tauri/tests/vault_frontmatter_parity_test.rs imports src-tauri/src/vault/parsing.rs
test src-tauri/tests/vault_task_line_edits_parity_test.rs imports src-tauri/src/vault/parsing.rs
test src-tauri/tests/vault_task_text_test.rs imports src-tauri/src/vault/parsing.rs
## symbols
sym src-tauri/src/vault/parsing.rs:78 fn strip_frontmatter(content: &str) -> &str L6 | Removes the leading frontmatter block (if any), returning the remaining body.
by src-tauri/src/vault/parsing.rs:strip_frontmatter <- src-tauri/src/vault/entry.rs:266 in NoteEntry::from_content_full lexical
sym src-tauri/src/vault/parsing.rs:90 fn normalize_type_casing(s: &str) -> String L7 | First letter uppercase, rest preserved.
by src-tauri/src/vault/parsing.rs:normalize_type_casing <- src-tauri/src/vault/entry.rs:411 in extract_is_a lexical
sym src-tauri/src/vault/parsing.rs:103 fn rewrite_type_in_frontmatter(content: &str, old_type: &str, new_type: &str) -> Option<String> L22 | Rewrites the value of a top-level `_type:` / `type:` frontmatter key when its (unquoted, casing-normalized) value equals `old_type`.
by src-tauri/src/vault/parsing.rs:rewrite_type_in_frontmatter <- src-tauri/src/commands/vault.rs:422 in propagate_type_rename_inner lexical
sym src-tauri/src/vault/parsing.rs:436 struct(crate) InlineTag L8 | One inline `#tag` found by `scan_inline_tags`.
sym src-tauri/src/vault/parsing.rs:456 fn(crate) scan_inline_tags(text: &str) -> Vec<InlineTag<'_>> L46 | Every inline `#tag` in `text`, in order, duplicates included.
sym src-tauri/src/vault/parsing.rs:537 fn extract_tags_strict(content: &str) -> Vec<String> L15 | Extracts the canonical tag list for a note: frontmatter tags first, then inline tags, deduplicated case-insensitively (first occurrence keeps its casing).
by src-tauri/src/vault/parsing.rs:extract_tags_strict <- src-tauri/src/vault/entry.rs:253 in NoteEntry::from_content_full lexical
sym src-tauri/src/vault/parsing.rs:588 fn parse_frontmatter(content: &str) -> BTreeMap<String, JsonValue> L8 | Parses the leading YAML frontmatter into a key->JsonValue map.
by src-tauri/src/vault/parsing.rs:parse_frontmatter <- src-tauri/src/vault/entry.rs:251 in NoteEntry::from_content_full lexical
sym src-tauri/src/vault/parsing.rs:600 fn parse_frontmatter_raw_yaml(content: &str) -> BTreeMap<String, JsonValue> L3 | Parses entire content as YAML (no `---` delimiters).
by src-tauri/src/vault/parsing.rs:parse_frontmatter_raw_yaml <- src-tauri/src/vault/entry.rs:247 in NoteEntry::from_content_full lexical
sym src-tauri/src/vault/parsing.rs:1081 fn extract_outgoing_links(content: &str) -> Vec<WikiLink> L62 | Extracts outgoing wikilinks from raw markdown content.
by src-tauri/src/vault/parsing.rs:extract_outgoing_links <- src-tauri/src/vault/entry.rs:252 in NoteEntry::from_content_full lexical +1
sym src-tauri/src/vault/parsing.rs:1158 fn is_word_boundary_char(c: char) -> bool L22 | Returns true when `c` is whitespace OR punctuation — the union the TS regex `/[\s\p{P}]/u` matches at note-name word boundaries.
sym src-tauri/src/vault/parsing.rs:1196 fn strip_non_body_content(content: &str) -> String L45 | Replaces leading frontmatter and every fenced code block with ASCII spaces of the same byte length.
by src-tauri/src/vault/parsing.rs:strip_non_body_content <- src-tauri/src/vault/index.rs:223 in match_unlinked_mentions lexical +1
sym src-tauri/src/vault/parsing.rs:1268 fn find_plain_text_mention_positions(content: &str, stripped_lower: &str, search_term: &str,) -> Vec<usize> L55 | Returns byte offsets where `search_term` appears as a plain-text mention in `content`.
by src-tauri/src/vault/parsing.rs:find_plain_text_mention_positions <- src-tauri/src/vault/index.rs:230 in match_unlinked_mentions lexical +1
sym src-tauri/src/vault/parsing.rs:1463 static(crate) HEADING_RE L2 | Regex for a markdown heading line.
by src-tauri/src/vault/parsing.rs:HEADING_RE <- src-tauri/src/vault/task_lines.rs:390 in heading_indexes ref
sym src-tauri/src/vault/parsing.rs:1574 static(crate) ID_RE L3 | ID regex: 🆔 + optional space + non-whitespace identifier.
by src-tauri/src/vault/parsing.rs:ID_RE <- src-tauri/src/vault/task_lines.rs:300 in anchors ref
sym src-tauri/src/vault/parsing.rs:1606 fn map_checkbox_char(c: char) -> TaskStatus L12 | Maps a checkbox character to a `TaskStatus`; any unrecognised character falls back to `Todo`.
sym src-tauri/src/vault/parsing.rs:1621 fn status_checkbox_char(status: TaskStatus) -> char L11 | The checkbox character written for `status`; the inverse of `map_checkbox_char` (done writes the lowercase `x`).
sym src-tauri/src/vault/parsing.rs:1650 fn(crate) parse_task_line(line: &str, line_number: usize) -> Option<Task> L42 | Parses a single line as a task item.
by src-tauri/src/vault/parsing.rs:parse_task_line <- src-tauri/src/commands/vault.rs:685 in toggle_task_status_inner lexical +2
sym src-tauri/src/vault/parsing.rs:1696 fn(crate) detect_code_fence(line: &str) -> Option<&str> L10 | Detects a fenced-code-block opener / closer at the start of `line`.
by src-tauri/src/vault/parsing.rs:detect_code_fence <- src-tauri/src/vault/task_lines.rs:379 in heading_indexes lexical
sym src-tauri/src/vault/parsing.rs:1709 fn extract_tasks(content: &str) -> Vec<Task> L3 | Extracts every task list item from `content` in document order.
sym src-tauri/src/vault/parsing.rs:1720 fn extract_tasks_and_headings(content: &str) -> (Vec<Task>, Vec<TaskHeading>) L44 | Extracts the tasks as `extract_tasks` does, plus the note's headings in the same pass, and points each task's `heading` at the nearest heading above it.
by src-tauri/src/vault/parsing.rs:extract_tasks_and_headings <- src-tauri/src/vault/entry.rs:254 in NoteEntry::from_content_full lexical
sym src-tauri/src/vault/parsing.rs:1771 fn parse_task_metadata(raw_text: &str) -> TaskMetadata L103 | Parses a task's raw text for emoji-signifier metadata.
sym src-tauri/src/vault/parsing.rs:1882 fn set_task_status_in_content(content: &str, line_number: usize, status: TaskStatus) -> String L29 | Sets the checkbox of the task at `line_number` (1-based) inside `content` to `status_checkbox_char(status)`.
by src-tauri/src/vault/parsing.rs:set_task_status_in_content <- src-tauri/src/commands/vault.rs:688 in toggle_task_status_inner lexical
sym src-tauri/src/vault/parsing.rs:1918 fn set_task_text_in_content(content: &str, line_number: usize, new_text: &str) -> String L21 | Replaces the text of the task at `line_number` (1-based) inside `content` with `new_text`: the line up to the start of `TASK_RE` / `ORDERED_TASK_RE` group 3 (i…
by src-tauri/src/vault/parsing.rs:set_task_text_in_content <- src-tauri/src/commands/vault.rs:930 in write_task_text_inner lexical
## locals
local src-tauri/src/vault/parsing.rs:41 fn frontmatter_range(content: &str) -> Option<(usize, usize)> L14
local src-tauri/src/vault/parsing.rs:58 fn frontmatter_inner(content: &str) -> Option<&str> L14
local src-tauri/src/vault/parsing.rs:129 fn rewrite_type_line(line: &str, old_normalized: &str, new_type: &str) -> Option<String> L27
local src-tauri/src/vault/parsing.rs:159 fn strip_matching_quotes(value: &str) -> (&str, Option<char>) L8
local src-tauri/src/vault/parsing.rs:172 fn strip_fenced_code_blocks(content: &str) -> String L18
local src-tauri/src/vault/parsing.rs:194 fn strip_inline_code(content: &str) -> String L31
local src-tauri/src/vault/parsing.rs:227 fn strip_html_comments(content: &str) -> String L18
local src-tauri/src/vault/parsing.rs:250 fn strip_outer_quotes(s: &str) -> &str L10
local src-tauri/src/vault/parsing.rs:263 fn clean_tag_value(s: &str) -> String L6
local src-tauri/src/vault/parsing.rs:272 fn line_starts_with_key(line: &str, key: &str) -> bool L8
local src-tauri/src/vault/parsing.rs:284 fn parse_yaml_key_value(line: &str) -> Option<&str> L26
local src-tauri/src/vault/parsing.rs:314 fn find_top_level_key(lines: &[&str], key: &str) -> Option<usize> L36
local src-tauri/src/vault/parsing.rs:356 fn extract_frontmatter_tags(content: &str) -> Vec<String> L77
local src-tauri/src/vault/parsing.rs:513 fn extract_inline_tags(content: &str) -> Vec<String> L14
local src-tauri/src/vault/parsing.rs:620 fn parse_yaml_block(yaml: &str) -> BTreeMap<String, JsonValue> L12
local src-tauri/src/vault/parsing.rs:638 fn read_events(yaml: &str) -> Result<Vec<YamlEvent>, String> L26
local src-tauri/src/vault/parsing.rs:678 fn YamlNode::null() -> Self L3
local src-tauri/src/vault/parsing.rs:684 fn YamlNode::size(&self) -> usize L10
local src-tauri/src/vault/parsing.rs:697 fn YamlNode::height(&self) -> usize L14
local src-tauri/src/vault/parsing.rs:713 fn YamlNode::get(&self) -> &YamlNode L6
local src-tauri/src/vault/parsing.rs:732 fn Anchors::register(&mut self, id: usize, node: YamlNode) -> YamlNode L9
local src-tauri/src/vault/parsing.rs:745 fn Anchors::resolve(&mut self, id: usize, depth: usize) -> YamlNode L12
local src-tauri/src/vault/parsing.rs:762 fn build_node(first: YamlEvent, events: &mut impl Iterator<Item = YamlEvent>, anchors: &mut Anchors, depth: usize,) -> Option<YamlNo… L37
local src-tauri/src/vault/parsing.rs:801 fn project_document(events: Vec<YamlEvent>) -> BTreeMap<String, JsonValue> L26
local src-tauri/src/vault/parsing.rs:829 fn project_value(node: &YamlNode) -> JsonValue L13
local src-tauri/src/vault/parsing.rs:845 fn wikilink_target(items: &[YamlNode]) -> Option<&str> L15
local src-tauri/src/vault/parsing.rs:864 fn parse_yaml_lines(lines: &[&str]) -> BTreeMap<String, JsonValue> L79
local src-tauri/src/vault/parsing.rs:949 fn parse_inline_array(value: &str) -> JsonValue L14
local src-tauri/src/vault/parsing.rs:966 fn parse_scalar(s: &str) -> JsonValue L31
local src-tauri/src/vault/parsing.rs:1001 fn leading_spaces(s: &str) -> usize L3
local src-tauri/src/vault/parsing.rs:1010 fn parse_block_array(lines: &[&str], min_indent: usize) -> (Vec<JsonValue>, usize) L28
local src-tauri/src/vault/parsing.rs:1041 fn skip_indented_block(lines: &[&str], min_indent: usize) -> usize L16
local src-tauri/src/vault/parsing.rs:1326 fn char_before_byte(s: &str, byte_pos: usize) -> Option<char> L6
local src-tauri/src/vault/parsing.rs:1336 fn char_at_byte(s: &str, byte_pos: usize) -> Option<char> L6
local src-tauri/src/vault/parsing.rs:1355 fn is_inside_wikilink(content: &str, match_byte_pos: usize) -> bool L39
local src-tauri/src/vault/parsing.rs:1397 fn find_last_double_bracket_open(line: &str, from: usize) -> Option<usize> L14
local src-tauri/src/vault/parsing.rs:1413 fn find_double_bracket_close(line: &str, from: usize) -> Option<usize> L11
local src-tauri/src/vault/parsing.rs:1512 fn emoji_pattern(emoji: &str) -> String L3
local src-tauri/src/vault/parsing.rs:1517 fn build_date_regex(emoji: &str) -> Regex L7
local src-tauri/src/vault/parsing.rs:1526 fn build_priority_regex(emoji: &str) -> Regex L3
local src-tauri/src/vault/parsing.rs:1635 fn calculate_indent(ws: &str) -> usize L12
## calls
call src-tauri/src/vault/parsing.rs:59 in frontmatter_inner -> src-tauri/src/vault/parsing.rs:frontmatter_range call
call src-tauri/src/vault/parsing.rs:79 in strip_frontmatter -> src-tauri/src/vault/parsing.rs:frontmatter_range call
call src-tauri/src/vault/parsing.rs:104 in rewrite_type_in_frontmatter -> src-tauri/src/vault/parsing.rs:frontmatter_range call
call src-tauri/src/vault/parsing.rs:106 in rewrite_type_in_frontmatter -> src-tauri/src/vault/parsing.rs:normalize_type_casing call
call src-tauri/src/vault/parsing.rs:111 in rewrite_type_in_frontmatter -> src-tauri/src/vault/parsing.rs:rewrite_type_line call
call src-tauri/src/vault/parsing.rs:146 in rewrite_type_line -> src-tauri/src/vault/parsing.rs:strip_matching_quotes call
call src-tauri/src/vault/parsing.rs:147 in rewrite_type_line -> src-tauri/src/vault/parsing.rs:normalize_type_casing call
call src-tauri/src/vault/parsing.rs:265 in clean_tag_value -> src-tauri/src/vault/parsing.rs:strip_outer_quotes call
call src-tauri/src/vault/parsing.rs:328 in find_top_level_key -> src-tauri/src/vault/parsing.rs:line_starts_with_key call
call src-tauri/src/vault/parsing.rs:332 in find_top_level_key -> src-tauri/src/vault/parsing.rs:parse_yaml_key_value call
call src-tauri/src/vault/parsing.rs:357 in extract_frontmatter_tags -> src-tauri/src/vault/parsing.rs:frontmatter_inner call
call src-tauri/src/vault/parsing.rs:367 in extract_frontmatter_tags -> src-tauri/src/vault/parsing.rs:find_top_level_key call
call src-tauri/src/vault/parsing.rs:400 in extract_frontmatter_tags -> src-tauri/src/vault/parsing.rs:clean_tag_value call +1
call src-tauri/src/vault/parsing.rs:514 in extract_inline_tags -> src-tauri/src/vault/parsing.rs:strip_frontmatter call
call src-tauri/src/vault/parsing.rs:515 in extract_inline_tags -> src-tauri/src/vault/parsing.rs:strip_fenced_code_blocks call
call src-tauri/src/vault/parsing.rs:516 in extract_inline_tags -> src-tauri/src/vault/parsing.rs:strip_inline_code call
call src-tauri/src/vault/parsing.rs:517 in extract_inline_tags -> src-tauri/src/vault/parsing.rs:strip_html_comments call
call src-tauri/src/vault/parsing.rs:520 in extract_inline_tags -> src-tauri/src/vault/parsing.rs:scan_inline_tags call
call src-tauri/src/vault/parsing.rs:538 in extract_tags_strict -> src-tauri/src/vault/parsing.rs:extract_frontmatter_tags call
call src-tauri/src/vault/parsing.rs:539 in extract_tags_strict -> src-tauri/src/vault/parsing.rs:extract_inline_tags call
call src-tauri/src/vault/parsing.rs:589 in parse_frontmatter -> src-tauri/src/vault/parsing.rs:frontmatter_inner call
call src-tauri/src/vault/parsing.rs:594 in parse_frontmatter -> src-tauri/src/vault/parsing.rs:parse_yaml_block call
call src-tauri/src/vault/parsing.rs:601 in parse_frontmatter_raw_yaml -> src-tauri/src/vault/parsing.rs:parse_yaml_block call
call src-tauri/src/vault/parsing.rs:621 in parse_yaml_block -> src-tauri/src/vault/parsing.rs:read_events call
call src-tauri/src/vault/parsing.rs:622 in parse_yaml_block -> src-tauri/src/vault/parsing.rs:project_document call
call src-tauri/src/vault/parsing.rs:625 in parse_yaml_block -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/vault/parsing.rs:630 in parse_yaml_block -> src-tauri/src/vault/parsing.rs:parse_yaml_lines call
call src-tauri/src/vault/parsing.rs:754 in Anchors::resolve -> src-tauri/src/vault/parsing.rs:YamlNode::null call
call src-tauri/src/vault/parsing.rs:776 in build_node -> src-tauri/src/vault/parsing.rs:build_node call +2
call src-tauri/src/vault/parsing.rs:810 in project_document -> src-tauri/src/vault/parsing.rs:build_node call
call src-tauri/src/vault/parsing.rs:823 in project_document -> src-tauri/src/vault/aliases.rs:canonicalize_key lexical
call src-tauri/src/vault/parsing.rs:823 in project_document -> src-tauri/src/vault/parsing.rs:project_value call
call src-tauri/src/vault/parsing.rs:832 in project_value -> src-tauri/src/vault/parsing.rs:parse_scalar call
call src-tauri/src/vault/parsing.rs:834 in project_value -> src-tauri/src/vault/parsing.rs:wikilink_target call
call src-tauri/src/vault/parsing.rs:879 in parse_yaml_lines -> src-tauri/src/vault/parsing.rs:leading_spaces call +1
call src-tauri/src/vault/parsing.rs:894 in parse_yaml_lines -> src-tauri/src/vault/aliases.rs:canonicalize_key lexical
call src-tauri/src/vault/parsing.rs:919 in parse_yaml_lines -> src-tauri/src/vault/parsing.rs:parse_block_array call
call src-tauri/src/vault/parsing.rs:925 in parse_yaml_lines -> src-tauri/src/vault/parsing.rs:skip_indented_block call
call src-tauri/src/vault/parsing.rs:934 in parse_yaml_lines -> src-tauri/src/vault/parsing.rs:parse_inline_array call
call src-tauri/src/vault/parsing.rs:936 in parse_yaml_lines -> src-tauri/src/vault/parsing.rs:parse_scalar call
call src-tauri/src/vault/parsing.rs:1019 in parse_block_array -> src-tauri/src/vault/parsing.rs:leading_spaces call
call src-tauri/src/vault/parsing.rs:1025 in parse_block_array -> src-tauri/src/vault/parsing.rs:parse_scalar call
call src-tauri/src/vault/parsing.rs:1049 in skip_indented_block -> src-tauri/src/vault/parsing.rs:leading_spaces call
call src-tauri/src/vault/parsing.rs:1201 in strip_non_body_content -> src-tauri/src/vault/parsing.rs:frontmatter_range call
call src-tauri/src/vault/parsing.rs:1303 in find_plain_text_mention_positions -> src-tauri/src/vault/parsing.rs:char_before_byte call
call src-tauri/src/vault/parsing.rs:1308 in find_plain_text_mention_positions -> src-tauri/src/vault/parsing.rs:char_at_byte call
call src-tauri/src/vault/parsing.rs:1312 in find_plain_text_mention_positions -> src-tauri/src/vault/parsing.rs:is_word_boundary_char call +1
call src-tauri/src/vault/parsing.rs:1314 in find_plain_text_mention_positions -> src-tauri/src/vault/parsing.rs:is_inside_wikilink call
call src-tauri/src/vault/parsing.rs:1376 in is_inside_wikilink -> src-tauri/src/vault/parsing.rs:find_last_double_bracket_open call
call src-tauri/src/vault/parsing.rs:1383 in is_inside_wikilink -> src-tauri/src/vault/parsing.rs:find_double_bracket_close call +1
call src-tauri/src/vault/parsing.rs:1498 in (module) -> src-tauri/src/vault/task.rs:TaskPriority lexical +4
call src-tauri/src/vault/parsing.rs:1534 in (module) -> src-tauri/src/vault/parsing.rs:build_date_regex call
call src-tauri/src/vault/parsing.rs:1542 in (module) -> src-tauri/src/vault/parsing.rs:build_priority_regex call
call src-tauri/src/vault/parsing.rs:1557 in (module) -> src-tauri/src/vault/parsing.rs:emoji_pattern call +8
call src-tauri/src/vault/parsing.rs:1520 in build_date_regex -> src-tauri/src/vault/parsing.rs:emoji_pattern call
call src-tauri/src/vault/parsing.rs:1527 in build_priority_regex -> src-tauri/src/vault/parsing.rs:emoji_pattern call
call src-tauri/src/vault/parsing.rs:1608 in map_checkbox_char -> src-tauri/src/vault/task.rs:TaskStatus lexical +7
call src-tauri/src/vault/parsing.rs:1623 in status_checkbox_char -> src-tauri/src/vault/task.rs:TaskStatus lexical +6
call src-tauri/src/vault/parsing.rs:1665 in parse_task_line -> src-tauri/src/vault/parsing.rs:calculate_indent call +1
call src-tauri/src/vault/parsing.rs:1667 in parse_task_line -> src-tauri/src/vault/parsing.rs:map_checkbox_char call +1
call src-tauri/src/vault/parsing.rs:1668 in parse_task_line -> src-tauri/src/vault/parsing.rs:parse_task_metadata call +1
call src-tauri/src/vault/parsing.rs:1710 in extract_tasks -> src-tauri/src/vault/parsing.rs:extract_tasks_and_headings call
call src-tauri/src/vault/parsing.rs:1723 in extract_tasks_and_headings -> src-tauri/src/vault/parsing.rs:frontmatter_range call
call src-tauri/src/vault/parsing.rs:1731 in extract_tasks_and_headings -> src-tauri/src/vault/parsing.rs:detect_code_fence call
call src-tauri/src/vault/parsing.rs:1754 in extract_tasks_and_headings -> src-tauri/src/vault/parsing.rs:parse_task_line call
call src-tauri/src/vault/parsing.rs:1773 in parse_task_metadata -> src-tauri/src/vault/task.rs:TaskMetadata lexical
call src-tauri/src/vault/parsing.rs:1858 in parse_task_metadata -> src-tauri/src/vault/parsing.rs:scan_inline_tags call
call src-tauri/src/vault/parsing.rs:1906 in set_task_status_in_content -> src-tauri/src/vault/parsing.rs:status_checkbox_char call
