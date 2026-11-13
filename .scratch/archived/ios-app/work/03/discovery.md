# 03 discovery: Paths stay inside the vault

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` 4.4 "Containment". Builds on `work/02` (policy table, dispatcher, lexical path rule). Rust only; the frontend gains one parity test.

## Files that change
- `src-tauri/src/remote/policy.rs:142-203`: `fs_path_rule` also refuses any dot segment other than an exact first `.kokobrain` (other dot-dirs and dot-files, `.git` and the dir itself included). New `canonical_in_vault(root, path)`: canonicalizes the host root and the path (deepest existing ancestor + missing tail; a dangling link is followed to its target, max 32 hops; `..` in a missing tail refused) and refuses a result not under the canonical root (`Path::starts_with`, component-wise). New `PATH_ARGS` table: (command, arg, kind) for every path-like arg of a non-Denied command, kind `Inside` (absolute, in the vault), `Root` (must name the vault root) or `Relative` (vault-relative key).
- `src-tauri/src/remote/dispatch.rs:41-80,183-196`: `dispatch` runs a path gate from `PATH_ARGS` before Read and Virtual commands run; `fs_arg_path` and the write header check apply `fs_path_rule` to the client spelling AND to the canonical spelling under the canonical root, then hand the canonical path to `std::fs`; settings redaction runs on the canonical path. `read_files_batch` gets the host root, never the client's `vaultPath`.
- Tests: `src-tauri/tests/remote_policy_test.rs` (dot rules), `src-tauri/tests/remote_ws_test.rs` dispatch section (each refusal case on a real temp vault), `src/tests/lib/contracts/ipc-parity.test.ts` (every `*path*` arg of a non-Denied command has a `PATH_ARGS` row).

## Plan
1. Dot-segment rule in `fs_path_rule` + policy tests.
2. `canonical_in_vault` + fs plugin calls on canonical paths + refusal tests (`..`, absolute outside, escaping link, link to the root from outside, case variant, dangling escaping link, settings spellings incl. Kelvin sign / long s / `//` / trailing `/`).
3. `PATH_ARGS` gate for Tauri commands + host root for `read_files_batch` + no-vault refusal for every path command + TS parity test.

## Prior art
- `remote_ws_test.rs` `Vault` fixture and `leaks_token`; `ipc-parity.test.ts` / `policy-table.ts` parsers.

## Risks
- Rule applied twice (client and canonical spelling) can over-refuse odd but harmless spellings (a link whose target is spelled in another case); refusal is the safe side.
- Check-then-use race: a link swapped between the check and the read. Reads go to the canonical path, which narrows it; not closed (rare, loopback, no write path yet).

## Defaults taken
- Containment is `Path::starts_with` on two `canonicalize` results, not a case-folded NFC string compare: both come from the same resolver, so a contained path always shares the root's spelling, and anything else is refused. Unicode spellings of `.kokobrain` start with an ASCII `.`, so the dot rule refuses them without a fold table; redaction keeps the inode identity check.
- "A symlinked vault root" = a path that reaches the vault through a link to the root (an alias outside it): the client path must start with the host's own root spelling, so it is refused. A link inside the vault to the root resolves to the root itself, where writes are refused. The host root itself may be a link (macOS `/var` -> `/private/var`).
- Dot-files are refused like dot-dirs: `scan_vault` never lists them, so the browser never needs them.
- The fs root itself stays refused for every fs op (as in 02); `scan_vault` and `Root` args may name it.
- Virtual commands with path args (`update_note_in_index`, `remove_from_search_index`, ...) pass the same gate, so no path-taking call succeeds with no vault open.
