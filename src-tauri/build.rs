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
	link_clang_rt_on_macos();
	tauri_build::build()
}

/// Links the compiler runtime (`libclang_rt.osx.a`) on macOS targets.
///
/// ONNX Runtime 1.31 (pulled by ort 2.0.0-rc.15) ships prebuilt CoreML code
/// that calls `__isPlatformVersionAtLeast`. `std` provides that symbol, but
/// release LTO drops it before the native objects are linked
/// (rust-lang/rust#164915), so `cargo build --release` fails with
/// "Undefined symbols: ___isPlatformVersionAtLeast". Debug and test builds
/// are unaffected. Remove once rustc keeps the symbol or ort stops needing it.
fn link_clang_rt_on_macos() {
	if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("macos") {
		return;
	}
	let path = std::process::Command::new("cc")
		.args(["-print-file-name=libclang_rt.osx.a"])
		.output()
		.ok()
		.and_then(|o| String::from_utf8(o.stdout).ok())
		.map(|s| std::path::PathBuf::from(s.trim()));
	// `-print-file-name` echoes the bare name back when the file is not found.
	match path.as_deref().and_then(|p| p.parent()).filter(|d| d.is_absolute()) {
		Some(dir) => {
			println!("cargo:rustc-link-search=native={}", dir.display());
			println!("cargo:rustc-link-lib=static=clang_rt.osx");
		}
		None => println!(
			"cargo:warning=libclang_rt.osx.a not found via `cc`; release link may fail on ___isPlatformVersionAtLeast"
		),
	}
}
