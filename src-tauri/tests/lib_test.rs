//! Source guard for the webview runtime selection in `src/lib.rs`.
//!
//! Tauri 3 has no default webview runtime. `tauri::Builder::default()` is a
//! `Builder<tauri::DynRuntime>`, and running it without `.runtime(...)` fails
//! with `RuntimeNotConfigured`, which `run()` turns into a panic on every
//! launch. `cargo test` compiles `run()` but cannot construct or launch the
//! real app (it needs the main-thread event loop), the builder's runtime
//! attributes are private, and the frontend gates never touch it, so a dropped
//! `.runtime(...)` call would pass every check. These tests read the source
//! instead.

/// `src/lib.rs`, embedded at compile time so an edit to it rebuilds this test.
const LIB_RS: &str = include_str!("../src/lib.rs");

/// Start of the app builder chain, with whitespace removed.
const BUILDER_START: &str = "tauri::Builder::default()";

/// End of the app builder chain, with whitespace removed.
const BUILDER_END: &str = ".run(tauri::generate_context!())";

/// The call that selects wry, with whitespace removed.
const WRY_RUNTIME_CALL: &str = ".runtime(tauri_runtime_wry::Wry::default())";

/// Removes `//` line comments (doc comments included), then `/* */` block
/// comments, then all whitespace. A plain scan is enough because `src/lib.rs`
/// has no comment markers inside string literals and no nested block comments.
fn strip_comments_and_whitespace(source: &str) -> String {
	let without_line_comments: String = source
		.lines()
		.map(|line| line.find("//").map_or(line, |index| &line[..index]))
		.collect::<Vec<_>>()
		.join("\n");
	let mut code = String::with_capacity(without_line_comments.len());
	let mut rest = without_line_comments.as_str();
	while let Some(start) = rest.find("/*") {
		code.push_str(&rest[..start]);
		rest = match rest[start + 2..].find("*/") {
			Some(end) => &rest[start + 2 + end + 2..],
			None => "",
		};
	}
	code.push_str(rest);
	code.chars().filter(|c| !c.is_whitespace()).collect()
}

/// Returns true when the code between `tauri::Builder::default()` and
/// `.run(tauri::generate_context!())` selects the wry runtime. Comments do not
/// count, and the call may sit anywhere in the chain.
fn selects_wry_runtime(source: &str) -> bool {
	let code = strip_comments_and_whitespace(source);
	let Some(start) = code.find(BUILDER_START) else {
		return false;
	};
	let chain = &code[start..];
	let Some(end) = chain.find(BUILDER_END) else {
		return false;
	};
	chain[..end].contains(WRY_RUNTIME_CALL)
}

#[test]
fn lib_rs_selects_the_wry_runtime() {
	assert!(
		selects_wry_runtime(LIB_RS),
		"src/lib.rs must call `.runtime(tauri_runtime_wry::Wry::default())` on \
		 the `tauri::Builder::default()` chain; without it the app panics with \
		 RuntimeNotConfigured at launch"
	);
}

#[test]
fn matches_across_rustfmt_line_breaks() {
	let source = "tauri::Builder::default()\n        .runtime(tauri_runtime_wry::Wry::default())\n        .setup(|_| Ok(()))\n        .run(tauri::generate_context!())";
	assert!(selects_wry_runtime(source));
}

#[test]
fn accepts_runtime_later_in_the_chain() {
	let source = "tauri::Builder::default()\n        .setup(|_| Ok(()))\n        .runtime(tauri_runtime_wry::Wry::default())\n        .run(tauri::generate_context!())";
	assert!(selects_wry_runtime(source));
}

#[test]
fn rejects_a_builder_without_runtime() {
	let source = "tauri::Builder::default()\n        .setup(|_| Ok(()))\n        .run(tauri::generate_context!())";
	assert!(!selects_wry_runtime(source));
}

#[test]
fn rejects_a_commented_out_runtime_call() {
	let source = "tauri::Builder::default()\n        // .runtime(tauri_runtime_wry::Wry::default())\n        .setup(|_| Ok(()))\n        .run(tauri::generate_context!())";
	assert!(!selects_wry_runtime(source));
}

#[test]
fn rejects_the_whole_chain_quoted_in_a_comment() {
	let source = "// tauri::Builder::default().runtime(tauri_runtime_wry::Wry::default())\ntauri::Builder::default()\n        .setup(|_| Ok(()))\n        .run(tauri::generate_context!())";
	assert!(!selects_wry_runtime(source));
}

#[test]
fn rejects_a_runtime_call_inside_a_block_comment() {
	let source = "tauri::Builder::default()\n        /* .runtime(tauri_runtime_wry::Wry::default()) */\n        .setup(|_| Ok(()))\n        .run(tauri::generate_context!())";
	assert!(!selects_wry_runtime(source));
}

#[test]
fn rejects_a_builder_that_never_runs() {
	let source = "tauri::Builder::default()\n        .runtime(tauri_runtime_wry::Wry::default())";
	assert!(!selects_wry_runtime(source));
}

#[test]
fn rejects_empty_source() {
	assert!(!selects_wry_runtime(""));
}
