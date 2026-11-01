# Issue 05 discovery: action bar, New 1:1 and New linked note

Repeats the bar pattern of `work/03` and `work/04` (`NoteActionBar.svelte`, bar logic / service, component
test with only Tauri + toast mocked) and the plugin-registers-into-feature bridge of
`features/event-calendar/event-calendar-daily-note.store.svelte.ts`. Only the differences are listed.

## Files that change

- `features/type-definitions/type-definitions.logic.ts:5-58,92-112` - `TypeMetadata.hub` (`_hub`, default false).
- `features/properties/properties.logic.ts` - `ensureFrontmatterLink(content, key, target)`: returns the content
  unchanged when `key` already links `target`; inserts `key: "[[target]]"` after the opening `---` when the key
  is absent (template bytes kept); appends the link to an existing value through `rebuildContent` when the key is
  there without it (throws on lossy frontmatter); prepends a frontmatter block when there is none.
- `core/note-creator/note-creator.service.ts:15-34,92` - `buildContent?: (content) => string` option, applied to
  the rendered template before `create_note`; a throw creates no file.
- `plugins/one-on-one/one-on-one.service.ts:59-90` - `createOneOnOneNote` passes
  `buildContent: ensureFrontmatterLink(_, '_related_to', person)`, so the picker and the bar share it.
  `registerOneOnOneActionBarAction()` registers "New 1:1" for `Person` notes (toast on failure, as the picker).
- New `features/note-action-bar/note-action-bar-actions.store.svelte.ts` - registry of plugin hub actions
  (`register` returns unregister, getter `actions`).
- `note-action-bar.logic.ts` - `ActionBarState.typeName` (null without `_type`); `resolveHubAction`.
- `note-action-bar.service.ts` - `createLinkedNote(hubPath)`: `createFile(dir of hub, 'Untitled.md',
  _belongs_to link)` then `openFileInEditor`; toast on failure.
- `NoteActionBar.svelte` - the hub button after the file name.
- `core/app-lifecycle/app-lifecycle.service.ts:242-248,552` - wired in the `unregisterNoteChangeConsumers` list.
- `help/documentation/` page that lists the bar actions.

## Prior-art tests

`type-definitions.logic.test.ts`, `note-creator.service.test.ts` (asserts `create_note` content),
`one-on-one.service.test.ts`, `NoteActionBar.test.ts`, `note-action-bar.service.test.ts`,
`app-lifecycle.service.test.ts` "note-change consumer wiring".

## Defaults taken

- A Person note is a note whose `_type` is `Person`; it shows New 1:1 (from the plugin registration) and not
  New linked note, even when Person sets `_hub` (prototype shows one button). Without the plugin registered it
  falls back to New linked note only when Person is a hub.
- The person / hub name in the link is the note's file name without `.md` (what the picker passes).
- Link match is case-insensitive on the target, ignoring `|alias` and `#heading`.
- New linked note: an untyped `Untitled.md` (deduped) whose only frontmatter is `_belongs_to`.
- An existing 1:1 for the same day is opened as is (the existing `openOrCreateNote` rule); no link is added.

## Risks

- `TypeMetadata` literals in tests and fixtures need the new field (`pnpm check` finds them).
- Lossy template frontmatter with a `_related_to` that lacks the person: creation fails with a toast.
