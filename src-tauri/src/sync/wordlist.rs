//! BIP-39 English wordlist + helpers for LAN sync pairing.
//!
//! Used by [`crate::sync::identity`] to render Ed25519 public-key
//! fingerprints as six BIP-39 words (~66 bits of identity) so users can
//! compare two devices side-by-side during pairing without typing hex.
//!
//! The list is the public-domain BIP-39 English wordlist (2048 entries,
//! one word per line, sorted lexicographically) embedded at compile time
//! from `wordlist-en.txt`. Parsing happens once on first access through
//! [`BIP39_WORDS`]; subsequent reads are pointer-cheap.

use std::sync::LazyLock;

/// Number of words in the BIP-39 English wordlist.
pub const WORDLIST_SIZE: usize = 2048;

/// Number of words a six-word fingerprint expands to.
pub const SIX_WORD_COUNT: usize = 6;

/// Raw embedded wordlist, one word per line, sorted lexicographically.
/// The file is the public-domain BIP-39 English list.
const WORDLIST_RAW: &str = include_str!("wordlist-en.txt");

/// Parsed BIP-39 English wordlist as 2048 sorted slices into [`WORDLIST_RAW`].
///
/// Initialised on first access. Panics on the first read if the embedded
/// file does not contain exactly [`WORDLIST_SIZE`] non-empty lines — that
/// would be a compile-time bug in the bundled `wordlist-en.txt`, caught
/// the first time any caller touches the static.
pub static BIP39_WORDS: LazyLock<[&'static str; WORDLIST_SIZE]> = LazyLock::new(|| {
	let mut out: [&'static str; WORDLIST_SIZE] = [""; WORDLIST_SIZE];
	let mut idx = 0usize;
	for line in WORDLIST_RAW.lines() {
		assert!(idx < WORDLIST_SIZE, "wordlist-en.txt: too many words");
		out[idx] = line;
		idx += 1;
	}
	assert_eq!(idx, WORDLIST_SIZE, "wordlist-en.txt: wrong word count");
	out
});

/// Deterministically maps the first 66 bits of `seed` to six BIP-39 words.
///
/// The seed is read big-endian: bytes `[0..9]` form a 72-bit value (any
/// missing trailing bytes are treated as zero, so callers may pass a
/// shorter slice without panicking). The top 66 bits of that value are
/// split into six contiguous 11-bit chunks, MSB-first, each used as an
/// index into [`BIP39_WORDS`]. The final 6 bits of byte 8 are discarded.
///
/// The function is pure: identical seeds always produce identical word
/// arrays. Different seeds that differ only in their top 66 bits will
/// produce different word arrays; seeds that differ only in trailing
/// bits past the 66-bit window will produce the same words by design.
pub fn six_words_from_bytes(seed: &[u8]) -> [String; SIX_WORD_COUNT] {
	let mut buf = [0u8; 9];
	let take = seed.len().min(9);
	buf[..take].copy_from_slice(&seed[..take]);
	// Interpret the 9 bytes as a 72-bit big-endian integer in a u128 so
	// we can shift cleanly across byte boundaries.
	let mut v: u128 = 0;
	for &b in &buf {
		v = (v << 8) | b as u128;
	}
	// We now have 72 bits in the low end of `v`. The top 66 are the ones
	// we care about; the bottom 6 are padding to be discarded.
	// Shift the 66-bit window down so chunk 0 lands at bits [55..66].
	let window: u128 = v >> 6; // 66 bits in the low end of `window`.
	let shifts: [u32; SIX_WORD_COUNT] = [55, 44, 33, 22, 11, 0];
	let mask: u128 = 0x7FF; // 11 bits
	std::array::from_fn(|i| {
		let idx = ((window >> shifts[i]) & mask) as usize;
		BIP39_WORDS[idx].to_string()
	})
}
