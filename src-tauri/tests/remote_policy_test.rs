use kokobrain_lib::remote::policy::{classify, fs_path_rule, is_meta_path, Class, FsOp, PathAccess};

#[test]
fn exact_rows_classify_commands() {
	assert_eq!(classify("scan_vault"), Some(Class::Read));
	assert_eq!(classify("open_vault_db"), Some(Class::Virtual));
	assert_eq!(classify("create_note"), Some(Class::Write));
	assert_eq!(classify("rename_note"), Some(Class::Denied));
	assert_eq!(classify("plugin:fs|read_text_file"), Some(Class::Read));
	assert_eq!(classify("plugin:fs|write_text_file"), Some(Class::Write));
	assert_eq!(classify("plugin:fs|mkdir"), Some(Class::Write));
	assert_eq!(classify("save_snapshot"), Some(Class::Write));
	for cmd in ["plugin:fs|remove", "plugin:fs|rename", "plugin:fs|write_file"] {
		assert_eq!(classify(cmd), Some(Class::Denied), "{cmd}");
	}
}

#[test]
fn plugin_wildcard_rows_cover_the_plugin_only() {
	assert_eq!(classify("plugin:window|set_title"), Some(Class::Virtual));
	assert_eq!(classify("plugin:dialog|open"), Some(Class::Denied));
	// fs has no wildcard: an unlisted fs command stays unclassified.
	assert_eq!(classify("plugin:fs|truncate"), None);
	assert_eq!(classify("plugin:notification|notify"), None);
	assert_eq!(classify("not_a_command"), None);
	assert_eq!(classify(""), None);
}

#[test]
fn paths_outside_the_vault_are_denied() {
	let root = "/v/vault";
	assert_eq!(fs_path_rule(root, "/v/vault/a.md", FsOp::Read), PathAccess::Allow);
	assert_eq!(fs_path_rule(root, "/v/vault", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault2/a.md", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/etc/passwd", FsOp::Probe), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/../x.md", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "", FsOp::Read), PathAccess::Deny);
}

#[test]
fn kokobrain_json_reads_and_dropped_writes_are_allowed() {
	let root = "/v/vault";
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/settings.json", FsOp::Read), PathAccess::Allow);
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/settings.json", FsOp::Write), PathAccess::Allow);
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain", FsOp::Probe), PathAccess::Allow);
}

#[test]
fn other_kokobrain_access_is_denied() {
	let root = "/v/vault";
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/kokobrain.db", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/history/a.json", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/x.db", FsOp::Write), PathAccess::Deny);
}

#[test]
fn writes_to_vault_notes_are_allowed_by_the_path_rule() {
	assert_eq!(fs_path_rule("/v/vault", "/v/vault/note.md", FsOp::Write), PathAccess::Allow);
	assert_eq!(fs_path_rule("/v/vault", "/v/vault/folder/new", FsOp::Write), PathAccess::Allow);
	assert_eq!(fs_path_rule("/v/vault", "/v/vault/.git/config", FsOp::Write), PathAccess::Deny);
	assert_eq!(fs_path_rule("/v/vault", "/v/other/note.md", FsOp::Write), PathAccess::Deny);
}

#[test]
fn empty_segments_are_denied() {
	let root = "/v/vault";
	assert_eq!(fs_path_rule(root, "/v/vault//.kokobrain/trash/x.json", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault//.kokobrain", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/a//b.md", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/", FsOp::Probe), PathAccess::Allow);
}

#[test]
fn kokobrain_case_variants_are_denied() {
	let root = "/v/vault";
	for op in [FsOp::Probe, FsOp::Read, FsOp::Write] {
		assert_eq!(fs_path_rule(root, "/v/vault/.KOKOBRAIN/settings.json", op), PathAccess::Deny);
		assert_eq!(fs_path_rule(root, "/v/vault/.Kokobrain/kokobrain.db", op), PathAccess::Deny);
		assert_eq!(fs_path_rule(root, "/v/vault/.KokoBrain", op), PathAccess::Deny);
	}
}

#[test]
fn meta_paths_match_the_kokobrain_segment_in_any_case() {
	let root = "/v/vault";
	assert!(is_meta_path(root, "/v/vault/.kokobrain"));
	assert!(is_meta_path(root, "/v/vault/.kokobrain/settings.json"));
	assert!(is_meta_path(root, "/v/vault/.KOKOBRAIN/settings.json"));
	assert!(is_meta_path(root, "/v/vault//.kokobrain/x"));
	assert!(!is_meta_path(root, "/v/vault/notes/.kokobrain/x"));
	assert!(!is_meta_path(root, "/v/vault/note.md"));
}

#[test]
fn other_dot_directories_and_their_children_are_denied() {
	let root = "/v/vault";
	for path in ["/v/vault/.git", "/v/vault/.git/config", "/v/vault/.obsidian/app.json", "/v/vault/a/.hidden/b.md"] {
		for op in [FsOp::Probe, FsOp::Read, FsOp::Write] {
			assert_eq!(fs_path_rule(root, path, op), PathAccess::Deny, "{path} {op:?}");
		}
	}
	assert_eq!(fs_path_rule(root, "/v/vault/.kokobrain/.hidden.json", FsOp::Read), PathAccess::Deny);
	assert_eq!(fs_path_rule(root, "/v/vault/notes/.DS_Store", FsOp::Read), PathAccess::Deny);
}

#[test]
fn writes_are_denied_on_the_root_and_the_meta_and_git_directories() {
	let root = "/v/vault";
	for path in ["/v/vault", "/v/vault/", "/v/vault/.kokobrain", "/v/vault/.kokobrain/", "/v/vault/.git", "/v/vault/.git/"] {
		assert_eq!(fs_path_rule(root, path, FsOp::Write), PathAccess::Deny, "{path}");
	}
}
