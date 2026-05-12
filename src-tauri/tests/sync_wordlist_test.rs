//! Integration tests for `sync::wordlist`: BIP-39 list shape +
//! `six_words_from_bytes` determinism / distribution / membership.

use kokobrain_lib::sync::wordlist::{
	six_words_from_bytes, BIP39_WORDS, SIX_WORD_COUNT, WORDLIST_SIZE,
};

#[test]
fn wordlist_has_exactly_2048_entries() {
	assert_eq!(BIP39_WORDS.len(), WORDLIST_SIZE);
	assert_eq!(WORDLIST_SIZE, 2048);
}

#[test]
fn wordlist_entries_are_non_empty_ascii_lowercase() {
	for (i, w) in BIP39_WORDS.iter().enumerate() {
		assert!(!w.is_empty(), "word at index {i} is empty");
		assert!(
			w.chars().all(|c| c.is_ascii_lowercase()),
			"word at index {i} ({w:?}) is not ascii lowercase"
		);
	}
}

#[test]
fn wordlist_is_sorted_lexicographically() {
	for pair in BIP39_WORDS.windows(2) {
		assert!(
			pair[0] < pair[1],
			"wordlist not sorted: {:?} >= {:?}",
			pair[0],
			pair[1]
		);
	}
}

#[test]
fn six_words_returns_six_entries() {
	let seed = [0u8; 32];
	let words = six_words_from_bytes(&seed);
	assert_eq!(words.len(), SIX_WORD_COUNT);
	assert_eq!(SIX_WORD_COUNT, 6);
}

#[test]
fn six_words_is_deterministic_for_same_seed() {
	let seed = [0xAB; 32];
	let a = six_words_from_bytes(&seed);
	let b = six_words_from_bytes(&seed);
	assert_eq!(a, b);
}

#[test]
fn six_words_differs_for_different_seeds() {
	let a = six_words_from_bytes(&[0x00u8; 32]);
	let b = six_words_from_bytes(&[0xFFu8; 32]);
	let c = six_words_from_bytes(&[0x55u8; 32]);
	assert_ne!(a, b);
	assert_ne!(a, c);
	assert_ne!(b, c);
}

#[test]
fn six_words_are_all_in_wordlist() {
	let seeds: [&[u8]; 4] = [
		&[0x00u8; 32],
		&[0xFFu8; 32],
		&[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x11],
		&[0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67, 0x89, 0x99],
	];
	for seed in seeds.iter() {
		let words = six_words_from_bytes(seed);
		for w in words.iter() {
			assert!(
				BIP39_WORDS.as_slice().binary_search(&w.as_str()).is_ok(),
				"produced word {w:?} not in wordlist"
			);
		}
	}
}

#[test]
fn six_words_handles_short_seed_by_zero_padding() {
	// Empty seed must not panic and must produce six valid words.
	let words = six_words_from_bytes(&[]);
	assert_eq!(words.len(), SIX_WORD_COUNT);
	for w in words.iter() {
		assert!(BIP39_WORDS.as_slice().binary_search(&w.as_str()).is_ok());
	}
	// A short seed and a fully-zero-padded seed of length 9 must agree
	// because trailing bytes are treated as zero.
	let short = six_words_from_bytes(&[0x12, 0x34]);
	let padded = six_words_from_bytes(&[0x12, 0x34, 0, 0, 0, 0, 0, 0, 0]);
	assert_eq!(short, padded);
}
