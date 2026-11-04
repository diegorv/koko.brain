# 16: Explicit organization makes new notes start in the Inbox

**What to build:** Settings > Types & Lifecycle > "Explicit organization" starts doing what its text and help 25 promise. While it is on, every Markdown note-creation path except periodic notes writes `_organized: false` into the new note's frontmatter, so the note appears in the Inbox until the user organizes it. Periodic notes (daily, weekly, monthly, quarterly, yearly) never get it. A template, rule or caller that already sets `_organized` wins. While the switch is off, nothing is written (today's behaviour).

**The helper (one owner):**

- Pure part: `src/lib/core/note-creator/explicit-organization.logic.ts` exports `withUnorganizedFlag(content: string): string`. It works on the final content (the rendered template, after any `buildContent`, title or tag injection), never on a template file or a path:
  - The key counts as set when a top-level line of the frontmatter block starts with `_organized:` or its alias `organized:` (`utils/frontmatter-aliases.ts:8`): content returned unchanged, whatever the value.
  - Frontmatter without the key: the line `_organized: false` goes right after the opening `---`, with that line's ending, so the rest of the block is kept byte for byte (comments included), the way `ensureFrontmatterLink` does it (`core/frontmatter/properties.logic.ts:518-532`).
  - An empty `---`/`---` block (which `FRONTMATTER_REGEX` does not match, file-io-audit Issue 30): the line goes inside that block; no second block is stacked.
  - No frontmatter (including empty content): `---\n_organized: false\n---\n` is prepended.
  - It never throws and never parses YAML, so unparseable or lossy frontmatter still gets the line.
- Switch part, in the same `.logic.ts`: `applyExplicitOrganization(content: string, enabled: boolean): string` returns `withUnorganizedFlag(content)` when `enabled` and `content` unchanged otherwise. Each call site passes `settingsStore.explicitOrganization`. It is not put in `note-creator.service.ts`: eleven test files `vi.mock` that whole module with only `openOrCreateNote`, so a function there would be `undefined` in them.
- Opt-in per call site: each covered path below passes its final content through `applyExplicitOrganization(content, settingsStore.explicitOrganization)`. Nothing decides "periodic" from a path, folder or file name: periodic paths are out because they never call it. A Cmd+N or Quick Capture note that lands inside the periodic notes folder still gets the key. The call may move into a shared callee only when every caller of that callee is covered (true for `createTypedNote`, whose two callers are paths 4 and 13); never into `openOrCreateNote` or `fs.service::createFile`, which periodic notes, non-Markdown files and type definitions also use.

**Covered paths (switch on: `_organized: false`):**

| # | Path | Call site | Where the content is wrapped |
|---|---|---|---|
| 1 | Cmd+N note composer | `plugins/quick-capture/note-composer.service.ts:19` `createNoteComposer` | `buildContent` passed to `openOrCreateNote` |
| 2 | Quick Capture popover, clipboard shortcut, `kokobrain://capture` | `app/deep-link-actions.ts:132` `executeCaptureAction` | `fileContent` after the title/tags injection, before `writeTextFile` (line 208) |
| 3 | "+ New here", plain rules (Inbox, Favorites, Today, Untyped, folder lens, a view lens without a type, provider rules such as the Calendar day lens) | `features/rail-shell/new-note.service.ts:28` | `newNoteContent(rule)` before `createFile` |
| 4 | "+ New here", typed rules (type lens, a view lens with a type) | `new-note.service.ts:24` -> `createTypedNote` | `createTypedNote` (`type-definitions.service.ts:115`) |
| 5 | New `<Type>` (Types navigator menu) | `features/type-definitions/type-definitions.service.ts:78` `createNoteOfType` | `buildContent` passed to `openOrCreateNote` |
| 6 | Following a wikilink to a missing note, and the meta-bind `createNote` button (`meta-bind-button-widget.ts:118`, `periodic: false`) | `app/editor-host.ts:122` (the non-periodic branch of `createNote`) | `buildContent` passed to `openOrCreateNote` |
| 7 | Files > folder menu > New note | `features/rail-shell/FilesNavigator.svelte:73` (`builtin:note`) | the `content` argument of `createFile` |
| 8 | Command palette "New File" (`file-explorer:new-file`) | `app/commands.ts:80-88` | the `content` argument of `createFile` |
| 9 | Quick Switcher, create from the query | `features/quick-switcher/QuickSwitcher.svelte:39-47` `createAndOpenNote` | the `content` argument of `createFile` |
| 10 | "New File from Template" (palette `templates:new`, Template picker) | `plugins/templates/templates.service.ts:54` `createFileFromTemplate` | `buildContent` passed to `openOrCreateNote` |
| 11 | "New 1:1" (action bar) and "Create 1:1 Note" (palette) | `plugins/one-on-one/one-on-one.service.ts:66` `createOneOnOneNote` | its `buildContent`, after `ensureFrontmatterLink` |
| 12 | "New linked note" (action bar on a hub note) | `features/note-action-bar/note-action-bar.service.ts:93` `createLinkedNote` | the `ensureFrontmatterLink(...)` content before `createFile` |
| 13 | New event from the event calendar | `features/event-calendar/event-calendar.service.ts:926` `createNow` -> `createTypedNote` | `createTypedNote` (same wrap as path 4), after `applyEventDraft` |
| 14 | `kokobrain://new`, create branch (silent and non-silent; `append` on a missing file falls through to it) | `features/deep-link/deep-link.service.ts:315-336` | `content` before the silent `writeTextFile`; `buildContent` on the `openOrCreateNote` branch |

**Not covered (never get the key):**

- Periodic notes: `plugins/periodic-notes/periodic-notes.service.ts:27` `openOrCreatePeriodicNoteForDate` and everything that reaches it (the five periodic commands, the Calendar navigator and its "Daily note" header button, the Calendar day lens "Daily note" button via `calendar-rail.service.ts:15`, the periodic branch of `editor-host.ts:119`, the `daily` deep link in `deep-link-actions.ts:39`).
- Non-Markdown files: canvas, collection, kanban, `.view` (`createView`).
- Type definitions (`createTypeDefinition`, `type-definitions.service.ts:178`): the Inbox excludes them anyway.
- Duplicate event (`event-calendar.service.ts:1008`): the copy keeps its source's lifecycle flags.
- `kokobrain://new` with `overwrite=true` (`deep-link.service.ts:298-313`): the caller's content replaces the file as given.
- Default template files (`templates.service.ts:116`) and the folder-note placeholder (`file-icons.service.ts:98`): marking a template would mark every note made from it.

**Blocked by:** 08

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Logic test of `withUnorganizedFlag` (`src/tests/lib/core/note-creator/explicit-organization.logic.test.ts`), written first: empty content; body without frontmatter; frontmatter without the key (rest of the block byte for byte, CRLF kept); empty `---`/`---` block (one block in the result); `_organized: true`, `_organized: false` and `organized: true` already set (unchanged); frontmatter with a comment and unparseable frontmatter (line added, no throw)
- [x] Same logic test: `applyExplicitOrganization` returns the input unchanged with `enabled` false and the `withUnorganizedFlag` result with it true
- [x] Each covered path 1-14, with the switch on, writes content holding `_organized: false` exactly once, asserted on the content passed to `create_note`, `createFile` or `writeTextFile` (Tauri boundary or the side-effect service mocked, stores real, the switch set through `settingsStore.setSettings`). Where the test file mocks `openOrCreateNote` (`note-composer`, `editor-host`, `templates`, `one-on-one`, `type-definitions`, `deep-link` service tests), the test runs the `buildContent` the mock received on a sample rendered template and asserts its result. One test per path, in that path's own test file (`note-composer.service.test.ts`, `deep-link-capture-frontmatter.test.ts`, `new-note.service.test.ts`, `type-definitions.service.test.ts`, `src/tests/lib/app/editor-host.test.ts`, `FilesNavigator.menu.test.ts`, `commands.test.ts`, a new `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts`, `templates.service.test.ts`, `one-on-one.service.test.ts`, `note-action-bar.service.test.ts`, `event-calendar.service.test.ts`, `deep-link.service.test.ts`), not one shared mock. Path 3 covers at least the Favorites (`_favorite: true` kept), Today (`date` kept), Untyped and folder rules; path 6 covers both the wikilink and the meta-bind `periodic: false` call
- [x] With the switch on, the Inbox "+ New here" (whose rule already sets `_organized: false`, `lens.logic.ts:226`) writes the key exactly once; `lens.logic.test.ts:598-602` and `RailNoteList.test.ts:874-885` stay green unchanged
- [x] With the switch on, each of the five periodic kinds created through `openOrCreatePeriodicNoteForDate` writes no `_organized` (one parameterised test in `periodic-notes.service.test.ts`), and a wikilink to a periodic name (`2026-11-04`) creates the daily note without the key (`editor-host.test.ts`)
- [x] With the switch on, a template or type template that sets `_organized: true` keeps `true` and gains no second key (one service test on path 5 or 10)
- [x] With the switch on and creation failing (`create_note` rejecting), the error propagates as today and no note is opened (one test on a `createFile` path and one on an `openOrCreateNote` path)
- [x] With the switch off, the paths write exactly what they write today: the existing tests of every covered path stay green unchanged, and one test per primitive family (a `createFile` path and an `openOrCreateNote` path) asserts no `_organized` with the switch explicitly off
- [x] Settings description (`core/settings/sections/TypesSection.svelte:13`) and help 19 (`help/documentation/19-settings.md:148`) read: "New notes start unorganized and appear in the Inbox until you organize them. Periodic notes are not marked."
- [x] ADR 0026 gets a `> **Amendment (2026-11-04):**` blockquote under its Lifecycle section (the form used at its lines 33, 58 and 60) saying the switch is wired, with the covered and excluded paths and the opt-in helper; line 41's "no code path reads it" sentence is not rewritten (history stays), the amendment supersedes it
- [x] Help 25 says, at line 253, that the Inbox holds notes with `_organized: false`, which new notes get while Explicit organization is on; at lines 277-284, that the switch marks notes created from then on (existing notes are unchanged), lists the covered paths in user terms and says periodic notes are not marked, and drops "Disable it to treat all notes as organized by default" (the Inbox is always shown and lists any note marked `_organized: false`); line 553 keeps its sentence, adds that periodic notes are not marked, and names the section "Settings > Types & Lifecycle"
- [x] Help examples that describe the switch match the code: `help/examples/type-definitions-features/person-bob.md:15-16` (a note without `_organized` is organized and is not in the Inbox), `project-inbox-example.md:12` (the Inbox shows it whatever the switch), `README.md:80` (the switch marks new notes; the Inbox item is always there). `pnpm vitest run src/tests/help` stays green

## Notes

- **Owner decisions (2026-11-04):** implement the switch (not remove it); every creation path except periodic notes (review section 8 names Cmd+N, Quick Capture, + New here, New <Type> and wikilink-created notes as examples).
- **Owner decision (2026-11-04, path list):** every creation path except periodic notes, including event notes, 1:1 notes and the deep link, as in the table.
- **Main-session decision (path list detail) (owner accepted 2026-11-04):** "every creation path" is read as every path that creates a Markdown note for the user, so the table covers paths 1-14 (including event notes, 1:1 notes, linked notes, template-picker notes, Quick Switcher and the `new` deep link). Type definitions, duplicated events, the `overwrite` deep link, templates and folder-note placeholders are not new user notes and stay out.
- **Main-session decision (helper shape):** opt-in at each call site through the pure `applyExplicitOrganization`, with a textual insertion that never parses or throws. A flag on `openOrCreateNote` / `createFile` would also reach periodic notes, non-Markdown files and type definitions and need an opt-out for each; a path or folder test would wrongly exempt Cmd+N notes in the periodic folder.
- **Main-session decision (Settings text (owner accepted 2026-11-04)):** the current second sentence ("Disable to treat all notes as organized by default.") is wrong: turning the switch off does not change notes already marked `_organized: false`. The new text is in the criterion.
- **Today (traced):** nothing reads `settingsStore.explicitOrganization`; it appears only in `core/settings/settings.types.ts:391`, `settings.store.svelte.ts:144,179`, `settings.service.ts:158` and `sections/TypesSection.svelte:16-18`. ADR 0026 line 41 admits it. A `settings.json` without the key reads as off (`settings.service.ts:158`), so existing vaults stay off.
- **Why after 08:** Issue 08 makes a missing `_organized` read as organized in the action bar too, so after it this switch is the one way new notes reach the Inbox, and help 25 line 253 describes both.
- **"+ New here" in the Inbox lens** already writes `_organized: false` through `newNoteRule`; keep that regardless of the switch.
- **Inbox membership** is not asserted in these tests: the lens reads the Rust entries snapshot, which vitest does not reindex, and the create paths skip the Rust IPC in `applyNoteChange` because `create_note` indexes the note. `_organized: false` -> not organized is covered by the Rust test `from_content_lifecycle_flags_false_when_explicit` (`entry.rs`) and the `isInboxEntry` tests.
- **Shared files with open file-io-audit Issues:** 20 and 38 touch Quick Capture (`quick-capture.service.ts`, the composer), and 30 is the empty-block regex. No conflict: this Issue adds one wrap per call site and handles the empty block inside the helper.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F71.
- **Size:** M.

## Comments

- 2026-11-04, branch `issue/16-explicit-organization-marks-new-notes`: `settingsStore.explicitOrganization` is wired through the pure `applyExplicitOrganization` / `withUnorganizedFlag` helper at each covered creation path (1-14); periodic notes are not marked. Settings text, help 19/25, the examples and ADR 0026 (amendment) now match. Fix round: the `kokobrain://new` deep link marks only Markdown targets (review finding 1); findings 2-3 rejected as harmless nits. Tests: pnpm check 0 errors; full suite exit=0 (474 files, 11118 passed, 1 skipped, 1 todo), pnpm build passed. Reviews: round 1 APPROVED (1 minor, 2 nits), round 2 APPROVED (no findings).
