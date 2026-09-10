//! Symmetric int8 quantization for the in-memory embedding cache
//! (`SEARCH_CACHE` in `commands/semantic.rs`).
//!
//! The embedder L2-normalizes every stored vector (`embedder::normalize_embedding`),
//! and the query embedding comes out of the same path, so cosine similarity
//! between them is exactly their dot product — no per-query norm needed.
//! That makes the cache's `Vec<f32>` replaceable by a `Vec<i8>` plus one `f32`
//! scale: 1 byte per dimension instead of 4, ~4x less resident memory on the
//! owner's vault (139,360 chunks, 570.8 MB of vectors) and a denser scan.
//!
//! The DB still stores f32 blobs — quantization happens at cache-load time
//! only, so there is no `EMBED_RECIPE_VERSION` bump and no reindex.
//!
//! The query stays in `f32`: the dot loop reads one `i8` and one `f32` per
//! dimension either way, and leaving the query unquantized keeps the chunk
//! vector as the single source of quantization error (bounded below) instead
//! of two. Quantizing it too would only pay off behind an explicit i32/SIMD
//! accumulate, which the brute-force scan (<20 ms) does not need.
//!
//! Pure arithmetic, no I/O — the error bounds are unit-tested here.

/// A cached embedding stored as int8 with one symmetric per-vector scale.
///
/// `values[i] * scale` reconstructs component `i` to within `scale / 2`.
pub struct QuantizedVector {
	/// Quantized components, each in `[-127, 127]`.
	pub values: Vec<i8>,
	/// Reconstruction step: `absmax / 127`, or `0.0` for an all-zero vector.
	pub scale: f32,
}

/// Largest magnitude an int8 component may take. 127 (not 128) keeps the
/// quantizer symmetric, so a vector and its negation quantize to exact
/// opposites.
const INT8_ABSMAX: f32 = 127.0;

/// Independent accumulators in the dot loop. Eight f32 lanes are two NEON
/// registers, which is what lets the scan run wider than one fadd per cycle.
const DOT_LANES: usize = 8;

impl QuantizedVector {
	/// Quantizes an f32 vector with a symmetric absmax scale.
	///
	/// An all-zero (or empty) vector yields all-zero values and a `0.0` scale,
	/// which scores `0.0` against every query — the same answer
	/// `embedder::cosine_similarity` gave for a zero-magnitude vector.
	pub fn from_f32(vector: &[f32]) -> Self {
		let absmax = vector.iter().fold(0.0f32, |acc, v| acc.max(v.abs()));
		if absmax == 0.0 || !absmax.is_finite() {
			return Self {
				values: vec![0; vector.len()],
				scale: 0.0,
			};
		}
		let scale = absmax / INT8_ABSMAX;
		// Multiply by the reciprocal instead of dividing per element: this
		// runs over every dimension of every chunk while `get_or_load_cache`
		// holds the DB lock, and f32 division throughput is several times
		// worse than multiplication. The extra ~1 ulp (~6e-9 absolute) is far
		// inside the half-step bound the round-trip test asserts.
		let inv = INT8_ABSMAX / absmax;
		let values = vector
			.iter()
			.map(|v| (v * inv).round().clamp(-INT8_ABSMAX, INT8_ABSMAX) as i8)
			.collect();
		Self { values, scale }
	}

	/// Similarity against an f32 query: `dot(query, values) * scale`.
	///
	/// Equals the cosine similarity of the two original vectors (both are
	/// L2-normalized) up to the quantization error bounded in this module's
	/// tests. Returns `0.0` on a dimension mismatch or an empty vector,
	/// matching `embedder::cosine_similarity`'s guards.
	pub fn dot(&self, query: &[f32]) -> f32 {
		if query.len() != self.values.len() || query.is_empty() {
			return 0.0;
		}
		// `DOT_LANES` independent accumulators, not one. Rust forbids FP
		// reassociation, so a single `acc` chains every dimension through one
		// fadd dependency and LLVM cannot vectorize the loop — the scan would
		// stay latency-bound exactly as `cosine_similarity` was, and the
		// memory win would buy no scan time.
		let mut lanes = [0.0f32; DOT_LANES];
		let q_chunks = query.chunks_exact(DOT_LANES);
		let v_chunks = self.values.chunks_exact(DOT_LANES);
		// Remainders must be read before the iterators are consumed.
		let q_tail = q_chunks.remainder();
		let v_tail = v_chunks.remainder();
		for (q, v) in q_chunks.zip(v_chunks) {
			for ((lane, q), v) in lanes.iter_mut().zip(q).zip(v) {
				*lane += q * f32::from(*v);
			}
		}
		let mut acc: f32 = lanes.iter().sum();
		for (q, v) in q_tail.iter().zip(v_tail) {
			acc += q * f32::from(*v);
		}
		acc * self.scale
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	/// Deterministic LCG in `[-1, 1)` — no `rand` dependency in tests.
	fn pseudo_random_unit(dim: usize, seed: u32) -> Vec<f32> {
		let mut state = seed.wrapping_mul(2_654_435_761).wrapping_add(1);
		let mut v: Vec<f32> = (0..dim)
			.map(|_| {
				state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
				(state >> 8) as f32 / (1u32 << 23) as f32 - 1.0
			})
			.collect();
		let norm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
		for x in v.iter_mut() {
			*x /= norm;
		}
		v
	}

	#[test]
	fn round_trip_error_is_at_most_half_a_scale_step() {
		// Round-to-nearest: |v - round(v/scale)*scale| <= scale/2 for every
		// component, and no component clamps because absmax/scale == 127.
		let v = pseudo_random_unit(1024, 7);
		let q = QuantizedVector::from_f32(&v);
		assert_eq!(q.values.len(), 1024);
		for (i, original) in v.iter().enumerate() {
			let restored = f32::from(q.values[i]) * q.scale;
			let err = (original - restored).abs();
			assert!(
				err <= q.scale / 2.0 + f32::EPSILON,
				"component {i}: err {err} exceeds half-step {}",
				q.scale / 2.0
			);
		}
	}

	#[test]
	fn dot_error_stays_inside_the_cauchy_schwarz_bound() {
		// Per-component error is <= scale/2 (test above), so the error vector
		// e = v - v_hat has ||e||_2 <= sqrt(d) * scale/2. The dot-product
		// error is dot(query, e), which by Cauchy-Schwarz is at most
		// ||query|| * ||e||. Both inputs here are unit vectors, so the bound
		// is sqrt(1024) * scale/2 = 16 * scale.
		let dim = 1024;
		for seed in [1u32, 42, 999] {
			let chunk = pseudo_random_unit(dim, seed);
			let query = pseudo_random_unit(dim, seed.wrapping_add(500));
			let q = QuantizedVector::from_f32(&chunk);
			// Compared against the function this type actually replaced at
			// both call sites, not a local dot helper: if
			// `normalize_embedding` ever stops producing unit vectors, the
			// cosine == dot premise breaks here rather than silently in the
			// ranking.
			let exact = crate::semantic::embedder::cosine_similarity(&query, &chunk);
			let approx = q.dot(&query);
			let bound = (dim as f32).sqrt() * q.scale / 2.0;
			assert!(
				(exact - approx).abs() <= bound,
				"seed {seed}: |{exact} - {approx}| exceeds bound {bound}"
			);
			// Sanity: the realistic error is ~1e-4 on unit vectors, well
			// inside the bound. Whether that is small enough to leave the
			// top-k order intact is a recall question, not an arithmetic
			// one — `examples/retrieval_eval.rs` answers it.
			assert!(
				(exact - approx).abs() < 1e-3,
				"seed {seed}: error {} unexpectedly large",
				(exact - approx).abs()
			);
		}
	}

	#[test]
	fn ordering_is_preserved_on_well_separated_vectors() {
		let query = vec![1.0, 0.0, 0.0, 0.0];
		let candidates = [
			vec![0.9_f32, 0.435_889_9, 0.0, 0.0],
			vec![0.6_f32, 0.8, 0.0, 0.0],
			vec![0.2_f32, 0.979_795_9, 0.0, 0.0],
			vec![-0.5_f32, 0.866_025_4, 0.0, 0.0],
		];
		let scores: Vec<f32> = candidates
			.iter()
			.map(|c| QuantizedVector::from_f32(c).dot(&query))
			.collect();
		for pair in scores.windows(2) {
			assert!(
				pair[0] > pair[1],
				"quantized scores must keep the f32 order: {pair:?}"
			);
		}
	}

	#[test]
	fn zero_vector_quantizes_to_zeros_and_scores_zero() {
		let q = QuantizedVector::from_f32(&[0.0, 0.0, 0.0]);
		assert_eq!(q.values, vec![0, 0, 0]);
		assert_eq!(q.scale, 0.0);
		assert_eq!(q.dot(&[1.0, 2.0, 3.0]), 0.0);
	}

	#[test]
	fn all_equal_components_reconstruct_exactly() {
		// Every component sits at absmax, so each maps to 127 and comes back
		// as absmax with no rounding error at all.
		let v = vec![0.25_f32; 8];
		let q = QuantizedVector::from_f32(&v);
		assert_eq!(q.values, vec![127i8; 8]);
		for value in &q.values {
			assert!((f32::from(*value) * q.scale - 0.25).abs() < 1e-6);
		}
		// Negative constants are the exact mirror (symmetric quantizer).
		let neg = QuantizedVector::from_f32(&[-0.25_f32; 8]);
		assert_eq!(neg.values, vec![-127i8; 8]);
	}

	#[test]
	fn empty_and_mismatched_dimensions_score_zero() {
		let q = QuantizedVector::from_f32(&[1.0, 2.0]);
		assert_eq!(q.dot(&[1.0, 2.0, 3.0]), 0.0, "dimension mismatch");
		let empty = QuantizedVector::from_f32(&[]);
		assert!(empty.values.is_empty());
		assert_eq!(empty.dot(&[]), 0.0, "empty vector");
	}

	#[test]
	fn negation_quantizes_to_the_exact_opposite() {
		let v = pseudo_random_unit(64, 3);
		let neg: Vec<f32> = v.iter().map(|x| -x).collect();
		let a = QuantizedVector::from_f32(&v);
		let b = QuantizedVector::from_f32(&neg);
		assert_eq!(a.scale, b.scale);
		for (x, y) in a.values.iter().zip(b.values.iter()) {
			assert_eq!(*x, -*y);
		}
	}
}
