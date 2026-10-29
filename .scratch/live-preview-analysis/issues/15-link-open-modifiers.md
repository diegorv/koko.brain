# 15: One "open" modifier for every link; ctrl+click on macOS does not navigate

**What to build:** Links follow the platform convention, like Obsidian:

| Action | Wikilink | External link |
|---|---|---|
| Plain click on the rendered link | Opens the note (unchanged) | Places the cursor (unchanged) |
| Cmd+click on macOS, Ctrl+click on Windows/Linux | Opens the note, also when the line is revealed (cursor on it) | Opens in the browser |
| Ctrl+click on macOS | Does not navigate (left to the context menu) | Does not navigate |
| Right click | Does not navigate (unchanged since issue 09) | Does not navigate |

Today on macOS Ctrl+click arrives as a primary-button mousedown with `ctrlKey`, so it passes the issue 09 primary-button filter and opens the note, and it also opens external links. And when the cursor is on a wikilink's line the syntax is revealed and the click does not open the note, so there is no way to open it without moving the cursor away first; the open modifier fixes that. Detect the platform once (the repo may already have a helper; reuse it). Do not add "open in new tab".

**Context:** Owner decision 2026-10-29, after the issue 09 review (finding 4) noted macOS Ctrl+click still navigates. Obsidian on macOS uses Ctrl+click for the context menu and Cmd+click to open (forum reports, not official docs).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/wikilink-click-target.ts` (modify; modifier and platform filter)
- `src/lib/core/markdown-editor/MarkdownEditor.svelte` (modify; capture-phase wikilink mousedown)
- `src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts` (modify; `metaKey || ctrlKey` check)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [x] Tests cover every row of the table for both platforms (macOS and non-macOS), wikilink and external link
- [x] Test: with the cursor on the wikilink's line (revealed source), the open modifier opens the note and a plain click does not
- [x] Plain click on a rendered wikilink still opens the note

## Comments

- 2026-10-29 20:49 — discovery — plan in work/15/discovery.md: platform helper + modifier-aware wikilink resolver + click-handler modifier — 5328db85
- 2026-10-29 20:53 — implement — utils/platform.ts + resolveWikilinkClickPosition + click-handler modifier; pnpm check 0 errors, markdown-editor tests 1494/1494, platform 7/7; revealed-source path tested with stubbed posAtCoords (manual check in the app left for the human) — 86c725af
