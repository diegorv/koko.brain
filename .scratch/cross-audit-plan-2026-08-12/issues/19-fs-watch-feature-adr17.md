# Issue 19: Drop the tauri-plugin-fs watch feature and rewrite ADR-0017

Status: ready-for-agent
Phase: P2 (cluster C12)
Source: PONY #28 — plan-2026-08-12.md §P2 — Safe deletion batch (Calendar / LP / misc), §Overlap map C12
Blocked by: none

## What

The `tauri-plugin-fs` watch feature is dead — the watcher is native Rust (notify crate) — but the
feature flag and its capability grants are still shipped, and ADR-0017 still describes a JS watcher
that no longer exists. Remove the feature and its ACL surface and rewrite the ADR, all in one commit.
This issue **owns the single ADR-0017 rewrite** for the whole program.

## How

- Drop the `watch` feature from `tauri-plugin-fs` in `src-tauri/Cargo.toml`.
- Delete the **two capability grants** at `src-tauri/capabilities/default.json:223-242`.
- Regenerate and commit `Cargo.lock` in the same commit.
- **Full ADR-0017 supersede/rewrite** — the ADR is stale about the JS watcher regardless.
  **Preserve Decision item 5 verbatim in the rewritten ADR:** it is the load-bearing citation behind
  ARCH 2.0's refutation and behind #44's corrected commit message (the watcher deliberately does not
  clear recent saves, per `watcher-handler.service.ts:43-45`).
- All of the above is **one commit** — the feature flag, the grants, the lockfile and the ADR.
- Optional: the e2e mock cleanup for the removed watch API rides along in the same commit.
- **Never apply PONY #57** (the `getWatcherCounters()` swap) as part of this ADR work — it is refuted;
  see issue 45 for the re-decision condition.

## Gate

- Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml`.
- **Plus a real `pnpm tauri build`** — ACL behavior cannot be verified read-only, so the full build is
  the only proof the removed grants break nothing.
- Stage only the files for this change (`git add <specific files>`), then verify with
  `git diff --cached --stat`.
- **One commit.** Full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments

### 2026-08-18 - closing

PONY #28 landed as the single commit the issue mandates: Cargo feature, both capability grants,
`Cargo.lock`, the ADR supersede/rewrite and the optional e2e mock cleanup all in one change.

| Step | Resolving SHA |
|------|---------------|
| PONY #28 (whole issue, one commit) | this commit |

**Gate + review:**

- **PONY #28** (this commit) - gate green. Rust surface: `cargo test --manifest-path
  src-tauri/Cargo.toml` exit 0, re-run at commit time (the 7 `vault_watcher_test.rs` cases -
  hidden-dir filter, burst debounce, handle-drop stop, rapid start/stop, watcher replacement - all
  pass with the plugin's `watch` feature gone). ACL surface: a real `pnpm tauri build` in the
  implement/review step - the only proof for capability edits, since `cargo test` never runs the ACL
  codegen - completed with the two grants deleted. Frontend collateral (`e2e/mocks/tauri-fs.ts`):
  `pnpm check` 191 files / 0 errors and `pnpm vitest run` green, both re-run at commit time;
  `pnpm build` is subsumed by the tauri build's `beforeBuildCommand`. Review: Fable 5 sub-agent
  under the presumed-flawed stance, verdict could_not_refute, 0 fix rounds.

**Evidence in brief:**

- Caller trace for the removed surface: `grep -rn "plugin-fs" src/ e2e/` returns only
  `readTextFile`/`writeTextFile`/`mkdir`/`remove`/`rename`/`exists`/`copyFile`/`readDir` mocks in
  `src/tests/**` - zero references to `watch`, `unwatch`, `UnwatchFn` or `WatchEvent` anywhere in
  the app or the e2e harness. The JS `watch()` API had no caller before this commit; the watcher is
  native Rust (`src-tauri/src/vault/watcher.rs`, notify crate) and reaches the frontend only through
  the `vault-files-changed` event consumed by `fs.watcher.ts`.
- The e2e mock's `watch`, `UnwatchFn` and `WatchEvent` exports were likewise unreferenced (no file
  imports from `e2e/mocks/tauri-fs`'s watch surface), so removing them is dead-export deletion, not
  a behavior change.
- ACL claim recorded honestly in the new ADR (0031, Consequences): `tauri-plugin-fs` ships its
  permission files unconditionally, so `fs:allow-watch` / `fs:allow-unwatch` would still have
  resolved in `gen/schemas/acl-manifests.json` with the feature off. The grants were dropped because
  they authorize commands no longer compiled into the binary, not because they broke the build.
- Decision item 5 of ADR-0017 is carried into ADR-0031 **verbatim** as its own item 5 (the
  `onFileChange` consumer-decides rule). This is the load-bearing citation behind ARCH 2.0's
  refutation and #44's corrected commit message; ADR-0031's "Alternatives considered" additionally
  pins the reason with the live reference (`watcher-handler.service.ts:35-49` skips the rebuild for
  an all-self-save batch *without* clearing the recent-save markers).
- PONY #57 was **not** applied: no `src/` file other than the e2e mock is touched, and
  `getWatcherCounters()` is untouched.

**Discrepancy vs the issue text:** the issue says "full ADR-0017 supersede/**rewrite**". Rewriting
0017 in place would violate this directory's own rule (`docs/adr/README.md`, "Supersede, don't
rewrite"), so the landed shape is: 0017 keeps its body and gains
`status: superseded` + `superseded_by: "0031"` + a `superseded-reason`, and the live decision moves
to the new **ADR-0031** (`0031-native-rust-vault-watcher.md`), with the README index updated for
both rows. Same outcome the issue asks for, expressed the way the ADR directory requires.

**Minor findings for follow-up (none blocking):**

- minor - the plan's "C12 corollary - #57 REFUTED" rests on two premises that this commit changes:
  ADR-0017 is no longer `status: active`, and ADR-0031 explicitly does **not** name or protect
  `getWatcherCounters()` (Consequences: "debug instrumentation ... this ADR does not name them").
  The re-decision condition for #57 is therefore now satisfied. It still must never be applied as
  proposed (the counter-only-assertion swap); the only honest variant is deleting the whole counters
  block plus its assertions. Owner remains issue 45 (do-not-apply ledger).
