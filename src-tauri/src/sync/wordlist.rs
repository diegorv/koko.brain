//! Diceware passphrase generation and validation for LAN sync pairing.
//!
//! Uses the BIP-39 English wordlist (2048 words, ~11 bits per word). A 7-word
//! passphrase carries ~77 bits of entropy — equivalent to the EFF Large
//! Wordlist 6-word recommendation. Words are pulled at random from
//! `bip39::Language::English.word_list()` with reposition (independent draws).
//!
//! The pairing flow generates the passphrase on the host vault and the user
//! types it on the joining vault. The joining side calls `normalize` to
//! sanitise the input before handing the result to SPAKE2.

use bip39::Language;
use rand::RngExt;
use unicode_normalization::UnicodeNormalization;

/// Number of words in a pairing passphrase.
pub const PASSPHRASE_WORD_COUNT: usize = 7;

/// Number of words in the BIP-39 English wordlist.
pub const WORDLIST_SIZE: usize = 2048;

/// Errors returned by [`normalize`] when the user-provided passphrase cannot
/// be turned into a canonical, validated form.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PassphraseError {
	/// Input was empty after normalisation.
	Empty,
	/// Input contained a different number of words than [`PASSPHRASE_WORD_COUNT`].
	WrongWordCount { expected: usize, got: usize },
	/// A word was not present in the BIP-39 English wordlist.
	UnknownWord(String),
}

impl core::fmt::Display for PassphraseError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Empty => write!(f, "passphrase is empty"),
			Self::WrongWordCount { expected, got } => {
				write!(f, "expected {expected} words, got {got}")
			}
			Self::UnknownWord(w) => write!(f, "unknown word: {w:?}"),
		}
	}
}

impl std::error::Error for PassphraseError {}

/// Returns the BIP-39 English wordlist (always 2048 entries, lowercase ASCII).
fn wordlist() -> &'static [&'static str; WORDLIST_SIZE] {
	Language::English.word_list()
}

/// Returns `true` if `word` is exactly a BIP-39 English wordlist entry.
///
/// Case-sensitive on purpose — callers should lowercase first if needed.
/// [`normalize`] handles that for end-user input.
pub fn is_known_word(word: &str) -> bool {
	Language::English.find_word(word).is_some()
}

/// Generates a fresh passphrase as an array of [`PASSPHRASE_WORD_COUNT`] words.
///
/// Uses [`rand::rng`] (the OS-seeded thread RNG) and draws each index
/// independently — duplicates are statistically possible but rare
/// (~0.34% chance of any two matching in a 7-word draw).
pub fn generate_passphrase() -> [String; PASSPHRASE_WORD_COUNT] {
	let mut rng = rand::rng();
	let list = wordlist();
	std::array::from_fn(|_| list[rng.random_range(0..WORDLIST_SIZE)].to_string())
}

/// Normalises end-user passphrase input into the canonical hyphenated form
/// that callers feed into SPAKE2.
///
/// Steps, in order:
/// 1. Unicode NFC normalisation (so visually identical strings hash the same).
/// 2. Lowercase the entire string.
/// 3. Split on whitespace OR `-` (so `"foo bar"`, `"foo-bar"`, `"foo - bar"`
///    all parse identically).
/// 4. Drop empty segments produced by repeated separators.
/// 5. Require exactly [`PASSPHRASE_WORD_COUNT`] words; reject otherwise.
/// 6. Each word must be a BIP-39 English wordlist entry.
///
/// Returns the canonical `"w1-w2-w3-w4-w5-w6-w7"` form on success — this is
/// the exact byte sequence the caller passes to SPAKE2 as the shared secret.
pub fn normalize(input: &str) -> Result<String, PassphraseError> {
	let nfc: String = input.nfc().collect();
	let lowered = nfc.to_lowercase();
	let trimmed = lowered.trim();
	if trimmed.is_empty() {
		return Err(PassphraseError::Empty);
	}
	let words: Vec<&str> = trimmed
		.split(|c: char| c == '-' || c.is_whitespace())
		.filter(|s| !s.is_empty())
		.collect();
	if words.len() != PASSPHRASE_WORD_COUNT {
		return Err(PassphraseError::WrongWordCount {
			expected: PASSPHRASE_WORD_COUNT,
			got: words.len(),
		});
	}
	for w in &words {
		if !is_known_word(w) {
			return Err(PassphraseError::UnknownWord((*w).to_string()));
		}
	}
	Ok(words.join("-"))
}
