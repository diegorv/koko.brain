/// Biometric authentication (Touch ID) via LAContext.
/// Prompts the user for Touch ID before accessing the encryption key.
/// Works without special entitlements — authentication is app-level,
/// not tied to Keychain access control.

/// Prompts for Touch ID / biometric authentication.
/// Returns Ok(()) on success, Err("canceled") if user canceled.
#[cfg(target_os = "macos")]
pub fn prompt_biometric(reason: &str) -> Result<(), String> {
	use block2::RcBlock;
	use objc2::runtime::Bool;
	use objc2_foundation::{NSError, NSString};
	use objc2_local_authentication::{
		kLAPolicyDeviceOwnerAuthentication, LAContext, LAPolicy,
	};
	use std::sync::{mpsc, Mutex};

	const LA_ERROR_USER_CANCEL: isize = -2;

	// Policy 2: Touch ID if available, falls back to macOS password
	let policy = LAPolicy(kLAPolicyDeviceOwnerAuthentication as isize);
	let context = unsafe { LAContext::new() };

	// Check if biometric is available
	unsafe {
		context
			.canEvaluatePolicy_error(policy)
			.map_err(|e| format!("Biometrics not available: {e}"))?;
	}

	// Prompt for biometric authentication
	let (tx, rx) = mpsc::channel::<Result<(), String>>();
	let tx = Mutex::new(Some(tx));
	let reason_ns = NSString::from_str(reason);

	let block = RcBlock::new(move |success: Bool, error: *mut NSError| {
		let result = if success.as_bool() {
			Ok(())
		} else if !error.is_null() {
			let code = unsafe { (*error).code() };
			if code == LA_ERROR_USER_CANCEL {
				Err("canceled".to_string())
			} else {
				let desc = unsafe { (*error).localizedDescription() };
				Err(format!("{desc}"))
			}
		} else {
			Err("Authentication failed".to_string())
		};

		if let Ok(mut guard) = tx.lock() {
			if let Some(sender) = guard.take() {
				let _ = sender.send(result);
			}
		}
	});

	unsafe {
		context.evaluatePolicy_localizedReason_reply(policy, &reason_ns, &block);
	}

	rx.recv().map_err(|e| format!("Channel error: {e}"))?
}

#[cfg(not(target_os = "macos"))]
pub fn prompt_biometric(_reason: &str) -> Result<(), String> {
	Err("Biometric authentication is only available on macOS".to_string())
}
