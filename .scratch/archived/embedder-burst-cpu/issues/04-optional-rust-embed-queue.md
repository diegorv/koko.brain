# 04 (OPTIONAL): Rust embed worker with latest-wins queue and cross-file packing

**OPTIONAL.** Only promote to `ready-for-agent` if measurements after 01-03 still show the machine slowing during a burst. Otherwise close as `wontfix` citing those numbers.

**What to build:** Replace per-call `spawn_blocking` embedding in `update_semantic_file` (`src-tauri/src/commands/semantic.rs:1193+`) with a single Rust worker: a map of pending paths where the latest content wins, drained one ONNX call at a time, optionally packing chunks from several files into one batch (estimated 10-25% saving, unmeasured). Gives one place to apply thread count and QoS, and bounds parked blocking threads during bursts.

**Risks to design for:**
- A deleted file must not be re-embedded: `remove_semantic_file` (`:1170`) has to drop its pending entry
- Must coordinate with `BUILD_LOCK` / `build_semantic_index` (`:465`) and the idle-unload timer
- Errors no longer return to the TS caller; decide how they surface (log + status)

**Blocked by:** 01, 02, 03 and their measurements

**Status:** needs-info

**Touches:**
- `src-tauri/src/commands/semantic.rs` (modify)
- new pure queue module under `src-tauri/src/semantic/` with an injected embed closure for tests
- `src-tauri/tests/` (create)

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [ ] Decision recorded in `## Comments`: measurements after 01-03 and whether this is still needed
- [ ] If built: queue unit tests cover latest-wins, delete-while-pending, and build-lock interaction
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
