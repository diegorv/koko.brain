#[cfg(target_os = "macos")]
mod macos {
	use kokobrain_lib::commands::fonts::list_system_fonts;

	#[test]
	fn returns_non_empty_list() {
		let fonts = list_system_fonts().unwrap();
		assert!(!fonts.is_empty(), "should find at least one font family on macOS");
	}

	#[test]
	fn list_is_sorted() {
		let fonts = list_system_fonts().unwrap();
		let mut sorted = fonts.clone();
		sorted.sort_unstable();
		assert_eq!(fonts, sorted, "font list should be sorted alphabetically");
	}

	#[test]
	fn all_entries_are_non_empty() {
		let fonts = list_system_fonts().unwrap();
		for font in &fonts {
			assert!(!font.is_empty(), "font family name should not be empty");
		}
	}

	#[test]
	fn contains_known_system_font() {
		let fonts = list_system_fonts().unwrap();
		// Helvetica is always present on macOS
		assert!(
			fonts.iter().any(|f| f == "Helvetica"),
			"should contain Helvetica (always present on macOS)"
		);
	}
}
