# Audit: feature/p2p-sync

> Audit plan prepared by **Kimi** (kimi-k3, via Claude Code), 2026-08-19, from a full recon read of the branch diff. Filename and this note identify the author.

Complete audit of the code introduced by `feature/p2p-sync` (merge-base `9ad53a2a1782`, 26 commits, 36 files, +2995/-21). The branch adds LAN P2P vault sync: a Noise-encrypted (`XXpsk3` via `snow`) read-only TCP listener plus a manual pull engine with local-wins conflicts and atomic writes.

Reference docs (the audit checks code against these):
- Spec: `docs/superpowers/specs/2026-07-03-p2p-sync-design.md`
- Plan: `docs/superpowers/plans/2026-07-03-p2p-sync.md`
- Finished task list: `tasks/done/p2p-sync.md`

Audit working tree: `.claude/worktrees/p2p-sync` (branch `feature/p2p-sync`). Do not commit fixes to the branch from the audit — record findings here or in `.scratch` issues; fixes are a separate decision.

## Scope map (what the branch introduces)

| Area | Files |
|---|---|
| Wire protocol | `src-tauri/src/sync/protocol.rs` (Msg enum, LE u32 framing, 65535 cap) |
| Crypto | `src-tauri/src/sync/noise.rs` (pairing key, XXpsk3 handshake, NoiseChannel) |
| State | `src-tauri/src/sync/state.rs` (`.kokobrain/sync-state.json`, keyed by peer device name) |
| Manifest/paths | `src-tauri/src/sync/manifest.rs` (`validate_rel_path`, sha256, walker skipping dot-dirs/symlinks/non-UTF-8) |
| Conflicts | `src-tauri/src/sync/decision.rs` (5-row decision table + conflict-copy naming) |
| Server | `src-tauri/src/sync/server.rs` (0.0.0.0 bind, one session at a time, 10s handshake / 30s idle timeouts, folder-confined canonicalize) |
| Engine | `src-tauri/src/sync/engine.rs` (pull loop, DownloadError Fatal/Recoverable, 1 GiB file cap, atomic temp+rename writes) |
| IPC | `src-tauri/src/commands/sync.rs` (6 commands), `lib.rs` registration, `capabilities/default.json` (adds clipboard write) |
| Frontend | `src/lib/plugins/sync/{sync.service.ts,sync.store.svelte.ts,sync.types.ts}`, `src/lib/core/settings/sections/SyncSection.svelte`, settings plumbing (types/store/service/logic), `SettingsPanel.svelte`, `app-lifecycle.service.ts` (startup listener + teardown) |
| Tests | `src-tauri/tests/sync_server_test.rs` (7), `src-tauri/tests/sync_e2e_test.rs` (9), inline unit tests (24), `src/tests/lib/plugins/sync/*` (17), settings tests |
| CI | `privacy.yml` (allowlist `sync/engine.rs TcpStream::connect`), `security.yml` + new `src-tauri/.cargo/audit.toml` (ignore quick-xml RUSTSEC-2026-0194/0195) |
| Deps | `snow 0.10`, `getrandom 0.4`, `serde_bytes 0.11`; tokio gains `net`, `sync`, `time` |

## Baseline (verified during recon, 2026-08-19)

- `cargo test --manifest-path src-tauri/Cargo.toml` on the branch — green (exit 0), incl. all sync suites.
- `pnpm vitest run` on the branch — FAILS TO START: vite 8.0.16 (pinned in the branch's lockfile from the 2026-07-03 branch point) cannot run under Node 26 (`[RESOLVE_ERROR] Could not resolve 'node:module' in \0rolldown/runtime.js` during dependency optimization). Main's lockfile has vite 8.2.1 / vitest 4.1.10 / svelte 5.56.8 and works. The branch diff itself never touches `package.json`/`pnpm-lock.yaml` — this is pure staleness, not a sync bug. See Finding F1.

## Tasks

- [ ] Task 0: Refresh the branch onto current main
  The merge-base (`9ad53a2a1782`) predates dependency fixes on main that the current toolchain requires. Rebase `feature/p2p-sync` onto `main` (or merge main into it), refresh the lockfile, and confirm the branch's own commits still apply cleanly. This is a prerequisite for every frontend gate below — without it the audit cannot distinguish branch bugs from staleness.
  Verify: `git log --oneline main..HEAD` shows the same 26 sync commits rebased; `pnpm install` resolves vite 8.2.1+.

- [ ] Task 1: Finish the baseline gates
  After Task 0, run `pnpm check` + `pnpm vitest run` + `pnpm build` and `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` in the worktree. Audit starts only on a green baseline; any failure here becomes a finding.
  Verify: all four commands exit 0.

- [ ] Task 2: Spec conformance matrix
  Build a table mapping every normative claim in the spec to code + test: pull-only (listener never writes — grep `server.rs` for write calls), local-wins rows 1-5 (`decision.rs` tests), no deletion propagation, off-by-default listener, wire discretion (no banner before/after handshake — confirm `serve_connection` sends nothing before the Noise handshake completes and that handshake bytes are snow-framed only), additive-only sync. Each row: `claim → file:line → covering test`, or a finding.
  Verify: every spec section (Decisions, Protocol, Decision table, Security, Error handling) appears in the matrix with a code reference.

- [ ] Task 3: Crypto and transport audit (`noise.rs`, `protocol.rs`)
  - Confirm `XXpsk3` usage against the snow 0.10 API: PSK position 3, fresh static keypair per session (accepted: identity comes from PSK, no key pinning — note the MITM-with-PSK consequence in the findings, spec already accepts PSK-only auth).
  - Confirm nothing is writable to the socket before `into_transport_mode` on either side.
  - Confirm handshake-failure behavior leaks no plaintext: responder drops the TCP connection without an application-level error message on wrong PSK.
  - `read_frame` caps at 65535 before allocating; `NoiseChannel.send` caps plaintext at 65519. Check `FILE_CHUNK_LEN` (48 KiB) + MessagePack envelope stays under 65519 (compute the actual worst-case envelope overhead, don't estimate).
  - Pairing key hygiene: grep the whole diff for log statements that could print `pairingKey`/`psk` (frontend `debug`/`error`, Rust `debug_log`) — a secret must never hit `~/Library/Logs/com.diegorv.kokobrain/`.
  - Check `getrandom::fill` is the correct 0.4 API (not the 0.2/0.3 `getrandom::getrandom`).
  Verify: each bullet has a confirmed-ok or a finding with file:line.

- [ ] Task 4: Server security audit (`server.rs`)
  - Path confinement: `serve_file` validates, matches the exposed folder, canonicalizes both roots and compares. Try to break it: exposed folder prefix tricks (`Notes` vs `Notes2`), symlink chains inside the exposed folder pointing within then out, trailing-slash and case-insensitive filesystem (APFS) edge cases (`notes/` vs `Notes/`), Unicode normalization (NFD vs NFC filenames — macOS stores NFD; a manifest path built on one machine may not match on another).
  - TOCTOU: canonicalize-then-read has a symlink-swap window. Threat model requires local write access, so likely accepted-risk — document it explicitly either way.
  - DoS starvation: the listener serves ONE session at a time; an unauthenticated LAN peer can connect and sit through the 10s handshake timeout repeatedly, starving the legitimate peer. Quantify (hold time per connection, backlog behavior) and decide: accepted LAN trade-off or finding.
  - Bind surface: `0.0.0.0` exposes the port on every interface incl. public WiFi. Confirm the spec intends this (it says LAN-only but never restricts the bind) and that the UI copy doesn't claim otherwise.
  Verify: adversarial cases above are covered by new or existing tests, or recorded as findings.

- [ ] Task 5: Engine robustness audit (`engine.rs`)
  Confirm or refute each hypothesis with a test:
  - H1 (unbounded manifest): the `ManifestPage` loop has no total-entry cap — a malicious/buggy peer streaming pages for 30s×N grows `remote_files` without limit (OOM vector). `MAX_FILE_LEN` caps files, nothing caps the manifest.
  - H2 (oversized file aborts the session): `bytes.len() + data.len() > MAX_FILE_LEN` returns `Fatal`, which aborts ALL remaining folders/files; the manifest already advertises `size`, so an oversized file could be skipped BEFORE download as Recoverable. Also note: `FileMeta.size` is currently never read by the engine.
  - H3 (conflict-copy name collision): two divergent versions on the same day from the same peer produce the same copy name → `write_atomic` renames over the previous copy (loses conflict evidence). Decide: accepted (day granularity documented) or finding.
  - H4 (no single-flight): two concurrent `sync_now` IPC calls both load state, last `save_state` wins (lost updates), and interleaved downloads write the same paths. The UI disables the button but IPC is not guarded. Check whether anything in Rust serializes `run_sync`.
  - H5 (state keyed by device name): two real machines with the same `deviceName` (default fallback is `kokobrain` for both when unset!) share one state bucket. Walk the decision table for a name-collision scenario and confirm content-hash anchoring keeps it benign, or find the row where it doesn't.
  - H6: `save_state` runs after `Bye`; a crash mid-session loses state (re-download only — documented). But `save_state` failure propagates as a sync failure AFTER all files were written — confirm the summary/toast the user sees makes sense in that case.
  Verify: each H becomes confirmed (finding filed) or refuted with the test that proves it.

- [ ] Task 6: Watcher and editor integration audit
  The spec claims "free integration" via the watcher. Verify the chain end to end and probe the weak spots:
  - H1 (dirty open tab loses the download): sync overwrites `Notes/a.md` → watcher fires → `reloadExternallyChangedTabs` skips the tab because it's dirty → next autosave writes the stale buffer over the synced version. No conflict copy, no notification; next sync sees row 4 (KeepLocal). Reproduce with a focused test or trace `editor.service.ts:358` + `editor.hooks.ts` autosave, and decide whether sync needs to notify/refuse when a target file is dirty-open.
  - H2 (file tree freshness): new `.md` files surface via `vault-index-updated` → contentOrder change → `loadDirectoryTree` (tauri-listeners.service.ts:~103). Non-markdown attachments (images) create no `NoteEntryV2` — confirm whether the explorer shows them without an app restart; if not, that's a visible gap for a file-sync feature.
  - H3 (conflict copies propagate): copies are ordinary files inside synced folders, so a two-way setup syncs `x (conflict from A ...).md` back to A and onward. No deletion rule means they accumulate forever. Confirm against the spec (silent on this) and record as design question, not bug.
  - H4: `.sync-tmp-*` files are dot-prefixed basenames → filtered by the Rust watcher's `is_inside_hidden_dir` (any dot segment incl. filename). Confirm with `watcher.rs` tests or a targeted case so temp files never trigger index churn.
  - H5: mass first sync (>10 files) forces the full-rebuild path in `rebuildAllIndexes` — acceptable, but confirm no `areAllRecentSaves` interaction misclassifies sync writes (sync writes are NOT editor saves, so rebuild runs — that's correct; just verify no skip).
  Verify: H1/H2 reproduced or refuted with file:line evidence; H3 answered from spec; H4/H5 confirmed.

- [ ] Task 7: Lifecycle and frontend audit
  - H1 (listener restart race): `sync_start_listener` stops the old listener via watch signal and immediately binds the same port; the old accept loop releases the socket only when its task observes shutdown. Rapid restarts (every exposed-folder add/remove in `SyncSection` triggers `restartListenerIfRunning`) could hit EADDRINUSE. Write a Rust stress test: 20 rapid stop/start cycles on a fixed port.
  - H2 (teardown/start ordering across vault switch): `teardownVault` calls `stopSyncListener().catch(() => {})` fire-and-forget; `initializeVault` calls `startSyncListener` fire-and-forget. On vault switch the stop can land after the start and kill the new vault's listener. Trace `app-lifecycle.service.ts` ordering and confirm or refute.
  - H3 (silent startup failure): if the listener fails to start on app launch (port taken), only a log line records it; `exposeEnabled` stays true and the user gets no signal until they open Sync settings. Confirm and decide if acceptable.
  - H4: `refreshStatus` rethrows; `SyncSection`'s `$effect` catches with `.catch(() => {})` — check the project rule on swallowed errors and whether the settings UI shows a stale "Listening on ..." after a backend failure.
  - H5: `SyncSection.svelte` line ~218 — the stale-subscription filter `(syncStore.remoteShares ?? [s]).includes(s)` renders stale entries only after a listing; confirm the logic shows/hides the right rows when `remoteShares` is null vs empty.
  - Confirm `$effect` + `untrack()` pattern compliance (PATTERNS.md) and that no `$derived` snuck into the stores.
  Verify: each H confirmed (finding) or refuted with evidence.

- [ ] Task 8: Test-gap closure list
  Existing coverage is good (24 Rust unit + 16 Rust integration + 17 frontend). Produce the definitive missing list; candidates from recon:
  - Rust: concurrent `sync_now` (H4/Task 5); manifest flood bound (H1/Task 5); conflict-copy same-day collision (H3/Task 5); listener rapid-restart (H1/Task 7); full A↔B convergence (A pulls, B pulls, assert both vaults converge — no existing test crosses directions); `MAX_FILE_LEN` boundary exactly at 1 GiB; empty-subscription sync (no-op summary).
  - Frontend: no component test for `SyncSection.svelte` (check whether other settings sections have any — follow existing convention either way); no Playwright E2E renders the Sync section (rule 8: assert on rendered content — decide if settings sections are in E2E scope at all).
  - Verify each candidate is genuinely missing (grep test names) before listing it.

- [ ] Task 9: Dependencies and CI audit
  - New crates: `snow 0.10`, `getrandom 0.4`, `serde_bytes 0.11` + tokio features. Run `cargo audit` in the worktree; check each crate's maintenance status and that versions match the plan's crates.io verification note.
  - Review the `Cargo.lock` diff (+208 lines) for unexpected transitive additions.
  - quick-xml ignores: confirm RUSTSEC-2026-0194/0195 are genuinely unreachable (quick-xml only parses app-controlled plists) and that `audit.toml` and the `security.yml` `ignore:` list match exactly.
  - Privacy scan gap: `commands/sync.rs:25` does `socket.connect("8.8.8.8:80")` (UDP, no packets sent) — the privacy.yml patterns match the literal `UdpSocket::connect`, not method-call syntax, so this evades the scan without an allowlist entry. Decide: add a `privacy-ok` comment, extend the pattern, or accept. Also confirm the `sync/engine.rs:.*TcpStream::connect` allowlist actually matches the current line.
  - `capabilities/default.json` adds `clipboard-manager:allow-write-text` — confirm the only user is the Sync section's Copy button.
  Verify: cargo audit output clean (minus documented ignores); lock diff accounted for; CI lists in sync.

- [ ] Task 10: Conventions and commit hygiene
  - Spot-check JSDoc/doc comments on exported items (Rust `///` on pub items, TS JSDoc), tabs everywhere, English.
  - `sync.types.ts` comments say skipped means "up-to-date or untracked" — actual semantics are up-to-date/keep-local/known-conflict; note doc drift.
  - Spot-check 3-5 commit messages against docs/COMMITS.md (Context/Problem/Solution/Behavior/Files).
  - Confirm no unrelated changes rode along (the 36-file diff should be sync + the CI/audit entries only; `CLAUDE.md` plugins line and `tasks/done/p2p-sync.md` move are expected).
  Verify: findings list or clean bill per item.

## Findings log

(Filled during execution. One entry per confirmed finding: severity, file:line, description, suggested fix, and whether it blocks merge.)

| # | Severity | Location | Finding | Status |
|---|----------|----------|---------|--------|
| F1 | blocker-for-audit | `pnpm-lock.yaml` (branch-wide) | Branch is stale: lockfile pins vite 8.0.16 / svelte 5.56.1 from the 2026-07-03 branch point; vitest cannot start under Node 26. Not a sync-code bug — fixed by Task 0 (rebase onto main). | found in recon |

## Notes

- Execution order matters: Tasks 1-2 establish the baseline and the conformance reference; Tasks 3-5 are the security core; Tasks 6-7 are where this feature touches existing systems (highest regression risk); Tasks 8-10 sweep up.
- Strongest hypotheses going in (from recon, unverified): engine manifest flood (Task 5 H1), oversized-file session abort (Task 5 H2), dirty-tab download loss (Task 6 H1), listener restart EADDRINUSE (Task 7 H1), privacy-scan evasion of the 8.8.8.8 UDP connect (Task 9).
- Per the memory policy, findings review before any fix commit runs an adversarial opus-5 reviewer; this plan covers the audit only, not fixes.
- Do not "fix while auditing" — log the finding, finish the audit, then prioritize.
