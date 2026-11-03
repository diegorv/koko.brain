//! Process CPU and memory samples for the embedder's debug log.
//!
//! One embed pass can take 20x its usual wall time. A per-pass CPU time,
//! major-fault count and footprint tell CPU starvation (little CPU for the
//! wall time) from paging (major faults climb).
//!
//! CPU time comes from `getrusage(RUSAGE_SELF)`, whose timevals are real
//! time units. `proc_pid_rusage`'s `ri_user_time` / `ri_system_time` are
//! not used for CPU: on Apple silicon they may be Mach ticks, not ns. Its
//! byte counts (`ri_resident_size`, `ri_phys_footprint`) have no such trap.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Once;
use std::time::{Duration, Instant};

use crate::utils::logger::{debug_log, is_debug_enabled};

/// Gap between two periodic memory lines.
const SAMPLE_INTERVAL: Duration = Duration::from_secs(10);

/// CPU time and major page faults of the whole process (every thread).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CpuUsage {
	/// User-mode CPU time.
	pub user: Duration,
	/// Kernel-mode CPU time.
	pub system: Duration,
	/// Page faults that needed I/O (`ru_majflt`).
	pub major_faults: u64,
}

impl CpuUsage {
	/// User plus system CPU time.
	pub fn total(&self) -> Duration {
		self.user + self.system
	}
}

/// Resident size and physical footprint of the process, in bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MemoryUsage {
	/// Resident set size (`ri_resident_size`).
	pub resident_bytes: u64,
	/// Physical footprint (`ri_phys_footprint`), the figure Activity Monitor shows as Memory.
	pub phys_footprint_bytes: u64,
}

/// Reads the process CPU usage, or `None` off unix or when the call fails.
pub fn cpu_usage() -> Option<CpuUsage> {
	#[cfg(unix)]
	{
		// SAFETY: getrusage only writes the zeroed struct we own.
		let mut ru: libc::rusage = unsafe { std::mem::zeroed() };
		if unsafe { libc::getrusage(libc::RUSAGE_SELF, &mut ru) } != 0 {
			return None;
		}
		let tv = |t: libc::timeval| Duration::new(t.tv_sec as u64, (t.tv_usec as u32) * 1000);
		Some(CpuUsage {
			user: tv(ru.ru_utime),
			system: tv(ru.ru_stime),
			major_faults: ru.ru_majflt as u64,
		})
	}
	#[cfg(not(unix))]
	{
		None
	}
}

/// Reads the process memory usage, or `None` off macOS or when the call fails.
pub fn memory_usage() -> Option<MemoryUsage> {
	#[cfg(target_os = "macos")]
	{
		// SAFETY: proc_pid_rusage writes at most a rusage_info_v4 into the
		// zeroed struct we own, for our own pid.
		let mut info: libc::rusage_info_v4 = unsafe { std::mem::zeroed() };
		let rc = unsafe {
			libc::proc_pid_rusage(
				std::process::id() as libc::c_int,
				libc::RUSAGE_INFO_V4,
				&mut info as *mut libc::rusage_info_v4 as *mut libc::rusage_info_t,
			)
		};
		if rc != 0 {
			return None;
		}
		Some(MemoryUsage {
			resident_bytes: info.ri_resident_size,
			phys_footprint_bytes: info.ri_phys_footprint,
		})
	}
	#[cfg(not(target_os = "macos"))]
	{
		None
	}
}

/// Formats bytes as MB with one decimal.
fn mb(bytes: u64) -> String {
	format!("{:.1} MB", bytes as f64 / 1_048_576.0)
}

/// Formats a memory sample as `rss X MB footprint Y MB`.
fn format_memory(m: MemoryUsage) -> String {
	format!("rss {} footprint {}", mb(m.resident_bytes), mb(m.phys_footprint_bytes))
}

/// One-line memory summary: `rss X MB footprint Y MB`, or `memory n/a`.
pub fn describe_memory() -> String {
	match memory_usage() {
		Some(m) => format_memory(m),
		None => "memory n/a".to_string(),
	}
}

/// Measures one embed pass: wall time, CPU time and major faults between
/// `start` and `finish`, plus the footprint at `finish`.
pub struct EmbedPass {
	started: Instant,
	cpu: Option<CpuUsage>,
}

impl EmbedPass {
	/// Samples the clock and CPU usage at the start of a pass.
	pub fn start() -> Self {
		Self {
			started: Instant::now(),
			cpu: cpu_usage(),
		}
	}

	/// Returns the pass line, e.g.
	/// `wall 1.78s cpu 6.20s (3.5x wall) majflt +0 rss 1010.3 MB footprint 1029.1 MB`.
	/// Fields the platform cannot read are left out.
	pub fn finish(&self) -> String {
		let wall = self.started.elapsed();
		let mut line = format!("wall {:.2}s", wall.as_secs_f64());
		if let (Some(before), Some(after)) = (self.cpu, cpu_usage()) {
			let cpu = after.total().saturating_sub(before.total());
			let ratio = cpu.as_secs_f64() / wall.as_secs_f64().max(f64::EPSILON);
			line.push_str(&format!(
				" cpu {:.2}s ({ratio:.1}x wall) majflt +{}",
				cpu.as_secs_f64(),
				after.major_faults.saturating_sub(before.major_faults)
			));
		}
		if let Some(m) = memory_usage() {
			line.push(' ');
			line.push_str(&format_memory(m));
		}
		line
	}
}

/// Whether [`ensure_periodic_sampler`] has spawned the sampler thread.
static SAMPLER_STARTED: AtomicBool = AtomicBool::new(false);

/// Returns whether the periodic memory sampler thread is running.
pub fn periodic_sampler_started() -> bool {
	SAMPLER_STARTED.load(Ordering::Relaxed)
}

/// Starts the periodic memory line (`[RESOURCES] rss X MB footprint Y MB`
/// every 10 s) on its own thread. Only the first call starts it; the thread
/// lives for the process and logs only while debug logging is on.
pub fn ensure_periodic_sampler() {
	static STARTED: Once = Once::new();
	STARTED.call_once(|| {
		let spawned = std::thread::Builder::new()
			.name("resource-sampler".into())
			.spawn(|| loop {
				std::thread::sleep(SAMPLE_INTERVAL);
				if is_debug_enabled() {
					debug_log("RESOURCES", describe_memory());
				}
			});
		SAMPLER_STARTED.store(spawned.is_ok(), Ordering::Relaxed);
	});
}
