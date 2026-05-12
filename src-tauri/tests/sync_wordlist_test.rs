use kokobrain_lib::sync::wordlist::{
	generate_passphrase, is_known_word, normalize, PassphraseError, PASSPHRASE_WORD_COUNT,
	WORDLIST_SIZE,
};

#[test]
fn wordlist_has_2048_entries() {
	// Sanity: the BIP-39 English wordlist is required to be exactly 2048 words.
	assert_eq!(WORDLIST_SIZE, 2048);
}

#[test]
fn passphrase_word_count_is_seven() {
	// Sanity: 7 BIP-39 words give ~77.5 bits of entropy.
	assert_eq!(PASSPHRASE_WORD_COUNT, 7);
}

#[test]
fn is_known_word_recognises_canonical_entries() {
	assert!(is_known_word("abandon"), "abandon is the first BIP-39 word");
	assert!(is_known_word("zoo"), "zoo is the last BIP-39 word");
	assert!(is_known_word("ability"));
}

#[test]
fn is_known_word_rejects_uppercase() {
	// Case-sensitive by design — callers should lowercase first.
	assert!(!is_known_word("Abandon"));
	assert!(!is_known_word("ABANDON"));
}

#[test]
fn is_known_word_rejects_non_wordlist_entries() {
	assert!(!is_known_word("kokobrain"));
	assert!(!is_known_word("xyzqq"));
	assert!(!is_known_word(""));
	assert!(!is_known_word("foo bar"));
}

#[test]
fn generate_passphrase_returns_exactly_seven_words() {
	let pp = generate_passphrase();
	assert_eq!(pp.len(), PASSPHRASE_WORD_COUNT);
}

#[test]
fn generated_words_are_all_in_wordlist() {
	for _ in 0..20 {
		let pp = generate_passphrase();
		for word in &pp {
			assert!(
				is_known_word(word),
				"generated word {word:?} must be in BIP-39 wordlist"
			);
		}
	}
}

#[test]
fn generate_passphrase_has_entropy() {
	// Statistical sanity: across 30 generations we should rarely produce two
	// identical passphrases. P(collision) per draw is ~(2048^-7) which is
	// vanishingly small; observing two identical 7-word passphrases in 30
	// draws would suggest the RNG is broken.
	let mut seen = std::collections::HashSet::new();
	for _ in 0..30 {
		let pp = generate_passphrase().join("-");
		assert!(
			seen.insert(pp.clone()),
			"unexpected collision in generated passphrases: {pp}"
		);
	}
}

#[test]
fn normalize_accepts_canonical_hyphen_form() {
	let pp = "abandon-ability-able-about-above-absent-absorb";
	assert_eq!(normalize(pp).unwrap(), pp);
}

#[test]
fn normalize_accepts_whitespace_separator() {
	let result = normalize("abandon ability able about above absent absorb").unwrap();
	assert_eq!(result, "abandon-ability-able-about-above-absent-absorb");
}

#[test]
fn normalize_accepts_mixed_separators() {
	let result = normalize("abandon-ability able  about\tabove absent-absorb").unwrap();
	assert_eq!(result, "abandon-ability-able-about-above-absent-absorb");
}

#[test]
fn normalize_lowercases_input() {
	let result = normalize("ABANDON Ability ABLE about ABOVE absent absorb").unwrap();
	assert_eq!(result, "abandon-ability-able-about-above-absent-absorb");
}

#[test]
fn normalize_trims_leading_and_trailing_whitespace() {
	let result = normalize("   abandon-ability-able-about-above-absent-absorb   ").unwrap();
	assert_eq!(result, "abandon-ability-able-about-above-absent-absorb");
}

#[test]
fn normalize_rejects_too_few_words() {
	let err = normalize("abandon-ability-able-about-above-absent").unwrap_err();
	assert_eq!(
		err,
		PassphraseError::WrongWordCount {
			expected: 7,
			got: 6,
		}
	);
}

#[test]
fn normalize_rejects_too_many_words() {
	let err = normalize("abandon ability able about above absent absorb abstract").unwrap_err();
	assert_eq!(
		err,
		PassphraseError::WrongWordCount {
			expected: 7,
			got: 8,
		}
	);
}

#[test]
fn normalize_rejects_empty() {
	let err = normalize("").unwrap_err();
	assert_eq!(err, PassphraseError::Empty);
	let err = normalize("   \t\n  ").unwrap_err();
	assert_eq!(err, PassphraseError::Empty);
}

#[test]
fn normalize_rejects_unknown_word() {
	// "kokobrain" is not in the BIP-39 wordlist.
	let err =
		normalize("abandon-ability-able-about-above-absent-kokobrain").unwrap_err();
	assert_eq!(err, PassphraseError::UnknownWord("kokobrain".to_string()));
}

#[test]
fn normalize_reports_first_unknown_word() {
	// When several words are unknown, the first encountered is reported.
	let err = normalize("foo bar baz qux quux corge grault").unwrap_err();
	assert_eq!(err, PassphraseError::UnknownWord("foo".to_string()));
}

#[test]
fn normalize_drops_repeated_separators() {
	// "abandon--ability" with a double hyphen should still parse as two words.
	// Combined with 5 more words, we get exactly 7.
	let result = normalize("abandon--ability   able about-above-absent-absorb").unwrap();
	assert_eq!(result, "abandon-ability-able-about-above-absent-absorb");
}

#[test]
fn normalize_handles_nfd_input() {
	// User pastes pre-composed (NFC, "café") or decomposed (NFD, "cafe\u{0301}")
	// characters — neither is a BIP-39 word, but the normaliser should
	// surface them as UnknownWord rather than panicking or duplicating bytes.
	let input = "cafe\u{0301} ability able about above absent absorb";
	match normalize(input).unwrap_err() {
		PassphraseError::UnknownWord(w) => {
			// After NFC the first word is "café" (4 chars, no combining), and
			// reporting it as UnknownWord is the expected behaviour.
			assert!(
				w.starts_with("caf"),
				"expected the first word to surface as UnknownWord, got {w:?}"
			);
		}
		other => panic!("expected UnknownWord, got {other:?}"),
	}
}

#[test]
fn normalize_output_is_what_spake2_will_see() {
	// The exact byte sequence returned by `normalize` is what gets fed to
	// SPAKE2 as the shared secret. Two inputs that normalise to the same
	// string MUST produce byte-identical outputs — otherwise pairing would
	// silently fail for users who type slightly differently on each side.
	let a = normalize("ABANDON-ability ABLE about-above absent absorb").unwrap();
	let b = normalize("abandon ability  able\tabout-above-absent-absorb").unwrap();
	assert_eq!(a.as_bytes(), b.as_bytes());
}
