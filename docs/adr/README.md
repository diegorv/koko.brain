# Architecture Decision Records

This directory records Kokobrain's significant architectural decisions. Each ADR captures the context that prompted a decision, the choice that was made (and why), the alternatives that were rejected, and the consequences the decision imposes on the codebase.

ADRs are **immutable once active**. If a decision needs to change, a new ADR supersedes the old one and the old record's frontmatter gets `status: superseded` and `superseded_by: "NNNN"`. This preserves the history of *why* things are the way they are, not just the current state.

Format modeled on [refactoringhq/tolaria/docs/adr](https://github.com/refactoringhq/tolaria/tree/main/docs/adr).

## Format

Each ADR is a single markdown file with YAML frontmatter and a fixed section order.

```markdown
---
type: ADR
id: "NNNN"
title: "<Decision title>"
status: active
date: YYYY-MM-DD
---

## Context

<Why was a decision needed? What constraints applied?>

## Decision

<One bold sentence stating the choice, then 1–3 sentences of detail.>

Use **<the chosen approach>** …

## Alternatives considered

- **<Alternative A>**: <what it is>. <Why rejected>.
- **<Alternative B>**: <what it is>. <Why rejected>.

## Consequences

- <Positive consequence, constraint, or follow-on requirement>
- <Tradeoff or known limitation>
- <Re-evaluation trigger: condition under which this ADR should be revisited>
```

An optional `## Advice` section at the end documents external consultation (a Rust forum thread, an Obsidian contributor note, a security review) when one informed the decision.

### Frontmatter fields

| Field | Required | Values |
|-------|----------|--------|
| `type` | yes | Always `ADR` |
| `id` | yes | Four-digit zero-padded string (`"0001"`) |
| `title` | yes | Short sentence — matches the `# H1` title in the body |
| `status` | yes | `proposed` \| `active` \| `superseded` \| `retired` |
| `date` | yes | `YYYY-MM-DD` of the latest status change |
| `superseded_by` | conditional | Set on superseded ADRs: `"NNNN"` of the replacement |

### The Decision statement must be bolded

The single sentence that states the choice should be wrapped in `**…**` so it stands out when scanning the file. Prefer one sentence + 1–3 clarifying sentences over a paragraph.

## Filename convention

```
NNNN-short-title.md
```

- `NNNN` is a monotonically increasing four-digit zero-padded integer. No gaps, no reuse — even for superseded ADRs.
- `short-title` is kebab-case, lowercased, and short enough to scan in a directory listing.

Examples: `0001-tauri-svelte-sveltekit-stack.md`, `0009-incremental-indexing-reverse-index.md`.

## Status lifecycle

```
                   ┌──────────────┐
                   │   proposed   │
                   └──────┬───────┘
                          │ accepted
                          ▼
                   ┌──────────────┐         ┌──────────────┐
                   │    active    │────────▶│  superseded  │
                   └──────┬───────┘         └──────────────┘
                          │
                          │ no longer relevant
                          ▼
                   ┌──────────────┐
                   │   retired    │
                   └──────────────┘
```

- **proposed** — under discussion. Rare in a solo-developer project; most ADRs land as `active` directly.
- **active** — the current decision. The file is immutable after this point.
- **superseded** — replaced by a later ADR. Set `superseded_by: "NNNN"` in the frontmatter and leave the body untouched. Do not edit the historical record.
- **retired** — the decision no longer applies and no replacement exists (e.g., the subsystem was removed).

## Rules

- **One decision per file.** Bundling makes ADRs hard to reference.
- **Active ADRs are never edited.** Typo fixes and broken-link repairs are the only allowed changes; anything that changes the *meaning* requires a new superseding ADR.
- **Supersede, don't rewrite.** When reality changes, write a new ADR that references the old one via `superseded_by`. Linking is traceability.
- **Cite code with paths and line ranges.** An ADR that says "we do X" without pointing to the file that does X is fiction.
- **Don't write speculative ADRs.** Record decisions the codebase actually embodies. Future ideas go in `tasks/todo/` or GitHub issues.

## Index

| ID   | Title                                                                                | Status |
|------|--------------------------------------------------------------------------------------|--------|
| [0001](0001-tauri-svelte-sveltekit-stack.md) | Tauri 2 + Svelte 5 + SvelteKit as application stack                                  | active |
| [0002](0002-shadcn-svelte-tailwind-bits-ui.md) | shadcn-svelte + Tailwind 4 + bits-ui for UI primitives                               | active |
| [0003](0003-four-layer-source-taxonomy.md) | Four-layer source taxonomy: core / features / plugins / utils                        | active |
| [0004](0004-file-type-separation.md) | File-type separation: .store.svelte.ts / .service.ts / .logic.ts / .svelte           | active |
| [0005](0005-svelte-runes-getter-stores.md) | Svelte 5 runes with getter-based stores (no `$derived` in stores)                    | active |
| [0006](0006-effect-untrack-pattern.md) | `$effect` + `untrack()` pattern for service calls                                    | active |
| [0007](0007-testing-strategy-real-stores.md) | Testing strategy: real stores, three tiers, and a pre-commit gate                    | active |
| [0008](0008-codemirror-live-preview-architecture.md) | Modular CodeMirror live-preview architecture (~22 ViewPlugins)                       | active |
| [0009](0009-incremental-indexing-reverse-index.md) | Incremental indexing with reverse index and strict setContents → setIndex ordering   | active |
| [0010](0010-queryjs-kb-api-caching.md) | QueryJS (kb-api) as Dataview-style scripting with per-session caches                 | active |
| [0011](0011-sqlite-fts5-wal-local-search.md) | SQLite with FTS5 and WAL mode for local search, history, and semantic storage        | active |
| [0012](0012-onnx-semantic-search-content-hash-skip.md) | ONNX Runtime local semantic search with BGE-M3 and content-hash skip                 | active |
| [0013](0013-encrypted-notes-aes-gcm-keyring.md) | Encrypted notes with AES-256-GCM and macOS Keychain + Touch ID                       | superseded |
| [0014](0014-supply-chain-pnpm-quarantine.md) | Supply-chain defense: pnpm quarantine + pre-commit hook + CI guardrail               | active |
| [0015](0015-dual-logging-frontend-rust.md) | Dual logging: appendLog (frontend → file) and debug_log (Rust → stderr + event)      | active |
| [0016](0016-plan-mode-commit-per-task.md) | Plan-mode workflow: tasks/todo → tasks/done with one commit per task                 | active |
| [0017](0017-file-watcher-incremental-hidden-filter.md) | File watcher: incremental subtree rescans, hidden-dir filtering, debounce + version counter | active |
| [0018](0018-batch-ipc-pattern.md) | Batch IPC: scan_vault and read_files_batch over per-file invokes                     | active |
| [0019](0019-kokobrain-in-vault-data-dir.md) | App data lives inside the vault at .kokobrain/                                       | active |
| [0020](0020-path-security-absolute-canonicalize.md) | Path security: absolute-path indexes + Rust canonicalize + starts_with traversal guard | active |
| [0021](0021-file-history-sqlite-snapshots.md) | File history as SQLite snapshots with SHA-256 deduplication (not git)                | active |
| [0022](0022-terminal-portable-pty.md) | Terminal plugin via portable-pty with per-session managed state                      | superseded |
| [0023](0023-canvas-xyflow-svelte.md) | Canvas as a feature backed by @xyflow/svelte                                         | active |
| [0024](0024-auto-update-tauri-plugin-updater.md) | Auto-update via tauri-plugin-updater with GitHub Releases + minisign signatures      | active |
| [0025](0025-rust-vault-index.md) | Rust VaultIndex as source of truth for vault metadata; native Rust watcher           | active |
| [0026](0026-type-definitions-relationships-lifecycle.md) | Type definitions, semantic relationships, and lifecycle flags via frontmatter         | active |
| [0027](0027-frontmatter-system-metadata-underscore-prefix.md) | Underscore prefix convention for system metadata with Rust-side alias resolution      | active |
