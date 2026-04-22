---
type: ADR
id: "0003"
title: "Four-layer source taxonomy: core / features / plugins / utils"
status: active
date: 2026-04-22
---

## Context

Obsidian-style note apps accrete functionality quickly: file explorer, editor, search, backlinks, tags, canvas, calendar, templates, terminal, graph view, kanban, encrypted notes, semantic search, and so on. Without a layout discipline, all of this collapses into a flat folder where dependencies run in every direction, impossible-to-toggle features appear on the hot startup path, and every new feature becomes a question of "where does it go and what can it import?"

The project needed a taxonomy that answers:

- What breaks the app if removed? (Must be in `core/`.)
- What's always on but could conceptually be optional? (In `features/`.)
- What is explicitly optional and togglable by the user? (In `plugins/`.)
- What is pure and reusable? (In `utils/`.)

## Decision

Use **four layers under `src/lib/`, each with enforceable import rules**:

- **`src/lib/components/ui/`** — shadcn-svelte generated primitives, customized via Tailwind (see ADR-0002).
- **`src/lib/core/`** — essential subsystems; removing any folder breaks the app. Currently: `app-lifecycle`, `editor`, `file-explorer`, `filesystem`, `keybindings`, `layout`, `markdown-editor`, `note-creator`, `settings`, `status-bar`, `trash`, `vault`, `zoom`.
- **`src/lib/features/`** — always-loaded, self-contained features. Currently 18 features including `backlinks`, `search`, `tags`, `tasks`, `canvas`, `properties`, `command-palette`, `quick-switcher`.
- **`src/lib/plugins/`** — optional modules; app works without any of them. Currently 11 plugins including `calendar`, `queryjs`, `graph-view`, `encrypted-notes`, `terminal`, `templates`.
- **`src/lib/utils/`** — pure utilities, no state, no side effects, may be imported by any layer.

Layer rules (from `CLAUDE.md` Layer Rules):

| Layer | Rule |
|-------|------|
| `components/ui/` | shadcn-svelte generated, customized via Tailwind |
| `core/` | Stores + services + core components; app breaks without it |
| `features/` | Always loaded; each feature self-contained in its own folder |
| `plugins/` | App works without them; self-contained; could be toggled off |
| `utils/` | No state, no side effects; usable by any layer |

## Alternatives considered

- **Flat structure** (`src/lib/<thing>/`): simplest to navigate but creates tangled dependencies; no signal about what is optional vs essential. Rejected — 40+ folders without hierarchy becomes unmanageable.
- **Layer by technology** (`stores/`, `services/`, `components/`): forces related files into separate trees; "backlinks" would be scattered across four folders. Rejected — cohesion matters more than technical uniformity.
- **Single `features/` folder with a `core: true` flag or manifest**: more dynamic but adds build-time indirection and fights against the static import graph. Rejected — folder boundaries are the simplest enforcement.
- **Monorepo packages** (`@kokobrain/core`, `@kokobrain/plugin-queryjs`): maximum isolation but prohibitive build and tooling complexity for a solo project. Revisit only if plugins ever need independent release cycles.

## Consequences

- Feature authors decide at file creation whether their work is core, feature, or plugin. The decision is embedded in the path and is hard to change silently.
- Import direction is from outer layers inward: `plugins/` may import from `core/`, `features/`, and `utils/`; `features/` may import from `core/` and `utils/`; `core/` may import from `utils/`. Inversions are review red flags.
- Plugins need to be self-contained enough that users can reason about them as discrete units. Cross-plugin imports (e.g., `periodic-notes` reaching into `calendar`) are acceptable only when one plugin is documented as building on another.
- Disabling a plugin at build time is currently not a build-step concern — plugins are always compiled; "toggling off" is a runtime choice (settings flag, no init). If bundle size becomes a problem, the taxonomy makes it straightforward to introduce dynamic imports for plugin code.
- Re-evaluation triggers: a `features/` module needs to become optional (promote to `plugins/`); a plugin becomes load-bearing (promote to `features/` or `core/`); the number of plugins grows to a point where dynamic import / bundle-splitting is required.
