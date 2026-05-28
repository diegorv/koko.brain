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
| `name` | Yes* | Note filename (without path). Creates the note in the default Quick Capture folder. |
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

### `capture` — Typed Quick Capture (v2 schema)

Creates a new quick-capture note from a typed payload. The brain owns the markdown rendering, so emitters only ship structured fields (text vs link vs clip) and let Kokobrain produce the body.

```
kokobrain://capture?v=2&kind=note&vault=MyVault&text=Important+idea&tags=inbox,ideas
kokobrain://capture?v=2&kind=clip&vault=MyVault&text=Whether+I+will+remain+open-minded&source_title=Four+Notes&source_url=https%3A%2F%2Fmedium.com%2Fpost
kokobrain://capture?v=2&kind=link&vault=MyVault&url=https%3A%2F%2Fexample.com%2Fpost&title=Post+Title&tags=reading-list
```

#### Required envelope params

| Parameter | Required | Description |
|-----------|----------|-------------|
| `v` | Yes | Schema version. Must be `2`. URIs without `v=2` are rejected. |
| `kind` | Yes | One of `note`, `clip`, `link`, `shot`, `file`. |
| `vault` | Yes | Vault name. |

#### Common optional params

These apply to every kind and travel as their own query params (no URL-encoded blobs).

| Parameter | Description |
|-----------|-------------|
| `tags` | Comma-separated list of tags injected into the note's YAML `tags:` frontmatter. Merged with template-supplied tags (deduplicated). |
| `source_app` | Bundle id of the foreground app at capture time (e.g. `com.google.Chrome`). Currently stored as provenance; not rendered into the body. |
| `source_title` | Title of the source window or page at capture time. Used as the label of the `> Source:` footer when present. |
| `source_url` | URL of the source page at capture time. When present (and different from `url` for the `link` kind), a `> Source: [<source_title or source_url>](<source_url>)` footer is appended to the body. |
| `captured_at` | ISO 8601 timestamp of when the capture happened. Stored as provenance; not rendered into the body. |

#### Per-kind params and rendering

##### `kind=note` — Free-form note

| Param | Required | Description |
|-------|----------|-------------|
| `text` | Yes | The note body. |

Body = `text` verbatim. If `source_url` is present, the source footer is appended:

```
<text>

> Source: [<source_title or source_url>](<source_url>)
```

##### `kind=clip` — Highlighted text from a source

| Param | Required | Description |
|-------|----------|-------------|
| `text` | Yes | The highlighted text. |

Body = `text` verbatim, plus the source footer when `source_url` is present. Same shape as `note`; the kind exists to express intent ("this came from a page I was reading") so future renderers can style it differently.

##### `kind=link` — Canonical link

| Param | Required | Description |
|-------|----------|-------------|
| `url` | Yes | Canonical URL of the link. |
| `title` | No | Optional page title. When present, it becomes the markdown link label, is injected into the YAML `title:` frontmatter, and is exposed to your Quick Capture link template as `<% title %>`. |

Body = `[<title or url>](<url>)`. When `source_url` is present AND different from `url`, the source footer is appended:

```
[<title or url>](<url>)

> Source: [<source_title or source_url>](<source_url>)
```

A `source_url` that equals the canonical `url` is treated as redundant and the footer is suppressed.

##### `kind=shot` / `kind=file` — Local file references (not yet supported)

| Param | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute local path to the file (image for `shot`, anything for `file`). |

The parser accepts these kinds for forward compatibility. The service currently shows a `Capture kind "shot" not yet supported` (or `"file"`) toast and does not write a file. A future change will wire the renderer; the emitter side can already ship URIs with these kinds against this brain version without breaking anything else.

#### Tags and title injection

- `tags` always run through `injectTagsIntoContent`. If a template sets a `tags:` list, the deep-link tags are merged (no duplicates). If the template's `tags:` is a scalar, it is replaced with a list containing the deep-link tags.
- `title` is injected as YAML `title:` ONLY for `kind=link`. For `note` and `clip`, the text itself is the title; no automatic `title:` is added. If you want a `title:` on a note/clip, set it via a template.

#### Template integration

The note is created in the Quick Capture folder (configured in `Settings → Quick Capture`). When the matching per-kind template path is set in `Settings → Quick Capture → <Kind> template`, the template is read and the following variables are exposed:

- `<% content %>` — the rendered body (the same markdown the brain writes after `renderCaptureBody`).
- `<% title %>` — the deep-link `title` (link kind only) or, when absent, the filename-derived title. Templates that reference `<% title %>` always resolve.

The template's output is then prepended to the rendered body. After that, `title` (link kind) and `tags` are injected into frontmatter, overwriting the template's `title:` field and merging into its `tags:` list when applicable.

#### Migration note (breaking)

v2 is a breaking change. The v1 schema (`kokobrain://capture?vault=...&content=...&title=...&tags=...` without `v=2` or `kind`) is no longer accepted. Old emitters that have not been updated will see a `Unsupported capture schema: expected "v=2"` toast. Coordinate the brain release with the quick-capture emitter rollout. `koko/clipper` is unaffected because it never used the `capture` action — it emits `kokobrain://new?...` and `kokobrain://daily?...`, both unchanged.

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

**Capture a free-form note tagged "inbox":**
```bash
open "kokobrain://capture?v=2&kind=note&vault=Personal&text=Remember+to+review+PR&tags=inbox"
```

**Capture a highlighted clip with its source page:**
```bash
open "kokobrain://capture?v=2&kind=clip&vault=Personal&text=Whether+I+will+remain+open-minded&source_title=Four+Notes&source_url=https%3A%2F%2Fmedium.com%2Fpost&tags=reading-list"
```

**Capture a link with a structured title (good for browser-extension or quick-capture-style integrations):**
```bash
open "kokobrain://capture?v=2&kind=link&vault=Personal&url=https%3A%2F%2Fnews.ycombinator.com&title=Hacker+News&tags=reading-list"
```

**Trigger a search from Raycast:**
```
kokobrain://search?vault=Work&query=standup
```

---

## Next Steps

- [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) — Configure the daily note this feature targets
- [Quick Capture & Templates](09-quick-notes-and-templates.md) — Configure the Quick Capture folder + per-kind templates used by `capture`
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — In-app shortcuts for common actions
