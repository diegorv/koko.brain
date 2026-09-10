//! Resident-memory estimate for the in-memory embedding cache
//! (`SEARCH_CACHE` in `commands/semantic.rs`).
//!
//! The cache holds every chunk with its embedding quantized to int8 plus one
//! f32 scale (`semantic::quantize`) — 1028 bytes per chunk at 1024
//! dimensions before any text, down from 4 KB under the old `Vec<f32>`
//! layout — and it has no idle unload path, unlike the ONNX models. This
//! module turns the per-chunk sizes into one log line at cache load. Pure
//! arithmetic, no I/O, so the numbers the log prints are unit-tested here.

/// Per-chunk sizes the caller reads off its cache entry.
pub struct ChunkFootprint {
	/// Number of components in the embedding (one `i8` each).
	pub embedding_len: usize,
	/// Bytes of heap text: content, key, path, heading and parent headings.
	pub text_bytes: usize,
	/// Fixed struct bytes (the cache entry itself plus one `String` header
	/// per parent heading), **excluding** the entry's inline `scale`:
	/// `estimate_footprint` adds that under `vector_bytes`, so it lands in
	/// the number a reader compares against the old f32 layout. A caller
	/// passing `size_of::<CacheEntry>()` must subtract `size_of::<f32>()`
	/// or the 4 bytes are counted twice.
	pub struct_bytes: usize,
}

/// Aggregate estimate over the whole cache.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Default)]
pub struct CacheFootprint {
	/// Number of chunks measured.
	pub chunks: usize,
	/// Bytes held by embedding vectors: `embedding_len` int8 components plus
	/// the 4-byte per-vector scale.
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
	/// `~91.3 MB (vectors 87.1 MB, text 3.7 MB, overhead 0.5 MB)`.
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
		total.vector_bytes +=
			item.embedding_len * std::mem::size_of::<i8>() + std::mem::size_of::<f32>();
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
		// int8 layout: 1024 * 1 byte + one f32 scale (was 1024 * 4 = 4_096).
		assert_eq!(fp.vector_bytes, 1_028);
		assert_eq!(fp.text_bytes, 3_000);
		assert_eq!(fp.overhead_bytes, 200);
		assert_eq!(fp.total_bytes(), 4_228);
	}

	#[test]
	fn owners_vault_vectors_shrink_from_570_mb_to_143_mb() {
		// The measured vault: 139,360 chunks at 1024 dims. Under the old
		// `Vec<f32>` layout the log reported 570.8 MB of vectors; the int8
		// layout reports 1 byte per dim plus one f32 scale per chunk.
		let chunks = 139_360usize;
		// Overhead per chunk: 188 B measured under the f32 layout
		// (160 B struct + ~28 B of parent-heading `String` headers). The
		// struct grew 32 B — `QuantizedVector` is 32 B where `Vec<f32>` was
		// 24, plus the 24 B `Option<Vec<f32>>` eval-baseline slot — and the
		// caller now subtracts the 4 B scale it reports under vectors: 216.
		let fp = estimate_footprint((0..chunks).map(|_| ChunkFootprint {
			embedding_len: 1024,
			text_bytes: 1_551,
			struct_bytes: 216,
		}));
		assert_eq!(fp.chunks, chunks);
		assert_eq!(fp.vector_bytes, chunks * (1_024 + 4));
		assert_eq!(format_mb(chunks * 1_024), "142.7 MB", "vectors alone");
		assert_eq!(format_mb(chunks * 4), "0.6 MB", "scales alone");
		assert_eq!(format_mb(fp.vector_bytes), "143.3 MB");
		// Text now dominates, which is the point of measuring again.
		assert!(fp.text_bytes > fp.vector_bytes);
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
	fn zero_length_embedding_costs_only_its_scale() {
		// Was `vector_bytes == 0` under the f32 layout. A `QuantizedVector`
		// carries a scale whatever its length, so the floor is now 4 bytes.
		let fp = estimate_footprint(vec![ChunkFootprint {
			embedding_len: 0,
			text_bytes: 10,
			struct_bytes: 10,
		}]);
		assert_eq!(fp.vector_bytes, 4);
		assert_eq!(fp.total_bytes(), 24);
	}
}
