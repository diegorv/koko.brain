//! Ratchet: the core modules carry no Tauri imports, so they can move to a
//! framework-free crate. Tauri glue belongs in `commands/`, `lib.rs` or
//! `quick_capture/`. The pattern matches comments too, like the grep it
//! replaces.

use std::fs;
use std::path::{Path, PathBuf};

const CORE_DIRS: [&str; 5] = ["vault", "db", "search", "semantic", "utils"];

fn rust_files(dir: &Path, out: &mut Vec<PathBuf>) {
	for entry in fs::read_dir(dir).unwrap_or_else(|e| panic!("read_dir {}: {e}", dir.display())) {
		let path = entry.expect("dir entry").path();
		if path.is_dir() {
			rust_files(&path, out);
		} else if path.extension().is_some_and(|ext| ext == "rs") {
			out.push(path);
		}
	}
}

#[test]
fn core_modules_have_no_tauri_imports() {
	let pattern = regex::Regex::new(r"\btauri(_\w+)?::|use tauri|AppHandle|Emitter").unwrap();
	let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");

	let mut files = Vec::new();
	for dir in CORE_DIRS {
		rust_files(&src.join(dir), &mut files);
	}
	assert!(!files.is_empty(), "no core source files found under {}", src.display());

	let mut hits = Vec::new();
	for file in &files {
		let text = fs::read_to_string(file).unwrap_or_else(|e| panic!("read {}: {e}", file.display()));
		for (n, line) in text.lines().enumerate() {
			if pattern.is_match(line) {
				hits.push(format!("{}:{}: {}", file.display(), n + 1, line.trim()));
			}
		}
	}
	assert!(hits.is_empty(), "Tauri references in core modules:\n{}", hits.join("\n"));
}
