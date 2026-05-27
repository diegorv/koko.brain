# 🧠 Kokobrain

| | Status |
|---|---|
| **CI** | [![CI][ci-badge]][ci-url] [![E2E][e2e-badge]][e2e-url] [![Release][release-badge]][release-url] [![Nightly][nightly-badge]][nightly-url] [![Wiki Sync][wiki-badge]][wiki-url] |
| **Security** | [![Dependabot][dependabot-badge]][dependabot-url] [![Security][security-badge]][security-url] [![CodeQL][codeql-badge]][codeql-url] [![Privacy][privacy-badge]][privacy-url] |
| **Project** | [![Latest release][version-badge]][version-url] [![License][license-badge]][license-url] [![Platform][platform-badge]][platform-url] [![Claude Code][claude-badge]][claude-url] |

A personal desktop note-taking app inspired by [Obsidian.md](https://obsidian.md) and [Tolaria](https://github.com/refactoringhq/tolaria), built with Svelte 5 and Tauri 2

Your notes are plain Markdown files stored locally - no cloud, no lock-in, privacy first. Built entirely with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and human review.

> [!NOTE]
> 🍎 **macOS only.** Pull requests without a prior discussion will not be accepted - if you want to contribute, please open a discussion first.
> If you want a mature, cross-platform tool, check out [Obsidian](https://obsidian.md) or [Logseq](https://logseq.com).

## ✨ Features

### ✏️ Editor

- **Markdown editor** with source mode and live preview - CodeMirror
- **Wikilinks** (`[[note]]`) with autocomplete, block references, and embeds
- **Meta-bind** - interactive inline inputs and action buttons that read/write frontmatter
- **Table of contents** - auto-generated outline panel from document headings
- **Templates**, **quick note** capture, and **1:1 meeting notes**

### 🔍 Search & Discovery

- **Full-text search** powered by SQLite FTS5 with BM25 ranking and accent-insensitive matching
- **Semantic search** using a local BGE-M3 embedder with hybrid mode fusing text and semantic rankings - every model runs offline on your machine, nothing leaves it
- **Graph view** - interactive force-directed visualization of note connections
- **Backlinks**, **outgoing links**, **tags**, and **properties** panel

### 📁 Organization

- **Note types** - declare `type: Project` in frontmatter, browse by type in a dedicated sidebar
- **Relationships** - semantic `belongs_to` / `related_to` fields with relationship backlinks
- **Lifecycle** - organize, archive, and favorite notes with inbox workflow and filtered views
- **Auto-move** - automatically route notes to folders based on expression rules
- **Custom file icons** - 11 icon packs + emoji with color picker
- **Bookmarks** and **folder notes**

### 📊 Views & Tools

- **Canvas** - infinite visual board with text, file, link, and image nodes (JSON Canvas 1.0)
- **Collection** - database/table views of notes queried by frontmatter properties
- **QueryJS** - JavaScript API for programmatic vault queries
- **Tasks** - aggregated view with custom statuses and Todoist sync
- **Kanban** - drag-and-drop task boards with lanes, cards, dates, colors, and tags
- **Periodic notes** - daily, weekly, monthly, and quarterly notes with templates and calendar

### ⚙️ Power User

- **File history** - automatic snapshots with diff viewer and restore
- **Deep links** - open notes and trigger actions from outside the app via `kokobrain://` URLs

## 🛠 Stack

**Svelte 5** + **SvelteKit** + **TypeScript** | **Tauri 2** (Rust) | **CodeMirror 6** | **SQLite** (FTS5 + ONNX semantic search) | **shadcn-svelte** (Tailwind v4)

## 🚀 Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for prerequisites, setup, commands, building, troubleshooting, and the full stack breakdown.

## 📚 Documentation

| | Document | Description |
|---|----------|-------------|
| 📖 | [User Guide](help/documentation/README.md) | Comprehensive guide covering every feature |
| 🔬 | [Developer Patterns](docs/PATTERNS.md) | Svelte 5 reactive patterns, store conventions |
| 🧪 | [Testing Guide](docs/TESTING.md) | Mock rules, assertion patterns, service/store tests |
| 📝 | [Commit Conventions](docs/COMMITS.md) | Commit message format and examples |
| 👁 | [Live Preview Architecture](docs/LIVE-PREVIEW.md) | Editor live preview plugin system |
| 🔍 | [Search Architecture](docs/SEARCH.md) | Retrieval pipeline, chunking, models, RRF |
| 🏷 | [Types & Relationships](help/documentation/25-types-and-relationships.md) | Note types, semantic relationships, lifecycle |
| ⚙️ | [GitHub Workflows](GITHUB-WORKFLOW.md) | CI workflows, what they test, when they run |
| 📦 | [Release Channels](docs/RELEASE-CHANNELS.md) | Stable vs Nightly, version semantics |
| 🔒 | [Privacy](PRIVACY.md) | Offline-first, no telemetry, embedded file scope |
| 🛡 | [Security](SECURITY.md) | Supply chain quarantine, pre-commit hook, CI guardrail |

## 💡 Inspirations

Concept-level inspirations from Obsidian community plugins I used daily. No code was copied.

| Feature | Inspired by |
|---------|-------------|
| Collection | [Obsidian Bases](https://help.obsidian.md/bases) |
| Auto-move | [obsidian-auto-note-mover](https://github.com/farux/obsidian-auto-note-mover) |
| QueryJS | [obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview) |
| Templates | [Templater](https://github.com/SilentVoid13/Templater) |
| Calendar | [oz-calendar](https://github.com/ozntel/oz-calendar) |
| Folder notes | [obsidian-folder-notes](https://github.com/LostPaul/obsidian-folder-notes) |
| Auto open & Pin tab | [obsidian-homepage](https://github.com/mirnovov/obsidian-homepage) |
| Types | [Tolaria note types system](https://github.com/refactoringhq/tolaria) |
| Relationships | [Portent knowledge base spec](https://portent.md) |

## 📄 License

Licensed under the [Apache License 2.0](LICENSE).

<!-- ─── Badge reference definitions ────────────────────────────── -->

[ci-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/ci.yml?branch=main&event=workflow_call&label=CI&logo=github&logoColor=white
[ci-url]: https://github.com/diegorv/koko.brain/actions/workflows/ci.yml
[e2e-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/e2e.yml?label=E2E&logo=playwright&logoColor=white
[e2e-url]: https://github.com/diegorv/koko.brain/actions/workflows/e2e.yml
[security-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/security.yml?label=Security&logo=github&logoColor=white
[security-url]: https://github.com/diegorv/koko.brain/actions/workflows/security.yml
[codeql-badge]: https://img.shields.io/badge/CodeQL-enabled-2ea44f?logo=github&logoColor=white
[codeql-url]: https://github.com/diegorv/koko.brain/security/code-scanning
[privacy-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/privacy.yml?label=Privacy&logo=github&logoColor=white
[privacy-url]: https://github.com/diegorv/koko.brain/actions/workflows/privacy.yml
[release-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/release.yml?event=push&label=Release&logo=github&logoColor=white
[release-url]: https://github.com/diegorv/koko.brain/actions/workflows/release.yml
[nightly-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/nightly.yml?label=Nightly&logo=github&logoColor=white
[nightly-url]: https://github.com/diegorv/koko.brain/actions/workflows/nightly.yml
[wiki-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/sync-wiki.yml?label=Wiki%20Sync&logo=github&logoColor=white
[wiki-url]: https://github.com/diegorv/koko.brain/actions/workflows/sync-wiki.yml
[dependabot-badge]: https://img.shields.io/github/actions/workflow/status/diegorv/koko.brain/dependabot/dependabot-updates?label=Dependabot&logo=dependabot&logoColor=white
[dependabot-url]: https://github.com/diegorv/koko.brain/actions/workflows/dependabot/dependabot-updates
[version-badge]: https://img.shields.io/github/v/release/diegorv/koko.brain?include_prereleases&sort=semver&label=release&color=blue
[version-url]: https://github.com/diegorv/koko.brain/releases
[license-badge]: https://img.shields.io/badge/license-Apache_2.0-blue
[license-url]: ./LICENSE
[platform-badge]: https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple&logoColor=white
[platform-url]: https://github.com/diegorv/koko.brain#kokobrain
[claude-badge]: https://img.shields.io/badge/built%20with-Claude%20Code-D97757?logo=anthropic&logoColor=white
[claude-url]: https://docs.anthropic.com/en/docs/claude-code
