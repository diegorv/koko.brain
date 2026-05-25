Status: ready-for-agent
Phase: 3

# Inbox workflow with explicit organization setting

## What to build

An optional "explicit organization" mode where new notes start in an Inbox state until the user marks them as organized. This implements the Portent lifecycle's capture-first philosophy: capture fast, organize later.

When enabled:
- New notes are created without `_organized` in frontmatter (defaults to `false`)
- "Inbox" filter in the type-grouped sidebar shows all non-organized, non-archived notes
- Inbox count badge shows how many notes need organizing
- "Mark as organized" action (from issue 04) removes the note from Inbox
- Assigning a `type` to a note could optionally auto-organize it (setting)

When disabled:
- No Inbox concept, all notes visible in default views
- `_organized` flag ignored for filtering purposes

Setting: `settings.vault.explicitOrganization: boolean` (default: `false` for backwards compatibility).

## Acceptance criteria

- [ ] New setting `explicitOrganization` in vault settings (default `false`)
- [ ] When enabled: Inbox filter shows notes with `organized: false` and `archived: false`
- [ ] When enabled: Inbox count badge in sidebar
- [ ] When enabled: new notes start unorganized
- [ ] When disabled: Inbox filter hidden, all notes in default view
- [ ] "Mark as organized" removes note from Inbox immediately
- [ ] Setting toggle accessible from settings UI
- [ ] Tests for inbox filtering logic with setting on/off

## Blocked by

- 04-lifecycle-ui-actions
- 10-type-grouped-sidebar
