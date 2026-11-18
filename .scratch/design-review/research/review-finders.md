# Design review: Search, command palette, quick switcher

Scope: src/lib/features/search, command-palette, quick-switcher, plus the shared shadcn command and dialog primitives. Screenshots read: command-palette-light, command-palette-filtered-light, quick-switcher-light, search-results-light, landing-today-light. Not verified: dark theme of this area (no capture), Semantic and Hybrid rendering (the E2E mock has no model), real FTS snippets (the mock emits no mark tags).

## Clear

1. Command dialogs are vertically centered, so the input jumps while typing
- Evidence: src/lib/components/ui/dialog/dialog-content.svelte:30 (`top-[50%] translate-y-[-50%]`). Palette input sits at y=300 (command-palette-light.png), switcher input at y=415 with one result (quick-switcher-light.png).
- Proposal: anchor command dialogs near the top (about 18vh) so the input never moves; only the list grows downward.

2. The list is capped at 300px with 62px rows, so only 4.5 commands are visible
- Evidence: command-list.svelte:15 (`max-h-[300px]`), command-dialog.svelte:33 (`py-3` per item), CommandPalette.svelte:56-60 (two-line row). Rows measured 62px in command-palette-light.png; the list ends at y=624 in a 900px window with about 38 commands.
- Proposal: `max-h` about min(60vh, 480px), rows of about 36px with the category right-aligned in muted text beside the shortcut. Target 9 to 10 visible rows.

3. Quick switcher cannot create a note when any fuzzy match exists
- Evidence: QuickSwitcher.svelte:72-106 (the Create row is an `else if` that only appears when `filteredFiles` is empty). Creation goes to the vault root (`createFile(vaultStore.path, name)`, :50) and the failure is swallowed with a generic toast (:49-53). The inventory notes that `No files found.` is therefore only reachable with an empty query.
- Proposal: always append a `Create "query"` row after the results (or Shift+Enter, hinted in a footer), show the target folder in the row, and put the cause in the error toast.

4. Hybrid results lose the note name and always say "Both"
- Evidence: search.service.ts:163 (`title: r.heading ?? basename`) and :169 (`source: 'both'`); SearchResult.svelte:47-68 (subtitle becomes `§ heading` when a heading exists), :153 (badge).
- Result: a hybrid result with a heading shows the heading twice (title and subtitle) and the file is nowhere; every card carries the same "Both" badge.
- Proposal: title is the note name; subtitle is `folder › heading`. Drop the badge when the source is constant.

5. Search results cannot be driven from the keyboard
- Evidence: SearchPanel.svelte:36-39 (only Escape, which blurs); :125-145 (plain buttons, no arrow handling); SearchResult.svelte:137 (no focus style). "/" and Cmd+Shift+F focus the input (global-keybindings.ts:40-49, :102-106), then a mouse is needed.
- Proposal: ArrowDown/ArrowUp move a highlighted row, Enter opens it (Cmd+Enter in a new tab), first Escape clears the query and the second blurs, and results get a visible focus-visible ring.

6. Search failures and empty states are indistinguishable
- Evidence: search.service.ts:269-270 (error only logged), :229-237 (FTS failure falls back silently), :257-261 (semantic failure becomes `[]`); semantic.rs:991 (hybrid returns an empty list for queries under 3 characters); SearchPanel.svelte:119-120 (all collapse to `No results found`), :89-90 (Semantic and Hybrid disabled with no reason).
- Proposal: an inline error row with Retry; a hint such as `Type at least 3 characters for Hybrid`; a disabled-mode tooltip `Enable semantic search in Settings > Search` with a link; do not show `No results found` while the index is building.

## Moderate

7. Result cards show raw markdown and repeat the file name in the path
- Evidence: search-results-light.png (`**roadmap**, the *design...`, `# Design sync`, `- [ ] The Design of Everyday`, `[[Projects/Website...`; the subtitle `Projects/Kokobrain Launch P...` repeats the title). SearchResult.svelte:161-172, sanitize.ts:54-63 (only mark tags are kept). No style exists for `mark` in app.css or the search folder, so highlights fall back to the browser default.
- Proposal: strip markdown syntax from snippets before rendering (headings, emphasis, list and task markers, wikilinks to their text), style `mark` with a theme token, and show the folder only in the subtitle.

8. Palette ranking puts the least likely commands first, and categories are noisy
- Evidence: command-palette-filtered-light.png: `cal` returns `Calendar: Redo`, `Calendar: Undo`, then `Go to Calendar`. fuzzy-match.ts:34-47 rewards short targets and prefixes only. commands.ts:253-262 puts Undo and Redo, `New Calendar Event` (:236) and `Open view: ...` (:105) in `Navigation`, 13 of about 38 commands.
- Proposal: boost word-start matches and `Go to` or `New` verbs, rank by use frequency, and recategorize Undo and Redo as Calendar and event creation as Create.

9. Empty-query state has no sections or hints
- Evidence: command-palette.logic.ts:9-17 and QuickSwitcher.svelte (`Command.Group` without `heading`, although command-group.svelte:25 supports it). Recents and the alphabetical rest form one flat list; only `Close Tab` shows a shortcut in command-palette-light.png.
- Proposal: `Recent` heading and `All commands` or `All notes` heading, plus a footer with the key hints (arrows, Enter, Esc, Cmd+Enter).

10. Search operators and fuzzy toggle are undiscoverable
- Evidence: search.logic.ts:6-7 supports `tag:` and `path:`; SearchPanel.svelte:118 says only `Type to search across all files`. The `~` toggle (:164-168) has no visible label or `aria-label`, and sits on top of the input (search-results-light.png at 389,20).
- Proposal: show `tag:`, `path:` examples and recent queries in the empty state; replace `~` with a labeled `Fuzzy` toggle (icon plus tooltip, `aria-pressed`) in the mode row.

11. The result list flashes `Searching...` on every query change
- Evidence: SearchPanel.svelte:115-116 replaces the whole list while `isSearching`; search.service.ts:140 sets it on every debounced run (layout +layout.svelte:169-176, 200 ms). The count (:122-124) can read `50 results` when `maxResults: 50` truncates (search.service.ts:201).
- Proposal: keep previous results dimmed until new ones arrive, show a thin progress indicator in the header, and say `50+ results`.

12. Several text and badge colors miss 4.5:1
- Evidence: snippet text darkest sampled pixel #7E7685 on #EFE7EA, about 3.6:1 at 12px (search-results-light.png; SearchResult.svelte:166 `text-file-explorer-fg/60`). `--search-semantic-fg #60a5fa` on a 15% blue tint is the same in light and dark (app.css:183-184, :247-248), about 2:1 on the light panel. Archived title uses `opacity-50` (QuickSwitcher.svelte:86).
- Proposal: raise snippet opacity to about 75%, give the semantic badge a darker light-theme foreground, and label archived rows instead of halving opacity.

13. Accessibility semantics are missing in the search panel
- Evidence: SearchPanel.svelte:154-162 (input without label), :84-96 (mode buttons without `aria-pressed` or a group role), :125-145 (no list roles, no live region for count or `Searching...`); SearchResult.svelte:141-171 puts `div` and `p` inside a `button`; command-input.svelte:16-25 has a placeholder only.
- Proposal: `aria-label` on inputs, a `radiogroup` or `aria-pressed` on modes, `role="status"` on the count line, and `span` inside the result button.

## Polish

14. Copy and terminology drift
- Evidence: `Indexed: 37 notes` in the panel (SearchPanel.svelte:106) duplicates the status bar `37 notes indexed` (SearchStatus.svelte:27, visible in search-results-light.png); `No results found` has no period while `No commands found.` and `No files found.` do; files, notes and vault are used interchangeably (:118, :157, QuickSwitcher.svelte:70); `Downloading…` is the only Unicode ellipsis (SearchSection.svelte:141); `Hybrid` mode but `Both` badge.
- Proposal: one noun (`notes`), one empty-state style, and drop the duplicate index line from the panel.

15. Quick switcher row details
- Evidence: QuickSwitcher.svelte:80-91: every row has the same FileText icon (the note list shows type labels such as Daily, Events), the path line repeats the `.md` extension (quick-switcher-light.png: `Projects/Roadmap.md`), archived is only an icon swap, and matches are not highlighted. The palette also keeps the default dialog X button (command-dialog.svelte:31) next to the input.
- Proposal: type icon or small type tag consistent with note list rows, folder-only secondary line, `Archived` text tag, highlight matched characters, and hide the X for command dialogs.
