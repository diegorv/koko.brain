use kokobrain_lib::utils::resource_usage::{cpu_usage, memory_usage, EmbedPass};
use std::hint::black_box;
use std::time::{Duration, Instant};

/// Spins the calling thread for `wall` of wall time.
fn spin_for(wall: Duration) -> Duration {
	let start = Instant::now();
	let mut x: u64 = 0;
	while start.elapsed() < wall {
		x = black_box(x.wrapping_mul(6364136223846793005).wrapping_add(1));
	}
	start.elapsed()
}

#[cfg(unix)]
#[test]
fn cpu_time_is_non_decreasing_and_counts_a_spin_in_real_time_units() {
	let before = cpu_usage().expect("getrusage works on unix");
	let wall = spin_for(Duration::from_millis(100));
	let after = cpu_usage().expect("getrusage works on unix");

	assert!(after.user >= before.user, "user time must not go backwards");
	assert!(after.system >= before.system, "system time must not go backwards");
	assert!(after.major_faults >= before.major_faults, "fault count must not go backwards");

	let cpu = after.total() - before.total();
	// RUSAGE_SELF counts every thread of this test process, so the upper
	// bound allows each core to have been busy for the whole spin. A unit
	// error (us read as ms, Mach ticks read as ns) is off by 40x or more.
	let cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1) as u32;
	// The floor is loose because a loaded runner can deschedule the
	// spinning thread for part of the spin.
	assert!(
		cpu >= wall / 10,
		"a {wall:?} spin must cost at least a tenth of that in CPU time, got {cpu:?}"
	);
	assert!(cpu <= wall * cores * 2, "CPU {cpu:?} exceeds {cores} cores busy for {wall:?}");
}

#[cfg(target_os = "macos")]
#[test]
fn memory_usage_reports_resident_and_footprint_bytes() {
	let mem = memory_usage().expect("proc_pid_rusage works on macOS");
	// A running test binary holds at least a megabyte, and a unit error
	// (pages or KB read as bytes) would land far below that.
	assert!(mem.resident_bytes > 1 << 20, "resident {} B", mem.resident_bytes);
	assert!(mem.phys_footprint_bytes > 1 << 20, "footprint {} B", mem.phys_footprint_bytes);
}

#[cfg(not(target_os = "macos"))]
#[test]
fn memory_usage_is_none_off_macos() {
	assert!(memory_usage().is_none());
}

#[test]
fn embed_pass_line_names_wall_cpu_and_faults() {
	let pass = EmbedPass::start();
	spin_for(Duration::from_millis(20));
	let line = pass.finish();
	assert!(line.starts_with("wall "), "{line}");
	if cfg!(unix) {
		assert!(line.contains(" cpu "), "{line}");
		assert!(line.contains(" majflt +"), "{line}");
	}
	if cfg!(target_os = "macos") {
		assert!(line.contains(" footprint "), "{line}");
	}
}
