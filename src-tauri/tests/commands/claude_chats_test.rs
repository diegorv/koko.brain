//! Integration tests for `commands::claude::chats`: the panel's chat files in
//! `<vault>/.kokobrain/claude/chats/`.

use kokobrain_lib::commands::claude::chats::{claude_chat_list, claude_chat_read, claude_chat_write, ClaudeChatEntry};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use tempfile::{tempdir, TempDir};

const ID_A: &str = "0f8fad5b-d9cb-469f-a165-70867728950e";
const ID_B: &str = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

fn vault_str(path: &Path) -> String {
	path.to_string_lossy().to_string()
}

fn chats_dir(vault: &Path) -> PathBuf {
	vault.join(".kokobrain/claude/chats")
}

fn write(vault: &Path, id: &str, content: &str) -> Result<(), String> {
	claude_chat_write(vault_str(vault), id.to_string(), content.to_string())
}

fn read(vault: &Path, id: &str) -> Result<Option<String>, String> {
	claude_chat_read(vault_str(vault), id.to_string())
}

fn set_mtime(path: &Path, secs_after_epoch: u64) {
	let file = fs::File::options().write(true).open(path).unwrap();
	file.set_modified(SystemTime::UNIX_EPOCH + Duration::from_secs(secs_after_epoch)).unwrap();
}

fn ids(entries: &[ClaudeChatEntry]) -> Vec<&str> {
	entries.iter().map(|e| e.chat_id.as_str()).collect()
}

fn vault() -> TempDir {
	tempdir().expect("tmpdir")
}

#[test]
fn write_creates_the_folder_and_read_returns_the_content() {
	let tmp = vault();
	write(tmp.path(), ID_A, "{\"version\":1}").expect("write");

	assert_eq!(fs::read_to_string(chats_dir(tmp.path()).join(format!("{ID_A}.json"))).unwrap(), "{\"version\":1}");
	assert_eq!(read(tmp.path(), ID_A), Ok(Some("{\"version\":1}".to_string())));
}

#[test]
fn write_replaces_the_file_and_leaves_no_temp_file() {
	let tmp = vault();
	write(tmp.path(), ID_A, "first").expect("write");
	write(tmp.path(), ID_A, "second").expect("write");

	assert_eq!(read(tmp.path(), ID_A), Ok(Some("second".to_string())));
	let names: Vec<String> = fs::read_dir(chats_dir(tmp.path()))
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().to_string())
		.collect();
	assert_eq!(names, vec![format!("{ID_A}.json")]);
}

#[test]
fn read_is_none_only_when_the_file_is_not_there() {
	let tmp = vault();
	assert_eq!(read(tmp.path(), ID_A), Ok(None));

	fs::create_dir_all(chats_dir(tmp.path())).unwrap();
	assert_eq!(read(tmp.path(), ID_A), Ok(None));
}

#[test]
fn read_reports_invalid_utf8_and_other_failures_as_errors() {
	let tmp = vault();
	let dir = chats_dir(tmp.path());
	fs::create_dir_all(&dir).unwrap();
	fs::write(dir.join(format!("{ID_A}.json")), [b'{', 0xff, b'}']).unwrap();
	assert!(read(tmp.path(), ID_A).is_err());

	// A folder where the file should be cannot be read, which does not say it is not there.
	fs::create_dir_all(dir.join(format!("{ID_B}.json"))).unwrap();
	assert!(read(tmp.path(), ID_B).is_err());

	// A vault that is gone, such as an unmounted volume, has no "no chat" answer.
	assert!(read(&tmp.path().join("missing"), ID_A).is_err());
}

#[test]
fn every_command_refuses_an_id_that_is_not_a_canonical_uuid() {
	let tmp = vault();
	fs::write(tmp.path().join("x.json"), "outside the chats folder").unwrap();
	let upper = ID_A.to_uppercase();
	let simple = ID_A.replace('-', "");
	let braced = format!("{{{ID_A}}}");
	let urn = format!("urn:uuid:{ID_A}");
	let bad = ["", "x", "..", "../../x", "a/b", upper.as_str(), simple.as_str(), braced.as_str(), urn.as_str()];

	for id in bad {
		let expected = format!("Invalid chat id: {id}");
		assert_eq!(write(tmp.path(), id, "x"), Err(expected.clone()));
		assert_eq!(read(tmp.path(), id), Err(expected));
	}
	assert!(!tmp.path().join(".kokobrain").exists());
}

#[test]
fn list_is_empty_when_the_folder_is_missing() {
	let tmp = vault();
	assert_eq!(claude_chat_list(vault_str(tmp.path())), Ok(Vec::new()));
}

#[test]
fn list_errors_when_the_vault_is_gone() {
	let tmp = vault();
	assert!(claude_chat_list(vault_str(&tmp.path().join("missing"))).is_err());
}

#[test]
fn list_gives_the_chats_newest_first_with_their_modification_time() {
	let tmp = vault();
	write(tmp.path(), ID_A, "a").unwrap();
	write(tmp.path(), ID_B, "b").unwrap();
	let dir = chats_dir(tmp.path());
	set_mtime(&dir.join(format!("{ID_A}.json")), 2_000);
	set_mtime(&dir.join(format!("{ID_B}.json")), 1_000);

	let entries = claude_chat_list(vault_str(tmp.path())).unwrap();
	assert_eq!(ids(&entries), vec![ID_A, ID_B]);
	assert_eq!(entries[0].modified_ms, 2_000_000);
	assert_eq!(entries[1].modified_ms, 1_000_000);

	set_mtime(&dir.join(format!("{ID_B}.json")), 3_000);
	assert_eq!(ids(&claude_chat_list(vault_str(tmp.path())).unwrap()), vec![ID_B, ID_A]);
}

#[test]
fn list_skips_anything_not_named_after_a_chat_id() {
	let tmp = vault();
	write(tmp.path(), ID_A, "a").unwrap();
	let dir = chats_dir(tmp.path());
	let upper = ID_A.to_uppercase();
	for name in [
		format!("{ID_B}.json.tmp-123-0"),
		format!("{upper}.json"),
		format!("{ID_B}.txt"),
		"notes.json".to_string(),
		".DS_Store".to_string(),
	] {
		fs::write(dir.join(name), "x").unwrap();
	}
	fs::create_dir_all(dir.join(format!("{ID_B}.json"))).unwrap();

	assert_eq!(ids(&claude_chat_list(vault_str(tmp.path())).unwrap()), vec![ID_A]);
}
