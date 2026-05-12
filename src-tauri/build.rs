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
	tauri_build::build()
}
