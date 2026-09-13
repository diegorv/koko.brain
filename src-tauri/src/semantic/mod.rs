//! Semantic search. The pure pieces (chunking, quantisation, filtering,
//! result types, cache stats) compile everywhere and back the FTS / hybrid
//! code paths; the ONNX-backed engine (`embedder`, `model`, `reranker`) is
//! desktop-only behind the `semantic` cfg (see build.rs).

pub mod cache_stats;
pub mod chunker;
#[cfg(semantic)]
pub mod embedder;
pub mod filtering;
#[cfg(semantic)]
pub mod model;
pub mod quantize;
#[cfg(semantic)]
pub mod reranker;
pub mod types;
