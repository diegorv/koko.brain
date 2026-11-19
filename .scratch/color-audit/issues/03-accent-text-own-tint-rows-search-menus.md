# 03: Accent and status text on its own tint: rows, search, menus

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause B). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build:**

Primary, file-explorer-primary or destructive text drawn on a 10 to 25% tint of the same color fails 4.5:1 on many themes (8 high in the table). Text on a tint needs its own color: the color moved toward the theme text, the pattern the app already uses for `--event-*-fg` (`src/app.css:404-410`) and kanban chips (`COLOR_PRESET_CHIP_TEXT`).

1. Add text-on-tint tokens in `src/app.css` next to `--event-*-fg`: one each for primary, file-explorer-primary and destructive (for example `--primary-tint-fg: color-mix(in oklab, var(--primary) N%, var(--foreground))`). Pick the share by measurement so the text reaches 4.5:1 on its tint over every surface it is used on, on the built-in themes and the hard palettes fixture (Issue 02 runs in parallel and creates the shared fixture under `src/tests/fixtures/`; do not create or edit that file here. Build the hard palettes inside this Issue's own test file instead, from the Zettlr Bielefeld Light and Tolaria Light palettes of the themes repo, with a source comment; a later Issue may move them onto the shared fixture).
2. Use them on: the selected note row title, subtitle and pills (`NoteRow.svelte:108,127,141`; the idle pills fail too), the selected Files and Types navigator rows and their counts (`FilesNavigator.svelte:347,349,569`, `TypesNavigator.svelte:299`), the search result source badges (`SearchResult.svelte:151-156`), the collection filter count pill (`FilterPanel.svelte:96`), the BuildInfo channel badge (`BuildInfo.svelte:29`), the Tasks refresh error banner (`TasksView.svelte:634`), the mod run Failed status (`ModActionPicker.svelte:19`), and the highlighted destructive item in dropdown and context menus (`dropdown-menu-item.svelte:23`, `context-menu-item.svelte:23`).
3. Muted text on those selected rows (counts, subtitles) uses the same rule or `foreground`, measured.

Not in this ticket: kanban, collection evaluator and file history (Issue 04), the builder surfaces for muted text on hover and selected rows (Issue 05).

**Size:** M

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, a contrast test over `BUILTIN_THEMES` and the hard palettes fixture: each new token, resolved with `mixColors` (OKLab, as `color-mix(in oklab)`), is at least 4.5:1 on its tint flattened over each surface it is used on (fileExplorerBg for rows, popover for menus, background for search), and the old raw color on the same stack fails on at least one theme.
- [ ] Component tests: the selected `NoteRow` title and pills, a search badge and the destructive menu item carry the new token class or style, not `text-primary` / `text-destructive`.
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `features/collection/toolbar/FilterPanel.svelte:96` Filter count pill uses text-primary on bg-primary/15 at 11px | medium | 15/28 themes under 4.5: Sakura 3.11 (Lc45), Willemstad Dark 3.43, Graphite Violet 3.50, Zettlr Frankfurt Dark 3.73, Shimmering Focus Light 3.74, Ko... |
| `features/note-list/NoteRow.svelte:141` Note-list property and type pills: text-primary on bg-primary/10 under 4.5 on 10 themes | medium | text-primary on primary/10 over list-bg. Row at rest: 10/28 fail (8 light, 2 dark), worst Twilight Violet 3.49 (Lc -32), Willemstad Dark 3.77, Shim... |
| `features/note-list/NoteRow.svelte:127` Selected row text (primary on its own 25% tint) below 4.5:1 in the note list, Files and Types navigators | high | primary on primary/25 over list-bg fails 21/28 (13 light, 8 dark): Twilight Violet 2.82 (Lc -28), Zettlr Karl-Marx-Stadt Light 3.10, Sakura 3.11, K... |
| `features/rail-shell/FilesNavigator.svelte:569` Muted and badge text on hovered/selected row tints: counts and note subtitle drop below 4.5:1 | medium | Selected nav tint: fe-muted-fg and badge-fg counts fail 21/28, KokoBrain Default 3.08 (Lc -32), Lavender Haze 3.15. Subtitle in muted-foreground on... |
| `features/search/SearchResult.svelte:151` File-explorer primary as text and as a tint in the search panel fails | medium | Both/Semantic badge (primary on primary/15 over list-bg) 3.25 Twilight Violet, 3.54 Shimmering Focus Light, 3.56 Sakura, 3.61 Zettlr light, 14/28; ... |
| `features/note-list/NoteRow.svelte:108` Active note row: title, subtitle and pills sit on bg-primary/25 and fail AA | high | Active row bg = list-bg + primary/25. Title text-primary fails on 21/28: KokoBrain Default 3.70 (Lc41), Lavender Haze 4.04, Twilight Violet 2.82 (L... |
| `features/rail-shell/FilesNavigator.svelte:347` Selected row in Files and Types navigators: primary text on its own 25% tint | medium | file-explorer-primary on nav-bg + primary/25 fails on 20/28: Shimmering Focus Light 2.97, Zettlr KMS Light 2.98, Sakura 3.01, Twilight Violet 3.06,... |
| `features/rail-shell/TypesNavigator.svelte:299` Types navigator row counts on the selected row tint | medium | file-explorer-badge-fg on the selected tint fails on 21/28: KokoBrain Default 3.09 (Lc32), Lavender Haze 3.15, Tolaria Light 3.20, Zettlr Bielefeld... |
| `features/rail-shell/FilesNavigator.svelte:349` Selected row in Files and Types navigators: file-explorer-primary on its 25% tint, plus muted counts | medium | Same figures as FilesNavigator.svelte:347 (20/28) and TypesNavigator.svelte:299 (21/28). The FilesNavigator.svelte:569 muted count has the same val... |
| `features/search/SearchResult.svelte:153` Search result Semantic and Both badges: primary-colored text on its own 15% tint fails 4.5:1 in 14 themes | medium | Both badge (file-explorer-primary on primary/15 over list-bg) 14/28 under 4.5: Twilight Violet 3.25 (Lc 31), Shimmering Focus Light 3.54, Sakura 3.... |
| `features/search/SearchResult.svelte:155` Search result Semantic and Both badges: accent text on a 15% accent tint | medium | Duplicate of SearchResult.svelte:153 (same badges, same numbers). The fuzzy toggle (SearchPanel.svelte:348) sits on the input's bg-background, not ... |
| `core/settings/BuildInfo.svelte:29` BuildInfo channel badge text fails 4.5:1 on most themes for every channel | medium | In Settings (20% tint over setting-item-bg): stable 15/28 (Lavender Haze 3.13, Lc 43), nightly 15/28 (Lavender Haze 3.16), preview 23/28 (5 under 3... |
| `features/tasks/TasksView.svelte:634` Tasks refresh error banner text and Retry too faint on destructive tint | medium | destructive on destructive/10 over editor-bg: 15/28 under 4.5, 2.79 (Lc 25) Zettlr Berlin/Bielefeld/Frankfurt/Karl-Marx-Stadt Dark, 2.96 Bordeaux D... |
| `features/search/SearchResult.svelte:156` muted text on --muted chips (SearchResult 'Text' badge, Off/Archived/count chips) | medium | muted-foreground on --muted fails on 14/28 themes: 2.52 Lc27 Zettlr Bordeaux Dark, 2.58 the other Zettlr Dark themes, 3.68 Zettlr Light, 3.87 Twili... |
| `components/ui/dropdown-menu/dropdown-menu-item.svelte:23` Highlighted destructive menu item (Delete) is 2.5 to 3:1 on dark themes | medium | Highlighted destructive item, text-destructive on destructive/20 over popover (dark) or /10 (light): fails on 18/28 themes. Dark: 2.56 Lc23 Zettlr ... |
| `plugins/mods/ModActionPicker.svelte:19` Mod run 'Failed' status text in destructive fails on popover | medium | 2.96:1 Zettlr Bordeaux Dark, 3.02 KokoBrain Default (Lc -30), 3.11 Zettlr dark, 3.97 Sakura, 4.09 Shimmering Focus Light |
| `components/ui/context-menu/context-menu-item.svelte:23` Highlighted destructive menu item (Delete in Files/Types/kanban menus) red text on its own tint fails on 18 themes, including the default | medium | 2.56:1 Zettlr Bordeaux Dark (Lc 23), 2.62 other Zettlr dark, 2.63 KokoBrain Default (Lc 27), 3.48 Sakura, 4.42 Lavender Haze; at rest 12/28 under 4... |
| `components/ui/context-menu/context-menu-item.svelte:23` Destructive context/dropdown menu item ('Delete') is about 3:1 on the default theme and Zettlr Dark | medium | 3.02:1 (Lc30) KokoBrain Default, 2.96 Zettlr Bordeaux Dark, 3.11 (Lc27) other Zettlr Dark; highlighted 2.56-2.63 |
| `features/note-list/NoteRow.svelte:141` Note-list type and property pills fail on idle rows too | medium | 3.49:1 Twilight Violet, 3.77 Willemstad Dark, 3.78 Shimmering Focus Light, 3.79 Sakura, 3.82-4.17 Zettlr Light, 4.32 Tolaria Light |
| `features/search/SearchResult.svelte:153` Hybrid search source badges (Both / Semantic / Text) under 4.5, Text badge about 2.5:1 on Zettlr Dark | medium | Both 3.25:1 (Lc31) Twilight Violet, 3.54 Shimmering Focus Light, 3.56 Sakura, 3.57 Willemstad Dark; Text 2.52-2.58:1 (Lc27-28) Zettlr Dark |

## Sequence with

- Issue 01 touches `PropertiesView`/`KanbanView`, not these files; Issue 05 changes how `primary` is lifted, so rebase and re-measure if 05 lands first.
- shell-sidebars-ux and finders-ux tickets that edit `NoteRow.svelte` or `SearchResult.svelte`: rebase, never in parallel.

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
