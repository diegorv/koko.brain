# Perf: Watcher full-rebuild coalesce

Bursts of `>10`-file watcher events each trigger a fresh `scan_vault_v2` (~1.8 s on a 5,500-note vault). Session logs show up to 94 rebuilds per session and 23 rebuilds in 2 minutes during sync activity, with overlapping in-flight rebuilds. Add an in-flight guard plus a short debounce so a burst collapses to one rebuild (plus an optional tail). Incremental path (≤ 10 md files) stays synchronous; coalesce only wraps the full rebuild branch.

Full plan in `/Users/diegorv/.claude/plans/analise-esse-projeto-baseado-jolly-stroustrup.md`.

## Tasks

- [x] Task 0: branch `perf/watcher-coalesce` + this `tasks/todo` entry, commit `chore(tasks): plan watcher coalesce work`.
- [ ] Task 1: validate Win 1 — confirm Fixes A/B/C in `tasks/todo/perf-fix-fts-tags-backlinks.md` are present on this branch; run cold-start + 5-file burst-save e2e validation; grep session logs for the four assertions in that task's last item; move file to `tasks/done/`. Tests: `pnpm check && pnpm vitest run` + `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `chore(tasks): close out perf-fix-fts-tags-backlinks after e2e validation`.
- [ ] Task 2: implement Win 2 coalesce in `src/lib/core/app-lifecycle/watcher-handler.service.ts` — extract full-rebuild branch into `runFullRebuild(changedPaths)`, add module-level `fullRebuildInFlight`, `fullRebuildPending`, `pendingPaths`, `debounceTimer`, `FULL_REBUILD_DEBOUNCE_MS = 400`. Add `scheduleFullRebuild()` + `triggerCoalescedRebuild()`. Export `_resetCoalesceForTests()` for vitest. Add 5 test cases to `src/tests/lib/core/app-lifecycle/watcher-handler.service.test.ts`: burst collapses to one, tail rebuild fires, incremental path not debounced, self-save skip wins, error in rebuild does not lock gate. Tests: `pnpm check && pnpm vitest run`. Commit: `perf(watcher): coalesce full rebuild bursts behind in-flight guard + 400ms debounce`.
- [ ] Task 3: live verification — launch app on 5.5k-note vault, trigger burst (`git pull` of branch w/ 50 changed notes or batch `touch` over many files), grep session log: before ⇒ many `Full rebuildAllIndexes executing`, multiple overlapping `scan_vault_v2 exit ~1.8 s`; after ⇒ at most 2 `runFullRebuild` lines per burst, no overlap. Confirm BacklinksPanel, OutgoingLinksPanel, TagsPanel, TasksView still refresh. No commit unless tweak needed.
- [ ] Task 4: move this file to `tasks/done/`. Tests: `pnpm check`. Commit: `chore(tasks): archive watcher-coalesce after live verification`.

## Notes

- Branch: `perf/watcher-coalesce`.
- Scope: Win 2 only. Win 1 already implemented, only the e2e validation is owed. Win 3 (persistent VaultIndex disk cache) deferred — see plan file § Win 3 for the sketch + reconsider triggers.
- Coalesce models on `backlinks.service.ts:36-58` `isBuilding`/`pendingRebuild` pattern that ships in Win 1 Fix B.
- Incremental path (≤ 10 md files) intentionally stays uncoalesced — it is already cheap and per-file, and adding latency would slow externally-edited single notes.
- Reactivity invariant: `scan_vault_v2` inside `runFullRebuild` still emits `vault-index-updated`, so panel `$effect`s on `vaultStore.vaultIndexVersion` keep working unchanged.
