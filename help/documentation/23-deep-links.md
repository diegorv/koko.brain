# Deep Links

Open notes, create captures, run searches, and trigger actions in Kokobrain from outside the app using the `kokobrain://` URL scheme.

---

## Overview

Kokobrain registers a custom URL protocol: `kokobrain://`. Any application on your Mac that can open URLs — Terminal, scripts, shortcuts, browser bookmarks, Raycast, Alfred, Shortcuts.app — can trigger actions inside Kokobrain by opening a `kokobrain://` URL.

This is useful for:
- Quick capture from a browser extension or automation shortcut
- Opening a specific note from a script or launcher
- Appending content to your daily note without switching windows
- Triggering a search from an external tool

## URL Format

```
kokobrain://action?vault=VaultName&param=value&param2=value2
```

- **`action`** — what to do (see actions below)
- **`vault`** — the vault name to target (required for all actions)
- Additional parameters depend on the action

If the specified vault is not currently open, Kokobrain switches to it first, then executes the action.

## Triggering a Deep Link

From Terminal:
```bash
open "kokobrain://open?vault=MyVault&file=Projects/ideas"
```

From an AppleScript or shortcut:
```applescript
open location "kokobrain://daily?vault=MyVault&append=true&clipboard=true"
```

---

## Actions

### `open` — Open a File or Vault

Opens a file in the editor. If no file is specified, just switches to the vault.

```
kokobrain://open?vault=MyVault
kokobrain://open?vault=MyVault&file=Projects/roadmap
kokobrain://open?vault=MyVault&path=/absolute/path/to/note.md
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vault` | Yes | Vault name |
| `file` | No | File path relative to vault root. `.md` is added automatically if no extension is present. |
| `path` | No | Absolute path to the file on disk. |

---

### `new` — Create a Note

Creates a new note and optionally opens it.

```
kokobrain://new?vault=MyVault&name=my-note&content=Hello
kokobrain://new?vault=MyVault&file=Projects/idea&append=true&clipboard=true
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vault` | Yes | Vault name |
| `name` | Yes* | Note filename (without path). Creates the note in the default quick-note folder. |
| `file` | Yes* | Note path relative to vault root. Use this to control location. |
| `content` | No | Text to write into the note. |
| `clipboard` | No | `true` — use the current clipboard content instead of `content`. |
| `append` | No | `true` — if the note already exists, append `content` to it. |
| `prepend` | No | `true` — if the note already exists, prepend `content` to it. |
| `overwrite` | No | `true` — if the note already exists, overwrite it with `content`. |
| `silent` | No | `true` — create the note without opening it in the editor. |

*Either `name` or `file` is required.

**Content mode priority:** If multiple modes are set, `append` takes precedence over `prepend`, which takes precedence over `overwrite`. If none is set and the file exists, the action does nothing (no destructive default).

---

### `search` — Open Search

Opens the Search panel and pre-fills the query.

```
kokobrain://search?vault=MyVault&query=meeting+notes
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vault` | Yes | Vault name |
| `query` | Yes | Search query string (URL-encode spaces as `+` or `%20`) |

---

### `daily` — Open or Append to Today's Daily Note

Opens today's daily note. Optionally appends or prepends content.

```
kokobrain://daily?vault=MyVault
kokobrain://daily?vault=MyVault&append=true&content=Task+from+browser
kokobrain://daily?vault=MyVault&prepend=true&clipboard=true
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vault` | Yes | Vault name |
| `content` | No | Text to add to the daily note. |
| `clipboard` | No | `true` — use the current clipboard content instead of `content`. |
| `append` | No | `true` — append `content` at the end of the daily note. |
| `prepend` | No | `true` — prepend `content` at the beginning of the daily note. |

If neither `append` nor `prepend` is set, the daily note is opened without any content modification.

---

### `capture` — Create a Quick Note with Tags

Creates a new quick-capture note and injects tags into its frontmatter.

```
kokobrain://capture?vault=MyVault&content=Important+idea&tags=inbox,ideas
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vault` | Yes | Vault name |
| `content` | Yes | The text content for the note. |
| `tags` | No | Comma-separated list of tags to add to the note's frontmatter. Merged with any existing tags (no duplicates). |

The note is created in the quick-note folder (configured in Settings → Quick Note).

---

## Vault Switching

If the `vault` parameter names a vault that is not currently open, Kokobrain will:

1. Store the action as **pending**.
2. Switch to the specified vault.
3. Once the vault finishes loading, execute the pending action automatically.

This means deep links always work, regardless of which vault is currently open.

---

## Encoding Special Characters

URL-encode special characters in parameter values:

| Character | Encoded |
|-----------|---------|
| Space | `+` or `%20` |
| `#` | `%23` |
| `&` | `%26` |
| `=` | `%3D` |
| `/` | `%2F` (inside parameter values) |

Most tools (Shortcuts.app, Alfred, Raycast) handle encoding automatically.

---

## Examples

**Open a specific note:**
```bash
open "kokobrain://open?vault=Work&file=Projects/Q2-roadmap"
```

**Append today's clipboard to the daily note:**
```bash
open "kokobrain://daily?vault=Personal&append=true&clipboard=true"
```

**Create a silent capture note tagged "inbox":**
```bash
open "kokobrain://capture?vault=Personal&content=Remember+to+review+PR&tags=inbox"
```

**Trigger a search from Raycast:**
```
kokobrain://search?vault=Work&query=standup
```

---

## Next Steps

- [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) — Configure the daily note this feature targets
- [Quick Notes & Templates](09-quick-notes-and-templates.md) — Configure the quick-note folder used by `capture`
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — In-app shortcuts for common actions
