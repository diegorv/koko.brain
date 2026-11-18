# 18: Note action bar: Mac glyph tooltips, and the width toggle says when it cannot work

**Origin:** design review 2026-11-17, proposals P95 (note action bar part), P40 (part), prototype `.scratch/design-review/prototypes/canvas.html` (shortcut hints) and `editor-authoring.html` (line length), research `.scratch/ux-quick-wins/research/verdict-canvas.md` (ticket Q6), `verdict-editor.md` (ticket E5) and `breakdown.md` (old ticket 21).

**What to build:** tooltip text and a disabled state only. No settings file is written and no default changes.

1. **Glyph tooltips.** The titles "(Cmd+D)", "(Cmd+E)" and "(Cmd+\)" (`src/lib/features/note-action-bar/NoteActionBar.svelte:148,157,175`) become `formatShortcut` of combo constants local to the component: `{ key: 'd', meta: true }`, `{ key: 'e', meta: true }` and `{ code: 'Backslash', meta: true }`, giving `⌘D`, `⌘E` and `⌘\`. The component cannot read the real bindings: `src/tests/lib/architecture/layer-rules.test.ts:167` forbids importing `#lib/app/` from outside `app/`, and the Raw binding (`app/global-keybindings.ts:183-187`) has no command id. Add `Backslash: '\\'` to `CODE_DISPLAY_MAP` (`src/lib/utils/keybindings.ts:29-34`; without it `formatShortcut` prints "⌘Backslash"). The `aria-label`s do not change.
2. **Width toggle that cannot work.** While `settingsStore.editor.contentWidth === 0` (the default, `settings.types.ts:159`) the wide-notes action switches between two identical layouts. The `width` entry (`NoteActionBar.svelte:92-97`) is then disabled: its label and title read "Set a content width in Settings > Editor to use this"; inline (`inlineAction`, `:224-235`) it carries `aria-disabled="true"` and the click does nothing; in the More menu (`:192-197`) it is a `DropdownMenuItem disabled`. With a width set nothing changes. `toggleWideNotes` (`note-action-bar.service.ts:15-17`) is the only caller and stays as it is.

Not in this ticket: the default `contentWidth` (settings store is an mvp-claude file and the owner picks the number), Undo, Redo and zoom items, a shared `Kbd` component.

**Size:** S

**Blocked by:** 17

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus `bash scripts/e2e.sh note-action-bar.spec.ts` (it finds the buttons by `aria-label`, `:49,58,95`, and sets a width of 600 first at `:103-126`, so it should stay green; run it to confirm).

- [ ] Failing test first (`src/tests/lib/features/note-action-bar/NoteActionBar.test.ts`): the favourite title is `` `${label} (${formatShortcut(shortcutFor('note:toggle-favorite'))})` `` and the same for organized (a test may import `#lib/app/`; the component may not); the Raw title ends with `(⌘\)`; no title contains "Cmd+". The assertions at `:183,191,200,207,214` are updated on purpose, not deleted.
- [ ] `src/tests/lib/utils/keybindings.test.ts`: `formatShortcut({ code: 'Backslash', meta: true })` is `⌘\`.
- [ ] Failing test first (real `settingsStore`): with `contentWidth` 0 the inline width button has `aria-disabled="true"` and the Settings label, and clicking it leaves `wideNotes` unchanged; in a narrow bar the More item is disabled and does not toggle.
- [ ] `NoteActionBar.test.ts:382-401` ("note width switches the one global setting") sets `contentWidth` to 720 first and keeps every assertion.
- [ ] `layer-rules.test.ts` passes (no `#lib/app/` import in the component).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P95 (note action bar part).** "Send hard-coded hints through `formatShortcut`." The tooltips say "(Cmd+D)" while the app is Mac-only and uses glyphs everywhere else. The canvas half is ticket 17.
- **P40 (part).** "While [`contentWidth`] is 0, disable the action-bar width toggle and give it a tooltip that points to Settings > Editor > Content width." The proposed default of about 72ch is deferred.

## Problem

Three tooltips spell the shortcut the way no other surface does. The note width toggle looks live, but with the default `contentWidth` of 0 it flips between two identical layouts, so clicking it does nothing visible.

## Evidence

Checked at 085b23c5d.

- `NoteActionBar.svelte:148,157,175` the titles; `:62` `wide`; `:92-97` the width entry; `:192-197` the More loop; `:224-235` `inlineAction`.
- `utils/keybindings.ts:40-54` `formatShortcut` (upper-cases `key`, reads `CODE_DISPLAY_MAP` for `code`), `:29-34` the map without `Backslash`.
- `app/global-keybindings.ts:183-187` Raw (`Backslash`, meta, no command id), `:189-203` favourite (`d`) and organized (`e`) with command ids `note:toggle-favorite` and `note:toggle-organized`.
- `e2e/specs/note-action-bar.spec.ts` uses names, not titles.

## Why blocked

- 17: it adds `Backspace: '⌫'` to `CODE_DISPLAY_MAP` and its test in `utils/keybindings.ts`; this ticket adds `Backslash` to the same map and test file.

## Sequence with

- shell-sidebars-ux 15 (note actions group; More menu at `NoteActionBar.svelte:187-219`), 24 (breadcrumb at `:126-132,:201`) and 32 (back and forward at the start of the bar, also extends `CODE_DISPLAY_MAP`): all ready-for-agent and edit this file; run one at a time and rebase.
- 17 is the canvas half of the glyph work and runs first; it adds its own cases to `keybindings.test.ts`, which this ticket extends.
- open-itens: none.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.
