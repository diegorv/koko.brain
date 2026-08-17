# Issue 35: Collection store producer + removeRecord wiring

Status: ready-for-agent
Phase: P3 Track E step 2 (cluster C11, C03)
Source: ARCH 7.0, M12, M08 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track E — Rust index)
Blocked by: 29-apply-note-change, 34-dead-vault-commands

## What

Give the collection store a real producer so embedded query results refresh when the vault index
updates (closes **M12**, stale embedded queries), and evict deleted notes from collection records
(closes **M08**, phantom collection pages) through the single note-change owner.

## How

- **Producer = option 2, decided at P1 (C11):** refresh `collectionStore` from the **existing
  debounced `vault-index-updated` listener** at `tauri-listeners.service.ts:97-131`. Touches no Rust
  commands.
- **Keep the synchronous per-file path** for `editor.hooks` / `note-creator` — the listener does not
  replace it.
- Add a **`collectionStore` version counter** and re-key `collection-block-widget`'s `cacheKey` on it.
  Closes **M12**.
- Wire **`removeRecord` at all four removal sites**, **reusing `forgetNote` / `applyNoteChange`
  (issue 29)** — single owner, never a second eviction path. Closes **M08**.
- **The queryjs half is DROPPED.** Per **ADR-0010 and CLAUDE.md perf rule 9**, the queryjs live-DOM
  cache is **never version-keyed** — re-keying it would destroy the canvas/video/iframe state the
  live-ref scheme exists to preserve. Do not add it back.
- Test collateral in the same commit: assert real `collectionStore` state after a
  `vault-index-updated` bump and after a removal (records gone, version advanced), plus the widget
  `cacheKey` change — not mock-call assertions.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only this
step's files, verify with `git diff --cached --stat`, and commit using the repo's full commit format
(Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
