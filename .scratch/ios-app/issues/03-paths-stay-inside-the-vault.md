# 03: Paths stay inside the vault

**What to build:** Nothing the browser sends can read or change a file outside the vault the Mac has open, or the app's own data folders, whatever path it passes. This must hold before the host is reachable from another device (04).

**Blocked by:** 02

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Rust (`cargo test`), plus the frontend gate if the stand-in changes.

- [ ] Every path-like argument of every remote call (Tauri commands and fs plugin calls alike) is canonicalized and must sit inside the open vault root; anything else is refused before the command runs
- [ ] Refused, each with a test: `..` traversal, an absolute path outside the vault, a symlink that escapes the vault, a symlinked vault root, a case variant that escapes on a case-insensitive volume
- [ ] Create, write, remove and rename are refused on the vault root itself and on the `.kokobrain/` and `.git/` directories (the directories, not only their children); the `.kokobrain/*.json` rules from 02 still apply
- [ ] Reads under other dot-directories are refused
- [ ] With no vault open on the Mac, every path-taking call is refused
- [ ] A refused call returns an error the browser shows; it never returns empty content

## Notes

- Proposal 4.4 "Containment". Whether macOS `canonicalize` returns the on-disk case is UNVERIFIED: compare on case-folded NFC paths.
