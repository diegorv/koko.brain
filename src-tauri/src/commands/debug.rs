use crate::utils::{logger, main_heartbeat};
use std::sync::Mutex;
use sysinfo::{Pid, System};

/// Cached `System` instance to avoid re-allocating on every call.
/// `sysinfo` recommends reusing the instance for better performance.
static SYSTEM: Mutex<Option<System>> = Mutex::new(None);

/// Enables or disables Rust-side debug logging to the frontend.
#[tauri::command]
pub fn set_tauri_debug_mode(enabled: bool) -> Result<(), String> {
	logger::set_debug_mode(enabled);
	Ok(())
}

/// Starts or stops the native main-thread heartbeat (`[MAIN-HB] stall Nms`
/// lines through `debug_log`). The frontend ties it to the Heartbeat setting.
#[tauri::command]
pub fn set_main_thread_heartbeat(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
	main_heartbeat::set_enabled(enabled, move |task| app.run_on_main_thread(task).is_ok());
	Ok(())
}

/// Returns the current process's resident set size (RSS) in bytes.
#[tauri::command]
pub fn get_process_memory() -> Result<u64, String> {
	let pid = Pid::from_u32(std::process::id());
	let mut guard = SYSTEM.lock().map_err(|e| format!("Lock error: {e}"))?;
	let sys = guard.get_or_insert_with(System::new);
	sys.refresh_processes_specifics(
		sysinfo::ProcessesToUpdate::Some(&[pid]),
		true,
		sysinfo::ProcessRefreshKind::nothing().with_memory(),
	);
	let process = sys
		.process(pid)
		.ok_or_else(|| "Failed to find current process".to_string())?;
	Ok(process.memory())
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn get_process_memory_returns_positive_value() {
		let rss = get_process_memory().expect("should read process memory");
		assert!(rss > 0, "RSS should be positive for a running process");
	}
}
