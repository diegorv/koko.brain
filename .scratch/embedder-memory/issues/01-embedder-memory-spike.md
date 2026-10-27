# 01: Embedder inference balloons process memory to 17-31 GB

**What to build:** cap the ONNX embedder's memory during watcher-driven embedding so a burst of external writes (Readwise sync into `reading-list/_Inbox/Readwise/`) cannot push the app to tens of GB.

**Blocked by:** None. The fix should be chosen from the measurement harness results (see Comments).

**Status:** needs-triage

Evidence (session log `2026-10-27_10-51-04.log`):
- RSS 17,327 MB at L1523 and 17,088 MB at L1600, each inside a running batch (`[8,410]` took ~12 s, `[8,512]` ~30 s, normal 1-4 s), so the machine was swapping. Activity Monitor showed 31 GB.
- `"File update"` (`commands/semantic.rs:1248`) logs BEFORE inference; `"Output: f32"` (`semantic/embedder.rs:197`) logs after. Read peaks against the next output line, not the previous one.
- Session built with only `with_intra_threads` (`semantic/embedder.rs:57-61`): CPU arena, memory pattern and arena extend strategy are ORT defaults. Each batch is padded to its own max length (`embedder.rs:132-135`), so shapes vary every run.
- `get_process_memory` (`commands/debug.rs:18-31`) is sysinfo `pti_resident_size` of the main process only: it excludes compressed pages, hence 17 GB logged vs 31 GB in Activity Monitor (`phys_footprint`), and 66 MB readings with the model loaded.
- Back-of-envelope peak for B=8, T=512 is 3-5 GB, so the exact multiplier is not yet explained.

- [ ] Harness results recorded (default / no mem pattern / no arena / both / fixed shape)
- [ ] Chosen session config or shape bucketing applied in `embedder.rs`
- [ ] Peak footprint for the replayed burst shapes measured before and after
- [ ] `get_process_memory` also reports `phys_footprint` so logs match Activity Monitor
