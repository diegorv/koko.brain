# Kokobrain

A personal desktop note-taking app inspired by [Obsidian.md](https://obsidian.md), built with Svelte 5 and Tauri 2. Your notes are plain Markdown files stored locally — no cloud, no lock-in.

> ⚠️⚠️ **Warning:** This is a personal project under active development. It is **not** a replacement for Obsidian, nor does it aim to be. Expect breaking changes, missing features, and rough edges.
> **We do not recommend using this for anything important.** 
> **We are not accepting pull requests, issues, or external contributions at this time.**

## Features

- **Markdown editor** with source mode and live preview (CodeMirror)
- **Wikilinks** (`[[note]]`) with autocomplete, block references, and embeds
- **Full-text search** powered by SQLite FTS5 with BM25 ranking
- **Semantic search** using a local AI model (BGE-M3 via ONNX Runtime) — no data leaves your machine
- **Graph view** — interactive force-directed visualization of note connections
- **Canvas** — infinite visual board with text, file, link, and image nodes (JSON Canvas 1.0)
- **Collection** — database/table views of notes queried by frontmatter properties
- **QueryJS** — JavaScript API for programmatic vault queries
- **Tasks** — aggregated task view with extended statuses and Todoist sync
- **Periodic notes** — daily, weekly, monthly, and quarterly notes with templates and calendar
- **File history** — automatic snapshots with diff viewer and restore
- **Encrypted notes** — AES-256-GCM encryption with macOS Keychain and Touch ID
- **Integrated terminal** — real PTY sessions with xterm.js and WebGL rendering
- **Custom file icons** — 11 icon packs + emoji with color picker
- **Bookmarks**, **tags**, **backlinks**, **outgoing links**, **properties** panel
- **Templates** and **quick note** capture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 (runes), SvelteKit, TypeScript |
| UI | shadcn-svelte (Tailwind CSS v4 + bits-ui) |
| Editor | CodeMirror 6 with custom extensions |
| Backend | Tauri 2 (Rust) |
| Database | SQLite (rusqlite) with WAL mode |
| Search | FTS5 + ONNX Runtime (semantic embeddings) |
| Encryption | AES-256-GCM, macOS Keychain, Touch ID |
| Terminal | portable-pty + xterm.js |
| Package manager | pnpm |

## Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full local development setup guide, including system dependencies, troubleshooting, and workflow tips.

### Quick Start

```bash
# 1. Install mise (version manager) — https://mise.jdx.dev
curl https://mise.jdx.dev/install.sh | sh

# 2. Install pinned versions of Node.js, pnpm, and Rust
mise install

# 3. Install frontend dependencies
pnpm install

# 4. Run in dev mode
pnpm tauri dev
```

### Commands

```bash
pnpm tauri dev            # Run app in dev mode (frontend + Tauri)
pnpm dev                  # Run frontend only (no Tauri window)
pnpm build                # Build frontend for production
pnpm tauri build          # Build the full desktop app
pnpm check                # TypeScript type checking
pnpm vitest run           # Run frontend tests
cargo test --manifest-path src-tauri/Cargo.toml   # Run Rust tests
bash scripts/e2e.sh       # Run E2E tests (Playwright)
```

## Project Structure

```
src/lib/
  components/ui/        # shadcn-svelte components
  core/                 # Essential: vault, filesystem, editor, file explorer, settings,
                        #   trash, layout, keybindings, status bar, note creator, zoom
  features/             # Always loaded: search, backlinks, tags, properties, tasks, canvas,
                        #   collection, file-history, bookmarks, file-icons, copy-block-link,
                        #   auto-move, command-palette, quick-switcher, folder-notes,
                        #   outgoing-links, deep-link, views
  plugins/              # Optional: periodic-notes, calendar, templates, quick-note,
                        #   graph-view, encrypted-notes, terminal, queryjs, word-count,
                        #   kanban, one-on-one
  utils/                # Pure shared utilities

src-tauri/src/
  commands/             # Tauri command handlers (vault, files, search, semantic, history,
                        #   crypto, terminal, debug, fonts, db)
  db/                   # SQLite: schema, FTS5 repo, history repo, semantic repo
  search/               # FTS indexing logic, text search, fuzzy expansion
  semantic/             # ONNX model management, embedder, markdown chunker, filtering
  security/             # AES-256-GCM crypto, macOS Keychain, Touch ID biometric
  utils/                # Debug logging, filesystem utilities
```

## Documentation

- **[User Guide](help/documentation/README.md)** — Complete guide with 20 chapters covering every feature
- **[Developer Patterns](docs/PATTERNS.md)** — Svelte 5 reactive patterns, store conventions
- **[Testing Guide](docs/TESTING.md)** — Mock rules, assertion patterns, service/store tests
- **[Commit Conventions](docs/COMMITS.md)** — Commit message format and examples
- **[Live Preview Architecture](docs/LIVE-PREVIEW.md)** — Editor live preview plugin system

## IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Inspirations

Some features in Kokobrain were inspired by ideas from Obsidian community plugins that I used daily. These are concept-level inspirations only — no code was copied, and there is no expectation of compatibility, feature parity, or interoperability with any of these projects.

- **Auto-move** — inspired by [obsidian-auto-note-mover](https://github.com/farux/obsidian-auto-note-mover)
- **QueryJS** — inspired by [obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
- **Templates** — inspired by [Templater](https://github.com/SilentVoid13/Templater)
- **Terminal** — inspired by [obsidian-terminal](https://github.com/polyipseity/obsidian-terminal)
- **Calendar** — inspired by [oz-calendar](https://github.com/ozntel/oz-calendar)
- **Folder notes** — inspired by [obsidian-folder-notes](https://github.com/LostPaul/obsidian-folder-notes)
- **Auto open & Pin tab** — inspired by [obsidian-homepage](https://github.com/mirnovov/obsidian-homepage)
