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
