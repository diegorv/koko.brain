//! macOS quality-of-service (QoS) for the embedder's threads.
//!
//! The embedder runs during background bursts (a sync tool writing new notes
//! fans each file through the watcher into ONNX) while the user works in the
//! UI. At the default QoS it competes with foreground work as an equal. At
//! `QOS_CLASS_UTILITY` the scheduler favors foreground threads and prefers
//! efficiency cores. Utility, not background: the same embedder serves
//! query-time search, and background QoS would make search slow.
//!
//! Two pieces are needed because macOS threads do not inherit their creator's
//! QoS (probe 2026-10-28: children of a utility thread created by
//! `pthread_create` or `std::thread` run at `QOS_CLASS_DEFAULT`):
//! - [`enter_utility_qos`] lowers the calling thread, which runs part of every
//!   intra-op loop, for the length of one embedder call.
//! - [`UtilityQosThreadManager`] starts each ORT intra-op worker at utility.
//!
//! Everything here is a no-op on other targets.

use std::marker::PhantomData;
use std::sync::atomic::{AtomicUsize, Ordering};

use crate::utils::logger::debug_log;

/// `QOS_CLASS_UTILITY` from `<sys/qos.h>`.
pub const QOS_CLASS_UTILITY: u32 = 0x11;

/// ORT worker threads started by [`UtilityQosThreadManager`] that reached
/// utility QoS, since process start.
static UTILITY_WORKERS_STARTED: AtomicUsize = AtomicUsize::new(0);

/// Returns how many ORT worker threads [`UtilityQosThreadManager`] has started
/// at utility QoS since process start (always 0 off macOS).
pub fn utility_workers_started() -> usize {
	UTILITY_WORKERS_STARTED.load(Ordering::Relaxed)
}

#[cfg(target_os = "macos")]
mod sys {
	/// `QOS_CLASS_UNSPECIFIED` from `<sys/qos.h>`; not a valid class to set.
	pub const QOS_CLASS_UNSPECIFIED: u32 = 0x00;

	extern "C" {
		pub fn pthread_set_qos_class_self_np(qos_class: u32, relative_priority: i32) -> i32;
		pub fn qos_class_self() -> u32;
	}
}

/// Returns the current thread's QoS class, or `None` off macOS.
pub fn current_qos_class() -> Option<u32> {
	#[cfg(target_os = "macos")]
	{
		// SAFETY: reads the calling thread's own QoS; no arguments.
		Some(unsafe { sys::qos_class_self() })
	}
	#[cfg(not(target_os = "macos"))]
	{
		None
	}
}

/// Sets the current thread's QoS class. Returns whether macOS accepted it.
#[cfg(target_os = "macos")]
fn set_current_qos_class(qos_class: u32) -> bool {
	// SAFETY: changes only the calling thread's own QoS; invalid classes are
	// rejected with a non-zero return, not undefined behavior.
	unsafe { sys::pthread_set_qos_class_self_np(qos_class, 0) == 0 }
}

/// Restores the thread's previous QoS class when dropped.
///
/// Not `Send`: QoS belongs to a thread, so the guard must drop on the thread
/// that created it. Held across an `.await`, a task could migrate and the
/// guard would then restore a different thread. The marker makes the compiler
/// reject that.
pub struct UtilityQosGuard {
	/// Class to restore; `None` when nothing was changed.
	#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
	previous: Option<u32>,
	/// Makes the guard `!Send` (see the type docs).
	_not_send: PhantomData<*const ()>,
}

/// Lowers the current thread to utility QoS until the returned guard drops.
///
/// Scoped because the embedder runs on tokio's shared `spawn_blocking` pool:
/// a bare set would leave that pool thread at utility for every later,
/// unrelated blocking task.
pub fn enter_utility_qos() -> UtilityQosGuard {
	#[cfg(target_os = "macos")]
	{
		let previous = current_qos_class().filter(|&class| class != sys::QOS_CLASS_UNSPECIFIED);
		if previous.is_some() && set_current_qos_class(QOS_CLASS_UTILITY) {
			return UtilityQosGuard {
				previous,
				_not_send: PhantomData,
			};
		}
	}
	UtilityQosGuard {
		previous: None,
		_not_send: PhantomData,
	}
}

impl Drop for UtilityQosGuard {
	fn drop(&mut self) {
		#[cfg(target_os = "macos")]
		if let Some(previous) = self.previous {
			// Drop cannot propagate an error. A failed restore leaves this
			// (possibly shared `spawn_blocking`) thread at utility, so record it.
			if !set_current_qos_class(previous) {
				debug_log("SEMANTIC", format!("Failed to restore thread QoS class {previous:#x}"));
			}
		}
	}
}

/// ORT thread manager that starts each worker thread at utility QoS.
///
/// Attached to the embedder session by `embedder_session_builder`; ORT then
/// creates the session's intra-op pool through it instead of its own
/// `pthread_create`.
pub struct UtilityQosThreadManager;

impl ort::environment::ThreadManager for UtilityQosThreadManager {
	type Thread = std::thread::JoinHandle<()>;

	fn create(&self, work: impl FnOnce() + Send + 'static) -> ort::Result<Self::Thread> {
		std::thread::Builder::new()
			.name("ort-embedder".to_string())
			.spawn(move || {
				// A dedicated worker: keep utility for its whole life.
				std::mem::forget(enter_utility_qos());
				if current_qos_class() == Some(QOS_CLASS_UTILITY) {
					UTILITY_WORKERS_STARTED.fetch_add(1, Ordering::Relaxed);
				}
				work();
			})
			.map_err(|e| ort::Error::new(format!("Failed to spawn ORT worker thread: {e}")))
	}

	fn join(thread: Self::Thread) -> ort::Result<()> {
		thread
			.join()
			.map_err(|_| ort::Error::new("ORT worker thread panicked"))
	}
}
