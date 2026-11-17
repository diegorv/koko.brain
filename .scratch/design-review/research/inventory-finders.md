# Inventory: Search, command palette, quick switcher

Scope: `src/lib/features/search`, `src/lib/features/command-palette`, `src/lib/features/quick-switcher`, plus the shared shadcn primitives they render (`src/lib/components/ui/command`, `dialog`) and the openers/mounts that wire them. Facts only, all cited path:line. Read-only scout.

## 1. Components

| Path | Lines | Renders | UI primitives | Custom markup |
|---|---|---|---|---|
| `src/lib/features/search/SearchPanel.svelte` | 171 | Rail Search panel: header with input, mode toggle (Text/Semantic/Hybrid), index stats line, result list | `ScrollArea` (`:5`, used `:113`) | Raw `<input>` (`:154-162`), 3 mode `<button>`s (`:84-96`), fuzzy `~` `<button>` (`:164-168`), status `<p>`s, result list `div`s |
| `src/lib/features/search/SearchResult.svelte` | 178 | One result card: icon, title, badge or score, subtitle (path or `§ heading`), 2-line snippet, Show-in-Calendar button | none | Fixed `h-20` wrapper (`:135`), `<button>` row (`:136-173`), `lucide` FileText (`:142`), `ShowInCalendarButton` sibling (`:176`) |
| `src/lib/features/search/SearchSection.svelte` | 159 | Settings > Search section: semantic switch, download progress, error text, reranker row | `Button` (`:4`, used `:140`), `Switch` (`:5`, used `:105`), `SettingItem` (`:17`) | `<h2 class="mb-4 text-lg ...">` (`:99`), progress `div`s (`:112-119`, `:146-153`), error `<p>`s (`:121-123`, `:155-157`) |
| `src/lib/features/search/SearchStatus.svelte` | 29 | Status-bar text: Indexing..., Building embeddings..., notes/chunks count | none | `<span>`s with lucide icons (`:10-28`) |
| `src/lib/features/search/SemanticIndexStatus.svelte` | 69 | Status-bar label for the active markdown tab (Loading model... / Indexed (N chunks) / Not indexed) | none | `<span title={label.text}>` (`:59`) |
| `src/lib/features/command-palette/CommandPalette.svelte` | 72 | Cmd+P dialog: command list with label, category subtitle, shortcut | `Command.Dialog/Input/List/Group/Item/Empty/Shortcut` (`:2`, `:40-71`) | `<span>` label + category (`:58-59`) |
| `src/lib/features/quick-switcher/QuickSwitcher.svelte` | 111 | Cmd+O dialog: file list (name + vault-relative path), archived styling, create-note row | `Command.Dialog/Input/List/Group/Item/Empty` (`:2`, `:63-110`) | `FileText`/`Archive`/`FilePlus` icons (`:81-103`), `<span>`s (`:86`, `:88-90`) |
| `src/lib/components/ui/command/command-dialog.svelte` | 40 | Shared wrapper: sr-only title/description, `Dialog.Content` with `p-0 overflow-hidden`, Tailwind arbitrary overrides for input h-12, item py-3, svg size | `Dialog` | arbitrary class string (`:33`) |
| `src/lib/components/ui/command/command-list.svelte` | 17 | List container | bits-ui Command | `max-h-[300px] ... overflow-y-auto` (`:15`) |
| `src/lib/components/ui/command/command-input.svelte` | 26 | Input row | bits-ui Command, lucide Search | wrapper `h-9 border-b ps-3 pe-8` (`:14`), input `h-10 ... outline-hidden` (`:19`) |
| `src/lib/components/ui/command/command-item.svelte` | 21 | Row | bits-ui Command | `aria-selected:bg-accent` (`:16`), `py-1.5 px-2 outline-hidden` (`:16`) |
| `src/lib/components/ui/command/command-empty.svelte` | 17 | Empty row | bits-ui Command | `py-6 text-center text-sm` (`:15`) |
| `src/lib/components/ui/command/command-shortcut.svelte` | 21 | Shortcut label | none | `text-muted-foreground ms-auto text-xs tracking-widest` (`:16`) |
| `src/lib/components/ui/command/command.svelte` | 28 | Root | bits-ui Command | `bg-popover text-popover-foreground ... rounded-md` (`:24`) |
| `src/lib/components/ui/dialog/dialog-content.svelte` | 45 | Modal shell: centered, `max-w-lg`, `rounded-xl`, `shadow-xl`, close X with sr-only "Close" | bits-ui Dialog | `z-50`, `duration-200`, `top-[50%]` (`:30`); X button (`:37-42`) |
| `src/lib/components/ui/dialog/dialog-overlay.svelte` | 20 | Scrim | bits-ui Dialog | `fixed inset-0 z-50 bg-scrim` (`:16`) |

Mounts and openers:
- `AppOverlays.svelte` imports and mounts `QuickSwitcher` and `CommandPalette` (`src/lib/app/AppOverlays.svelte:5-6`).
- `AppShell.svelte` mounts `SearchPanel`, `SearchStatus`, `SemanticIndexStatus` (`src/lib/app/AppShell.svelte:46`, `:50`, `:52`).
- `SearchSection` is mounted in settings (`src/lib/app/SettingsPanel.svelte:8`).
- Search input is refocused via `openSearch()` (`src/lib/features/search/open-search.service.ts:11-15`), also called from `TagsView.svelte:18` and `editor-host.ts:192` with `tag:` queries.
- Debounced search trigger, 200 ms: `src/routes/(app)/+layout.svelte:169-176` (`performSearch()` at `:176`).

## 2. States

Empty / loading / error / disabled, with visibility.

Search panel (`SearchPanel.svelte`):
- Loading, result list: `Searching...` `<p>` (`:115-116`), gated on `searchStore.isSearching`.
- Empty, no query: "Type to search across all files" (`:117-118`).
- Empty, no results: "No results found" (`:119-120`). This branch also covers failed searches; see error below.
- Index build in progress: spinner + `semanticProgress?.message ?? 'Building index...'` (`:100-104`). Shown together with a query that can still say "No results found" (`:119-120`); the two are not mutually exclusive.
- Index stats: `Indexed: N notes` (`:105-106`), chunk count (`:107-109`). When `indexStats` is null nothing renders (`:105`, no else branch).
- Mode buttons: `disabled` and `opacity-40 cursor-not-allowed` when `!modelAvailable` (`:89-90`). No title/tooltip explaining why.
- Fuzzy `~` toggle: has `title` only ("Fuzzy matching enabled/disabled", `:167`). Shown only in text mode (`:163`).
- No error branch in the panel. Search errors are logged only: `search.service.ts` outer catch `error('SEARCH','Search failed:')` (`src/lib/features/search/search.service.ts:269-270`), FTS failure falls back silently (`:229-237`), semantic failure sets `[]` silently (`:257-261`). The user sees "No results found".

Status bar (`SearchStatus.svelte`, `SemanticIndexStatus.svelte`):
- Indexing / embedding spinner: `:9-18` (SearchStatus). Gated on store flags only.
- Renders nothing when there are no stats (`SearchStatus.svelte:24-28`, no else). `SemanticIndexStatus.svelte:58` renders nothing when `label` is null or semantic is off.
- Loading state: `LoaderIcon` with `opacity-60` and "Loading model..." text (`semantic-index-status.logic.ts:46`, `SemanticIndexStatus.svelte:62-63`).
- Status fetch failure: silently `status = null`, which hides the label (`SemanticIndexStatus.svelte:47-49`).

Settings section (`SearchSection.svelte`):
- Switch disabled while downloading (`:105-108`).
- Download progress: spinner + `semanticProgress?.message ?? 'Downloading model...'` (`:112-119`).
- Error text, raw `String(err)` shown to user, `text-destructive` (`:121-123`, `:155-157`). Not translated, not actionable.
- Reranker: "Installed" text (`:137-138`) or "Download" button, disabled while downloading (`:140`). Button text `Downloading…` uses a Unicode ellipsis (`:141`).
- Reranker progress: spinner with `'Downloading reranker...'` fallback (`:146-153`).
- No error state for `refreshRerankerStatus` (`:25-33`): failure only goes to `debug`.

Search result card (`SearchResult.svelte`):
- No loading or pending state on click; `handleClick` (`:106-131`) has no try/catch and no feedback. Errors from `openNoteAt` (`:112`, `:119`, `:126`) are not caught. `openFileInEditor` (`:108`, `:114`, `:121`, `:128`) is not awaited in some branches.
- Empty snippet: renders empty `<p>` (`:166-171`).

Command palette (`CommandPalette.svelte`):
- Empty: `No commands found.` (`:68-69`).
- Command failure: `console.error` (`:34`) plus `toast.error('Command "…" failed.')` (`:35`). Palette closes before the action runs (`:28-29`).

Quick switcher (`QuickSwitcher.svelte`):
- Empty, no query: `No files found.` (`:107-108`).
- Empty, with query: a "Create ..." row replaces the empty state (`:96-106`). The `No files found.` text is therefore only reachable with an empty query.
- Create failure: `catch {}` swallows the error (`:49-54`), toast `Failed to create file.` (`:52`). No console/debug log.
- Archived files: icon `Archive` `text-muted-foreground/50` (`:80-81`), title `opacity-50` (`:86`). No label, tooltip or legend.
- No loading state while `createFile` runs (`:50`).

Visibly absent states:
- No error UI in SearchPanel, SearchStatus, SemanticIndexStatus. Failures are silent or logged (see above).
- No loading indicator on opening a search result or palette/switcher item.
- No "index not built" state: an empty index shows "No results found" (`SearchPanel.svelte:119-120`).
- Semantic mode with model not available: buttons only disabled (`SearchPanel.svelte:89-90`). Nothing explains the cause.

## 3. Interaction

Keyboard:
- Search input: Escape blurs the input (`SearchPanel.svelte:36-39`). No Escape-to-clear. No Enter handler. No ArrowUp/ArrowDown navigation across results (result list is plain buttons, `:125-145`).
- Global "/" opens search: `src/lib/app/global-keybindings.ts:40-49` (listener), registered at `:225`. Skips typing targets and `[role="dialog"]` (`:43-44`).
- Cmd+Shift+F opens search: `global-keybindings.ts:102-106`; palette entry `search:toggle` label "Search in Vault" (`src/lib/app/commands.ts:201-206`).
- Cmd+P toggles palette: `global-keybindings.ts:64-67`. Cmd+O toggles quick switcher: `global-keybindings.ts:70-73`. Palette entry "Open Quick Switcher" (`commands.ts:194-199`).
- Command palette and quick switcher keyboard nav (arrows, Enter) comes from bits-ui `Command` (not in this area). Both pass `shouldFilter={false}` (`CommandPalette.svelte:43`, `QuickSwitcher.svelte:66`), so ranking is custom.
- Quick switcher create row: Enter runs `createAndOpenNote` through `Command.Item onSelect` (`QuickSwitcher.svelte:98-105`).
- Palette shortcut labels come from `shortcutFor()` (`commands.ts:53`, `:124-230`) via `formatShortcut` (`CommandPalette.svelte:4`, `:61-63`).

Focus management:
- Search input focuses on a `focusRequest` bump, not on mount alone (`SearchPanel.svelte:19-29`). Store: `search.store.svelte.ts:16-18`, `:57-59`.
- Dialog focus, trap and return are bits-ui defaults (not in this area).

Hover-only affordances:
- Result row background on hover only, `hover:bg-file-explorer-accent/60` (`SearchResult.svelte:137`).
- Mode button and fuzzy `~` text color on hover only (`SearchPanel.svelte:88`, `:165`).
- No content is revealed only on hover. Show-in-Calendar is always visible when the note is an event (`src/lib/features/event-calendar/ShowInCalendarButton.svelte`, render block near the end of file).

Drag and drop: none in the three feature folders (grep for `draggable`, `ondrag`, `ondrop` returned nothing).

Context menus: none in the three feature folders (grep for `oncontextmenu`, `ContextMenu` returned nothing). Primitive `context-menu` exists in `src/lib/components/ui/` but is not used here.

Tooltips: native `title` attributes only (`SearchPanel.svelte:167`, `SemanticIndexStatus.svelte:59`, `ShowInCalendarButton.svelte` title). No shadcn `Tooltip` used in the area (`src/lib/components/ui/tooltip` exists, unused here).

Click targets that are not buttons: none. Every `onclick` in the area sits on a `<button>` or `Button` (`SearchResult.svelte:138`, `SearchPanel.svelte:91`, `:166`, `SearchSection.svelte:140`). Palette/switcher rows are bits-ui `Command.Item` (`role` set by bits-ui).

Nested interactive: `ShowInCalendarButton` is a sibling of the result `<button>`, not nested (`SearchResult.svelte:174-177` with comment `:175`).

## 4. Accessibility

Icon-only and labels:
- Fuzzy toggle `<button>` has text `~` and `title` but no `aria-label` (`SearchPanel.svelte:164-168`). Accessible name is "~".
- Show in Calendar: `aria-label="Show in Calendar"` and `title` (`ShowInCalendarButton.svelte`, button block).
- Dialog close X: sr-only "Close" (`dialog-content.svelte:41`).
- Search input (`SearchPanel.svelte:154-162`): no `<label>`, no `aria-label`. Placeholder "Search vault..." only.
- Command input (`command-input.svelte:16-25`, used `CommandPalette.svelte:47`, `QuickSwitcher.svelte:70`): placeholder only, no `aria-label`.
- Mode toggle: text buttons, no `aria-pressed` or `role="tablist"`. Selected state is class-only (`SearchPanel.svelte:84-96`).

Roles and live regions:
- Result list: `div`s and buttons, no `role="list"` or `role="listbox"` (`SearchPanel.svelte:125-145`).
- No `aria-live` on "Searching...", result count (`SearchPanel.svelte:115-124`), status-bar text (`SearchStatus.svelte`, `SemanticIndexStatus.svelte`), or download progress (`SearchSection.svelte:112-119`).
- Palette and switcher: `Dialog.Title`/`Description` are sr-only (`command-dialog.svelte:27-30`; `CommandPalette.svelte:44-45`, `QuickSwitcher.svelte:67-68`).
- Palette and switcher use bits-ui `Command` roles (listbox/option semantics from primitive, not verified here).

Focus-visible:
- Search input: `focus:outline-none focus:ring-1 focus:ring-ring` (`SearchPanel.svelte:161`).
- Result card button: no focus style (`SearchResult.svelte:137`).
- Mode buttons: no focus style (`SearchPanel.svelte:88`).
- Fuzzy toggle: no focus style (`SearchPanel.svelte:165`).
- Settings Switch/Button: primitive styles (`src/lib/components/ui/button`, `switch`), not in area.
- Command item: `outline-hidden` (`command-item.svelte:16`); keyboard highlight is `aria-selected:bg-accent` only.
- Show in Calendar: `focus-visible:ring-2 focus-visible:ring-ring outline-none` (`ShowInCalendarButton.svelte`).
- Dialog close: `focus:ring-2 focus:ring-offset-2` (`dialog-content.svelte:38`).

Semantics issues:
- `SearchResult.svelte:136-173`: `<div>` (`:141`) and `<p>` (`:161`, `:166`) nested inside `<button>`. Block content inside a button is invalid HTML.
- Result title is `<span>` (`:143`), not a heading. Results have no per-item name beyond the button text.
- `SearchSection.svelte:99` uses `<h2>`, the only heading in the area.

Click handlers on non-buttons: none (see section 3).

## 5. Styling

Raw colors (hex, rgb, hsl, oklch literals) in the feature `.svelte` and `.ts` files: none found.

Inline styles:
- `SearchPanel.svelte:76` `style="box-shadow: inset 0 -1px 0 var(--divider)"`. Only inline style in the area.

Arbitrary sizes and values in `.svelte`:
- `SearchPanel.svelte:75` `pl-[var(--rail-header-pad)]` (token defined by inline style on `AppShell.svelte:187`).
- `command-dialog.svelte:33` long arbitrary-variant string: `[&_[data-command-item]]:py-3`, `h-12`, `h-5 w-5` icons.
- `command-list.svelte:15` `max-h-[300px]`.
- `dialog-content.svelte:30` `max-h-[calc(100dvh-4rem)]`, `max-w-[calc(100%-2rem)]`, `sm:max-w-lg`, `rounded-xl`, `shadow-xl`, `duration-200`.
- `SearchResult.svelte:135` `h-20` fixed card height; `:166` `line-clamp-2`; `SearchResult.svelte:76,82` snippet `substring(0, 200)`.

Hard-coded font sizes:
- No `text-[Npx]` in the area. Sizes come from tokens and Tailwind defaults.
- Tokens (app.css): `text-label` 11px (`src/app.css:92`), `text-meta` 12px (`:94`), `text-row` 14px, `text-title` 15px (`:98-101`). Not all used here.
- Tailwind default `text-xs` (12px) is not overridden in app.css. Used in feature files: SearchPanel `:116, :118, :120, :157, :161`; SearchResult `:143, :166`; CommandPalette `:59`; QuickSwitcher `:88`.
- `text-meta` (12px) also used: SearchPanel `:99, :122`; SearchResult `:156`; SearchSection `:113, :126, :138, :147`; SemanticIndexStatus/SearchStatus inherit.
- `text-label` (11px): SearchPanel `:87-88` (mode buttons), `:165` (fuzzy); SearchResult `:146` (badge).
- `text-lg`: SearchSection `:99`.
- Primitive sizes: `text-sm` (command-item `:16`, command-empty `:15`), `text-xs` (command-shortcut `:16`, command-group heading `:26`).

Spacing (feature files): `h-10` header (SearchPanel `:74`), `h-20` card (SearchResult `:135`), `px-2 py-1.5 space-y-1.5` (SearchPanel `:82`), `py-0.5` mode (`:87`), `py-4` status text (`:116-120`), `mt-0.5` snippet (SearchResult `:166`), `pl-5` subtitle indent (SearchResult `:161`, `:166`), `size-3.5` icons (SearchResult `:142`), `size-3` status icons.

z-index: no `z-` in the feature folders. Only primitives: overlay `z-50` (`dialog-overlay.svelte:16`), content `z-50` (`dialog-content.svelte:30`).

Shadows: `shadow-sm` (SearchPanel `:88`), `shadow-xl` (dialog-content `:30`), inline box-shadow (SearchPanel `:76`).

Custom CSS files in the three feature folders: none (no `.css` or `<style>` blocks; verified by file listing).

Transitions and animation:
- `transition-colors` with default duration: SearchPanel `:87`, `:165`; SearchResult `:137`.
- Dialog: `duration-200` and `animate-in/out`, fade and zoom (`dialog-content.svelte:30`, `dialog-overlay.svelte:16`).
- Spinners: `animate-spin` without motion guard: SearchPanel `:101`; SearchStatus `:11`, `:16`; SemanticIndexStatus `:63`; SearchSection `:114`, `:148`.
- `prefers-reduced-motion`: none in these folders, none in `dialog/` or `command/` primitives, none in `app.css` (grep). Only `EventCalendarView.svelte:284` has it in the whole `src/lib` search for this query.

Theme tokens used (CSS variables via Tailwind classes):
- Surfaces: `bg-list-bg` (SearchPanel `:72`, SearchResult `:176`), `bg-tab-bar` (SearchPanel `:75`), `bg-background` (SearchPanel `:161`), `bg-muted` (SearchPanel `:84`), `bg-popover` (command.svelte `:24`), `bg-accent` (command-item `:16`), `bg-scrim` (dialog-overlay `:16`).
- Text: `text-file-explorer-fg` (SearchPanel `:72`, `:161`), `text-file-explorer-muted-fg` (13 uses), `text-file-explorer-primary` (SearchPanel `:165`, SearchResult `:161`), `text-muted-foreground` (SemanticIndexStatus, SearchStatus, command-shortcut), `text-destructive` (SearchSection `:122`, `:156`), `text-search-semantic-fg` (SearchResult `:150`), `text-popover-foreground` (command.svelte `:24`), `text-accent-foreground` (command-item).
- Borders and rings: `border-file-explorer-border` (SearchPanel `:161`), `border-b` default (command-input `:14`), `ring-ring` (SearchPanel `:161`).
- Badges and states: `bg-file-explorer-primary/20` (SearchPanel `:165`), `/15` (SearchResult `:148`), `bg-search-semantic-bg` (SearchResult `:150`), `bg-file-explorer-accent/60` (SearchResult `:137`), `divide-divider/20` (SearchPanel `:125`).

Token definitions (`src/app.css`):
- `--file-explorer-*` tokens: light `:root` block lines 155-214 defines fg, muted-fg, accent, primary, border, badge-fg (`:177-182`). `--file-explorer-bg` is defined only in `.dark` (`:240`).
- `--list-bg`: light `:root, .column-tones` block (`:380-386`) sets `color-mix(in oklch, var(--file-explorer-bg) 50%, var(--editor-bg))` (`:385`); `.dark` sets it to `var(--file-explorer-bg)` (`:392`).
- Within `src/app.css`, `--file-explorer-bg` is not defined in the light `:root` block (lines 155-214). Light `--list-bg` (SearchPanel bg, `bg-list-bg`) therefore resolves through an undefined variable. Unverified in a running app: a remote theme catalog (ADR-0035) may supply the value.
- `--search-semantic-bg` `rgba(59, 130, 246, 0.15)` and `--search-semantic-fg` `#60a5fa` are identical in both themes (`app.css:183-184`, `:247-248`).
- `--elev-scrim` `#30284040` light (`:209`), `#0000008c` dark (`:283`), mapped to `--color-scrim` (`:77`).

## 6. Copy

User-visible strings in the area, grouped. Case and punctuation as written.

Placeholders:
- "Search vault..." (SearchPanel `:157`, three dots).
- "Type a command..." (CommandPalette `:47`, three dots).
- "Type a note name..." (QuickSwitcher `:70`, three dots).

Dialog titles and descriptions (sr-only):
- "Command Palette" / "Search for a command to run" (command-dialog defaults `command-dialog.svelte:12-13`; CommandPalette `:44-45`).
- "Quick Switcher" / "Search for a note to open" (QuickSwitcher `:67-68`).

Empty and status text:
- "Type to search across all files" (SearchPanel `:118`, no period).
- "No results found" (SearchPanel `:120`, no period).
- "No commands found." (CommandPalette `:69`, period).
- "No files found." (QuickSwitcher `:108`, period).
- "Searching..." (SearchPanel `:116`, three dots).
- "Building index..." (SearchPanel `:103`, three dots).
- "Building embeddings..." (SearchStatus `:17`, three dots).
- "Indexing..." (SearchStatus `:12`, three dots).
- "Indexed: N notes" (SearchPanel `:106`), "N notes indexed" (SearchStatus `:27`). Same fact, different order and capitalization.
- "N notes · M chunks" (SearchPanel `:108`, SearchStatus `:22`).
- "N results" / "1 result" (SearchPanel `:123`). Lowercase noun.
- "N matches" / "1 match" (SearchResult `:91`).
- "Loading model..." (semantic-index-status.logic.ts `:46`); "Indexed (N chunks)" / "Not indexed" (`:47-51`); "N chunks" in status-bar (SearchStatus `:22`).
- Snippet fallback "Downloading model..." (SearchSection `:116`), "Downloading reranker..." (`:150`), "Downloading…" button text with Unicode ellipsis (`:141`), "Installed" (`:138`), "Download" (`:141`).
- Settings copy: "Semantic search" (`:102`); "Find notes by meaning as well as by words. Downloads a 542 MB model once." (`:103`); "Model loaded · N chunks indexed from M files" (`:127-128`); "Reranker" (`:134`); "Re-scores the top results with a second model for better precision. About 280 MB more to download, 2 to 3 s per query on CPU, CC-BY-NC-4.0 license. Used automatically once downloaded." (`:135`).
- Tooltips: "Fuzzy matching enabled" / "Fuzzy matching disabled" (SearchPanel `:167`); "Show in Calendar" (ShowInCalendarButton).
- Toasts: `Command "${label}" failed.` (CommandPalette `:35`); `Failed to create file.` (QuickSwitcher `:52`); "This note is no longer a calendar event" and "Could not open the Calendar" (ShowInCalendarButton).
- Create row: `Create "${query}"` (QuickSwitcher `:104`).
- Badges: "Both", "Semantic", "Text" (SearchResult `:153`).
- Mode labels: "Text", "Semantic", "Hybrid" (SearchPanel `:50-52`).
- Heading: "Search" (SearchSection `:99`).

Terminology drift:
- Object noun: "files" (`SearchPanel.svelte:118`, `QuickSwitcher.svelte:108`), "notes" (`SearchPanel.svelte:106`, `SearchStatus.svelte:27`, `QuickSwitcher.svelte:70`, `SearchSection.svelte:103`), "documents" (`search.service` log only), "vault" (`SearchPanel.svelte:157`, `commands.ts:202` "Search in Vault").
- Verb for the feature: "Search", "Find" (`SearchSection.svelte:103`), "Open Quick Switcher" (`commands.ts:195`).
- Hybrid mode is labelled "Hybrid" (SearchPanel `:52`), but its result badge reads "Both" (SearchResult `:153`).
- Command labels: "Search in Vault" and "Open Quick Switcher" are Title Case (`commands.ts:195`, `:202`); "Tasks: Show all statuses" uses sentence case after a colon (`commands.ts:84`); "Go to ${label}" (`commands.ts:68`).
- Ellipsis: "..." ASCII in most strings; "…" in "Downloading…" (`SearchSection.svelte:141`).
- Period: "No results found" (no period, `SearchPanel.svelte:120`) vs "No commands found." and "No files found." (periods, palette and switcher).
- Error text: raw `String(err)` shown in SearchSection (`:86`, `:122`, `:156`).
- Hard-coded figures in copy: "542 MB" (`SearchSection.svelte:103`), "280 MB", "2 to 3 s" (`:135`).
- Quick Switcher archived files: no visible label for "archived" (only icon and dimming, `QuickSwitcher.svelte:80-86`).

## Notable constants and state (for reference)

- Recent list caps: 20 for commands (`command-palette.store.svelte.ts:2`), 20 for files (`quick-switcher.store.svelte.ts:2`). Storage: `localStorage` keys `kokobrain:recent-commands` and `kokobrain:recent-files` (`:1` in each).
- Search request params: `maxResults: 20`, `minScore: 0.3` for semantic (`search.service.ts:251-252`); hybrid `maxResults: 20` (`:152`); FTS `maxResults: 50` (`:201`).
- Reset paths: `resetCommandPalette` (`command-palette.service.ts:4-6`), `resetQuickSwitcher` (`quick-switcher.service.ts:4-6`), search reset (`search.store.svelte.ts:72-89`).
- Ranking: `filterAndRankCommands` boosts recent commands within 5 points (`command-palette.logic.ts:36-37`). Empty query lists recents first, then alphabetical (`:9-17`).
- Quick switcher ranking is in `#lib/core/filesystem/file-entries.logic.js` (`filterAndRank`, imported `QuickSwitcher.svelte:13`), outside this area.

## Not verified

- Rendered appearance, contrast ratios, focus order and actual screen-reader output were not checked in a running app.
- bits-ui internals (Command roles, Dialog focus trap, arrow-key handling) were not read.
- The light-theme `--file-explorer-bg` gap is from reading `src/app.css` only; a theme catalog could supply it at runtime.
