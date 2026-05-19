---
type: ADR
id: "0026"
title: "Rust Tauri commands replace tauri-plugin-fs for vault filesystem operations"
status: proposed
date: 2026-05-19
---

## Context

Filesystem operations on the vault are currently split. Some paths go through
custom Rust commands (`commands::vault::scan_vault`, `scan_vault_v2`,
`read_files_batch`, `create_note`, `create_folder`, `remove_note_from_index`,
the `VaultIndex` mutators from ADR 0025); the rest go through
`@tauri-apps/plugin-fs` (`readDir`, `exists`, `readTextFile`, `writeTextFile`,
`mkdir`, `remove`, `rename`, `copyFile`, `readFile`). The plugin-fs surface is
gated by the Tauri 2 ACL declared in `src-tauri/capabilities/default.json`,
which is statically configured with path globs.

Today the ACL whitelists three vault roots: `$DOCUMENT/**`, `$HOME/MyFiles/**`,
and `$HOME/kokobrain-vault/**`. A path-glob audit on 2026-05-19 surfaced four
classes of failure that stem from this design:

1. **Glob doesn't match bare roots.** The pattern `$HOME/kokobrain-vault/**`
   matches descendants only, never the bare directory itself. Calls like
   `readDir($HOME/kokobrain-vault)` and `mkdir($HOME/kokobrain-vault,
   {recursive:true})` are rejected with "forbidden path". This bug fired on
   right-click "New File / New Folder / New Canvas / New Kanban" at the vault
   root (fixed at `06ca7242` by widening `fs:allow-read-dir`). The same gap
   exists in `fs:allow-mkdir` (latent - `deep-link.service.ts:234/248/330`
   when capturing to a root-level path) and `fs:allow-exists`
   (`vault.service.ts:23` stale-recent-vault detection).

2. **Permissions missing entirely.** `fs:allow-read-file` is not in the
   capability file at all, so `canvas-image.logic.ts` `readFile()` for
   canvas image nodes always rejects (no toast, no devtools error, just a
   placeholder). Fixed by Task 1 of `tasks/todo/migrate-plugin-fs-to-rust-commands.md`
   (commit `a57fc255`) which routed the canvas image render through the
   Tauri asset protocol instead.

3. **Vault location is hardcoded.** Every plugin-fs ACL entry names a
   specific prefix. Move the vault to `$HOME/Documents/Brain`, `$HOME/Dropbox/Vault`,
   or any other path the user chooses and the prefix list no longer covers
   the new location. Result: 18 services in `src/lib/features/` and
   `src/lib/plugins/` that read or write `${vault}/.kokobrain/*.json` start
   throwing "forbidden path" in lock-step.

4. **Every new caller is a fresh surface.** Adding any plugin-fs call to the
   frontend requires re-auditing the capability file. There is no compile-time
   or test-time check that flags a call site outside the whitelist; failures
   only manifest at runtime, and only on paths the developer happened to test.

The Rust side already implements `vault_fs::validate_vault_path` and path
canonicalization (ADR 0020). Every existing Rust command rejects paths that
escape the vault root before performing I/O. The security boundary is not
weaker than the plugin-fs ACL; it is stronger because it travels with the
code instead of being pasted into capability JSON.

`@tauri-apps/plugin-fs` is also used by `src/lib/utils/log.service.ts` to
write session logs into `$APPLOG`. That path has nothing to do with the
vault and stays on plugin-fs (different scope, different domain).

## Decision

**Replace every frontend `@tauri-apps/plugin-fs` call that targets a vault
path with a custom Rust Tauri command (or, for binary asset reads, with the
Tauri asset protocol).** The migration is slice-by-slice via
[`tasks/todo/migrate-plugin-fs-to-rust-commands.md`](../../tasks/todo/migrate-plugin-fs-to-rust-commands.md);
each slice is its own commit. After the final cleanup slice ships, the
vault-path entries in `src-tauri/capabilities/default.json`
(`fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-mkdir`,
`fs:allow-remove`, `fs:allow-rename`, `fs:allow-copy-file`, `fs:allow-exists`,
`fs:allow-read-dir`, `fs:allow-read-file`, `fs:allow-watch`, `fs:allow-unwatch`)
are removed and the dependency is narrowed to `$APPLOG` for logging only.

Components (target state):

1. **Rust FS primitives** (Task 3) - a new `src-tauri/src/commands/fs_primitives.rs`
   module exposes `path_exists`, `read_text`, `write_text`,
   `rename_path`, `copy_path`, `delete_path`, `read_dir`. Each command goes
   through `vault_fs::validate_vault_path` and canonicalize per ADR 0020.
   Per-command Rust unit tests cover happy path, missing target, and a
   traversal attempt.

2. **TS wrapper** (Task 4) - `src/lib/core/filesystem/fs-rust.service.ts`
   exposes typed wrappers (`pathExists`, `readText`, `writeText`,
   `renamePath`, `copyPath`, `deletePath`, `readDir`) that call `invoke(...)`
   and propagate errors (no silent swallowing). Vitest mocks
   `@tauri-apps/api/core`. No call-site migrations in this slice.

3. **Per-caller migrations** (Tasks 5-21) - each slice migrates one service
   end-to-end with its tests. Slices are ordered by current user-impact
   (P0 visible bug -> P1 foundation -> P2 hot paths -> P3 active features
   -> P4 occasional features -> P5 corner cases + cleanup).

4. **Asset protocol for binary reads** - canvas image rendering
   (`canvas-image.logic.ts`) and live-preview image widgets
   (`live-preview/widgets.ts`) use `convertFileSrc` from
   `@tauri-apps/api/core`, not a Rust `read_binary` command. The asset
   protocol scope in `src-tauri/tauri.conf.json` covers vault paths plus
   `$DESKTOP/**`, `$PICTURE/**`, `$DOWNLOAD/**`, and the app cache
   directory. The SMB/UNC rejection invariant lives in
   `src/lib/utils/sanitize-url.ts::fileUrlToFsPath` and both consumers
   import it.

5. **Cleanup** (Task 24) - `grep -rn "@tauri-apps/plugin-fs" src/lib` must
   return only `log.service.ts` (and any path that legitimately targets
   `$APPLOG` or `$APPCONFIG`). Capability vault-path entries are removed
   in the same commit that proves the smoke test on a non-hardcoded vault
   path (e.g. `$HOME/Documents/Brain`).

## Alternatives considered

- **Capability-patch the bug instead of migrating.** Adding bare-root
  entries to `fs:allow-read-dir` / `fs:allow-mkdir` / `fs:allow-exists` and
  declaring `fs:allow-read-file` would close the four observed bugs in
  ~15 lines of JSON. But it leaves the rest of the bug class intact: every
  future plugin-fs caller is still a runtime audit, every alternative vault
  location still requires editing capabilities + rebuilding Tauri, and the
  hardcoded prefix list still gates 18 services. Rejected as a fragile
  point-fix; the user explicitly asked for the definitive solution.

- **Migrate only the buggy paths (canvas image, vault.service exists,
  deep-link mkdir), leave the rest on plugin-fs.** Roughly 40-60 lines of
  TS change. Fixes the visible bugs without churn. But the latent risk
  (18 callers, all coupled to the hardcoded prefix list) stays in place,
  and the next user who moves a vault outside the three roots hits a
  cascade. Rejected; user prioritized eliminating the entire bug class
  over engineering economy.

- **Big-bang migration in one PR.** Touches 21 TS files plus the new Rust
  primitives plus the capability cleanup plus the asset-protocol fix
  plus tests across every layer. Too large to review safely; no per-slice
  rollback; mid-merge breakage cannot be triaged. Rejected; the slice plan
  in `tasks/todo/` reuses the per-task commit discipline from ADR 0016 and
  the per-feature staging discipline from ADR 0025.

- **Migrate to a generic `invoke_fs(op, args)` Rust command** (single
  command dispatching by operation name). Reduces Rust command count to
  one but tangles the dispatch logic and hides ownership: every call site
  pays a string match cost and the security validator sits inside a switch
  statement. Rejected; one command per operation matches the existing Rust
  module shape (`vault.rs`, `db.rs`, `history.rs`) and lets each command
  document its own constraints.

- **Use the Tauri asset protocol for everything (not just binary reads).**
  The asset protocol returns a URL, not file content; it solves image
  rendering but not arbitrary reads or any writes. Out of scope. Used
  only where it fits: canvas + live-preview images.

## Consequences

- **Vault can live at any path.** After Task 24, the only static path
  constraints are the asset-protocol scope in `tauri.conf.json` (for
  embedded `file://` images outside the vault - Desktop / Pictures /
  Downloads / app cache) and the `$APPLOG` log writer. Vault location is
  no longer a hardcoded capability axis.

- **Plugin-fs becomes an APPLOG-only dependency.** Either narrowed to the
  log writer or removed entirely if logging also migrates later. The
  capability file shrinks by ~10 permission blocks.

- **+~6-8 Rust commands.** Each ~10-20 lines plus its unit tests. The
  Rust side becomes the single I/O boundary for vault operations,
  matching the existing pattern set by ADR 0025 (Rust `VaultIndex` as the
  metadata source of truth).

- **One TS wrapper module.** `fs-rust.service.ts` centralizes the
  `invoke` calls so individual services do not reimplement error mapping
  per call site. Migration becomes a mechanical import swap for most
  callers.

- **Security boundary travels with the code.** Path traversal protection
  lives in `vault_fs::validate_vault_path` (ADR 0020), inside the
  command implementation, not in a JSON file that future callers might
  forget. No "forbidden path" can fire on a legitimate vault subpath
  again; failures are now Rust `Result::Err` strings that surface in
  toasts and logs.

- **Asset-protocol pattern is documented.** Image renders (canvas +
  live-preview) share the `fileUrlToFsPath` security helper. Any future
  caller that wants to display `file://` resources must go through it.

- **Migration churn.** ~21 TS files plus tests get edited across ~24
  commits. Each commit is reviewable on its own per the slice workflow
  in the plan file. No commit batches multiple features.

- **Re-evaluation triggers**: a Rust panic in `validate_vault_path`
  surfaces as a UX regression; the asset-protocol scope becomes a
  bottleneck because users routinely embed images from unexpected
  directories; a Tauri 3 release ships a capability model that solves
  the bare-root problem natively and makes the migration unnecessary
  going forward (existing callers would still benefit from the Rust
  consolidation, but new callers could stay on plugin-fs).

## Advice

The decision is validated against the codebase audit on 2026-05-19 and
against the existing pattern from commit `fdddb0ef`
(`feat(live-preview): render file:// images via Tauri asset protocol`),
which migrated the live-preview image renderer to `convertFileSrc` for
the same class of reason (plugin-fs ACL rejected the read path).
Task 1 of the migration plan (commit `a57fc255`,
`feat(canvas): render image nodes via Tauri asset protocol`) extends that
pattern to canvas and consolidates `fileUrlToFsPath` into the shared
`src/lib/utils/sanitize-url.ts` module so both consumers share the SMB /
UNC rejection invariant.

This ADR is `proposed` until at least Task 3 (Rust primitives) and one
hot-path migration (probably Task 5 - `fs.service.ts`) have shipped
green, at which point it moves to `active` in a separate commit citing
the integrated code paths.
