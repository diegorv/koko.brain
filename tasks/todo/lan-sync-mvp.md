# LAN Sync MVP — Discovery + One-Shot Push

Smallest end-to-end useful slice of LAN sync: see peers on the LAN, pair with one via TOFU + 6-word fingerprint confirmation, push a folder over Noise XX (mutual auth + forward secrecy + AEAD). Full plan: `/Users/diegorv/.claude/plans/valiant-foraging-mccarthy.md`.

## Tasks

- [x] Stage 0: Integration seams (backend mount fn + frontend plugin hook, no behavior, Cargo deps added)
- [x] Stage 1 (P1A): Identity + BIP-39 wordlist + fingerprint
- [x] Stage 2 (P1B): peers.json trust store with atomic CRUD
- [x] Stage 3 (P1C-1F): Frontend types + reactive store
- [x] Stage 4: Typed event payloads (Rust)
- [x] Stage 5: mDNS announce + browse + first 6 commands
- [x] Stage 6: Noise XX transport with pinned-key mutual auth
- [x] Stage 7: One-shot folder push with atomic apply + traversal defense
- [ ] Stage 8: Pairing + push commands wired
- [x] Stage 3F-2 (P1C-2F): Frontend service layer with mockable transport
- [x] Stage 3F-3 (P1C-3F-a): LanSyncSettings.svelte component + tests
- [x] Stage 3F-3 (P1C-3F-b): PairingPrompt.svelte component + tests
- [x] Stage 3F-3 (P1C-3F-c): PushFolderDialog.svelte component + tests
- [ ] Stage 9: Wire frontend service to real Tauri backend
- [ ] Stage 10: Mount plugin into settings dialog + file-explorer context menu
- [ ] Stage 11: Rewrite docs/lan-sync.md to MVP scope
- [ ] Stage 12: Manual smoke matrix + cleanup commit if needed

## Notes

- Each stage = one commit. NO batching. Full Conventional Commits body (Context/Problem/Solution/Behavior/Files w/ line ranges) per docs/COMMITS.md.
- After every stage: relevant tests pass (Rust → `cargo test`; Frontend → `pnpm check` + `pnpm vitest run`; both → all three) before commit.
- `git diff --cached --stat` before every commit to verify only files in the stage's declared scope are staged.
- Integration seam: only Stage 0 + Stage 10 touch host files outside `src-tauri/src/sync/`, `src-tauri/src/commands/sync.rs`, and `src/lib/plugins/lan-sync/`.
- Parallelism: after Stage 0, frontend stages (3, 3F-2, 3F-3a/b/c) can run in parallel with backend stages (1, 2, 4-8) via subagents — each touches disjoint files.
- Reference branch (read-only): `claude/vault-lan-sync-r1D89`. Lift `wordlist.rs`, structure of `identity.rs` / `events.rs` / `discovery.rs`, and the 3-layer path-traversal defense from its `docs/lan-sync.md`.
