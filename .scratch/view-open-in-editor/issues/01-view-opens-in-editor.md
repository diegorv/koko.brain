# 01: A view marked to open in the editor opens there on click, and its row shows while it is the active tab

**What to build:** A `.view` whose YAML has `_open_in_editor: true` at the top level opens in the editor (the full table or collection) when its row under Types > Views is clicked, instead of becoming the note list's lens. The note list keeps the lens it had. While that view is the active editor tab, its row has the same highlight and `aria-current` as a picked row; switching to another tab clears it. Views without the key behave as they do today: a click picks the view lens and the highlight follows the pick only.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Only the boolean `true` turns the behaviour on; `false`, the string `"true"`, other values and a missing key leave the view as a list view (pure-logic tests)
- [x] The Types navigator's view row carries whether the view opens in the editor; type rows and Untyped never do (row-builder tests)
- [x] Clicking a view row with the key opens that `.view` in the editor and does not change the pick; clicking a view row without it still picks the view lens (component test, real stores and real row builder)
- [x] The row of a view with the key is highlighted while that view is the active editor tab, and not while another tab is active (component test, real `editorStore`)
- [x] A list view open in an editor tab is not highlighted by the tab; it is highlighted only when it is the picked lens
- [x] The picked lens row stays highlighted too, so two rows can show at once (the list's lens and the open editor view); this is intended
- [x] The help documentation's View Metadata Fields table lists `_open_in_editor` (default `false`), and the sentence on clicking a view mentions the editor case

## Notes

- **Owner decisions (2026-11-03):** a per-view key, not a global setting; no context-menu toggle (the key is written by hand in the YAML); the row is highlighted while the view is the active tab; one ticket.
- **Key name:** `_open_in_editor`, following the underscore system-metadata convention (ADR-0027). No Rust alias (`open_in_editor`, `open in editor`), so no `src-tauri/` change.
- **No Rust change is needed:** a `.view` is parsed as raw YAML at index time, so every top-level key already lands in the entry's frontmatter, the same path `_sidebar_label` and `_order` take to the Views rows.
- **Lag:** editing the key takes effect at the next throttled index bump (about 2 s), as `_sidebar_label` does today.
- **Saved pick:** a saved Types pick that points at a view later switched to the editor keeps resolving as a lens; nothing rewrites it.
- **Out of scope:** listing `.collection` files under Views (only `.view` files are listed today).
- **Size:** S.

## Comments

- 2026-11-03, branch `issue/01-view-opens-in-editor`: a view with `_open_in_editor: true` opens its `.view` in the editor on click instead of picking the lens, and its Types navigator row is highlighted while it is the active tab; help docs list the key. Review round 1 APPROVED (1 minor, 1 nit, both fixed: real-editor click test, comment reworded); round 2 APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite at b0cc687c passed (459 files, 10649 tests, 1 skipped, 1 todo), build OK.
