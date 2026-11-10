# 14: The sync runs on its own and reports failures

**What to build:** With sync enabled, it runs after the vault opens, every few minutes, when the app window regains focus, and shortly after a note with synced tasks is saved, without the Tasks view open. Failures show a persistent toast, a status bar item shows the last sync and any error, and "Todoist: Show sync log" lists recent log entries. Design: `.scratch/todoist-bisync/research/design.md` Triggers, rules 9, 13.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Failing tests first with fake timers, the fake `/sync`, real stores.
- [ ] Started in the vault lifecycle's deferred startup step and stopped on teardown and vault switch; a cycle never writes to a vault other than the one it started in.
- [ ] Triggers: vault open (index ready), every `syncIntervalMinutes`, window focus, 5 s after saving a note that holds anchored lines, and "Sync now". One cycle at a time; at least 30 s between automatic cycles; a trigger during a cycle queues one follow-up. Automatic cycles never run before `first_run_done` and never ask (design rule 9).
- [ ] 429: wait `responseData.error_extra.retry_after` seconds (else 60) before the next cycle. 401: stop automatic cycles until the token changes, with a toast saying the token is invalid.
- [ ] Persistent toast (`duration: Infinity`, close button) with a fixed message per failure kind, once per kind until it recovers.
- [ ] Status bar item: syncing / last synced time / error, from the sync store.
- [ ] "Todoist: Show sync log" shows the newest entries (conflict losers, detaches, frozen anchors, skipped lines, terminal command errors).
- [ ] Gate: frontend.

## Notes

- Blocked by 06 instead of 09 (owner, 2026-11-09): the triggers only need a working cycle. Until Issue 10 sets `first_run_done`, automatic cycles stay idle by design (rule 9), so only "Sync now" runs; the tests set `first_run_done` themselves.

- Size: M.
