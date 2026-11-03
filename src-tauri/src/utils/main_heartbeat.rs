//! Native main-thread heartbeat. The JS `[HB]` heartbeat runs in the
//! WebContent process, so it stays green while a sync command blocks the app
//! main thread (the thread that dispatches every IPC and owns the window).
//! This loop posts a closure to the main thread and reports how late it ran.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use crate::utils::logger::debug_log;

/// A closure handed to the main thread.
pub type MainTask = Box<dyn FnOnce() + Send>;

/// Gap between ticks, the same as the JS heartbeat.
pub const INTERVAL: Duration = Duration::from_millis(250);

/// A closure that runs later than this after it was posted counts as a stall.
pub const STALL_THRESHOLD: Duration = Duration::from_millis(50);

/// Runs the heartbeat until `stop` is set. Each tick posts one closure with
/// `post` and waits for it to run before sleeping `interval`, so one long
/// block yields one stall report instead of one per queued tick. `report`
/// gets the lateness in ms of every closure later than `threshold`. Returns
/// when `post` fails (returns false) or the closure is dropped unrun.
pub fn run_heartbeat(
	post: impl Fn(MainTask) -> bool,
	interval: Duration,
	threshold: Duration,
	stop: &AtomicBool,
	report: impl Fn(u64),
) {
	while !stop.load(Ordering::Relaxed) {
		let (tx, rx) = mpsc::channel();
		let posted = Instant::now();
		if !post(Box::new(move || {
			let _ = tx.send(posted.elapsed());
		})) {
			return;
		}
		let Ok(late) = rx.recv() else { return };
		if late > threshold {
			report(late.as_millis() as u64);
		}
		thread::sleep(interval);
	}
}

/// Stop flag of the running heartbeat thread (None when stopped).
static RUNNING: Mutex<Option<Arc<AtomicBool>>> = Mutex::new(None);

/// Starts the heartbeat thread with `post` as the main-thread poster, or
/// stops it. Lines go out as `[MAIN-HB] stall Nms` through `debug_log`.
/// Starting twice is a no-op; a stopped thread exits after its current tick.
pub fn set_enabled(enabled: bool, post: impl Fn(MainTask) -> bool + Send + 'static) {
	let mut running = RUNNING.lock().unwrap_or_else(|e| e.into_inner());
	if !enabled {
		if let Some(stop) = running.take() {
			stop.store(true, Ordering::Relaxed);
		}
		return;
	}
	if running.is_some() {
		return;
	}
	let stop = Arc::new(AtomicBool::new(false));
	*running = Some(Arc::clone(&stop));
	let spawned = thread::Builder::new()
		.name("main-heartbeat".into())
		.spawn(move || {
			run_heartbeat(post, INTERVAL, STALL_THRESHOLD, &stop, |ms| {
				debug_log("MAIN-HB", format!("stall {ms}ms"));
			});
		});
	if spawned.is_err() {
		*running = None;
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::sync::atomic::AtomicUsize;

	/// Runs the heartbeat with a poster that runs each closure `delays[i]`
	/// late on another thread, stopping after the last delay. Returns the
	/// stall reports.
	fn run_with_delays(delays: Vec<Duration>) -> Vec<u64> {
		let stop = Arc::new(AtomicBool::new(false));
		let reports = Mutex::new(Vec::new());
		let tick = AtomicUsize::new(0);
		let poster_stop = Arc::clone(&stop);
		run_heartbeat(
			|task: MainTask| {
				let i = tick.fetch_add(1, Ordering::Relaxed);
				let delay = delays[i];
				if i + 1 == delays.len() {
					poster_stop.store(true, Ordering::Relaxed);
				}
				// Punctual closures run inline: a thread spawn can take over
				// the threshold on a loaded machine and report a false stall.
				if delay.is_zero() {
					task();
				} else {
					thread::spawn(move || {
						thread::sleep(delay);
						task();
					});
				}
				true
			},
			Duration::from_millis(1),
			STALL_THRESHOLD,
			&stop,
			|ms| reports.lock().unwrap().push(ms),
		);
		reports.into_inner().unwrap()
	}

	#[test]
	fn reports_a_stall_when_the_main_closure_runs_late() {
		let reports = run_with_delays(vec![Duration::ZERO, Duration::from_millis(200), Duration::ZERO]);
		assert_eq!(reports.len(), 1, "one late closure, one report: {reports:?}");
		assert!(reports[0] >= 200, "reported {}ms for a 200ms delay", reports[0]);
	}

	#[test]
	fn punctual_closures_report_nothing() {
		let reports = run_with_delays(vec![Duration::ZERO; 5]);
		assert!(reports.is_empty(), "{reports:?}");
	}

	#[test]
	fn returns_when_the_poster_fails() {
		let stop = AtomicBool::new(false);
		let posts = AtomicUsize::new(0);
		run_heartbeat(
			|_task| {
				posts.fetch_add(1, Ordering::Relaxed);
				false
			},
			Duration::from_millis(1),
			STALL_THRESHOLD,
			&stop,
			|_| panic!("no report expected"),
		);
		assert_eq!(posts.load(Ordering::Relaxed), 1);
	}
}
