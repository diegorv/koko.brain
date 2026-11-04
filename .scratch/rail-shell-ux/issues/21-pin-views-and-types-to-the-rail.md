# 21: `_rail: true` pins a view or a type to the rail

**What to build:** A `.view` or a type definition with `_rail: true` (YAML boolean) becomes an item on the rail. Pinned items sit in their own group under the navigator items (Types, Calendar, Files), separated by a divider, above the bottom Archive. They are ordered by `_order`, then label, and use the item's `_icon` (fallback: the view row icon or the type's icon) with the label as tooltip and accessible name. Clicking a pinned view picks the view lens (or opens it in the editor when it has `_open_in_editor: true`, matching its Views row); clicking a pinned type picks that type's lens. Neither opens a navigator pane, like Inbox. The pick persists in `layout.railItem` as `view:<absolute path>` or `type:<name>`; a pin whose target is gone falls back to Today on restore. The view row and type row menus get "Pin to rail" / "Unpin from rail", which write or remove the key and ask for a prompt index refresh. When the rail is too short, the pinned group scrolls and the rest of the rail stays fixed.

**Blocked by:** 10, 12

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] `restoreRailItem` accepts `view:<path>` and `type:<name>` when the target exists and falls back to Today when it does not (logic test)
- [ ] A pure builder returns the pinned items from the entries snapshot: only YAML `true`, ordered by `_order` then label, with label and icon (logic test; `"true"` reported through Issue 10's ignored-key mechanism)
- [ ] `Rail.svelte` renders the pinned group with label, icon, `aria-current` on the active pin, and no navigator pane opens on click (component test, real stores)
- [ ] Clicking a pinned `_open_in_editor` view opens it in the editor and leaves the lens unchanged (component test)
- [ ] "Pin to rail" writes `_rail: true` and "Unpin from rail" removes the key, on a `.view` and on a type definition (service test, Tauri boundary mocked, real stores)
- [ ] The pinned group scrolls when it overflows (component test on the container class; visual check noted as not run)
- [ ] ADR 0033 is amended (pinned rail items) and ADR 0027 lists `_rail`; help 25 documents the key and the menu items

## Notes

- **Owner decisions (2026-11-04):** pins are a `_rail: true` key in the file, plus a menu item that writes it; the same key works on `.view` files and type definitions.
- **Main-session decisions:** pinned group below the navigator items and above Archive; no pin limit (the group scrolls); the pin keeps the item's `_order`, it has no separate rail order; Settings > Rail (Issue 24) orders built-in items only.
- **Today (traced):** rail items are constants (`features/rail-shell/Rail.svelte:40-53`); `restoreRailItem` resolves only built-ins and registered navigators (`lens.logic.ts:140-172`); `RailNoteList` already treats any `kind: 'view'` lens as a view (`RailNoteList.svelte:107`), and type lenses already resolve, so the note list needs no change.
- **Known limit:** writing `_rail` into a `.view` goes through the existing view YAML writer, which drops comments (review F13, not fixed here); a `.view` write also bypasses the note-change owner until Issue 02 lands.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F52 (option A in section 5).
- **Size:** S-M.

## Comments
