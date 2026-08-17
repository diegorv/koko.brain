# Issue 34: Delete the dead Rust vault commands

Status: ready-for-agent
Phase: P3 Track E step 1 (cluster C11)
Source: PONY #9 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track E — Rust index)
Blocked by: 10-rust-one-liners

## What

Cut the five unused Tauri vault commands and everything that references them, so the doc surfaces stop
enumerating commands nothing invokes. Safe only now: the P1 C11 decision fixed arch 7.0's producer
shape as option 2 (the `vault-index-updated` listener seam), which touches no Rust commands.

## How

Full corrected checklist — **all of it in one commit, or the crate does not compile**:

- 5 commands + their **5 registrations** + **3 `index.rs` lookups**.
- **ALL 19 test functions** — compile-breaking otherwise.
- 3 now-unused imports.
- `CLAUDE.md:262` and `vault-v2.types.ts:65`.
- The stale comments and the **'Phase 8' header**.
- The **e2e mock handlers**.

Hard constraint:

- **Do NOT delete `properties_index`** — accept it as **write-only**. Per the P1/C11 decision,
  re-adding readers is a later decision, not part of this program.

Ordering: **#25 (issue 10) must land first**; **this issue must land before issue 35 (arch 7.0)**, and
the later `rename_note` work is written against the post-cut `index.rs`.

## Gate

Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml`. The e2e mock handler and
`vault-v2.types.ts` edits also touch the frontend surface — run `pnpm check` + `pnpm vitest run` +
`pnpm build` as well. Stage only this step's files, verify with `git diff --cached --stat`, and commit
as one commit using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
line ranges).

## Comments
