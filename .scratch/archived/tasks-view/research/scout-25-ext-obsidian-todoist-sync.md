# Scout 25: ext-obsidian-todoist-sync

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

**Summary (120 words max):** Todoist-linked Obsidian plugins mostly write the Todoist ID into the task line as visible text or an HTML comment. Those markers have caused duplicate tasks, break other task plugins, and get lost on edits. The fetched sources show fixes built on a per-task local identity, a stored base state for three-way conflict checks, and a status lookup for completed vs deleted tasks. I recommend an app-owned mapping keyed by a stable local ID, with an Obsidian `^id` block ID on the line, and no Todoist ID in the visible text. I did not write the report file: the agent instructions forbid report .md files, so the full findings are below.

## Facts

**Plugin identity storage**
- Markdoist (0ximst1ll/obsidoist-plugin) appends `[todoist_id:123456789]` to the line. New tasks get a temporary `[todoist_id:local-...]` until created. Remote deletion strips the marker. It has a "persistent offline queue" and an optional Sync API for incremental sync. https://github.com/0ximst1ll/obsidoist-plugin (via WebFetch summary; verify the exact text in the README).
- Sync Todoist (`sync-todoist`) stores `<!-- todoist-id:... -->` as an HTML comment. v0.7.0 keeps fixed-time and recurring due info in a hidden `todoist-due` comment. https://community.obsidian.md/plugins/sync-todoist
- Ultimate Todoist Sync (HeroBlackInk) README does not say where the link is stored. Sync is opt-in with `#todoist` on `- [ ]` lines. Obsidian→Todoist defaults on, Todoist→Obsidian defaults off, interval 300 s. Priority uses `!!N`, and Todoist's numbering is reversed (4 = urgent in the plugin's syntax). Remote deletions are not reflected yet (🔜). https://github.com/HeroBlackInk/ultimate-todoist-sync-for-obsidian
- jamiebrynes7 "Todoist Sync" renders tasks through query blocks. The docs overview says the integration is mostly one-way, Todoist→Obsidian, with limited edits, even though the README says "bidirectionally". Whether it writes IDs into notes was not verified. https://jamiebrynes7.github.io/obsidian-todoist-plugin/docs/overview/
- Todoist Context Bridge (wenlzhang) links both ways and adds a back-link in Todoist to the source note. Its ID format was not verified. https://github.com/wenlzhang/obsidian-todoist-context-bridge

**Known bugs and failure modes**
- Stale reads and overwrites. The plugin read the file from disk while the new ID sat only in the editor buffer. Obsidian's autosave then overwrote `vault.modify()` writes, which created duplicate Todoist tasks. Fixed by `readLiveFileContent`/`writeLiveFileContent` in PR #114. https://github.com/HeroBlackInk/ultimate-todoist-sync-for-obsidian/pull/114
- Revision-only conflict detection. Any Todoist revision change counted as a conflict, which turned sync off. PR #114 changed this to a conflict only when the revision moved and there is a real local field change (`decideConflict()`).
- Completed vs deleted. Completed tasks drop out of `/api/v1/sync`, so the two look the same. PR #114 added `getTaskCompletionState()` (completed/active/missing/unknown). https://github.com/HeroBlackInk/ultimate-todoist-sync-for-obsidian/pull/114
- Tasks plugin recurrence copies the `tid` onto the new recurring line, so completed and open lines share one ID. Issue #61. https://github.com/eudennis/ultimate-todoist-sync-for-obsidian-experiment/issues/61
- Inline HTML comment breaks Tasks plugin parsing and editing. Syncist issue #3. https://github.com/bastiaanschonhage/syncist/issues/3
- sandrohoerler: "do not remove or manually edit the todoist-id marker unless you intend to create a second task." https://github.com/sandrohoerler/obsidian-todoist-sync
- Brand-new tasks could be deleted by Backspace in the first second. PR #114 added a one-minute grace window.
- Maintenance: the eudennis fork says the original plugin stopped working in early April 2025 because of Todoist API changes. A forum post says the original was unmaintained for a couple of years. https://github.com/eudennis/ultimate-todoist-sync-for-obsidian-experiment

**Todoist API** (developer.todoist.com/api/v1/)
- Full sync uses `sync_token=*`. Later calls pass the returned token. `full_sync_date_utc` may show lag. https://developer.todoist.com/api/v1/#tag/Sync/Overview/Incremental-sync
- Rate limits, from a search snippet: 1000 partial and 100 full sync requests per user per 15 minutes. The fetch was truncated before the Request limits section, so verify. https://developer.todoist.com/api/v1/
- 429 responses carry `error_extra.retry_after` in the JSON body. A 400 command error is terminal and should not be retried. Commands are idempotent by UUID. https://developer.todoist.com/api/v1/#tag/Sync/Overview/Response-Error
- `tmp-` placeholder IDs are not valid server IDs. Real IDs are numeric or base32 depending on resource. https://developer.todoist.com/api/v1/#section/Developing-with-Todoist/Resource-IDs-and-optimistic-updates
- Legacy numeric IDs are resolved through the `id_mappings` endpoint (PR #114).
- Whether server IDs are permanent and how IDs behave after completion or moves was not confirmed. The relevant section was truncated.

**Obsidian block IDs** (from a search snippet of obsidian.md/help/links; the fetch returned a 404)
- A trailing `^id` works on paragraphs, single list items and tasks. IDs are limited to Latin letters, numbers and dashes. https://obsidian.md/help/links

## Problems and gaps
- Storing identity as visible text or a comment breaks other plugins, gets edited by users, and is lost on autosave races.
- Identity by `filePath + task text` (Kokobrain's current scheme, per the brief) breaks on any text edit, rename or move. It can also match duplicate task text across files. I did not verify the current code.
- Recurrence duplicates a shared ID.
- Remote deletion and completion are ambiguous unless a status lookup runs.
- No surveyed plugin documents a conflict policy beyond "revision moved".

## Ideas worth keeping
- Identity: give each synced task a stable local ID as a trailing `^kb-<id>` block ID. Keep the Todoist ID in an app-owned store (SQLite or a JSON sidecar in `.kokobrain/`) keyed by that local ID. Never put the Todoist ID in the line text.
- Store a base snapshot per mapping (last synced fields and revision). Use three-way merge, so a conflict requires a real field change on both sides.
- Keep `createdAt` on each mapping and skip deletion for a grace period.
- Store the Sync `sync_token` per account. Use `getTaskCompletionState`-style lookups for missing tasks, not the absence of a task in incremental sync.
- Write through the live editor buffer, not `vault.modify`, to avoid autosave clobbering.
- Treat 429 by honoring `retry_after`. Send commands with UUIDs so retries are safe.

## Open questions
- Verify Todoist REST v1 rate limits in the truncated Request limits section.
- Are server-assigned task IDs permanent? Check the "Migrating from v9 → IDs" section.
- Does a trailing `^id` on a task line round-trip cleanly through the Obsidian Tasks plugin's parser? Not tested here.
- Does Kokobrain's Todoist integration use the Sync or REST endpoint? Not checked, since repo reads were out of scope.
