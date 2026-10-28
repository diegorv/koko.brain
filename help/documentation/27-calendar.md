# Calendar

The Calendar tab shows your Event notes on a day, week or month grid. Every event is an ordinary Markdown note with a few frontmatter keys, so you can open, link, search and edit it like any other note. Creating, moving or resizing an event on the grid writes those keys for you.

---

## Opening the Calendar

| How | What happens |
|-----|--------------|
| `Cmd+Shift+C` | Opens the Calendar tab, or closes it when it is the active tab |
| Command Palette: **Toggle Calendar View** | Same as `Cmd+Shift+C` |
| Command Palette: **New Calendar Event** | Opens the Calendar tab and the new-event dialog |
| Command Palette: **Calendar: Go to Today** | Opens the Calendar tab on today |
| Sidebar calendar panel: **Open Calendar** button | Opens the Calendar tab on the panel's selected day (or today) |
| Sidebar calendar panel: double-click a day | Opens the Calendar tab on that day, in the day view |

The Calendar opens as a tab in the editor area, next to your notes. Only one Calendar tab exists at a time.

## Views and Navigation

The header holds **Today**, the previous / next arrows, the **Keyboard shortcuts** button (it opens the list of the shortcuts below, as `?` does) and the **D / W / M** switch:

- **Day** shows one day on a 24-hour time grid.
- **Week** shows seven days on the time grid (five when **Show weekends** is off).
- **Month** shows the month as a grid of day cells with event chips.

All-day events sit in the **All day** lane above the time grid. When a day has more events than fit, a **+N** button opens that day in the day view.

In the month view, click a day number to select the day; click the selected day's number again to open it in the day view.

**Daily notes**: with Periodic Notes, a notebook button sits beside each day header (day and week views) and each day number (month view). It opens that day's daily note, creating it from the daily template when it does not exist yet.

**Narrow panes**: each day column keeps a minimum width. When the pane is too narrow for every column (for example a week view in a split pane), the grid scrolls sideways while the time axis stays in place. Events in a narrow column show only their title.

The grid scrolls to the **Day starts at** hour (Settings > Calendar) when it opens.

## Creating, Moving and Resizing Events

| Action | How |
|--------|-----|
| New event at a time | Click an empty spot on the time grid, or drag over a range, then fill in the dialog |
| New all-day event | Click an empty spot in the **All day** lane |
| New event in the month view | Double-click an empty part of a day cell (the start is the **Day starts at** hour) |
| New event anywhere | Press `N` in the Calendar, or run **New Calendar Event** |
| Move an event | In the day or week view, drag its block to another time or day |
| Change its length | In the day or week view, drag the bottom edge of its block |
| See details | Click the event: the popover shows its time, location and a note excerpt |
| Edit the fields | **Edit** in the popover |
| Open the note | **Open note** in the popover |
| Duplicate / delete | The copy and trash icons in the popover, or `Delete` / `Backspace` for delete |

Times snap to 15 minutes and an event is at least 15 minutes long. Press `Escape` during a drag to cancel it.

The dialog has **Title**, **Date**, **All day**, **Start**, **End**, **Location**, **Color** and, for a new event, **Notes** (the start of the note body).

Deleting an event moves its note to the [Trash](18-trash.md). The "Event deleted" toast has an **Undo** button.

## The Event Note

An event note is any note whose type is the event type (`Event` by default). The calendar reads these frontmatter keys:

```yaml
---
type: Event
date: 2026-03-02
start: "09:30"
end: "10:15"
location: Room 4
event_color: green
---
Agenda and notes go in the body as usual.
```

| Key | Meaning | When absent |
|-----|---------|-------------|
| `date` | The day, as `YYYY-MM-DD` | The note is **Unscheduled** (see below) |
| `start` | Start time, `HH:mm` (24-hour) | The event is all-day |
| `end` | End time, `HH:mm`; `24:00` (or `00:00` after a later `start`) is the end of the day. An `end` before `start` ends on the next day | `start` plus the **Default duration**; with `end_date`, the end of that day |
| `all_day` | `true` makes it an all-day event | Not all-day, unless `start` is absent |
| `event_color` | `green`, `purple`, `cyan`, `orange`, `pink` or `blue` | The **Default color**; an unknown color also falls back to it |
| `location` | Free text | No location |
| `event_title` | Display title, when it differs from the filename | The filename (without `.md`) is the title |
| `end_date` | Last day of a multi-day event, as `YYYY-MM-DD` | Single-day event |

`type` is an alias of `_type` (see [Types & Relationships](25-types-and-relationships.md#frontmatter-key-aliases)); the type name matches without regard to case, so `type: event` counts too.

A multi-day event (one with `end_date`) shows on every day from `date` to `end_date`: an all-day one in the all-day row, a timed one from `start` on its first day to `end` on its last day. A timed event whose `end` is before its `start`, such as `start: "23:00"` and `end: "01:00"`, crosses midnight and shows on both days.

Both are read-only on the calendar: you cannot drag, resize or retime them there, because the calendar never writes `end_date` and moving `date` alone would break the span. Change their dates and times in the note. The edit dialog still changes the title, color and location.

### Titles with `:` or `/`

The title is the note's filename, and a filename cannot contain `< > : " / \ | ? *`. When you type such a title (for example `Sync: Q3 plan`), the calendar replaces each forbidden character with `-` in the filename (`Sync- Q3 plan.md`) and keeps the real title in `event_title`. Changing the title in the dialog renames the note; when the new name is taken, a number is added (`Standup 1.md`).

### The Event Type

**Settings > Calendar > Event type** sets which type counts as an event (default `Event`). Leaving the field empty, or entering `Type` (in any case; it is the type of type-definition notes), resets it to `Event`.

Renaming the type in the type sidebar renames it in every member note, but not in this setting: enter the new name in **Settings > Calendar > Event type**, or your events disappear from the calendar.

### Needs Attention

An event note the calendar cannot place, or can only place with a caveat, is listed below the grid under **N events need attention**. Click a row to open the note and fix it.

| Reason shown | What to fix |
|--------------|-------------|
| `start is not a valid time (HH:mm)` / `end is not a valid time (HH:mm)` | Write the time as `HH:mm`, for example `09:30` |
| `end_date is not YYYY-MM-DD` | Write the last day as `YYYY-MM-DD`, or remove the key |
| `all_day is not true or false` | Use `all_day: true` or remove the key |
| `end is not after start` | `end` equals `start` (an empty event), or `end_date` is the same day as `date` and `end` is before `start`; fix the times |
| `end_date is before date` | Set `end_date` on or after `date` |
| `<key> has a trailing # comment` | Remove the `# ...` comment after the value of `date`, `end_date`, `start`, `end`, `all_day` or `event_color` |

The calendar never guesses a value it cannot read: a note with an unreadable `start`, `end` or `all_day` stays off the grid, so a drag can never overwrite what you wrote.

## Which Notes Show

- Notes of the event type outside the system folder (**Settings > Templates > System folder**, `_system` by default). Notes under that folder, such as the Event template, never show.
- Archived events (`_archived: true`) are hidden. The footer counts them: **N archived events hidden**.
- Event notes without a usable `date` are listed under **Unscheduled** (see the next part). They are not counted as problems.

### Using Existing Event Notes

If you already keep Event notes, for example meetings typed `type: Event` as shown in [Types & Relationships](25-types-and-relationships.md), they work as they are:

- An Event note with no `date:` is listed under **Unscheduled**: a quiet **N unscheduled** link below the grid, or an **Unscheduled (N)** section when other notes need attention. It is not an error.
- Add `date:` to put it on the calendar as an all-day event. Add `start` and `end` as well for a timed event.
- A value like `date: 2024-03-02T14:00` is not a day, so the note stays **Unscheduled** ("date is not YYYY-MM-DD"). Split it into `date: 2024-03-02` and `start: "14:00"`.

## Times and Time Zones

Event times are floating wall-clock times: `start: "09:00"` means 09:00 wherever you are, with no time zone attached. Moving to another time zone does not shift your events.

The time grid always has 24 rows, also on the days a daylight-saving change makes 23 or 25 hours long.

## Where New Events Go

The calendar creates a new event exactly like **New Event** in the type sidebar ([Creating Notes from Types](25-types-and-relationships.md#creating-notes-from-types)):

- The folder is the event type's `_folder` (under the Types base folder). **Settings > Calendar > New events go to** shows the resolved folder, and **Open Event type** opens the type definition to change it.
- The note starts from the event type's `_template`, if it has one. Template expressions such as `<% tp.date.now() %>` render the event's date, not today's.
- The calendar adds its keys (`date`, `start`, `end`, ...) to the template's frontmatter.
- A template whose frontmatter has comments or nested values is refused: no note is created and a toast asks you to fix the template or remove it from the Event type.

## How the Calendar Writes a Note

Every calendar change (create, move, resize, edit) rewrites the note's frontmatter. The body is left alone.

- **Canonical YAML**: the first calendar edit reformats the frontmatter to Kokobrain's canonical YAML form ([ADR-0029](../../docs/adr/0029-frontmatter-yaml-canonical-form.md)), the same form the Properties panel writes. Quoting and list style may change; the values stay the same.
- **The usual coercions apply**: an empty value becomes `""`, list items become strings, and alias keys become canonical (`type` becomes `_type`).
- **Refused writes**: the calendar does not rewrite frontmatter it would damage. The write is refused, with a toast and an **Open note** button, when the frontmatter has:
  - YAML comments,
  - nested values,
  - the same key twice,
  - two keys for one property (for example `type` and `_type`),
  - YAML anchors,
  - YAML that cannot be parsed.
- **Unsaved typing**: if the note is open with an unsaved body edit, a calendar edit saves that edit together with its own change. Deleting an event saves the note first, so the Trash keeps your latest text.
- **Duplicating**: the copy is named `<title> (copy).md`, in the same folder. When the original has `event_title`, the copy's becomes `<title> (copy)`. If the calendar would refuse to rewrite the original's frontmatter (see the list above), the copy keeps the bytes unchanged, so it shows the original title.

## Undo and Redo

| Shortcut | Action |
|----------|--------|
| `Cmd+Z` | Undo the last calendar change |
| `Cmd+Shift+Z` or `Ctrl+Y` | Redo |

The Command Palette has **Calendar: Undo** and **Calendar: Redo** too.

- Undo covers changes made in the Calendar: create, duplicate, move, resize, edit and delete. Undoing a delete restores the note from the Trash. The last 100 changes are kept.
- Undo does not cover edits made elsewhere (in the editor or the Properties panel). If the event changed since, undo is refused ("Event changed since; not undone").
- Renaming or moving the note outside the calendar ends the undo history for that event; a later undo shows "Event was moved or renamed outside the calendar; cannot undo".
- A toast confirms each undo or redo and offers the opposite action.

## Calendar Keyboard Shortcuts

These work while the Calendar tab has focus, not while you type in a field or while a dialog is open.

| Key | Action |
|-----|--------|
| `T` | Go to today |
| `N` | New event |
| `D` / `W` / `M` | Day / week / month view |
| `Left` / `Right` | Previous / next day, week or month |
| `Delete` / `Backspace` | Delete the event in the open popover, or the focused event |
| `Escape` | Close the event popover, or cancel a drag |
| `Cmd+Z` / `Cmd+Shift+Z` / `Ctrl+Y` | Undo / redo |
| `?` | Show these shortcuts |

`Cmd+Shift+C` opens and closes the Calendar from anywhere. See [Keyboard Shortcuts](20-keyboard-shortcuts.md).

## Good to Know

- **Search**: a new event appears in text search after its first edit, or after the vault is opened again.
- **Sync (planned)**: with the planned peer-to-peer sync, a sync conflict copy of an event note is an ordinary Event note, so it shows as a duplicate event until you resolve the conflict.
- **Collections**: to list events in a [Collection](12-collection.md), filter on the type and use `date` as the date property:

  ```yaml
  filters: '_type == "Event"'
  views:
    - type: calendar
      name: Events
      dateProperty: date
  ```

  Use your event type's name if you changed it in Settings.

## Calendar Tab vs. the Sidebar Calendar Panel

| | Calendar tab | Sidebar calendar panel |
|---|---|---|
| Shows | Event notes, placed by `date`, `start` and `end` | A month grid of days, with dots for files created on each day |
| Used for | Planning and editing events | Opening periodic notes (daily, weekly, monthly, quarterly) and files created on a day |
| Lives in | An editor tab | The left sidebar |

The panel's **Open Calendar** button and day double-click open the Calendar tab. See [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md).

## Settings

**Settings > Calendar** sets the week start, time format, **Day starts at** hour, weekends, default view, default duration and color, and the event type. See [Settings](19-settings.md#calendar).

---

## Next Steps

- [Types & Relationships](25-types-and-relationships.md): the type system Event notes use
- [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md): the sidebar calendar panel
- [Settings](19-settings.md#calendar): the Calendar settings
- [Keyboard Shortcuts](20-keyboard-shortcuts.md): all shortcuts
