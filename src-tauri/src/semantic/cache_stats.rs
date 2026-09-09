//! Resident-memory estimate for the in-memory embedding cache
//! (`SEARCH_CACHE` in `commands/semantic.rs`).
//!
//! The cache holds every chunk with its embedding deserialized to `Vec<f32>`
//! — 4 KB per chunk at 1024 dimensions before any text — and it has no idle
//! unload path, unlike the ONNX models. Before deciding whether that
//! footprint justifies quantization, measure it: this module turns the
//! per-chunk sizes into one log line at cache load. Pure arithmetic, no I/O,
//! so the numbers the log prints are unit-tested here.

/// Per-chunk sizes the caller reads off its cache entry.
pub struct ChunkFootprint {
	/// Number of `f32` components in the embedding.
	pub embedding_len: usize,
	/// Bytes of heap text: content, key, path, heading and parent headings.
	pub text_bytes: usize,
	/// Fixed struct bytes (the cache entry itself plus one `String` header
	/// per parent heading).
	pub struct_bytes: usize,
}

/// Aggregate estimate over the whole cache.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Default)]
pub struct CacheFootprint {
	/// Number of chunks measured.
	pub chunks: usize,
	/// Bytes held by embedding vectors (`embedding_len * 4` each).
	pub vector_bytes: usize,
	/// Bytes held by text buffers.
	pub text_bytes: usize,
	/// Bytes held by struct and `String` headers.
	pub overhead_bytes: usize,
}

impl CacheFootprint {
	/// Sum of the three components.
	pub fn total_bytes(&self) -> usize {
		self.vector_bytes + self.text_bytes + self.overhead_bytes
	}

	/// One-line summary for the load log, e.g.
	/// `~352.4 MB (vectors 348.2 MB, text 3.7 MB, overhead 0.5 MB)`.
	pub fn describe(&self) -> String {
		format!(
			"~{} (vectors {}, text {}, overhead {})",
			format_mb(self.total_bytes()),
			format_mb(self.vector_bytes),
			format_mb(self.text_bytes),
			format_mb(self.overhead_bytes)
		)
	}
}

/// Formats a byte count as `x.y MB` (decimal megabytes, one decimal).
pub fn format_mb(bytes: usize) -> String {
	format!("{:.1} MB", bytes as f64 / 1_000_000.0)
}

/// Sums per-chunk footprints into a `CacheFootprint`.
pub fn estimate_footprint<I>(items: I) -> CacheFootprint
where
	I: IntoIterator<Item = ChunkFootprint>,
{
	let mut total = CacheFootprint::default();
	for item in items {
		total.chunks += 1;
		total.vector_bytes += item.embedding_len * std::mem::size_of::<f32>();
		total.text_bytes += item.text_bytes;
		total.overhead_bytes += item.struct_bytes;
	}
	total
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn empty_cache_is_all_zero() {
		let fp = estimate_footprint(Vec::<ChunkFootprint>::new());
		assert_eq!(fp, CacheFootprint::default());
		assert_eq!(fp.total_bytes(), 0);
		assert_eq!(fp.describe(), "~0.0 MB (vectors 0.0 MB, text 0.0 MB, overhead 0.0 MB)");
	}

	#[test]
	fn single_chunk_arithmetic() {
		let fp = estimate_footprint(vec![ChunkFootprint {
			embedding_len: 1024,
			text_bytes: 3_000,
			struct_bytes: 200,
		}]);
		assert_eq!(fp.chunks, 1);
		assert_eq!(fp.vector_bytes, 4_096);
		assert_eq!(fp.text_bytes, 3_000);
		assert_eq!(fp.overhead_bytes, 200);
		assert_eq!(fp.total_bytes(), 7_296);
	}

	#[test]
	fn many_chunks_sum_and_vectors_dominate_at_1024_dims() {
		// 85k chunks at 1024 dims: the finding 5 arithmetic.
		let fp = estimate_footprint((0..85_000).map(|_| ChunkFootprint {
			embedding_len: 1024,
			text_bytes: 800,
			struct_bytes: 160,
		}));
		assert_eq!(fp.chunks, 85_000);
		assert_eq!(fp.vector_bytes, 85_000 * 4_096);
		assert!(fp.vector_bytes > fp.text_bytes + fp.overhead_bytes);
		assert_eq!(format_mb(fp.vector_bytes), "348.2 MB");
	}

	#[test]
	fn describe_rounds_to_one_decimal() {
		let fp = CacheFootprint {
			chunks: 1,
			vector_bytes: 1_250_000,
			text_bytes: 49_999,
			overhead_bytes: 0,
		};
		assert_eq!(fp.describe(), "~1.3 MB (vectors 1.2 MB, text 0.0 MB, overhead 0.0 MB)");
	}

	#[test]
	fn zero_length_embedding_contributes_no_vector_bytes() {
		let fp = estimate_footprint(vec![ChunkFootprint {
			embedding_len: 0,
			text_bytes: 10,
			struct_bytes: 10,
		}]);
		assert_eq!(fp.vector_bytes, 0);
		assert_eq!(fp.total_bytes(), 20);
	}
}
