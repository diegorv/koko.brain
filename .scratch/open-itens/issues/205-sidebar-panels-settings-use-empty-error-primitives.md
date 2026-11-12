# 205: Sidebar panels and settings use the empty and error primitives

**Origin:** `audit-2026-11-05` Issue 146, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the Origin lines use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here. The sites below were re-checked by the Tasks view deep dive at `d2304ac9e` (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` 205, `dossier-129+198+205.md`, `cross-tests-relay.md` M7).

**Migrated from:** `.scratch/archived/ux-polish/issues/60-panels-use-empty-error-primitives.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). A refactor that needs 59's primitives (here: Issue 204).

**What to build:** Move the true empty states of the sidebar panels and the empty and error text of a few settings sections onto Issue 204's `EmptyState` and `InlineAlert`, and replace raw error text shown as UI copy in `SearchSection` and the event calendar with a fixed message, with the error going to the log. This is the minimum scope; anything outside the lists below stays as it is.

First, read what Issue 204 delivered: directory names, exports, props (title, description, action, the compact variant, `role`), markup and classes. Its ticket defines none of them, so do not code against a guess.

**Raw error text to replace** (the error itself goes to `error(tag, ...)` from `#lib/utils/debug.js`, which reaches the console, Sentry and the log file)
- `src/lib/features/search/SearchSection.svelte`: the reranker download catch sets `rerankerError = String(err)` and the semantic setup catch sets `downloadError = String(err)`, both logged with `debug('SEARCH', ...)`, which writes only when a debug setting is on. Switch both to `error('SEARCH', ...)`, show fixed messages through `InlineAlert`: "The reranker model could not be downloaded. The log has the details." and "The semantic model could not be downloaded. The log has the details." (proposed wording).
- `src/lib/features/event-calendar/event-calendar.service.ts`, `loadEvents`' catch: `setLoadError` gets the fixed `Could not load events. The log has the details.` instead of the error's message (the catch already logs with `error('EVENT-CALENDAR', ...)`). `EventCalendarView.svelte` renders `loadError` alone in an `InlineAlert`, keeping `role="alert"` and `data-calendar-load-error`.
- `EventCalendarView.svelte`: the "Could not load calendar events" and "Could not load tasks" toasts drop `description: err.message`. The titles stay.

**Empty states to migrate** (true empties only; "Not available", "Indexing vault...", "Indexing tags...", "Searching..." and "Type to search across all files" are loading or hint copy and stay plain text)
- `BacklinksPanel.svelte` "No backlinks found", `OutgoingLinksPanel.svelte` "No outgoing links", `TableOfContentsPanel.svelte` "No headings found" (compact variant).
- `TagsView.svelte` "No tags found", `SearchPanel.svelte` "No results found".
- `TrashSection.svelte` "Trash is empty", `AppearanceSection.svelte` "The theme catalog is empty."

**Settings errors to migrate onto `InlineAlert`:** the two `SearchSection` alerts above, `SentrySection.svelte`'s alert, `TodoistSection.svelte`'s `data-load-error`, and `AppearanceSection.svelte`'s catalog error box with its Retry action. Keep their copy and data hooks.

Out of scope: `BacklinksPanel` and `OutgoingLinksPanel` swallow fetch errors (`.catch(() => {})`); an alert there needs a store field and a service change. Other raw error text (`TrashSection`, `UpdateSection`, `AppearanceSection` toasts, `OneOnOnePicker`, `EventDailyNoteButton`, `ShowInCalendarButton`, `TypesNavigator`) stays. The Tasks view (see Comments).

**Blocked by:** 204

**Status:** ready-for-agent

**Answered:** nothing open. The scope above is the deep dive's minimum reading (`dossier-205` ambiguities 3 and 4), not an owner decision; the owner can widen it at review.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`. relay-lite's configured checks do not run `pnpm build`: the build step runs it once before its last commit and reports the result.

- [ ] Failing test first, new `src/tests/lib/features/search/SearchSection.test.ts`: with `invoke` rejecting `download_reranker_model` and `download_semantic_model` with `boom`, the section shows each fixed message in an element with `role="alert"`, `boom` appears nowhere in its `textContent`, and the error reaches `error('SEARCH', ...)` (mock `#lib/utils/debug.js` or spy on `console.error`). Red first: the raw text renders.
- [ ] Event calendar, changed on purpose: `EventCalendarView.test.ts` asserts the fixed message in `[data-calendar-load-error]` and no `boom` (the two tests that pin `boom` there), and the two toasts called without a `description` (the tests that pin `{ description: 'boom' }` and `{ description: 'tasks gone' }`); `event-calendar.service.test.ts` asserts the fixed `loadError` in the two tests that pin `'index gone'` and `'boom'`. The store tests stay (`setLoadError` still takes any text).
- [ ] Each migrated panel and section has a component test asserting the primitive's contract by role and text, not by class: `InlineAlert` has `role="alert"`; `EmptyState` renders the title and, where present, the action.
- [ ] Only three existing tests pin the old empty-state markup as `p.text-meta`: the "No backlinks found" test in `BacklinksPanel.test.ts`, and the empty-state tests in `OutgoingLinksPanel.test.ts` and `TableOfContentsPanel.test.ts`. Either the compact `EmptyState` keeps rendering a `<p class="text-meta ...">`, and they stay as they are, or they change on purpose to assert the same meta role through the primitive. `BacklinksPanel.test.ts`' `toContain('No backlinks found')` case, `TagsView.test.ts` and `SearchPanel.test.ts` use `toContain` and stay unchanged.
- [ ] `src/tests/lib/core/settings/settings-text.test.ts` and `chrome-type-scale.test.ts` stay green: a `<p>` a settings section keeps still uses `text-meta`.

## Notes

- **Source:** `.scratch/archived/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6; dropped from Issue 06 as copy and presentation work.
- **Size:** M after 204. If 204's primitives need per-panel theming, treat it as M to L and leave the settings half for a follow-up.
- **Launch only by its number, after Issue 204 is done.** Do not launch it from the ledger's next-up list.
- **Tone:** the panels use different muted colors (`text-right-sidebar-muted-fg` in Backlinks, Outgoing links and Table of contents, `text-file-explorer-muted-fg` in Search, `text-muted-foreground` in Tags and settings). The primitive must take its tone from the context (a prop or class), or the panels change color. The delivery comment says the panels were not checked by eye (relay agents cannot run the app); the owner checks them after the merge.
- `settings-text.test.ts` follows only local relative PascalCase imports, so a primitive imported from `#lib/components/ui/` is not scanned; its own text should still follow the `text-meta` role inside settings.
- Issue 212 rewrites the `TagsView.svelte` empty branch into two messages and a "Show all tags" button. Whichever lands second reconciles: if 212 is first, migrate its messages and button into `EmptyState` and its action.
- Same-file conflicts are possible with 014 and 046 (Backlinks, Outgoing links), 159, 160 and 212 (TagsView), 045, 057, 160 and 220 (SearchPanel), 092 (TrashSection), 034 and 202 (SentrySection), 155 (AppearanceSection).

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/60-panels-use-empty-error-primitives.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-10: the TodoistPopover mentions were removed: `todoist-bisync` Issue 15 deleted `TodoistPopover.svelte`.

- 2026-11-12: the Tasks view is out of this Issue. Its empty state and error alert are rewritten by the Tasks view chain (Issues 108 and 234) in plain markup, and that chain edits the same file until Issue 241; moving it onto the primitives is a follow-up after both 204 and 241.
- 2026-11-12: deep dive applied (SUMMARY 205, `dossier-129+198+205.md`, `cross-tests-relay.md` M7). The sites are the ones at `d2304ac9e`, by file and symbol; the stale audit lines and the "check the cited lines" triage note are gone. Minimum scope: true empties only, `SearchSection` and the event calendar for raw error text, five settings sections. Only three tests pin `p.text-meta` (not four). The calendar tests that pin raw text change on purpose. Read 204's delivered API first; launch only by number after 204.
