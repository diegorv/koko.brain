VERDICT: CHANGES_REQUESTED

# Review: help-examples 08, markdown-editor-vault data notes

Reviewed `git diff main...HEAD` (base 757dbb7d, commits d585bc08, 906a4f1b, 8e19b39e). Main has since moved to 24b41a60 (issue 09: templates, SCOPING.md, a new test). None of those files overlap this branch, and `git merge-tree main HEAD` merges cleanly.

## Test verdict rests on

- `./node_modules/.bin/vitest run src/tests/help`: 3 files (`examples-scoping.test.ts`, `queryjs-features-scoping.test.ts`, `type-definitions-views.test.ts`), 83/83 passed. I ran it myself.
- A throwaway probe (`src/tests/help/zz-probe-08.test.ts`, deleted afterwards, never committed). It ran `tags.logic.ts::extractAllTags` and a port of the Rust `TASK_RE` / fence logic (`parsing.rs:1167`, `1414`) over all 39 files. Results: 19 files with tags, 36 tags, 19 distinct. Tasks: 03-lists 12/9, 21-combined-stress 2/1, project-kokobrain 6/3, project-garden 4/1. Status on 8 notes, progress on 5. The only wikilinks to `22-queryjs` and to `daily-2026-02-13` are the ones the ESPERADO texts name.
- `pnpm check` was not run because the diff touches no `src/` file, only Markdown under `help/` and `.scratch/`. The Issue's Gate also excludes it.

## Acceptance criteria

- [ ] **Every collection and queryjs section in the four notes has at least one matching data note, and its ESPERADO text matches.** Partly met.
  - Met: every data-driven section now has matching notes, and its counts match the code. Checked: collection `hasTag` exact match (`evaluator.ts:501`), `null != 'backlog'` true and `null > 50` false (`evaluator.ts:279-281`, `toNumber(null)=0`), nulls sort last (`collection.logic.ts:273`), `progress != null` keeps `progress: 0`. QueryJS: `whereTag` prefix match (`data-array.ts:55`), `completed = checked` so `[/] [-]` etc. count as done (`queryjs.logic.ts:120`), `whereDate` inclusive (`data-array.ts:78`). Sleep 4,3,2,5,3,4,4 gives sum 25 and avg 3.6, energy avg 3.4, mood avg 4.0.
  - Not met: several ESPERADO texts state an order that the code does not produce. Finding 1 is a swap in three places; findings 2-5 are smaller. One section still points at a note that is not in this folder (finding 6). Cause: `kb.pages()` order is not arbitrary. It is the `collectionStore.propertyIndex` insertion order (`kb-api.ts:371`), filled from `get_all_property_records`, and that command sorts by absolute path (`src-tauri/src/commands/vault.rs:788-790`). So the index order is byte order of the path: `01-…` … `24-…`, then `data/bug-css-overflow`, `data/bug-login-timeout`, `data/daily-*`, `data/meeting-planning`, `data/meeting-retro`, `data/meeting-standup`, `data/project-garden`, `data/project-kokobrain`, `data/task-refactor-store`. `groupBy` and `countBy` keep first-occurrence order (`data-array.ts:135-150`, `329-336`), and `sort` is stable.
- [x] **The scoping guard still passes (data notes add no unscoped query).** Met. The data notes hold no `queryjs`/`collection` blocks. 22 §4's new source `` `"${kb.current().file.folder}/data"` `` is a folder-derived scope, and the guard passes 83/83.

## Other checks

- Scope: the Issue's Touches list covers all the changes. Backticking `#projeto` / `#type/project` in 22 is needed so the stated tag counts hold, since Rust does not strip `%%` comments but does strip inline code (`parsing.rs:442-446`). The frontmatter tags added to 24 are the minimum that makes §9 non-empty, and the header says so. The note language (Portuguese) matches the existing example notes. Every data note says it is fake.
- No source code, tests or layers touched, so CLAUDE.md's code rules do not apply.

## Findings

1. **Medium**: `help/examples/markdown-editor-vault/22-queryjs.md:379`, `24-queryjs-advanced.md:451`, `24-queryjs-advanced.md:587`. The status group order is wrong. In index order, the first `planning` note is `data/project-garden`, which comes before the first `backlog` note, `data/task-refactor-store`. The real order is therefore active 4, todo 1, completed 1, **planning 1, backlog 1**. 24:451 even says "(ordem da primeira ocorrencia)" and then gives a different order. Fix: swap `planning` and `backlog` in all three lines.
2. **Medium**: `22-queryjs.md:294` (§11e) and `22-queryjs.md:268` (§11d). Tie order and render order are wrong. In §11e the three rows tied on 3 pending keep index order: 03-lists 12/9/3, **project-garden 4/1/3, project-kokobrain 6/3/3**. Then 21-combined-stress 2/1/1. In §11d, `project-garden (1/4)` renders before `project-kokobrain (3/6)`. Fix: reorder both lines.
3. **Low**: `22-queryjs.md:36` (§2) and `22-queryjs.md:105-106` (§6). "nao alfabetica" is false, because the index order is sorted by path. Fix §2: the 3 links are `01-inline-formatting`, `02-headings`, `03-lists`. Fix §6: exactly 5 rows (01..05), and the Tags column is empty in all of them.
4. **Low**: `24-queryjs-advanced.md:189` (§5). The text hedges where the code is deterministic. Fix: `find('project'): project-garden`, `findIndex('project'): 36` (24 top-level notes + 2 bugs + 7 dailies + 3 meetings come before it).
5. **Low**: `24-queryjs-advanced.md:398` (§10). The stable desc sort keeps index order for the 2026-02-13 tie: daily-2026-02-13, **meeting-retro-feb13, meeting-standup-feb13**. Fix: write "(daily, retro, standup)".
6. **Low**: `23-queryjs-real-scripts.md:158` (§5). The ESPERADO still describes running from `weekly-2026-W07.md`. That note is not in this folder; it lives in `help/examples/queryjs-features/`. The header no longer says to copy that folder, so the main case of this section has no matching note. Fix: say the weekly note is in `queryjs-features/` (or drop that branch) and keep the "from THIS file" outcome. Do not add a weekly note to `data/`, because every 39-note count would change.
7. **Nit**: `22-queryjs.md:456` lists example tags "(type/journal/daily, type/meeting, meeting, team/engineering, ...)". That reads as the start of the joined string, but the string really starts `Sem, teste, manual, markdown, stress-test, combined, area/dev, team/engineering, bug, ...`. `20-collection.md:35` leaves out that 24-queryjs-advanced also fills `tags`, and that dailies and meetings fill only `tags`. `23-queryjs-real-scripts.md:301-302` (an unchanged line) lists `engineering` before `product`, but `meeting-planning-feb10` (product) is first in index order, so "Time: product (1)" renders first. Fix: reword or reorder these lines.

## Not verified

- Nothing was checked in the running app. Every order and count above comes from reading the code and from the probe. If the user creates a note while the vault is open, `updateRecord` appends it to the `propertyIndex` Map out of path order until the next full rebuild.

## Resolution

- Findings 1, 2, 4, 5, 6 and 7: fixed as described. Confirmed the path sort at `vault.rs:788-790` and the status and team tags of the data notes before editing.
- Finding 3: fixed in part. §2 now names 01-inline-formatting, 02-headings and 03-lists, and §6 says exactly 5 rows (01..05). I rejected "Tags column empty in all 5 rows": `02-headings.md:73` (`#Sem espaco ...`) gives the inline tag `Sem`, which is the first entry of the joined tag string in this same review. §6 now says 4 empty rows and 02-headings shows "Sem".
