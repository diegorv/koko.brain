# Kokobrain

| | |
|---|---|
| **CI** | [![CI][ci-badge]][ci-url] [![E2E][e2e-badge]][e2e-url] [![Release][release-badge]][release-url] [![Nightly][nightly-badge]][nightly-url] [![Wiki Sync][wiki-badge]][wiki-url] [![Dependabot][dependabot-badge]][dependabot-url] |
| **Security** | [![Security][security-badge]][security-url] [![CodeQL][codeql-badge]][codeql-url] [![Privacy][privacy-badge]][privacy-url] |
| **Project** | [![Latest release][version-badge]][version-url] [![License][license-badge]][license-url] [![Platform][platform-badge]][platform-url] [![Claude Code][claude-badge]][claude-url] |

A personal desktop note-taking app inspired by [Obsidian.md](https://obsidian.md) and [Tolaria.md](https://tolaria.md/), built with Svelte 5 and Tauri 2

Your notes are plain Markdown files stored locally — no cloud, no lock-in, privacy first. Built 100% with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with human review.

> [!NOTE]
> **macOS only.** Pull requests without a prior discussion will not be accepted - if you want to contribute, please open a discussion first.
> If you want a mature, cross-platform tool, check out [Obsidian](https://obsidian.md) or [Logseq](https://logseq.com).

## Features

- **Markdown editor** with source mode and live preview (CodeMirror)
- **Wikilinks** (`[[note]]`) with autocomplete, block references, and embeds
- **Full-text search** powered by SQLite FTS5 with BM25 ranking and accent-insensitive matching (unicode61)
- **Semantic search** using a local BGE-M3 embedder (ONNX Runtime), with an opt-in BGE-reranker-v2-m3 cross-encoder, and a hybrid mode that fuses FTS and semantic rankings via Reciprocal Rank Fusion — every model runs on your machine, nothing leaves it
- **Graph view** — interactive force-directed visualization of note connections
- **Canvas** — infinite visual board with text, file, link, and image nodes (JSON Canvas 1.0)
- **Collection** — database/table views of notes queried by frontmatter properties
- **QueryJS** — JavaScript API for programmatic vault queries
- **Tasks** — aggregated task view with extended statuses and Todoist sync
- **Periodic notes** — daily, weekly, monthly, and quarterly notes with templates and calendar
- **File history** — automatic snapshots with diff viewer and restore
- **Integrated terminal** — real PTY sessions with xterm.js and WebGL rendering
- **Table of contents** — auto-generated outline panel from document headings
- **Kanban** — drag-and-drop task boards with lanes, cards, dates, colors, and tags
- **Auto-move** — automatically route notes to folders based on expression rules
- **Deep links** — open notes and trigger actions from outside the app via `kokobrain://` URLs
- **Meta-bind** — interactive inline inputs and action buttons that read/write frontmatter
- **Note types** — declare `type: Project` in frontmatter, browse notes grouped by type in a dedicated sidebar mode
- **Relationships** — semantic `belongs_to` / `related_to` fields with relationship backlinks in the sidebar
- **Lifecycle** — organize, archive, and favorite notes with inbox workflow and filtered views
- **Custom file icons** — 11 icon packs + emoji with color picker
- **Bookmarks**, **tags**, **backlinks**, **outgoing links**, **properties** panel
- **Templates**, **quick note** capture, and **1:1 meeting notes**

## Stack

**Svelte 5** + **SvelteKit** + **TypeScript** | **Tauri 2** (Rust) | **CodeMirror 6** | **SQLite** (FTS5 + ONNX semantic search) | **shadcn-svelte** (Tailwind v4)

See [CONTRIBUTING.md](CONTRIBUTING.md#stack) for the full stack breakdown.

## Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for prerequisites, setup, commands, building, and troubleshooting.

## Documentation

- **[User Guide](help/documentation/README.md)** - Complete guide with 24 chapters covering every feature
- **[Developer Patterns](docs/PATTERNS.md)** - Svelte 5 reactive patterns, store conventions
- **[Testing Guide](docs/TESTING.md)** - Mock rules, assertion patterns, service/store tests
- **[Commit Conventions](docs/COMMITS.md)** - Commit message format and examples
- **[Live Preview Architecture](docs/LIVE-PREVIEW.md)** - Editor live preview plugin system
- **[Search Architecture](docs/SEARCH.md)** - Retrieval pipeline, chunking, models, RRF, versioning levers
- **[Types & Relationships](help/documentation/25-types-and-relationships.md)** - Note types, semantic relationships, lifecycle workflow
- **[GitHub Workflows](GITHUB-WORKFLOW.md)** - What each CI workflow tests, when it runs, and what it does not cover
- **[Release Channels](docs/RELEASE-CHANNELS.md)** - Stable vs Nightly channels, version semantics, switching from inside the app
- **[Privacy](PRIVACY.md)** - Offline-first, no telemetry, embedded file scope
- **[Security](SECURITY.md)** - Supply chain quarantine, pre-commit hook, CI guardrail

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
- **Types & Relationships** — inspired by the [Portent](https://portent.md) knowledge base spec (document types, semantic relationships, lifecycle workflow)

## License

Licensed under the [Apache License 2.0](LICENSE). You are free to use, modify, and redistribute the code, including for commercial purposes, subject to the license's notice and patent terms.

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
[nightly-badge]: https://github.com/diegorv/koko.brain/actions/workflows/nightly.yml/badge.svg
[nightly-url]: https://github.com/diegorv/koko.brain/actions/workflows/nightly.yml
[wiki-badge]: https://github.com/diegorv/koko.brain/actions/workflows/sync-wiki.yml/badge.svg
[wiki-url]: https://github.com/diegorv/koko.brain/actions/workflows/sync-wiki.yml
[dependabot-badge]: https://github.com/diegorv/koko.brain/actions/workflows/dependabot/dependabot-updates/badge.svg
[dependabot-url]: https://github.com/diegorv/koko.brain/actions/workflows/dependabot/dependabot-updates
[version-badge]: https://img.shields.io/github/v/release/diegorv/koko.brain?include_prereleases&sort=semver&label=release&color=blue
[version-url]: https://github.com/diegorv/koko.brain/releases
[license-badge]: https://img.shields.io/badge/license-Apache_2.0-blue
[license-url]: ./LICENSE
[platform-badge]: https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple&logoColor=white
[platform-url]: https://github.com/diegorv/koko.brain#kokobrain
[claude-badge]: https://img.shields.io/badge/built%20with-Claude%20Code-D97757?logo=anthropic&logoColor=white
[claude-url]: https://docs.anthropic.com/en/docs/claude-code
