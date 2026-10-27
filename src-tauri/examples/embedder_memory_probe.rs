//! Embedder memory probe.
//!
//! Loads the BGE-M3 ONNX model the way `semantic/embedder.rs` does and
//! replays the batch shapes seen in the 2026-10-27 31 GB incident, logging
//! the process footprint after each `run()`. One process per variant, so
//! `lifetime_max_phys_footprint` is the peak for that variant alone.
//!
//! ```sh
//! cargo run --release --manifest-path src-tauri/Cargo.toml --example embedder_memory_probe -- \
//!   <model_dir> <default|no-pattern|no-arena|both|fixed>
//! ```

use ndarray::Array2;
use ort::session::Session;
use std::path::PathBuf;
use std::time::Instant;

/// Batch shapes `[batch, seq_len]` in the order the incident log produced them.
const INCIDENT_SHAPES: &[(usize, usize)] = &[
	(2, 357),
	(5, 512),
	(8, 287),
	(6, 70),
	(8, 410),
	(3, 295),
	(8, 512),
	(8, 512),
	(8, 512),
];

/// `struct rusage_info_v4` from `<sys/resource.h>`: a 16-byte uuid followed by u64 fields.
#[repr(C)]
struct RusageInfoV4 {
	uuid: [u8; 16],
	fields: [u64; 40],
}

extern "C" {
	fn proc_pid_rusage(pid: i32, flavor: i32, buffer: *mut RusageInfoV4) -> i32;
}

/// Returns (resident, phys_footprint, lifetime_max_phys_footprint) in MB.
fn memory_mb() -> (u64, u64, u64) {
	let mut info = RusageInfoV4 { uuid: [0; 16], fields: [0; 40] };
	// RUSAGE_INFO_V4 = 4
	let rc = unsafe { proc_pid_rusage(std::process::id() as i32, 4, &mut info) };
	assert_eq!(rc, 0, "proc_pid_rusage failed");
	let mb = |v: u64| v / 1_048_576;
	// Field order: ri_resident_size = 6, ri_phys_footprint = 7, ri_lifetime_max_phys_footprint = 28
	(mb(info.fields[6]), mb(info.fields[7]), mb(info.fields[28]))
}

fn main() {
	let args: Vec<String> = std::env::args().collect();
	if args.len() != 3 {
		eprintln!("usage: embedder_memory_probe <model_dir> <default|no-pattern|no-arena|both|fixed>");
		std::process::exit(2);
	}
	let model_path = PathBuf::from(&args[1]).join("model.onnx");
	let variant = args[2].as_str();

	let env = ort::init().build().expect("ort env");
	let threads = std::thread::available_parallelism().map(|n| n.get().min(8)).unwrap_or(4);
	let mut builder = Session::builder(&env).expect("builder").with_intra_threads(threads).expect("threads");
	if matches!(variant, "no-pattern" | "both") {
		builder = builder.with_memory_pattern(false).expect("memory pattern");
	}
	if matches!(variant, "no-arena" | "both") {
		builder = builder.with_config_entry("session.enable_cpu_mem_arena", "0").expect("arena");
	}
	let mut session = builder.commit_from_file(&model_path).expect("load model");

	let (rss, fp, max) = memory_mb();
	println!("variant={variant} loaded rss={rss}MB footprint={fp}MB max={max}MB");

	for &(batch, seq) in INCIDENT_SHAPES {
		let (batch, seq) = if variant == "fixed" { (8, 512) } else { (batch, seq) };
		// Token id 1000 everywhere: the shape drives memory, not the values.
		let input_ids = Array2::<i64>::from_elem((batch, seq), 1000);
		let attention_mask = Array2::<i64>::ones((batch, seq));
		let started = Instant::now();
		let outputs = session
			.run(ort::inputs![
				"input_ids" => ort::value::Tensor::from_array(input_ids).expect("ids"),
				"attention_mask" => ort::value::Tensor::from_array(attention_mask).expect("mask"),
			])
			.expect("inference");
		drop(outputs);
		let (rss, fp, max) = memory_mb();
		println!(
			"shape=[{batch},{seq}] ms={} rss={rss}MB footprint={fp}MB max={max}MB",
			started.elapsed().as_millis()
		);
	}
}
