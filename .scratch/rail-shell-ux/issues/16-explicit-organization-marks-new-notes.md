# 16: Explicit organization makes new notes start in the Inbox

**What to build:** Settings > Types & Lifecycle > "Explicit organization" starts doing what its text and help 25 promise. While it is on, every note-creation path except periodic notes writes `_organized: false` into the new note's frontmatter, so the note appears in the Inbox until the user organizes it. Paths covered: Cmd+N / Quick Capture, "+ New here" in any lens, New `<Type>`, a note created by following a wikilink to a missing note, Files > New note, and the command palette's New note. Periodic notes (daily, weekly, monthly, quarterly, yearly) never get it. A template that sets `_organized` itself wins. While the switch is off, nothing is written (today's behaviour).

**Blocked by:** 08

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] One helper decides the extra frontmatter for a creation (`explicitOrganization` on, path not periodic, template does not set the key) (logic test of the helper)
- [ ] Each covered path, with the switch on, creates a note whose frontmatter has `_organized: false`, and the note is in the Inbox lens after the index update (service tests per path, Tauri boundary mocked, real stores; one test per path, not one shared mock)
- [ ] Daily and weekly creation with the switch on write no `_organized` (service test)
- [ ] A template with `_organized: true` keeps `true` (service test)
- [ ] With the switch off, no path writes the key (service test)
- [ ] ADR 0026 is amended: the switch is wired, with the path list and the periodic exception; help 25 (the three passages around lines 253, 277-284, 553) and the Settings description match

## Notes

- **Owner decisions (2026-11-04):** implement the switch (not remove it); every creation path except periodic notes.
- **Today (traced):** nothing reads `settingsStore.explicitOrganization`; it appears only in `core/settings/settings.types.ts:385`, `settings.store.svelte.ts:143,178`, `settings.service.ts:157` and `sections/TypesSection.svelte:16-18`. ADR 0026 line 41 admits it.
- **Why after 04:** Issue 08 makes a missing `_organized` read as organized in the action bar too, so this switch is the one way new notes reach the Inbox.
- **"+ New here" in the Inbox lens** already writes `_organized: false` through `newNoteRule`; keep that regardless of the switch.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F71.
- **Size:** S-M.

## Comments
