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
| **Kanban** | New Kanban Board | — |
| **Navigation** | Open Quick Switcher | `Cmd+O` |
| | Search in Vault | `Cmd+Shift+F` |
| | Toggle Graph View | `Cmd+G` |
| | Toggle Tasks View | `Cmd+Shift+T` |
| | Toggle Tags View | — |
| **Layout** | Toggle Right Sidebar | `Cmd+B` |
| | Toggle Left Sidebar | `Cmd+Shift+B` |
| | Toggle Table of Contents | — |
| **Daily Notes** | Open Daily Note | — |
| **Quick Capture** | Create Quick Capture Note | `Cmd+N` |
| **1:1 Notes** | Create 1:1 Note | `Cmd+Shift+N` |
| **Templates** | New File from Template | — |
| **Settings** | Open Settings | `Cmd+,` |

---

## Vault Search

**Shortcut:** `Cmd+Shift+F`

Vault Search opens the **Search Panel** in the left sidebar, replacing the file explorer. This is your tool for searching across the full content of every note in your vault.

![Search panel with results](screenshots/search-panel.png)

### Search Modes

Kokobrain offers three search modes. Select them using the tabs at the top of the search panel.

#### Text Search (default)

Fast full-text search powered by SQLite FTS5. This mode finds exact words and phrases across all your notes. Results are ranked by relevance using the BM25 algorithm, and matching text is highlighted in the results.

The FTS index uses the `unicode61` tokenizer with diacritic folding, so `acao` matches `ação`, `cafe` matches `café`, and so on. Both your queries and your notes are folded the same way at index time, so accents never cause missed matches.

#### Semantic Search (AI-powered)

Semantic search understands the *meaning* of your query, not just the exact keywords. For example, searching "meeting with client" can find a note titled "customer sync-up" even though none of the words match.

- Requires a one-time model download (~542 MB for the embedder). Enable it in **Settings > Search > Semantic Search**.
- Uses local AI models (BGE-M3 embedder, plus an optional BGE-reranker-v2-m3 cross-encoder) that run entirely on your machine — your data never leaves your computer.

**How it works under the hood:**

1. **Chunking**: Kokobrain splits each note into chunks. Headings drive the structure: each section becomes its own chunk, with the parent heading hierarchy (e.g. `Project X > Decisions > Auth`) prepended to the embedded text so semantically similar sections from different parts of the vault remain distinguishable. Long sections are split with a character-based cap (~3000 chars) and overlap so context carries between chunks. Notes that contain no headings at all fall back to a sliding-window chunker so they get indexed in their entirety instead of being truncated to the model's token limit. Fenced code blocks keep their opening lines and inline comments so function names, CLI flags, and signatures stay searchable.
2. **Embedding**: Each chunk is converted into a 1024-dimensional vector using the BGE-M3 ONNX model, which runs locally via the ONNX Runtime. Chunks are processed in batches. Re-indexing is content-hash-aware — chunks whose text hasn't changed since the last index skip embedding entirely.
3. **Searching**: When you search, your query is also embedded, then compared against all stored chunk embeddings using cosine similarity. The top 50 candidates are kept for the next stage.
4. **Reranking (optional)**: If the BGE-reranker-v2-m3 cross-encoder model has been downloaded (~571 MB, opt-in via **Settings > Search**), the top 50 candidates are re-scored by reading each `(query, chunk)` pair jointly. This is qualitatively a much stronger signal than cosine similarity alone — it captures word-level relevance the bi-encoder embedding cannot — at the cost of ~500 ms of CPU work per query. If the reranker model is not present, this stage is skipped transparently and results stay in cosine order.
5. **Filtering**: Results go through adaptive noise filtering that removes low-quality matches by detecting natural score gaps in the ranked list, so you see only the relevant hits.

#### Hybrid Search

Hybrid search combines text and semantic results for the best of both worlds. It uses Reciprocal Rank Fusion (RRF, `k = 60`) to merge the rankings from FTS and the semantic engine into a single fused ranking, then the top 50 fused candidates are reranked with the BGE cross-encoder (when available) and adaptively filtered exactly like semantic mode. This captures both exact-term hits and paraphrased / multilingual matches in one ranking.

This mode is only available when semantic search is enabled. The reranker step is skipped automatically if its model is not downloaded.

> [!NOTE]
> Everything — embeddings, reranking, and ranking — runs entirely on your machine. No query or document text is ever sent to any server. The ONNX model files are downloaded once from HuggingFace and then run locally.

### Fuzzy Toggle

In Text mode, click the `~` button next to the search input to toggle **fuzzy matching** (enabled by default). When enabled, the search tolerates typos and approximate matches. For example, "meating" will still find notes containing "meeting". The toggle only appears in Text mode.

### Search Results

Each result shows:

- The **file name** of the matching note
- A **text snippet** with the matching terms highlighted
- A **relevance score** indicating how closely the note matches your query

Click any result to open that file in the editor. The search index updates automatically whenever you save files, so your results are always up to date.

### Search Operators

You can narrow text and hybrid searches with two operators, typed anywhere in the query:

- `tag:tagname` - only matches notes that contain that tag (in frontmatter or inline). Combine multiple `tag:` operators to require all of them.
- `path:folder` - only matches notes whose path contains that text, so you can scope a search to a folder.

Operators can be combined with regular search terms, for example `meeting tag:work path:projects`.

Clicking a tag in the Tags panel (right sidebar) automatically sets the search query to `tag:tagname`, which is the same as typing the operator yourself.

---

## Status Bar: Search Progress

When the search index is being built — on first vault open or after many changes — the status bar at the bottom of the window shows indexing progress. Once indexing is complete, searches are near-instantaneous.

---

## Next Steps

- [Sidebar Panels](07-sidebar-panels.md) — Backlinks, tags, and properties
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — Complete shortcut reference
