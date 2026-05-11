# Kokobrain

<!-- Build & tests -->
[![CI][ci-badge]][ci-url] [![E2E][e2e-badge]][e2e-url]

<!-- Security & privacy -->
[![Security][security-badge]][security-url] [![CodeQL][codeql-badge]][codeql-url] [![Privacy][privacy-badge]][privacy-url]

<!-- Release & publishing -->
[![Release][release-badge]][release-url] [![Wiki Sync][wiki-badge]][wiki-url]

<!-- Maintenance -->
[![Dependabot Updates][dependabot-badge]][dependabot-url]

<!-- Project metadata -->
[![Latest release][version-badge]][version-url] [![License: Source-Available][license-badge]][license-url] [![Platform: macOS][platform-badge]][platform-url] [![Built with Claude Code][claude-badge]][claude-url]

A personal desktop note-taking app inspired by [Obsidian.md](https://obsidian.md), built with Svelte 5 and Tauri 2

Your notes are plain Markdown files stored locally — no cloud, no lock-in, privacy first. Built 100% with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with human review.

> [!CAUTION]
> This is a personal project under active development. It is **not** a replacement for Obsidian, nor does it aim to be. Expect breaking changes, missing features, and rough edges.
> **macOS only** — this app is built exclusively for macOS and there are no plans to support other operating systems.
> **We do not recommend using this for anything important.**

> [!WARNING]
> **We are not accepting pull requests, issues, or external contributions at this time.**

> [!TIP]
> If you're looking for a mature, well-supported note-taking app, I recommend [Obsidian](https://obsidian.md) or [Logseq](https://logseq.com). Both are excellent tools with active communities and plugin ecosystems.

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
- **[GitHub Workflows](GITHUB-WORKFLOW.md)** — What each CI workflow tests, when it runs, and what it does not cover

## IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Privacy

**Privacy is a core value of this project.** Kokobrain is designed to work entirely offline — your notes never leave your machine.

- All data is stored locally as plain Markdown files
- Search indexing (FTS5 + semantic embeddings) runs locally via SQLite and ONNX Runtime
- Encryption uses AES-256-GCM with macOS Keychain and Touch ID — no external key servers
- The semantic search model is downloaded once from HuggingFace and runs locally — no API calls, no telemetry, no cloud processing
- **No analytics, no tracking, no accounts, no sign-up**

The only external network calls in the entire codebase are:

| Call | Where | Why |
|------|-------|-----|
| HuggingFace model download | `src-tauri/src/semantic/model.rs` | One-time download of the BGE-M3 ONNX model and tokenizer for local semantic search. After download, everything runs offline. |
| Chart.js CDN | `src/lib/plugins/queryjs/dv-ui.ts` | Loads Chart.js for rendering charts in QueryJS results. |

A [Privacy Check](https://github.com/diegorv/koko.brain/actions/workflows/privacy.yml) workflow runs on every push and pull request, scanning all `.ts` and `.rs` source files for external network calls. Any new external call that is not explicitly approved will fail the build.

## Supply Chain Security

After the [axios npm supply chain attack (March 2026)](https://en.wikipedia.org/wiki/Npm#Security), where compromised maintainer tokens were used to publish malicious package versions that existed for only hours before removal, we added a multi-layered defense to prevent this class of attack:

### 1. pnpm Quarantine (primary defense)

`pnpm-workspace.yaml` sets `minimumReleaseAge: 20160` (14 days in minutes). pnpm will refuse to resolve any npm package version published less than 14 days ago during `pnpm install` or `pnpm update`. Already-locked versions are not affected.

### 2. Pre-commit hook (second layer)

A git pre-commit hook (`scripts/pre-commit-dep-age.sh`) catches changes that bypass pnpm config — e.g., manual lockfile edits. When `pnpm-lock.yaml` is staged, the hook queries the npm registry for each new/changed package version and blocks the commit if any version is younger than 14 days.

```bash
# Install the hook
bash scripts/setup-hooks.sh

# Emergency bypass
git commit --no-verify

# Allow a specific version (with justification)
echo "lodash@4.17.22  # Emergency security patch" >> .dep-age-allowlist
```

### 3. CI guardrail (tamper detection)

The [Security workflow](.github/workflows/security.yml) includes a `supply-chain-quarantine` job that verifies on every push, PR, and weekly schedule that:
- `pnpm-workspace.yaml` exists
- `minimumReleaseAge` is set to at least 20160 minutes (14 days)

If someone accidentally deletes the config or lowers the threshold, CI fails with a clear error.

## Inspirations

Some features in Kokobrain were inspired by ideas from Obsidian community plugins that I used daily. These are concept-level inspirations only — no code was copied, and there is no expectation of compatibility, feature parity, or interoperability with any of these projects.

- **Collection** — inspired by [Obsidian Bases](https://help.obsidian.md/bases)
- **Auto-move** — inspired by [obsidian-auto-note-mover](https://github.com/farux/obsidian-auto-note-mover)
- **QueryJS** — inspired by [obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
- **Templates** — inspired by [Templater](https://github.com/SilentVoid13/Templater)
- **Terminal** — inspired by [obsidian-terminal](https://github.com/polyipseity/obsidian-terminal)
- **Calendar** — inspired by [oz-calendar](https://github.com/ozntel/oz-calendar)
- **Folder notes** — inspired by [obsidian-folder-notes](https://github.com/LostPaul/obsidian-folder-notes)
- **Auto open & Pin tab** — inspired by [obsidian-homepage](https://github.com/mirnovov/obsidian-homepage)

<!-- ─── Badge reference definitions ────────────────────────────── -->

[ci-badge]: https://github.com/diegorv/koko.brain/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/diegorv/koko.brain/actions/workflows/ci.yml
[e2e-badge]: https://github.com/diegorv/koko.brain/actions/workflows/e2e.yml/badge.svg
[e2e-url]: https://github.com/diegorv/koko.brain/actions/workflows/e2e.yml
[security-badge]: https://github.com/diegorv/koko.brain/actions/workflows/security.yml/badge.svg
[security-url]: https://github.com/diegorv/koko.brain/actions/workflows/security.yml
[codeql-badge]: https://img.shields.io/badge/CodeQL-enabled-2ea44f?logo=github&logoColor=white
[codeql-url]: https://github.com/diegorv/koko.brain/security/code-scanning
[privacy-badge]: https://github.com/diegorv/koko.brain/actions/workflows/privacy.yml/badge.svg
[privacy-url]: https://github.com/diegorv/koko.brain/actions/workflows/privacy.yml
[release-badge]: https://github.com/diegorv/koko.brain/actions/workflows/release.yml/badge.svg
[release-url]: https://github.com/diegorv/koko.brain/actions/workflows/release.yml
[wiki-badge]: https://github.com/diegorv/koko.brain/actions/workflows/sync-wiki.yml/badge.svg
[wiki-url]: https://github.com/diegorv/koko.brain/actions/workflows/sync-wiki.yml
[dependabot-badge]: https://github.com/diegorv/koko.brain/actions/workflows/dependabot/dependabot-updates/badge.svg
[dependabot-url]: https://github.com/diegorv/koko.brain/actions/workflows/dependabot/dependabot-updates
[version-badge]: https://img.shields.io/github/v/release/diegorv/koko.brain?include_prereleases&sort=semver&label=release&color=blue
[version-url]: https://github.com/diegorv/koko.brain/releases
[license-badge]: https://img.shields.io/badge/license-Source--Available-orange
[license-url]: ./LICENSE
[platform-badge]: https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple&logoColor=white
[platform-url]: https://github.com/diegorv/koko.brain#kokobrain
[claude-badge]: https://img.shields.io/badge/built%20with-Claude%20Code-D97757?logo=anthropic&logoColor=white
[claude-url]: https://docs.anthropic.com/en/docs/claude-code
