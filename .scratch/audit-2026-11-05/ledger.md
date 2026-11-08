# Ledger: audit-2026-11-05

This file is the source of truth for the progress of the audit-2026-11-05 Issues. Read it before working on any of them. **Update it every time something is done**: the row status, the Branch / PR column, and one line in the Log.

## Continue

```text
/relay-lite:run audit-2026-11-05
```

Add Issue numbers to force them; `--all` runs every available Issue in sequence; `--all --parallel` runs the ones that touch different files at the same time.

## Process

The `relay-lite:workflow` workflow, one worktree per Issue at `<repo>.worktrees/issue-NN-slug`: build (discovery + implement), review (Claude or Codex), fix and re-review while changes are requested, deliver. Only deliver runs the full suite. Formats: relay-lite's `docs/format.md`.

## Statuses

| Status | Meaning |
|---|---|
| `todo` | Not started. |
| `in-progress` | Set by `/relay-lite:run` on `base` before it launches the Issue; still there after a run means it was interrupted (the worktree and branch may exist). `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `blocked` | Nothing was delivered: the build refused the Issue or returned nothing, the suite failing, a review or re-review that returned nothing, a re-review that still requests changes, a rebase conflict in source files, a failed push. The reason is in the Log; the worktree is kept. `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `in-review` | `pr` delivery: the PR is open, not merged yet; its URL is in Branch / PR. The next run checks it and sets `done` or `todo`. relay-lite does not delete the remote branch `issue/NN-slug` when the PR is merged or closed (GitHub does on merge if the repository auto-deletes head branches); after a close, delete it or renumber the Issue before the Issue runs again, or its push is rejected. |
| `done` | Delivered, and the Issue file says `Status: resolved`. |
| `wontfix` | Closed without work. |

## Next up

An Issue can start when its status is `todo` and every Issue in its "Blocked by" is `done`. Among those, take the lowest number.

## Issues

**Branch / PR**: in `merge` delivery `issue/NN-slug (<short sha>)`, the branch HEAD before deliver's ledger commit (after any rebase), never the final `base` HEAD (it names a commit of the branch, which never reaches the remote and which the body of the Issue's squash commit lists); in `pr` delivery the PR URL while `in-review`, then `<PR URL> (<short merge sha>)` once `/relay-lite:run` finds it merged; cleared when it finds the PR closed and sets the row back to `todo` (the URL stays in the `pr closed` Log line). **Merged**: always a date (YYYY-MM-DD); in `merge` delivery the date deliver wrote the row, before the squash commit; in `pr` delivery the date `/relay-lite:run` recorded the merge. Both cells stay empty on a row `/relay-lite:ledger` created as `done` from an Issue file already `Status: resolved`.

| # | Issue | Blocked by | Status | Branch / PR | Merged |
|---|---|---|---|---|---|
| 03 | [Quick Capture writes page titles, app ids and URLs into template frontmatter as valid YAML](issues/03-quick-capture-writes-page-titles-app-ids.md) | none | done | issue/03-quick-capture-writes-page-titles-app-ids (a48236edf) | 2026-11-06 |
| 10 | [Images in notes display for a vault under ~/kokobrain-vaults: the asset-protocol scope adds that root and keeps the folders the README documents](issues/10-images-notes-display-vault-under-kokobrain-vaults.md) | none | done | issue/10-images-notes-display-vault-under-kokobrain-vaults (4d9a270c6) | 2026-11-06 |
| 22 | [A note-list inline rename that the file name rules refuse says why, like the folder rename does](issues/22-note-list-inline-rename-that-file-name.md) | none | done | issue/22-note-list-inline-rename-that-file-name (5c90647ed) | 2026-11-06 |
| 24 | [A text search shows only its own results: a query with no hits says No results found, even right after a tag click](issues/24-text-search-shows-only-own-results-query.md) | none | wontfix | | |
| 33 | [kb.pages('"folder"') returns the notes in that folder and its subfolders only](issues/33-kb-pages-folder-returns-notes-that-folder.md) | none | done | issue/33-kb-pages-folder-returns-notes-that-folder (4d172a562) | 2026-11-06 |
| 34 | [The Tasks view treats only done and cancelled tasks as completed: [/], [!], [?] and [>] tasks stay listed under Hide completed](issues/34-tasks-view-treats-only-done-cancelled-tasks.md) | none | wontfix | | |
| 35 | [The Tasks view keeps its list and scroll position on screen while it refreshes after a toggle or an index update](issues/35-tasks-view-keeps-list-scroll-position-screen.md) | none | wontfix | | |
| 44 | [Copy Block Link reuses only a real trailing block ID; a line ending in [[Note#^id]] or x^2 gets a new ID](issues/44-copy-block-link-reuses-only-real-trailing.md) | none | done | issue/44-copy-block-link-reuses-only-real-trailing (92e997ca4) | 2026-11-06 |
| 45 | [Backlinks and Outgoing links show a load error with Retry, not an empty message](issues/45-backlinks-outgoing-links-show-load-error-retry.md) | 12 | wontfix | | |
| 55 | [Todoist sync tells the user when it could not reach Todoist or the token was rejected](issues/55-todoist-sync-tells-user-when-could-not.md) | none | wontfix | | |
| 60 | [Live preview paints no active-line background; source mode keeps it](issues/60-live-preview-paints-no-active-line-background.md) | none | done | issue/60-live-preview-paints-no-active-line-background (31df5caad) | 2026-11-06 |
| 67 | [The first semantic or hybrid search after a one-file index update does not reload the whole search cache](issues/67-first-semantic-hybrid-search-after-one-file.md) | none | wontfix | | |
| 87 | [Toasts and the editor's CodeMirror base follow the theme mode](issues/87-toasts-editor-s-codemirror-base-follow-theme.md) | none | done | issue/87-toasts-editor-s-codemirror-base-follow-theme (cc94c8675) | 2026-11-06 |
| 88 | [The graph view paints with the active theme's colors](issues/88-graph-view-paints-active-theme-s-colors.md) | none | done | issue/88-graph-view-paints-active-theme-s-colors (2526c56d4) | 2026-11-06 |
| 94 | [Right sidebar sections share one header recipe and one left edge](issues/94-right-sidebar-sections-share-one-header-recipe.md) | none | done | issue/94-right-sidebar-sections-share-one-header-recipe (cc62ad527) | 2026-11-06 |
| 122 | [A stale Tasks list never ticks the wrong task line on a clean tab or after an external edit](issues/122-stale-tasks-list-never-ticks-wrong-task.md) | none | wontfix | | |
| 133 | [QueryJS blocks written by a deep link or capture do not auto-run until the user trusts them](issues/133-queryjs-blocks-written-deep-link-capture-do.md) | none | wontfix | | |
| 143 | [Typing # in the editor suggests the vault's existing tags](issues/143-typing-editor-suggests-vault-s-existing-tags.md) | none | done | issue/143-typing-editor-suggests-vault-s-existing-tags (a44f9f3a9) | 2026-11-06 |

## Leftovers

## Log

- 2026-11-06 00:31 — ledger created (151 Issues)
- 2026-11-06 00:39 — 45 set to wontfix by hand: the round-2 second opinion found its error path unreachable in daily use (see the Issue); the CLI has no transition from todo to wontfix
- 2026-11-06 — 34, 35, 55 and 122 set to wontfix by hand: the owner kept the tasks-view Issues 02, 04, 06 and 20 that cover them (tasks-view PRD L4 (a))
- 2026-11-06 05:47 — 67 and 133 set to wontfix by hand from the owner's 2026-11-06 survey: 67 keeps option C (the one cache reload is accepted), 133 uses the existing autoRunQueries manual setting; the CLI has no transition from todo to wontfix
- 2026-11-06 05:48 — ledger updated (blocked by of 143)
- 2026-11-06 05:53 — ledger updated (title of 129)
- 2026-11-06 05:56 — ledger updated (title of 140)
- 2026-11-06 06:30 — ledger updated (added 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162; title of 07, 31, 124; blocked by of 26, 28, 31, 101, 142, 143)
- 2026-11-06 06:30 — 24 set to wontfix by hand: merged into 25 by the owner after the first-wave challenge review; the CLI has no transition from todo to wontfix
- 2026-11-06 06:50 — ledger updated (blocked by of 08, 13, 14, 16, 99, 101, 113, 128, 147)
- 2026-11-06 06:54 — 10 — start — launched by /relay-lite:run — d58d85d5b
- 2026-11-06 07:02 — 03 — start — launched by /relay-lite:run (parallel with 10) — a2aeb59a5
- 2026-11-06 07:25 — 03 — deliver — merged: capture placeholders quoted as YAML scalars, including one followed by a comment; R1 APPROVED, R2 APPROVED (fix b3661bb2e); full suite 12977 passed, build ok — a48236edf
- 2026-11-06 07:26 — 22 — start — launched by /relay-lite:run (parallel with 10) — 4cada6904
- 2026-11-06 07:36 — 10 — deliver — merged: asset-protocol scope adds $HOME/kokobrain-vaults; R1 APPROVED, no fix round; cargo 1314 passed, full suite 12979 passed, build ok; manual in-app image checks left for the owner — 4d9a270c6
- 2026-11-06 07:36 — 33 — start — launched by /relay-lite:run (parallel with 22) — 8ad679878
- 2026-11-06 07:44 — 22 — deliver — merged: inline rename to an illegal name toasts why; R1 APPROVED, one nit rejected; full suite 12981 passed after rebase, build ok — 5c90647ed
- 2026-11-06 07:44 — 60 — start — launched by /relay-lite:run (parallel with 33) — 619e2366a
- 2026-11-06 07:58 — 33 — deliver — merged: kb.pages folder source matches by path segment, leading slash and root handled; R1 APPROVED, fix 7002e0722, R2 APPROVED; full suite 12988 passed after rebase, build ok — 4d172a562
- 2026-11-06 07:58 — 44 — start — launched by /relay-lite:run (parallel with 60) — 4f5d753e5
- 2026-11-06 08:14 — 44 — deliver — merged: block ID rule ignores trailing block links and exponents; R1 APPROVED, no code fix; full suite 12995 passed, build ok; follow-up for extractBlockContent filed as 163 — 92e997ca4
- 2026-11-06 08:14 — 88 — start — launched by /relay-lite:run (parallel with 60) — 9905d20ab
- 2026-11-06 08:14 — ledger updated (added 163)
- 2026-11-06 08:15 — 94 — start — launched by /relay-lite:run (parallel with 60 and 88) — 4628d5bed
- 2026-11-06 08:20 — 60 — deliver — merged: no active-line background in live preview, blockquote and callout tint kept; R1 CHANGES_REQUESTED, fix c537e80f3, R2 APPROVED; full suite 13002 passed after two rebases, build ok; not checked visually — 31df5caad
- 2026-11-06 08:20 — 87 — start — launched by /relay-lite:run (parallel with 88 and 94) — f14b0ad78
- 2026-11-06 08:47 — 87 — deliver — merged: toasts and the editor base theme follow the theme mode; R1 APPROVED, no findings; full suite 13009 passed, build ok — cc94c8675
- 2026-11-06 08:48 — 143 — start — launched by /relay-lite:run (parallel with 88 and 94) — 7c85c5fa8
- 2026-11-06 09:17 — 88 — deliver — merged: graph view paints with the active theme's colors; R1 APPROVED with 2 findings fixed (79f2e0a02), R2 APPROVED; full suite 13051 passed after three rebases, build ok; theme-mode E2E not run — 2526c56d4
- 2026-11-06 09:32 — 94 — deliver — merged: SidebarSection wrapper for the four right sidebar sections; R1 APPROVED (1 of 4 findings fixed), R2 APPROVED; full suite 13064 passed after three rebases, build ok; first suite run had 8 load timeouts that passed on rerun; follow-ups filed as 164 — cc62ad527
- 2026-11-06 09:33 — ledger updated (added 164)
- 2026-11-06 09:41 — 143 — deliver — merged: typing # suggests the vault's tags, skipping fences and the tag after the cursor; R1 APPROVED, fix 7caeaf8a1, R2 APPROVED; full suite 13103 passed after two rebases, build ok — a44f9f3a9
- 2026-11-08 12:00 — ledger updated (moved 146 open Issues to .scratch/open-itens: 01→001, 02→002, 04→003, 05→061, 06→004, 07→005, 08→016, 09→006, 11→062, 12→014, 13→015, 14→038, 15→039, 16→040, 17→041, 18→063, 19→064, 20→042, 21→043, 23→044, 25→045, 26→046, 27→047, 28→049, 29→050, 30→051, 31→052, 32→053, 36→054, 37→155, 38→156, 39→157, 40→007, 41→055, 42→158, 43→056, 46→036, 47→159, 48→057, 49→160, 50→161, 51→058, 52→026, 53→162, 54→163, 56→059, 57→164, 58→165, 59→166, 61→211, 62→066, 63→212, 64→213, 65→214, 66→215, 68→151, 69→217, 70→218, 71→199, 72→219, 73→221, 74→223, 75→224, 76→225, 77→226, 78→227, 79→065, 80→060, 81→220, 82→201, 83→197, 84→198, 85→195, 86→196, 89→200, 90→202, 91→208, 92→209, 93→194, 95→207, 96→203, 97→071, 98→017, 99→018, 100→088, 101→027, 102→023, 103→024, 104→025, 105→089, 106→090, 107→076, 108→077, 109→096, 110→078, 111→091, 112→028, 113→029, 114→092, 115→030, 116→031, 117→079, 118→093, 119→094, 120→095, 121→105, 123→048, 124→020, 125→107, 126→080, 127→081, 128→082, 129→083, 130→097, 131→084, 132→098, 134→085, 135→103, 136→104, 137→169, 138→170, 139→086, 140→171, 141→087, 142→152, 144→153, 145→204, 146→205, 147→206, 148→183, 149→184, 150→185, 151→186, 152→008, 153→019, 154→099, 155→100, 156→022, 157→106, 158→167, 159→222, 160→101, 161→216, 162→102, 163→168, 164→210)
