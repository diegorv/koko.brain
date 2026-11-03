//! Plans a single-file semantic update from the file's stored chunk rows and
//! its fresh chunks, without touching the model or the database.
//!
//! Chunk keys carry the absolute `line_start` (`path#heading-line`), so a
//! newline above a section re-keys every later chunk while its
//! `content_hash` (the hash of the `embed_text()` projection) stays the same.
//! Matching by key alone would re-embed all of them; matching by hash reuses
//! the stored vector. That is as safe as the existing same-key skip: an
//! embed-recipe or model change does not change `content_hash` for either,
//! and the startup build clears every chunk when the model hash changes.

use std::collections::{BTreeMap, HashMap, HashSet};

use crate::semantic::types::Chunk;

/// What a single-file update must write.
pub struct UpdatePlan<'a> {
	/// Chunks whose text matches no stored row of the file: run the model.
	pub embed: Vec<&'a Chunk>,
	/// Chunks stored under a different key (or whose key now holds other
	/// text) with the same hash: copy the vector of the stored row whose key
	/// is the `String`.
	pub reuse: Vec<(&'a Chunk, String)>,
	/// Stored keys the fresh chunks no longer produce, sorted.
	pub delete: Vec<String>,
}

impl UpdatePlan<'_> {
	/// True when every fresh chunk is stored under its own key with its own
	/// hash and no stored key is stale.
	pub fn is_noop(&self) -> bool {
		self.embed.is_empty() && self.reuse.is_empty() && self.delete.is_empty()
	}
}

/// Plans the update of one file. `existing` maps each stored key of the file
/// to its `content_hash`; `chunks` are the file's fresh chunks.
///
/// A chunk whose key is stored with the same hash needs no write. Otherwise a
/// stored row with the same hash is its reuse source (the smallest key when
/// several match, so the plan is deterministic); with none, it is embedded.
pub fn plan_file_update<'a>(existing: &HashMap<String, String>, chunks: &'a [Chunk]) -> UpdatePlan<'a> {
	let mut source_by_hash: HashMap<&str, &str> = HashMap::new();
	let sorted: BTreeMap<&str, &str> = existing.iter().map(|(k, h)| (k.as_str(), h.as_str())).collect();
	for (key, hash) in &sorted {
		source_by_hash.entry(hash).or_insert(key);
	}

	let mut embed = Vec::new();
	let mut reuse = Vec::new();
	for chunk in chunks {
		if existing.get(&chunk.key) == Some(&chunk.content_hash) {
			continue;
		}
		match source_by_hash.get(chunk.content_hash.as_str()) {
			Some(source) => reuse.push((chunk, source.to_string())),
			None => embed.push(chunk),
		}
	}

	let new_keys: HashSet<&str> = chunks.iter().map(|c| c.key.as_str()).collect();
	let delete = sorted
		.keys()
		.filter(|k| !new_keys.contains(*k))
		.map(|k| k.to_string())
		.collect();

	UpdatePlan { embed, reuse, delete }
}
