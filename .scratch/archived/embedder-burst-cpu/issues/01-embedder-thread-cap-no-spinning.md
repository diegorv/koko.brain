# 01: Embedder capped at 4 intra-op threads, intra-op spinning off

**What to build:** During a watcher burst (Readwise sync writing ~8-14 new notes/min, log `2026-10-27_22-15-08.log`), the BGE-M3 embedder runs every new file through ONNX with up to 8 intra-op threads, holding the process at ~580% CPU and slowing the whole Mac. The thread cap was raised from `min(4)` to `min(8)` on the assumption that "the user doesn't typically interact with the UI while it runs" (`src-tauri/src/semantic/embedder.rs:49-54`), which a background sync breaks. Lower the cap back to `min(4)` and turn off ORT intra-op spinning (busy-wait between ops) in the shared builder `session_builder` (`src-tauri/src/semantic/mod.rs:32-39`) via `.with_intra_op_spinning(false)` (exists in `ort 2.0.0-rc.15`, which `Cargo.lock` resolves from the `2.0.0-rc.13` floor in `Cargo.toml:53`; `session/builder/impl_config_keys.rs:135`).

**Context:** Exploration run 2026-10-28 (20 scouts + 5 reviewers). Commits `8d0daf13`, `a061a034`, `dca9a87e`, `9ce04ba3` fixed memory (31 GB CoreML), idle-unload and double-load, but none bound CPU. Inference is already serialized by `EMBEDDER.lock()` (`src-tauri/src/commands/semantic.rs:1247` per file, `:630` in the full build), so per-run threads are the lever.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

**Touches:**
- `src-tauri/src/semantic/embedder.rs` (modify; lines 49-54, comment + cap)
- `src-tauri/src/semantic/mod.rs` (modify; `session_builder`, lines 32-39)
- `src-tauri/src/semantic/reranker.rs` (read; it shares `session_builder` at :57, so spinning-off applies to it too)

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only)

- [ ] `embedder.rs` caps intra-op threads at 4 (fallback stays 4) and the comment states why (background bursts, UI in use)
- [ ] `session_builder` disables intra-op spinning for every session it builds; the doc comment says so
- [ ] Commit confirms spinning-off is wanted for the reranker too (shared builder, `reranker.rs:57`)
- [ ] Existing `semantic_session_builder_test.rs` still passes; if the builder exposes no getter for the new option, the commit says the effect is verified by measurement only
- [ ] Manual measurement noted in a `## Comments` entry or commit body: `top -pid <pid> -stats cpu,rss,th` during a replay of ~20 files at ~10/min, before vs after, plus per-file embed time from the log
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
- 2026-10-28 11:48 — discovery — plan in work/01/discovery.md: cap 4, spinning off in session_builder; no ort getter, manual measurement left for human — e8a24bf1
- 2026-10-28 11:51 — implement — cap min(4) + intra-op spinning off in session_builder; semantic cargo tests 55/55 pass; manual top measurement (before/after ~20-file replay) still TODO by a human — 2217134b
- 2026-10-28 11:54 — review — CHANGES_REQUESTED: code correct, 4 semantic test files 55/55 pass; cap has no test (med), measurement unmet so do not close/delete this file, deliver as ready-for-human (med), two comment inaccuracies (low), wrong discovery sha (nit) — de3e2e56
- 2026-10-28 11:56 — deliver — review fixes in (thread-cap test, comment wording, sha); cargo gate green 1119 passed / 0 failed; code merged to main but Issue NOT closed: owed manual measurement by a human: `top -pid <pid> -stats cpu,rss,th` during a ~20-file replay at ~10/min, baseline = main before the merge (45e2577e) vs after = this merge, plus per-file embed time from the `EMBEDDER` log lines; record numbers here, then close. Issue 02 stays blocked until then — 6a3182a4

- 2026-10-28 (open item, deferred by the user): CPU measurement not done yet. Procedure when picked up: build `45e2577e` (before) and `54b8bcb5` (after) with `pnpm tauri:build:fast`, one at a time; close the installed app; replay ~20 existing Readwise notes into a temporary `_burst-test/` folder of the vault at one every 6 s (delete it after); record `top -pid <pid> -stats cpu,rss,th` every second and per-file embed time from the `EMBEDDER` log lines; note whether typing / other apps stall. Compare A vs B, then close this Issue. Issue 02 stays blocked until then.
