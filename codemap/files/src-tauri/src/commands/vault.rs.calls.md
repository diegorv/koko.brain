# calls of src-tauri/src/commands/vault.rs
cols: call <loc> in <fn> -> <target> <kind> [+<n>] · grep: grep -F -- ' in <fn> -> ' codemap/files/src-tauri/src/commands/vault.rs.calls.md
sections: calls
## calls
call src-tauri/src/commands/vault.rs:40 in CmdTrace::new -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:50 in CmdTrace::drop -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:65 in log_vault_shape_once -> src-tauri/src/utils/logger.rs:is_debug_enabled lexical
call src-tauri/src/commands/vault.rs:75 in log_vault_shape_once -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:122 in scan_vault -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:123 in scan_vault -> src-tauri/src/commands/vault.rs:scan_vault_inner call
call src-tauri/src/commands/vault.rs:132 in scan_vault_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/vault.rs:133 in scan_vault_inner -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:134 in scan_vault_inner -> src-tauri/src/commands/vault.rs:scan_dir call
call src-tauri/src/commands/vault.rs:187 in scan_dir -> src-tauri/src/commands/vault.rs:scan_dir call
call src-tauri/src/commands/vault.rs:202 in scan_dir -> src-tauri/src/commands/vault.rs:sort_nodes call
call src-tauri/src/commands/vault.rs:210 in canonical_vault_root -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:225 in collect_v2_entries -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/commands/vault.rs:229 in collect_v2_entries -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:230 in collect_v2_entries -> src-tauri/src/utils/fs.rs:collect_markdown_paths_with_metadata lexical
call src-tauri/src/commands/vault.rs:239 in collect_v2_entries -> src-tauri/src/vault/entry.rs:NoteEntry lexical
call src-tauri/src/commands/vault.rs:239 in collect_v2_entries -> src-tauri/src/vault/entry.rs:NoteEntry::from_content_full lexical
call src-tauri/src/commands/vault.rs:330 in update_note_in_index_inner -> src-tauri/src/utils/fs.rs:is_markdown_filename lexical
call src-tauri/src/commands/vault.rs:341 in update_note_in_index_inner -> src-tauri/src/commands/vault.rs:read_file_metadata call
call src-tauri/src/commands/vault.rs:342 in update_note_in_index_inner -> src-tauri/src/vault/entry.rs:NoteEntry lexical
call src-tauri/src/commands/vault.rs:342 in update_note_in_index_inner -> src-tauri/src/vault/entry.rs:NoteEntry::from_content_full lexical
call src-tauri/src/commands/vault.rs:343 in update_note_in_index_inner -> src-tauri/src/vault/index.rs:VaultIndex::update_entry lexical-method
call src-tauri/src/commands/vault.rs:364 in update_note_in_index -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:365 in update_note_in_index -> src-tauri/src/commands/vault.rs:read_file_mtime_secs call
call src-tauri/src/commands/vault.rs:370 in update_note_in_index -> src-tauri/src/commands/vault.rs:update_note_in_index_inner call
call src-tauri/src/commands/vault.rs:374 in update_note_in_index -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:415 in propagate_type_rename_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/vault.rs:422 in propagate_type_rename_inner -> src-tauri/src/vault/parsing.rs:rewrite_type_in_frontmatter lexical
call src-tauri/src/commands/vault.rs:425 in propagate_type_rename_inner -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/vault.rs:432 in propagate_type_rename_inner -> src-tauri/src/commands/vault.rs:read_file_mtime_secs call
call src-tauri/src/commands/vault.rs:433 in propagate_type_rename_inner -> src-tauri/src/commands/vault.rs:update_note_in_index_inner call
call src-tauri/src/commands/vault.rs:457 in propagate_type_rename -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:462 in propagate_type_rename -> src-tauri/src/commands/vault.rs:propagate_type_rename_inner call
call src-tauri/src/commands/vault.rs:466 in propagate_type_rename -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:490 in get_backlinks_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:494 in get_backlinks_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_backlinks lexical-method
call src-tauri/src/commands/vault.rs:504 in get_relationship_backlinks_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:508 in get_relationship_backlinks_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_relationship_backlinks lexical-method
call src-tauri/src/commands/vault.rs:523 in get_outgoing_links_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:527 in get_outgoing_links_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_outgoing_links lexical-method
call src-tauri/src/commands/vault.rs:546 in get_outgoing_unlinked_mentions_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:550 in get_outgoing_unlinked_mentions_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_outgoing_unlinked_mentions lexical-method
call src-tauri/src/commands/vault.rs:566 in get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:603 in get_unlinked_mentions_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:609 in get_unlinked_mentions_v2 -> src-tauri/src/vault/index.rs:VaultIndex::unlinked_mentions_candidates lexical-method
call src-tauri/src/commands/vault.rs:618 in get_unlinked_mentions_v2 -> src-tauri/src/vault/index.rs:match_unlinked_mentions lexical
call src-tauri/src/commands/vault.rs:627 in get_unlinked_mentions_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_entries lexical-method
call src-tauri/src/commands/vault.rs:641 in get_all_tags_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:645 in get_all_tags_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_all_tags lexical-method
call src-tauri/src/commands/vault.rs:655 in get_all_tasks_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:659 in get_all_tasks_v2 -> src-tauri/src/vault/index.rs:VaultIndex::lookup_all_tasks lexical-method
call src-tauri/src/commands/vault.rs:685 in toggle_task_status_inner -> src-tauri/src/vault/parsing.rs:parse_task_line lexical
call src-tauri/src/commands/vault.rs:688 in toggle_task_status_inner -> src-tauri/src/vault/parsing.rs:set_task_status_in_content lexical
call src-tauri/src/commands/vault.rs:704 in toggle_task_status_inner -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/vault.rs:705 in toggle_task_status_inner -> src-tauri/src/commands/vault.rs:read_file_mtime_secs call
call src-tauri/src/commands/vault.rs:706 in toggle_task_status_inner -> src-tauri/src/commands/vault.rs:update_note_in_index_inner call
call src-tauri/src/commands/vault.rs:742 in toggle_task_status -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:747 in toggle_task_status -> src-tauri/src/commands/vault.rs:toggle_task_status_inner call
call src-tauri/src/commands/vault.rs:758 in toggle_task_status -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:778 in confined_note_path -> src-tauri/src/utils/fs.rs:is_search_indexed_filename lexical
call src-tauri/src/commands/vault.rs:806 in write_task_lines_inner -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:807 in write_task_lines_inner -> src-tauri/src/vault/index.rs:VaultIndex::vault_root lexical-method
call src-tauri/src/commands/vault.rs:810 in write_task_lines_inner -> src-tauri/src/commands/vault.rs:confined_note_path call
call src-tauri/src/commands/vault.rs:826 in write_task_lines_inner -> src-tauri/src/vault/task_lines.rs:apply_task_line_edits lexical
call src-tauri/src/commands/vault.rs:827 in write_task_lines_inner -> src-tauri/src/vault/task_lines.rs:TaskLineEditOutcome lexical +1
call src-tauri/src/commands/vault.rs:827 in write_task_lines_inner -> src-tauri/src/vault/task_lines.rs:TaskLinesOutcome lexical +4
call src-tauri/src/commands/vault.rs:840 in write_task_lines_inner -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/vault.rs:841 in write_task_lines_inner -> src-tauri/src/commands/vault.rs:read_file_mtime_secs call
call src-tauri/src/commands/vault.rs:842 in write_task_lines_inner -> src-tauri/src/commands/vault.rs:update_note_in_index_inner call
call src-tauri/src/commands/vault.rs:865 in write_task_lines -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:870 in write_task_lines -> src-tauri/src/commands/vault.rs:write_task_lines_inner call
call src-tauri/src/commands/vault.rs:874 in write_task_lines -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:907 in write_task_text_inner -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:908 in write_task_text_inner -> src-tauri/src/vault/index.rs:VaultIndex::vault_root lexical-method
call src-tauri/src/commands/vault.rs:911 in write_task_text_inner -> src-tauri/src/commands/vault.rs:confined_note_path call
call src-tauri/src/commands/vault.rs:917 in write_task_text_inner -> src-tauri/src/vault/parsing.rs:parse_task_line lexical +1
call src-tauri/src/commands/vault.rs:930 in write_task_text_inner -> src-tauri/src/vault/parsing.rs:set_task_text_in_content lexical
call src-tauri/src/commands/vault.rs:931 in write_task_text_inner -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/vault.rs:932 in write_task_text_inner -> src-tauri/src/commands/vault.rs:read_file_mtime_secs call
call src-tauri/src/commands/vault.rs:937 in write_task_text_inner -> src-tauri/src/commands/vault.rs:update_note_in_index_inner call
call src-tauri/src/commands/vault.rs:966 in write_task_text -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:971 in write_task_text -> src-tauri/src/commands/vault.rs:write_task_text_inner call
call src-tauri/src/commands/vault.rs:983 in write_task_text -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1059 in get_all_property_records -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1103 in get_index_delta -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1107 in get_index_delta -> src-tauri/src/commands/vault.rs:index_delta_inner call
call src-tauri/src/commands/vault.rs:1151 in create_note -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1152 in create_note -> src-tauri/src/commands/vault.rs:ensure_safe_write_path call
call src-tauri/src/commands/vault.rs:1156 in create_note -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/vault.rs:1157 in create_note -> src-tauri/src/commands/vault.rs:read_file_mtime_secs call
call src-tauri/src/commands/vault.rs:1162 in create_note -> src-tauri/src/commands/vault.rs:update_note_in_index_inner call
call src-tauri/src/commands/vault.rs:1165 in create_note -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1180 in create_folder -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1181 in create_folder -> src-tauri/src/commands/vault.rs:ensure_safe_write_path call
call src-tauri/src/commands/vault.rs:1191 in mod_data_path -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:1207 in write_mod_data -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1208 in write_mod_data -> src-tauri/src/commands/vault.rs:mod_data_path call
call src-tauri/src/commands/vault.rs:1212 in write_mod_data -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/vault.rs:1223 in read_mod_data -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1224 in read_mod_data -> src-tauri/src/commands/vault.rs:mod_data_path call
call src-tauri/src/commands/vault.rs:1247 in remove_note_from_index -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1252 in remove_note_from_index -> src-tauri/src/vault/index.rs:VaultIndex::remove_entry lexical-method
call src-tauri/src/commands/vault.rs:1256 in remove_note_from_index -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1333 in rename_note_inner -> src-tauri/src/vault/index.rs:VaultIndex::remove_entry lexical-method
call src-tauri/src/commands/vault.rs:1334 in rename_note_inner -> src-tauri/src/utils/fs.rs:is_markdown_filename lexical
call src-tauri/src/commands/vault.rs:1335 in rename_note_inner -> src-tauri/src/utils/fs.rs:is_view_filename lexical +1
call src-tauri/src/commands/vault.rs:1336 in rename_note_inner -> src-tauri/src/vault/entry.rs:NoteEntry::with_path lexical-method
call src-tauri/src/commands/vault.rs:1338 in rename_note_inner -> src-tauri/src/commands/vault.rs:reparse_across_view_boundary call
call src-tauri/src/commands/vault.rs:1340 in rename_note_inner -> src-tauri/src/vault/index.rs:VaultIndex::update_entry lexical-method
call src-tauri/src/commands/vault.rs:1358 in reparse_across_view_boundary -> src-tauri/src/vault/entry.rs:NoteEntry lexical +1
call src-tauri/src/commands/vault.rs:1358 in reparse_across_view_boundary -> src-tauri/src/vault/entry.rs:NoteEntry::from_content_full lexical
call src-tauri/src/commands/vault.rs:1366 in reparse_across_view_boundary -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1367 in reparse_across_view_boundary -> src-tauri/src/utils/fs.rs:is_view_filename lexical
call src-tauri/src/commands/vault.rs:1368 in reparse_across_view_boundary -> src-tauri/src/vault/entry.rs:NoteEntry::from_view_frontmatter lexical
call src-tauri/src/commands/vault.rs:1376 in reparse_across_view_boundary -> src-tauri/src/vault/entry.rs:NoteEntry::with_path lexical-method
call src-tauri/src/commands/vault.rs:1398 in rename_note -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1403 in rename_note -> src-tauri/src/commands/vault.rs:rename_note_inner call
call src-tauri/src/commands/vault.rs:1407 in rename_note -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1446 in scan_vault_v2 -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1448 in scan_vault_v2 -> src-tauri/src/commands/vault.rs:scan_vault_v2_inner call
call src-tauri/src/commands/vault.rs:1449 in scan_vault_v2 -> src-tauri/src/commands/vault.rs:emit_index_updated call
call src-tauri/src/commands/vault.rs:1467 in scan_vault_v2_inner -> src-tauri/src/commands/vault.rs:collect_v2_entries call
call src-tauri/src/commands/vault.rs:1468 in scan_vault_v2_inner -> src-tauri/src/commands/vault.rs:canonical_vault_root call
call src-tauri/src/commands/vault.rs:1474 in scan_vault_v2_inner -> src-tauri/src/vault/index.rs:VaultIndex::build_with_root lexical-method
call src-tauri/src/commands/vault.rs:1475 in scan_vault_v2_inner -> src-tauri/src/commands/vault.rs:log_vault_shape_once call
call src-tauri/src/commands/vault.rs:1476 in scan_vault_v2_inner -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1533 in scan_vault_v2_cached -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1535 in scan_vault_v2_cached -> src-tauri/src/commands/vault.rs:scan_vault_v2_cached_inner call
call src-tauri/src/commands/vault.rs:1536 in scan_vault_v2_cached -> src-tauri/src/commands/vault.rs:emit_index_updated call
call src-tauri/src/commands/vault.rs:1556 in scan_vault_v2_cached_inner -> src-tauri/src/vault/index_cache.rs:read_snapshot lexical
call src-tauri/src/commands/vault.rs:1559 in scan_vault_v2_cached_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +11
call src-tauri/src/commands/vault.rs:1579 in scan_vault_v2_cached_inner -> src-tauri/src/vault/index_cache.rs:cache_file_path lexical
call src-tauri/src/commands/vault.rs:1589 in scan_vault_v2_cached_inner -> src-tauri/src/commands/vault.rs:collect_v2_entries call
call src-tauri/src/commands/vault.rs:1590 in scan_vault_v2_cached_inner -> src-tauri/src/commands/vault.rs:canonical_vault_root call
call src-tauri/src/commands/vault.rs:1597 in scan_vault_v2_cached_inner -> src-tauri/src/vault/index.rs:VaultIndex::build_with_root lexical-method +1
call src-tauri/src/commands/vault.rs:1598 in scan_vault_v2_cached_inner -> src-tauri/src/commands/vault.rs:log_vault_shape_once call +1
call src-tauri/src/commands/vault.rs:1610 in scan_vault_v2_cached_inner -> src-tauri/src/vault/index_cache.rs:write_snapshot lexical +1
call src-tauri/src/commands/vault.rs:1638 in scan_vault_v2_cached_inner -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/vault.rs:1639 in scan_vault_v2_cached_inner -> src-tauri/src/utils/fs.rs:collect_markdown_paths_with_metadata lexical
call src-tauri/src/commands/vault.rs:1655 in scan_vault_v2_cached_inner -> src-tauri/src/vault/entry.rs:NoteEntry lexical +1
call src-tauri/src/commands/vault.rs:1655 in scan_vault_v2_cached_inner -> src-tauri/src/vault/entry.rs:NoteEntry::from_content_full lexical +1
call src-tauri/src/commands/vault.rs:1753 in emit_index_updated -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1770 in save_vault_cache -> src-tauri/src/commands/vault.rs:CmdTrace::new call
call src-tauri/src/commands/vault.rs:1776 in save_vault_cache -> src-tauri/src/vault/index_cache.rs:write_snapshot lexical
call src-tauri/src/commands/vault.rs:1777 in save_vault_cache -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/vault.rs:1800 in sort_nodes -> src-tauri/src/commands/vault.rs:natural_cmp call
call src-tauri/src/commands/vault.rs:1818 in natural_cmp -> src-tauri/src/commands/vault.rs:take_digits call +1
