# Development Guide

Personal development setup and workflow guide for Kokobrain.

> This project is **not accepting external contributions**. This document exists as a reference for local development.

## Prerequisites

### macOS System Dependencies

Tauri 2 requires Xcode Command Line Tools:

```bash
xcode-select --install
```

### mise (Version Manager)

[mise](https://mise.jdx.dev) manages the exact versions of Node.js, pnpm, and Rust used in this project. It reads from `.tool-versions` in the repo root.

```bash
# Install mise
curl https://mise.jdx.dev/install.sh | sh

# Add to your shell (zsh)
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# Install all pinned runtimes
mise install
```

This installs:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | See `.tool-versions` | Required for SvelteKit frontend |
| pnpm | See `.tool-versions` | Package manager |
| Rust | See `.tool-versions` | Required for Tauri backend |

> **Alternative:** You can manage Rust separately via [rustup](https://rustup.rs/) and Node.js via [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) — just make sure the versions match `.tool-versions`.

### Verify Installation

```bash
node --version    # Should match .tool-versions
pnpm --version    # Should match .tool-versions
rustc --version   # Should match .tool-versions
cargo --version   # Installed with Rust
```

## Setup

```bash
# Clone the repository
git clone <repo-url> && cd koko.brain

# Install frontend dependencies
pnpm install
```

## Running

```bash
# Full app (frontend + Tauri backend)
pnpm tauri dev

# Frontend only (no Tauri window, useful for UI work)
pnpm dev
```

The dev server runs on `http://localhost:1420` by default. The Tauri window opens automatically when using `pnpm tauri dev`.

## Testing

Run the tests that match what you changed:

| What changed | Commands to run |
|---|---|
| Rust only (`src-tauri/`) | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Frontend only (`src/`, styles, config) | `pnpm check` + `pnpm vitest run` |
| Both | All three commands |

```bash
# TypeScript type checking
pnpm check

# Frontend unit tests
pnpm vitest run

# Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# E2E tests (Playwright) — always use the script
bash scripts/e2e.sh
```

> **E2E tests:** Always run via `bash scripts/e2e.sh`. Never run `PLAYWRIGHT=true pnpm dev` manually — the script handles server lifecycle, port cleanup, and teardown.

## Building

```bash
# Frontend only
pnpm build

# Full desktop app (.dmg / .app)
pnpm tauri build
```

## Project Structure

```
src/lib/
  components/ui/        # shadcn-svelte components (generated via CLI)
  core/                 # Essential: vault, filesystem, editor, file explorer, settings,
                        #   trash, layout, keybindings, status bar, note creator, zoom
  features/             # Always loaded: search, backlinks, tags, properties, tasks, canvas,
                        #   collection, file-history, bookmarks, file-icons, copy-block-link,
                        #   auto-move, command-palette, quick-switcher, folder-notes,
                        #   outgoing-links, deep-link, views
  plugins/              # Optional: periodic-notes, calendar, templates, quick-note,
                        #   graph-view, encrypted-notes, terminal, queryjs, word-count,
                        #   kanban, one-on-one
  utils/                # Pure shared utilities (no state, no side effects)

src-tauri/src/
  commands/             # Tauri command handlers (vault, files, search, semantic, history,
                        #   crypto, terminal, debug, fonts, db)
  db/                   # SQLite: schema, FTS5, history, semantic repos
  search/               # FTS indexing, text search, fuzzy expansion
  semantic/             # ONNX model, embedder, markdown chunker
  security/             # AES-256-GCM, macOS Keychain, Touch ID
  utils/                # Debug logging, filesystem utilities

src/tests/              # Frontend test files
src-tauri/tests/        # Rust test files
tasks/                  # Task plans (todo/ and done/)
docs/                   # Developer documentation
```

## Workflow

### Commits

Use Conventional Commits with detailed descriptions. See [docs/COMMITS.md](docs/COMMITS.md) for the full format.

### Code Conventions

- **Indentation:** Tabs, not spaces
- **Language:** English for all code, variables, and UI text
- **File naming:** PascalCase for components, kebab-case for everything else

See [CLAUDE.md](CLAUDE.md) for the complete list of conventions and architecture guidelines.

## Useful Documentation

| Document | Contents |
|----------|----------|
| [docs/PATTERNS.md](docs/PATTERNS.md) | Svelte 5 reactive patterns, store conventions |
| [docs/TESTING.md](docs/TESTING.md) | Mock rules, assertion patterns, test guidelines |
| [docs/COMMITS.md](docs/COMMITS.md) | Commit message format and examples |
| [docs/LIVE-PREVIEW.md](docs/LIVE-PREVIEW.md) | Live preview plugin architecture |

## Troubleshooting

### `pnpm tauri dev` fails with missing system libraries

Make sure Xcode Command Line Tools are installed:

```bash
xcode-select --install
```

### Rust compilation errors after updating

```bash
# Clean Rust build cache
cargo clean --manifest-path src-tauri/Cargo.toml

# Rebuild
pnpm tauri dev
```

### Port 1420 already in use

```bash
# Find and kill the process
lsof -ti:1420 | xargs kill -9
```

### `mise install` fails for Rust

You can install Rust separately via rustup:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
```

Just make sure the version matches what's in `.tool-versions`.
