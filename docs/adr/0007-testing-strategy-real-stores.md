---
type: ADR
id: "0007"
title: "Testing strategy: real stores, three tiers, and a pre-commit gate"
status: active
date: 2026-04-22
---

## Context

Kokobrain has three kinds of code that need different test strategies:

1. Pure functions in `.logic.ts` — deterministic, no I/O.
2. Stores (`.store.svelte.ts`) — reactive state with getters; consumed by components and services.
3. Services (`.service.ts`) — orchestrate Tauri IPC, apply results to stores.

Plus user-visible flows that only exist in the Tauri WebView (editor, file operations, search) that require an integration test.

Early iterations over-mocked: tests mocked stores whenever a service wrote to them, which meant a passing test proved nothing about the store actually being updated. Regressions landed because `expect(setNoteIndex).toHaveBeenCalled()` was the only assertion and `setNoteIndex` was a `vi.fn()`.

The project needed an explicit testing contract that prevents this class of false confidence.

## Decision

**Three test tiers with an aggressive allow-list on what may be mocked and mandatory real-store assertions in every service test.**

### Tier 1 — Pure logic (vitest)
- Files: `.logic.ts`, `utils/*.ts`.
- Mocks: none. Import the real function, feed inputs, assert outputs.

### Tier 2 — Stores and services (vitest with real stores)
- Location: `src/tests/` mirrors `src/lib/`; `src-tauri/tests/` mirrors `src-tauri/src/`.
- **Allowlist** (only these may be mocked — `docs/TESTING.md:15-21`):
  - `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` (`invoke`), `@tauri-apps/plugin-dialog`
  - Side-effect services that write to disk (`openOrCreateNote`, `refreshTree`, `openFileInEditor`)
  - DOM services (`applyActiveTheme`, `preloadPacks`)
- **Blocklist** (never mock — `docs/TESTING.md:23-28`):
  - `.store.svelte.ts` files — use the real store, call its `reset()` in `beforeEach`, assert on getters.
  - `.logic.ts` files — the whole point is to test them.
  - Other feature stores used as data sources (e.g., `noteIndexStore` from a tags test).
- **Must assert on REAL state**, not `.toHaveBeenCalled()` alone (`docs/TESTING.md:54-100`). The 10-second litmus test: comment out the `store.setX()` in the source — if the test still passes, it's worthless.
- Every service suite covers: happy path, empty/null input, error handling.
- Every computed getter in a store has a test.

### Tier 3 — End-to-end (Playwright)
- Location: `e2e/specs/`.
- Runner: **always `bash scripts/e2e.sh`** — it starts the E2E Vite server on port 1421 (see `vite.config.js:80-87`), waits for readiness, runs Playwright, and cleans up. Never run `PLAYWRIGHT=true pnpm dev` directly.
- Tauri APIs are aliased to `e2e/mocks/*.ts` via Vite's `resolve.alias` when `PLAYWRIGHT=true` (`vite.config.js:46-55`).
- Assert on rendered content (SVG inside mermaid, text inside a widget), not container existence.
- Run only the spec(s) that exercise the area you changed; the full suite runs only at the end of multi-area plans.

### Pre-commit gate (enforced by discipline, not CI yet)

`docs/TESTING.md:178-206` and `CLAUDE.md` Quick Reference rules 6 & 11 make it explicit:

- **Rust only** (`src-tauri/`) → `cargo test --manifest-path src-tauri/Cargo.toml`
- **Frontend only** (`src/`, styles, config) → `pnpm check` + `pnpm vitest run`
- **Both** → all three commands. No exceptions.

For every changed source file, find its test file; if the file exists, update it; if it doesn't, create it (unless the file is a `.svelte` component or a trivial util).

## Alternatives considered

- **Mock everything (mockist style)**: fast but proves nothing about reactive behavior and misses every integration bug in the store/getter/component chain. Rejected given the first-year regressions this caused.
- **Integration-only (no unit tests)**: E2E is slow (~seconds per test) and cannot exercise edge cases cheaply. Rejected — unit tests catch 95% of bugs in <1s feedback.
- **Jest instead of vitest**: jsdom support parity, but vitest integrates with Vite config out of the box and handles Svelte's `.svelte.ts` extension without custom transforms.
- **Property-based testing (fast-check)**: valuable for `.logic.ts` (parsers especially), but not required across the board; introduce per-file as needed.

## Consequences

- Service tests are longer than mockist equivalents: each `beforeEach` calls `.reset()` on every store used and `vi.clearAllMocks()`, and may need the `localStorage` stub fixture. This is the cost of verifying real behavior.
- When a test imports `vaultStore`, the localStorage stub from `src/tests/fixtures/localStorage.fixture.ts` must be placed BEFORE imports and AFTER `vi.mock()` calls.
- `scripts/e2e.sh` is the only supported way to run Playwright — this was hard-won after debugging zombie processes and port contention. Deviating creates flakes.
- The "no `.toHaveBeenCalled()` alone" rule occasionally forces asserting on derived state we might otherwise not have exposed; that's a feature — it pushes useful state onto store getters.
- `.svelte` components and trivial `utils/` may skip tests. Everything else must have coverage before commit.
- Re-evaluation triggers: vitest ships first-class Svelte-component test support that makes store/derivation testing trivial; Playwright is replaced; the full-suite E2E time grows past 10 minutes and test selection becomes the bottleneck.
