fn main() {
	// Only re-run this build script when its own source, the crate's source
	// tree, or the git ref actually change. Without these directives Cargo
	// falls back to its conservative default of re-running build.rs (and
	// re-emitting the GIT_HASH env var, which forces a relink of the crate)
	// more often than necessary.
	println!("cargo:rerun-if-changed=build.rs");
	println!("cargo:rerun-if-changed=Cargo.toml");
	println!("cargo:rerun-if-changed=src");
	println!("cargo:rerun-if-changed=../.git/HEAD");
	println!("cargo:rerun-if-changed=../.git/refs");

	let git_hash = std::process::Command::new("git")
		.args(["rev-parse", "--short", "HEAD"])
		.output()
		.ok()
		.and_then(|o| String::from_utf8(o.stdout).ok())
		.map(|s| s.trim().to_string())
		.unwrap_or_else(|| "unknown".to_string());

	println!("cargo:rustc-env=GIT_HASH={}", git_hash);

	// Platform-aware feature cfgs. The `semantic` and `desktop-integration`
	// Cargo features are on by default so the desktop build is unchanged, but
	// their crates (ONNX Runtime, arboard, the updater / global-shortcut /
	// process plugins) have no iOS / Android backend, so the cfgs the code
	// gates on are emitted only for desktop targets. Turning a feature off on
	// a desktop host (`cargo check --no-default-features`) yields the same
	// cfg set as a mobile build, which is how the mobile profile is verified
	// without an Apple SDK (docs/IOS.md).
	println!("cargo:rustc-check-cfg=cfg(semantic)");
	println!("cargo:rustc-check-cfg=cfg(desktop_integration)");
	let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
	let mobile = target_os == "ios" || target_os == "android";
	if !mobile && std::env::var_os("CARGO_FEATURE_SEMANTIC").is_some() {
		println!("cargo:rustc-cfg=semantic");
	}
	if !mobile && std::env::var_os("CARGO_FEATURE_DESKTOP_INTEGRATION").is_some() {
		println!("cargo:rustc-cfg=desktop_integration");
	}

	// `KOKO_CAPABILITIES_GLOB` narrows the capability files tauri-build
	// validates. A mobile build skips `capabilities/desktop.json` on its own
	// (its `platforms` exclude iOS / Android), but the host-side check of the
	// mobile profile runs on a desktop target where that file would still be
	// validated against plugins the profile does not link. Unset in every
	// normal build; `scripts/check-mobile-profile.sh` is the only caller.
	println!("cargo:rerun-if-env-changed=KOKO_CAPABILITIES_GLOB");
	let mut attributes = tauri_build::Attributes::new();
	if let Ok(pattern) = std::env::var("KOKO_CAPABILITIES_GLOB") {
		// tauri-build skips its own rerun directive when a pattern is given.
		println!("cargo:rerun-if-changed=capabilities");
		attributes = attributes.capabilities_path_pattern(Box::leak(pattern.into_boxed_str()));
	}
	tauri_build::try_build(attributes).expect("failed to run tauri-build")
}
