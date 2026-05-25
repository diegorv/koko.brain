//! Frontmatter key alias resolution.
//!
//! Maps alternative spellings of system metadata keys to their canonical form.
//! Called at parse time so downstream consumers always see canonical keys.

use std::collections::HashMap;
use std::sync::LazyLock;

static ALIAS_MAP: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
	let mut m = HashMap::new();
	m.insert("is_a", "type");
	m.insert("is a", "type");
	m.insert("belongs to", "belongs_to");
	m.insert("related to", "related_to");
	m.insert("organized", "_organized");
	m.insert("archived", "_archived");
	m.insert("favorite", "_favorite");
	m.insert("order", "_order");
	m.insert("sort", "_sort");
	m.insert("icon", "_icon");
	m.insert("sidebar_label", "_sidebar_label");
	m.insert("sidebar label", "_sidebar_label");
	m.insert("color", "_color");
	m.insert("template", "_template");
	m.insert("view", "_view");
	m.insert("visible", "_visible");
	m.insert("list_properties_display", "_list_properties_display");
	m
});

/// Returns the canonical key name if the input matches a known alias,
/// otherwise returns the input unchanged.
pub fn canonicalize_key(key: &str) -> &str {
	ALIAS_MAP.get(key).copied().unwrap_or(key)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn known_aliases_resolve() {
		assert_eq!(canonicalize_key("is_a"), "type");
		assert_eq!(canonicalize_key("is a"), "type");
		assert_eq!(canonicalize_key("belongs to"), "belongs_to");
		assert_eq!(canonicalize_key("related to"), "related_to");
		assert_eq!(canonicalize_key("organized"), "_organized");
		assert_eq!(canonicalize_key("archived"), "_archived");
		assert_eq!(canonicalize_key("favorite"), "_favorite");
		assert_eq!(canonicalize_key("order"), "_order");
		assert_eq!(canonicalize_key("sort"), "_sort");
		assert_eq!(canonicalize_key("icon"), "_icon");
		assert_eq!(canonicalize_key("sidebar_label"), "_sidebar_label");
		assert_eq!(canonicalize_key("sidebar label"), "_sidebar_label");
		assert_eq!(canonicalize_key("color"), "_color");
		assert_eq!(canonicalize_key("template"), "_template");
		assert_eq!(canonicalize_key("view"), "_view");
		assert_eq!(canonicalize_key("visible"), "_visible");
		assert_eq!(canonicalize_key("list_properties_display"), "_list_properties_display");
	}

	#[test]
	fn canonical_keys_pass_through() {
		assert_eq!(canonicalize_key("type"), "type");
		assert_eq!(canonicalize_key("belongs_to"), "belongs_to");
		assert_eq!(canonicalize_key("_organized"), "_organized");
		assert_eq!(canonicalize_key("_icon"), "_icon");
	}

	#[test]
	fn unknown_keys_pass_through() {
		assert_eq!(canonicalize_key("title"), "title");
		assert_eq!(canonicalize_key("tags"), "tags");
		assert_eq!(canonicalize_key("custom_field"), "custom_field");
	}
}
