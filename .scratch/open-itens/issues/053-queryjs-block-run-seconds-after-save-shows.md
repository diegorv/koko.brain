# 053: A QueryJS block run in the seconds after a save shows the saved data once the index catches up, and never keeps a pre-save result

**Origin:** `audit-2026-11-05` Issue 32, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** notifyAfterSave (src/lib/core/editor/editor.hooks.ts:81-83) updates Rust and then clears the QueryJS result cache at once, but execute() reads tags, tasks and outgoing links from getVaultEntries() (src/lib/plugins/queryjs/queryjs-block-widget.ts:243), a memo keyed on vaultStore.vaultIndexVersion (src/lib/core/vault/vault-entries.service.ts:26-29). That version only advances in the throttled vault-index-updated refresh (src/lib/app/tauri-listeners.service.ts:106-109, refresh() :267-268), 2 s after an isolated event and up to 10 s in a burst. A run in that window reads the pre-save snapshot (frontmatter is already fresh, because the property index is a synchronous note-change consumer), and setResult (queryjs-block-widget.ts:270) caches it. When the version bump lands, nothing drops that result, so the stale DOM is re-attached on every tab switch until some other note is saved. CLAUDE.md Indexing 12 accepts the lag of a read; it does not accept a lagged result being cached as final. Fix direction: remember the index version (or the entries snapshot) a cached result was computed from, and treat a result older than the current snapshot as a cache miss once the refresh advances the memo (for example clear results on the refresh bump when any cached result predates it). Keep the existing policy semantics for a miss (Always re-runs, First open/Manual show Run). Do not make every save bypass the refresh throttle.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts: with autoRunQueries 'always', bumpVaultIndexVersion(1) and get_all_vault_entries_v2 returning a note with one open task, render a block that writes the open-task count and let it cache; fire notifyContentInvalidated() (as a save does) and re-render while the version is still 1 (shows 1, expected lag); then make get_all_vault_entries_v2 return the note with the task ticked, bumpVaultIndexVersion(2) and call toDOM() again. The block must show 0. It fails today: the version-1 result is re-attached.
- [ ] A result computed at the current index version is still re-attached on re-render, with no re-run and no extra get_all_vault_entries_v2 call (the canvas/DOM persistence of ADR 0010 holds).
- [ ] Under 'first-open' with the tab still open and under 'manual', a stale result after the bump renders the Run button, the same as after a save.
- [ ] help/documentation/13-queryjs.md 'Result cache and DOM persistence' says a result run before the index caught up is dropped when it does.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. A dashboard opened right after an edit keeps showing the stale result.
- **Trigger:** The owner ticks a task, adds a tag or a wikilink in a note, then within about 2 s switches to a dashboard note. The save on tab switch (or Cmd+S) clears the QueryJS cache. The dashboard block runs under 'always' (or auto-runs on a first open after the tab was closed) and caches its result.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/editor/editor.hooks.ts:81 applyNoteChange({source:'save'}) then :83 notifyContentInvalidated(); src/lib/core/filesystem/note-change.service.ts:87 save row has no yield, :226-230 update_note_in_index is fire-and-forget; src/lib/plugins/queryjs/queryjs-ports.ts:15 content invalidation -> invalidateQueryjsCache -> queryjs-session.store.svelte.ts:121-125 clearResults; src/lib/plugins/queryjs/queryjs-block-widget.ts:243 entries = await getVaultEntries(); src/lib/core/vault/vault-entries.service.ts:26-29 memo keyed on vaultIndexVersion; src/lib/app/tauri-listeners.service.ts:106 REFRESH_DELAY_MS 2000, :109 REFRESH_MIN_INTERVAL_MS 10000, :267-268 the only bumpVaultIndexVersion; src/lib/plugins/queryjs/queryjs.logic.ts:121-146 tags/tasks/outlinks/inlinks from entries; queryjs-block-widget.ts:270 setResult caches the run; no listener on vaultIndexVersion clears QueryJS results (only save, watcher-handler.service.ts:78/:120, trash restore, teardown); the watcher skips our own save via areAllRecentSaves (watcher-handler.service.ts:44). docs/agents/indexing-watcher-rules.md item 12 documents the read lag only.
- **Second opinion:** upheld (ux, medium). Confirmed. notifyAfterSave clears the QueryJS results (editor.hooks.ts:81-83), but execute reads getVaultEntries() (queryjs-block-widget.ts:243), which is memoized on vaultIndexVersion (vault-entries.service.ts:26-29). That version is bumped only in the throttled refresh (tauri-listeners.service.ts:106-109, :267-268, 2 s or 10 s), and requestPromptIndexRefresh is not called on a plain save. A run in that window caches a pre-save result via setResult (:270), and nothing in queryjs listens on vaultIndexVersion to drop it. A stale dashboard is shown, but no file is written. Corrections to apply while implementing: Category ux, not content: the dashboard shows stale data and nothing is written.
- **Source:** audit 2026-11-05, domain `queryjs`, finding `N-queryjs-01` (from queryjs-ux-1, queryjs-spec-1). Size M.

## Comments
