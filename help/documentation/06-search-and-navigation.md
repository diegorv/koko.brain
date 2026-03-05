# Search & Navigation

Learn how to find anything in your vault using the Quick Switcher, Command Palette, and powerful search.

---

## Quick Switcher

**Shortcut:** `Cmd+O`

The Quick Switcher is a popup dialog for opening files by name — the fastest way to navigate your vault.

- **Fuzzy search**: type any part of the filename. The search is not case-sensitive, and the characters you type don't need to be contiguous. For example, typing "mtg" can match "Meeting Notes".
- **Recent files**: before you type anything, the Quick Switcher shows your most recently opened files at the top, so you can jump back to them instantly.
- **Create new note**: if no file matches your search, a "Create [your query]" option appears at the bottom of the list. Press Enter to create a new note with that name instantly.

Press **Enter** to open the selected file, or **Escape** to dismiss the dialog.

![Quick Switcher with search results](screenshots/quick-switcher.png)

> [!TIP]
> The Quick Switcher is the fastest way to navigate a large vault. Train yourself to use `Cmd+O` instead of scrolling through the file explorer.

---

## Command Palette

**Shortcut:** `Cmd+P`

The Command Palette gives you a searchable list of all available commands in the app. It works much like the Quick Switcher, but for actions instead of files.

- Type any part of a command name to filter the list.
- Keyboard shortcuts are shown next to each command, so you can learn them over time.
- Recently used commands appear at the top for quick access.

![Command Palette](screenshots/command-palette.png)

### Available commands by category

| Category | Command | Shortcut |
|----------|---------|----------|
| **Editor** | Save File | `Cmd+S` |
| | Close Tab | `Cmd+W` |
| | Next Tab | `Cmd+Shift+]` |
| | Previous Tab | `Cmd+Shift+[` |
| | Pin/Unpin Tab | — |
| | Copy Link to Block | `Cmd+Shift+L` |
| | Copy Block Embed | — |
| | View File History | `Cmd+Shift+H` |
| **File Explorer** | New File | — |
| | New Folder | — |
| **Canvas** | New Canvas | — |
| **Navigation** | Open Quick Switcher | `Cmd+O` |
| | Search in Vault | `Cmd+Shift+F` |
| | Toggle Graph View | `Cmd+G` |
| | Toggle Tasks View | `Cmd+Shift+T` |
| **Layout** | Toggle Right Sidebar | `Cmd+B` |
| | Toggle Terminal | `` Cmd+` `` |
| **Notes** | Open Daily Note | — |
| | Create Quick Note | `Cmd+N` |
| | Create 1:1 Note | `Cmd+Shift+N` |
| | New File from Template | — |
| **Settings** | Open Settings | `Cmd+,` |
| **Encryption** | Toggle Note Encryption | — |
| | Lock Encrypted Notes | — |

---

## Vault Search

**Shortcut:** `Cmd+Shift+F`

Vault Search opens the **Search Panel** in the left sidebar, replacing the file explorer. This is your tool for searching across the full content of every note in your vault.

![Search panel with results](screenshots/search-panel.png)

### Search Modes

Kokobrain offers three search modes. Select them using the tabs at the top of the search panel.

#### Text Search (default)

Fast full-text search powered by SQLite FTS5. This mode finds exact words and phrases across all your notes. Results are ranked by relevance using the BM25 algorithm, and matching text is highlighted in the results.

#### Semantic Search (AI-powered)

Semantic search understands the *meaning* of your query, not just the exact keywords. For example, searching "meeting with client" can find a note titled "customer sync-up" even though none of the words match.

- Requires a one-time model download (~118 MB). Enable it in **Settings > Search > Semantic Search**.
- Uses a local AI model (BGE-M3) that runs entirely on your machine — your data never leaves your computer.

**How it works under the hood:**

1. **Chunking**: Kokobrain splits each note into chunks based on Markdown headings. Short sections are merged together; long sections are capped. This ensures each chunk has enough context for meaningful similarity matching.
2. **Embedding**: Each chunk is converted into a numerical vector (embedding) using the BGE-M3 ONNX model, which runs locally via the ONNX Runtime. Chunks are processed in batches for efficiency.
3. **Searching**: When you search, your query is also converted into an embedding, then compared against all stored chunk embeddings using cosine similarity.
4. **Filtering**: Results go through adaptive noise filtering that removes low-quality matches by detecting natural score gaps in the results, so you see only relevant hits.

#### Hybrid Search

Hybrid search combines text and semantic results for the best of both worlds. It uses Reciprocal Rank Fusion (RRF) to merge the rankings from both search engines into a single result list. This mode is only available when semantic search is enabled.

> [!NOTE]
> Semantic search runs entirely on your machine. No data is sent to any server.

### Fuzzy Toggle

Click the `~` button next to the search input to enable **fuzzy matching**. When enabled, the search tolerates typos and approximate matches. For example, "meating" will still find notes containing "meeting".

### Search Results

Each result shows:

- The **file name** of the matching note
- A **text snippet** with the matching terms highlighted
- A **relevance score** indicating how closely the note matches your query

Click any result to open that file in the editor. The search index updates automatically whenever you save files, so your results are always up to date.

### Tag Search

Clicking a tag in the Tags panel (right sidebar) automatically sets the search query to `tag:tagname`. This filters the results to show only notes that contain that specific tag.

---

## Status Bar: Search Progress

When the search index is being built — on first vault open or after many changes — the status bar at the bottom of the window shows indexing progress. Once indexing is complete, searches are near-instantaneous.

---

## Next Steps

- [Sidebar Panels](07-sidebar-panels.md) — Backlinks, tags, and properties
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — Complete shortcut reference
