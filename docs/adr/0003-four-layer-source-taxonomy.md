---
type: ADR
id: "0003"
title: "Four-layer source taxonomy: core / features / plugins / utils"
status: active
date: 2026-04-22
---

## Amendment (2026-11-01): a fifth layer, `app/`

`src/lib/app/` is the composition root and a fifth layer. It wires the other layers together: vault open and teardown (`app/lifecycle/`), the app shell and overlays, the Tauri listeners, the global shortcuts, the editor's file-type views, the settings panel, the command palette's built-in commands, and the app-lifetime ports (`app/boot.ts`).

- `app/` may import every layer.
- Only `src/routes` imports `app/`. A `src/lib` file outside `app/` that imports it fails the `app-inbound` rule.
- Core, features and plugins expose register functions and props (snippets included); `app/` passes the implementations in. Nothing below `app/` names a file in it.

This replaces the per-file composition-root list of the enforcement amendment below: the roots are now `src/lib/app/**`, and `features/command-palette` is no longer a root (its command list moved to `app/commands.ts`). The `composition-root-inbound` rule became `app-inbound`.

The archify maps in `docs/architecture/archify/` name none of the moved files and describe the same lifecycle steps, so none went stale with the move.

## Amendment (2026-11-01): enforcement

The layer rules are now enforced by `src/tests/lib/architecture/layer-rules.test.ts`, built on `scripts/import-graph.mjs`. It reads every `.ts` and `.svelte` file under `src/lib` (both `<script>` blocks of a component; static, type-only and re-export imports; literal `import()`; `import('x')` types) and fails on any import that breaks one of these rules:

| Rule | Forbids |
|------|---------|
| `core->features`, `core->plugins` | `core/` importing `features/` or `plugins/` |
| `features->plugins` | `features/` importing `plugins/` |
| `utils->non-utils` | `utils/` importing anything in `src/lib` outside `utils/` |
| `types->lib` | `types/` importing anything in `src/lib` outside `types/` |
| `components/ui->app` | `components/` importing `core/`, `features/` or `plugins/` |
| `plugin->plugin` | a plugin importing another plugin, except the allowlist: `calendar`, `one-on-one` and `quick-capture` may import `periodic-notes`, and `mods` may import `queryjs` (for `ctx.kb`, owner decision in vault-mods Issue 05) |
| `app-inbound` | importing `src/lib/app/` from any `src/lib` file outside it (only `src/routes` may) |

`src/lib/contracts/` may be imported from every layer, `utils/` and `types/` included. A non-literal `import()` is forbidden outright, since a variable specifier would bypass every rule.

**Feature -> feature imports are allowed while they form no cycle.** The original text below ("`features/` may import from `core/` and `utils/`") forbade them, but the code holds well over a hundred such imports and the owner decided on 2026-11-01 to allow them. The layer ratchet does not baseline them. `src/tests/lib/architecture/feature-cycle.test.ts` guards the acyclic part: it runs Tarjan's strongly-connected components over the feature -> feature pairs (type-only imports included) and checks them against `feature-cycle-baseline.json`. `featureCycleEdges` lists the pairs inside the one cycle that existed when the test landed. It only shrinks: a new cycle, a feature joining the cycle, or a new pair inside it fails with the cycle path, and a listed pair that leaves the cycle fails with the line to delete. `featurePairs` records every directed feature pair. The test rewrites that list without failing, so a new acyclic pair shows up in the diff for review.

**Existing violations** are listed in `src/tests/lib/architecture/layer-baseline.json` as `<from> -> <resolved to>` (no line numbers). The baseline only shrinks: a stale entry fails and prints the line to delete, and there is no auto-update mode (`node scripts/import-graph.mjs` only prints). A new violation fails with its file:line and two fixes: a registration API (see Consequences), or moving the code down a layer. Adding a baseline entry or a composition root needs owner sign-off.

### Composition roots

The composition root is the `app` layer (amendment above): its files wire the layers together, so the outbound rules (`core->features`, `core->plugins`, `features->plugins`) do not apply to them. The test asserts the list equals this table: adding a root means editing this ADR.

| Composition root | Wires |
|------------------|-------|
| `src/lib/app/**` | vault lifecycle, app shell and overlays, Tauri listeners, global shortcuts, editor views, settings panel, palette commands, app-lifetime ports |

## Context

Obsidian-style note apps accrete functionality quickly: file explorer, editor, search, backlinks, tags, canvas, calendar, templates, graph view, kanban, encrypted notes, semantic search, and so on. Without a layout discipline, all of this collapses into a flat folder where dependencies run in every direction, impossible-to-toggle features appear on the hot startup path, and every new feature becomes a question of "where does it go and what can it import?"

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
- **`src/lib/plugins/`** — optional modules; app works without any of them. Currently 10 plugins including `calendar`, `queryjs`, `graph-view`, `encrypted-notes`, `templates`.
- **`src/lib/utils/`** — pure utilities, no state, no side effects, may be imported by any layer.
- **`src/lib/contracts/`** — a leaf that every layer may import. It holds the ts-rs generated IPC types (`generated/`, re-exported by `index.ts`) plus the thin `ipc.ts` wrapper over `invoke`, and imports nothing from `#lib`; its only outside import is `@tauri-apps/api`. Hand-written copies of a generated type fail `src/tests/lib/architecture/ipc-mirrors.test.ts`.

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
- Import direction is from outer layers inward: `plugins/` may import from `core/`, `features/`, and `utils/`; `features/` may import from `core/`, `utils/` and other features while no cycle forms (amendment 2026-11-01); `core/` may import from `utils/`. Inversions fail `layer-rules.test.ts`.
- An inward dependency that is genuinely needed becomes a registration API rather than an import. `core/filesystem/note-change.service.ts` owns "a note's bytes changed" but the indexes that must follow it live in `features/collection`, `features/file-icons` and `plugins/calendar`. Each exports a register function, `app/lifecycle` wires them at vault open and unwires them at teardown, and the owner only ever sees an anonymous `NoteChangeConsumer`. The cost is that a missing registration fails silently, so each one is pinned by a lifecycle test.
- Plugins need to be self-contained enough that users can reason about them as discrete units. Cross-plugin imports (e.g., `calendar` reaching into `periodic-notes`) are acceptable only when one plugin is documented as building on another; the documented ones are the `plugin->plugin` allowlist in the amendment above.
- Disabling a plugin at build time is currently not a build-step concern — plugins are always compiled; "toggling off" is a runtime choice (settings flag, no init). If bundle size becomes a problem, the taxonomy makes it straightforward to introduce dynamic imports for plugin code.
- Re-evaluation triggers: a `features/` module needs to become optional (promote to `plugins/`); a plugin becomes load-bearing (promote to `features/` or `core/`); the number of plugins grows to a point where dynamic import / bundle-splitting is required.
