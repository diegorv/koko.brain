/// Returns a sorted list of all available font family names on the system.
///
/// Uses direct FFI to Apple's CoreText and CoreFoundation frameworks.
/// Thread-safe: `CTFontManagerCopyAvailableFontFamilyNames` does not require the main thread.
#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
	#[cfg(target_os = "macos")]
	{
		use std::ffi::CStr;
		use std::os::raw::{c_char, c_void};

		#[repr(C)]
		struct OpaqueArray(c_void);
		type CFArrayRef = *const OpaqueArray;

		#[repr(C)]
		struct OpaqueString(c_void);
		type CFStringRef = *const OpaqueString;

		const K_CF_STRING_ENCODING_UTF8: u32 = 0x0800_0100;

		#[link(name = "CoreText", kind = "framework")]
		extern "C" {
			fn CTFontManagerCopyAvailableFontFamilyNames() -> CFArrayRef;
		}

		#[link(name = "CoreFoundation", kind = "framework")]
		extern "C" {
			fn CFArrayGetCount(arr: CFArrayRef) -> isize;
			fn CFArrayGetValueAtIndex(arr: CFArrayRef, index: isize) -> *const c_void;
			fn CFStringGetLength(str: CFStringRef) -> isize;
			fn CFStringGetCString(
				str: CFStringRef,
				buffer: *mut c_char,
				buf_size: isize,
				encoding: u32,
			) -> bool;
			fn CFRelease(cf: *const c_void);
		}

		unsafe {
			let families = CTFontManagerCopyAvailableFontFamilyNames();
			if families.is_null() {
				return Ok(vec![]);
			}

			let count = CFArrayGetCount(families) as usize;
			let mut result = Vec::with_capacity(count);

			for i in 0..count {
				let cf_str = CFArrayGetValueAtIndex(families, i as isize) as CFStringRef;
				if cf_str.is_null() {
					continue;
				}
				// UTF-8 can be up to 4 bytes per character; +1 for null terminator.
				let buf_size = CFStringGetLength(cf_str) as usize * 4 + 1;
				let mut buf = vec![0i8; buf_size];
				if CFStringGetCString(cf_str, buf.as_mut_ptr(), buf_size as isize, K_CF_STRING_ENCODING_UTF8) {
					let cstr = CStr::from_ptr(buf.as_ptr());
					if let Ok(s) = cstr.to_str() {
						result.push(s.to_owned());
					}
				}
			}

			CFRelease(families as *const c_void);
			result.sort_unstable();
			Ok(result)
		}
	}
	#[cfg(not(target_os = "macos"))]
	{
		Ok(vec![])
	}
}
