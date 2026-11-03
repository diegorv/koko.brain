use kokobrain_lib::semantic::types::Chunk;
use kokobrain_lib::semantic::update_plan::plan_file_update;
use std::collections::HashMap;

fn chunk(key: &str, hash: &str) -> Chunk {
	Chunk {
		key: key.into(),
		source_path: "note.md".into(),
		content: format!("body of {key}"),
		heading: None,
		parent_headings: vec![],
		line_start: 1,
		line_end: 1,
		content_hash: hash.into(),
	}
}

fn existing(rows: &[(&str, &str)]) -> HashMap<String, String> {
	rows.iter().map(|(k, h)| (k.to_string(), h.to_string())).collect()
}

fn keys<'a>(chunks: &[&'a Chunk]) -> Vec<&'a str> {
	chunks.iter().map(|c| c.key.as_str()).collect()
}

#[test]
fn re_keyed_chunk_with_matching_hash_is_reused_and_changed_one_is_embedded() {
	// A newline above "intro" shifted every later line: "body-5" became
	// "body-6" with the same text, and "tail-9" became "tail-10" with new text.
	let old = existing(&[("note.md#intro-1", "h-intro"), ("note.md#body-5", "h-body"), ("note.md#tail-9", "h-tail")]);
	let new = vec![
		chunk("note.md#intro-1", "h-intro"),
		chunk("note.md#body-6", "h-body"),
		chunk("note.md#tail-10", "h-tail-edited"),
	];

	let plan = plan_file_update(&old, &new);

	let reused: Vec<(&str, &str)> = plan.reuse.iter().map(|(c, src)| (c.key.as_str(), src.as_str())).collect();
	assert_eq!(reused, vec![("note.md#body-6", "note.md#body-5")]);
	assert_eq!(keys(&plan.embed), vec!["note.md#tail-10"]);
	assert_eq!(plan.delete, vec!["note.md#body-5".to_string(), "note.md#tail-9".to_string()]);
	assert!(!plan.is_noop());
}

#[test]
fn unchanged_keys_and_hashes_are_a_noop() {
	let old = existing(&[("note.md#a-1", "h1"), ("note.md#b-4", "h2")]);
	let new = vec![chunk("note.md#a-1", "h1"), chunk("note.md#b-4", "h2")];

	let plan = plan_file_update(&old, &new);

	assert!(plan.embed.is_empty() && plan.reuse.is_empty() && plan.delete.is_empty());
	assert!(plan.is_noop());
}

#[test]
fn no_stored_rows_embeds_every_chunk() {
	let new = vec![chunk("note.md#a-1", "h1"), chunk("note.md#b-4", "h2")];

	let plan = plan_file_update(&HashMap::new(), &new);

	assert_eq!(keys(&plan.embed), vec!["note.md#a-1", "note.md#b-4"]);
	assert!(plan.reuse.is_empty() && plan.delete.is_empty());
}

#[test]
fn same_key_with_changed_hash_reuses_another_row_with_that_hash() {
	// Two sections swapped text: each key now holds the other's old text.
	let old = existing(&[("note.md#a-1", "h1"), ("note.md#b-4", "h2")]);
	let new = vec![chunk("note.md#a-1", "h2"), chunk("note.md#b-4", "h1")];

	let plan = plan_file_update(&old, &new);

	let reused: Vec<(&str, &str)> = plan.reuse.iter().map(|(c, src)| (c.key.as_str(), src.as_str())).collect();
	assert_eq!(reused, vec![("note.md#a-1", "note.md#b-4"), ("note.md#b-4", "note.md#a-1")]);
	assert!(plan.embed.is_empty() && plan.delete.is_empty());
}

#[test]
fn duplicate_stored_hashes_pick_the_smallest_source_key() {
	let old = existing(&[("note.md#z-9", "h1"), ("note.md#m-5", "h1")]);
	let new = vec![chunk("note.md#new-2", "h1")];

	let plan = plan_file_update(&old, &new);

	assert_eq!(plan.reuse[0].1, "note.md#m-5");
}
