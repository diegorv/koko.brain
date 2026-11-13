# Validation of sweeps s7 and s8

Checked 2026-11-12 against HEAD `318b6e9b5`. Read-only: no tests, no build, no app run. "Verified" means I read the cited line at HEAD. "Inference" means reasoning, not a read or a run. Stance: I assumed every rating was wrong and tried to break it.

Short answer: no Issue in either sweep is high impact for this owner. The sweeps got the facts right: every "still present" claim I checked holds at HEAD. They overrate 159 and 214 and leave out one series constraint on 230. 161 holds up and also has a spec defect the sweep missed.

## Confirmed additions

| Issue | Impact | Complexity | Risk | Verdict |
|---|---|---|---|---|
| 161 fuzzy search 500 cap | Low to medium | S | Low | Confirmed. Put it at the end of the queue (after 002). Correct the Issue's spec first (see below) |
| 230 linear calendar bar geometry | Medium if the owner uses linear-calendar views, zero if not | S | Low | Confirmed, but only if the owner says yes to the usage question. It falls under the VE series rule |
| 214 active row hover fill, kanban lane grip | Low (s8 says medium) | S code, M gate (two E2E checks) | Low | Confirmed as an optional cheap rider, not a main-queue item |

### 161 evidence (verified)

- `src-tauri/src/search/fuzzy.rs:56` builds the pattern `<first char>%`. `:58` caps the candidates at 500. `:62-66` runs Levenshtein over those candidates only.
- `src-tauri/src/db/fts_repo.rs:258` runs `SELECT DISTINCT term FROM notes_fts_vocab WHERE term LIKE ?1 LIMIT ?2`.
- `src-tauri/src/db/schema.rs:148` declares `fts5vocab(notes_fts, instance)`, which has one row per token occurrence.
- `src-tauri/src/commands/search_index.rs:389` calls this for every query term when fuzzy is on. Fuzzy is on by default (`src/lib/features/search/search.store.svelte.ts:22`, mode `text` at `:21`).
- `help/documentation/06-search-and-navigation.md:123` promises that "meating" finds "meeting".
- Impact: a typo search returns nothing once more than 500 distinct terms share the first letter and sort before the target. Inference: a vault of about 4.5k notes passes that easily for common letters. Search is not on the owner's daily list, so impact stays low to medium.
- Second effect (inference, not measured): the `instance` table is not bounded by `LIKE`, so for a rare first letter one fuzzy term walks every token occurrence in the vault before LIMIT can stop it. This hits every text search, typo or not. Per the memory rule, latency is reported, not gated, so I only flag it.
- **Spec defect the sweep missed (FTS5 behavior from memory, not checked in the SQLite source):** the tokenizer is `unicode61 remove_diacritics 2` (`src-tauri/src/db/schema.rs:13`). The vocab therefore stores folded terms (`exito`, not `éxito`). The query term is only lowercased (`fuzzy.rs:52`). So a query whose first letter is accented gets no candidates at all, today and after the planned range fix. The Issue's criterion "A first letter outside ASCII (e.g. 'é') still finds its close matches" cannot pass unless the implementer folds diacritics on the query term before building the range, or uses an unaccented non-ASCII letter in the test. Accents elsewhere in a word also inflate the Levenshtein distance against folded candidates. Fix the Issue text before launching it.
- Open point (from memory): fts5vocab's xBestIndex accepts `=`, `<`, `<=`, `>`, `>=` on `term`, and does not accept `LIKE`. The range rewrite depends on that. The implementer should confirm it with a test, not by reading docs.

### 230 evidence (verified)

- `src/lib/features/collection/CollectionLinearCalendarView.svelte:67-73`: `getBarLeft` and `getBarWidth` divide by `daysInMonth`.
- The track is `repeat(31, 1fr)` at `:144` and `:163`, and the overlay spans 31 columns at `:189-194`. The bar for February day 28 lands about three columns right of its column.
- Correction to s8: s8 says 230 is "not in the deferred 131-144 chain". That is true, but the Issue's origin is view-engine-fixes 05, a VE Issue. The priority file says "every VE and VD Issue" runs in series with `RailNoteList` / `lens.logic.ts` / `CollectionView.svelte` (`.scratch/open-itens/priority-2026-11-08.md:62`). 230 touches only `CollectionLinearCalendarView.svelte` and `linear-calendar.logic.ts`, so the code does not collide. The rule still means it should not run alongside the queued 009/010/012/067/068/070 without an explicit exception.
- Usage is unknown (the Issue's own Notes say so). Ask the owner before queueing.

### 214 evidence (verified), and why the rating drops to low

- `src/lib/features/note-list/NoteRow.svelte:70` puts `hover:bg-primary/10` and `{isActive ? 'bg-primary/25' : ''}` on the same button. Tailwind is `^4.3.4` (`package.json:104`). Inference: the hover rule has higher specificity (class plus `:hover`), so on hover the active row drops to the 10% fill. NoteRow renders the rail lists (`src/lib/features/rail-shell/RailNoteList.svelte`), so the owner sees this every day.
- `src/lib/plugins/kanban/KanbanLane.svelte:236` uses the unnamed `group-hover:opacity-60` under `group/lane` (`:215`). `:356` and `:391` already use `group-hover/lane`. The only bare `group` I found outside kanban is the vault picker (`src/routes/(app)/+page.svelte:47`), which is not a lane ancestor.
- Why low: both halves are cosmetic. The grip stays `draggable="true"` with `cursor-grab` at opacity 0 (`:236-238`), so lane reorder still works, just invisibly. No function is lost.
- The fix pattern s8 cites does exist at `src/lib/features/rail-shell/TypesNavigator.svelte:282-283` (s8 gives only the filename).

## Rejected additions

- **159 Tags view blanks and collapses on refresh.** The code facts hold: `tags.service.ts:27` always calls `setLoading(true)`, `TagsView.svelte:79-80` swaps the list out, and `TagItem.svelte:19` keeps `open` in local state. s7 missed that `TagsView` is mounted only while the Tags tab is the active tab (`src/lib/app/EditorView.svelte:41,74-75`). So expanded state is already lost on every tab switch, whatever the Issue fixes. The refresh-while-open case needs a `vault-index-updated` event while the Tags tab is in front. With no external writer, only background writes such as Quick Capture or Auto Organize can cause one. The Tags tab is not on the owner's daily list. What remains is a blank of about 1 s on each open. Impact is low, not medium.
- **225 personal-week example sortMode.** Present: `help/examples/kanban-features/personal-week.kanban:24` has `"unchecked"`, which is not in `KanbanSortMode` (`src/lib/plugins/kanban/kanban.types.ts:43`). `canReorderItems` then disables card drag (`KanbanView.svelte:173,534`). I grepped `src/lib` and `src-tauri/src` and nothing copies `help/examples` into a vault (the one hit is a JSDoc comment in `kb-api.v1.ts:709`). The owner's boards are not affected. Docs batch only.
- **158, 155, 164 (s7 riders).** All present and all low. 158: `wikilink-embed-plugin.ts:19-23` returns null for `300x200`. 155: no `onDestroy` or effect cleanup in `ThemeEditor.svelte` or `AppearanceSection.svelte`. 164: `QuickSwitcher.svelte:41-58` passes the raw query to `createFile`, which also reads sibling names from the vault root, not from the target folder (`fs.service.ts:198-202`). A collision inside an existing folder therefore also ends at "Failed to create file." None loses data. Keep them as riders when their files are already open (158 with 062 in the `widgets.ts` series), not as queue items.
- **211, 221 (s8 optional).** Present (`live-preview/styles.ts:406` `paddingRight: '24px'`; `code-highlight.logic.ts:5` registers `common` only, while `code-block-widget.ts:41-47` lists powershell, dockerfile, elixir, haskell, scala). Both are polish. 211 carries live-preview risk for 24 px. Reject from the queue.

## Issues confirmed fixed

None of 152-171 or 194-232 is fully fixed at HEAD, and neither sweep claims one is. The items the sweeps marked done or partly done:

- **198** done: commit `1198d8e7b` "fix: status colors use theme tokens, test forbids palette (Issue 198)". Ledger row at `ledger.md:214`.
- **229** done: commit `8ab6672fa` "docs: say plainly that the Todoist token lives in the vault (Issue 229)". Ledger `:244`.
- **152** partly done: commit `015f8c18f` "feat: task tags follow the note tag rule (Issue 075)". Task tags now use `scan_inline_tags` (`src-tauri/src/vault/parsing.rs:1938-1940`). The digit-first rejection is still at `:469-473`, and `INDEX_SCHEMA_VERSION` is 7 (`src-tauri/src/vault/index_cache.rs:18`). Also, blocker 151 is done (`07ec74a68`, `ledger.md:167`), so of 152's blockers only 040 and 048 remain. The Issue file still lists `040, 151, 048`.
- **224** partly done: the 3000 ms default is right at `help/examples/auto-organize-features/README.md:41`. Step 4 is not re-checked here.

## Missed bugs and rating corrections (spot-checks of low-rated Issues)

I spot-checked five low-rated Issues: 167, 201, 163, 168 and 159 (159 is above). None hides a high-impact bug in the owner's daily features. Two ratings need corrections.

1. **167 (tables, rated low to medium) is the wrong place to look. Its blocker 055 holds the daily-table bug.** `paste-html-link.logic.ts:21-26` `BLOCK_TAGS` has `TABLE` and `TR` but no `TD`/`TH`. When a copied web table has a link the plain text lacks, `htmlLinksToMarkdown` takes over the paste (`:75-79`) and fuses each row's cells (`NameStatus`). The owner pastes into tables daily, and 055 is S, pure `.logic.ts`, low risk. Sweep s3 covers 055 (`sweep-s3-phase2-b.md:16,35`), so the gap is s7's alone: anyone ranking 167 should rank 055 first. I did not re-rate 055.
2. **201 (rated "no corrupt data") can delete file history.** `FileHistorySection.svelte:38-41` clamps on every keystroke, so a cleared field stores 1. That value is persisted, and the next vault open runs `cleanup_history(retentionDays)` (`src/lib/app/lifecycle/app-lifecycle.service.ts:296-298`). With 1 day, `src-tauri/src/commands/history.rs:147-166` deletes every snapshot older than 31 days and thins days 1 to 31 to one per day. The likelihood is low: the field visibly shows "1", and the usual typing path ends at a larger number (130), not a smaller one. The severity is unrecoverable loss of history, though. It stays low impact, but it is not harmless.
3. **163 (low) holds.** `templates.service.ts:111-121` has no parent mkdir, and one catch (`:122-124`) aborts the rest of the loop. The failure only skips empty placeholders on a vault without those subfolders.
4. **168 (low) holds.** `embed-resolver.logic.ts:40-50` matches `line.includes('^id')`. A wrong match needs an earlier line that contains the same 6-char ID. Inference beyond the Issue: only the marked line is returned, not a multi-line paragraph, but that is rare.

## Not verified

- Tailwind specificity for 214 comes from reading the classes, not from a browser.
- The fts5vocab constraint support and the diacritic folding of vocab terms in 161 are from memory of SQLite FTS5 behavior.
- Whether the owner uses linear-calendar views (230), the Tags tab (159) or Quick Switcher create-with-path (164) is unknown.
