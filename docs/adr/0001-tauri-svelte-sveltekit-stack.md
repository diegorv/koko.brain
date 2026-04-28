---
type: ADR
id: "0001"
title: "Tauri 2 + Svelte 5 + SvelteKit as application stack"
status: active
date: 2026-04-22
---

## Context

Kokobrain is a local-first markdown note-taking app inspired by Obsidian. It must open and watch large vaults (1800+ notes), render rich live-preview markdown, run a local semantic-search model, access the filesystem without a backend server, and feel native on macOS. A single developer builds it with heavy AI assistance.

The project needs:

- Direct filesystem access (no server) and OS-level integrations (Keychain, dialogs, deep links, watchers).
- A reactive UI framework where fine-grained state updates do not re-render the entire app (the editor + 22+ live-preview plugins cannot tolerate coarse reactivity).
- An ecosystem mature enough for CodeMirror 6, shadcn-style UI primitives, and a unit test runner that understands the reactive model.
- Offline-first; updates, telemetry, and crypto must not require an internet round-trip.

## Decision

Use **Tauri 2 (Rust backend) + Svelte 5 with runes + SvelteKit in SPA mode**, with TypeScript strict typing, pnpm 10 as package manager, and Vite 8 as the dev/build tool.

Key anchors:

- `package.json:52` pins `@tauri-apps/api ^2.10.1` and several `@tauri-apps/plugin-*` modules.
- `package.json:109` pins `svelte ^5.55.1` and `@sveltejs/kit ^2.55.0`.
- `src-tauri/Cargo.toml:21` pins `tauri = "2"`.
- `svelte.config.js:5-15` enables `@sveltejs/adapter-static` with `fallback: "index.html"` — SPA mode, which Tauri requires because it has no Node.js server.

## Alternatives considered

- **Electron + React**: mature ecosystem, but ~150 MB baseline binary, heavier memory footprint, and no second language to share logic with the filesystem/crypto/ONNX layers. Rejected — Tauri ships ~10 MB bundles and moves filesystem, crypto, sqlite, and ML inference into native Rust.
- **SwiftUI (macOS/iOS native)**: best native integration, but locks the codebase to Apple platforms and forecloses a web build. Rejected for now; revisit when/if the app needs true iOS parity.
- **React + Tauri**: functionally equivalent for the Tauri half. Rejected in favor of Svelte 5 because (a) rune-based fine-grained reactivity is a better fit for a live-preview editor with ~22 decoration plugins, and (b) Svelte components compile to smaller JS and avoid virtual-DOM diffing overhead on the hot path.
- **Vue 3 / Solid / Qwik**: comparable reactivity models, but smaller component ecosystem for our specific needs (shadcn, PaneForge, CodeMirror integrations) and less operator familiarity.
- **Full web app with a backend**: rules out offline-first, OS Keychain, real filesystem watchers, and local ML inference. Rejected on principle — the product is a local-first notes app.

## Consequences

- Every feature is split across two languages: TypeScript (UI, editor, orchestration) and Rust (filesystem, sqlite, ONNX, crypto, PTY). Developers must switch contexts; the upside is each side can use idiomatic libraries.
- SvelteKit is used only for routing and SSR-style preprocessing; there is no server runtime. `+layout.ts` and `+page.svelte` run entirely in the Tauri WebView. See `vite.config.js:80-87` (port 1420 dev, 1421 Playwright).
- Updates to Tauri are tightly coupled across `package.json` (`@tauri-apps/*`) and `Cargo.toml` (`tauri*`); `pnpm-workspace.yaml:6` excludes `@tauri-apps/*` from the 7-day quarantine so the two sides can stay in lockstep.
- Svelte 5 runes are new; several reactivity rules (ADR-0005, ADR-0006) are required workarounds for rune semantics in tests and `$effect` tracking.
- Re-evaluation triggers: Tauri 2 ships a breaking v3 and the cost of migrating both Rust and TS at once becomes prohibitive; Svelte 6 removes or reshapes runes; SwiftUI/UIKit parity becomes a product requirement (see ADR to be written for iPad).
