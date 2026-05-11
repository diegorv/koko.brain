# GitHub Workflows

This document describes every GitHub Actions workflow in `.github/workflows/`, what triggers it, what it validates, and what it intentionally does not cover. Keep it in sync with reality when you change a workflow.

## Index

- [CI](#ci-ciyml)
- [E2E](#e2e-e2eyml)
- [Security](#security-securityyml)
- [Privacy](#privacy-privacyyml)
- [Release](#release-releaseyml)
- [Wiki Sync](#wiki-sync-sync-wikiyml)
- [Run All Checks](#run-all-checks-run-allyml)
- [Composite actions](#composite-actions)
- [Dependabot](#dependabot-dependabotyml)
- [Cross-cutting conventions](#cross-cutting-conventions)

---

## CI (`ci.yml`)

Primary validation pipeline for code changes.

**Triggers**

- `push` to `main`
- `pull_request` against `main`
- `workflow_dispatch` (manual)
- `workflow_call` (invoked by `run-all.yml` and by `release.yml` to revalidate the tagged SHA before building)
- Skipped automatically when the changeset only touches `**/*.md`.

**Jobs**

| Job ID | Display name | Runner | When |
|---|---|---|---|
| `changes` | Detect Changes | ubuntu-latest | Always |
| `frontend` | Frontend (typecheck + tests) | ubuntu-latest | Only if `frontend` paths changed |
| `rust` | Rust (cargo test) | macos-latest | Only if `rust` paths changed |
| `ci-success` | CI success | ubuntu-latest | Always (sentinel for branch protection — passes when every preceding job either succeeded or was deliberately skipped, fails on any failure or cancellation) |

`changes` uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter) with two filters:

- `frontend`: `src/**`, `static/**`, `pnpm-lock.yaml`, `package.json`, `tsconfig.json`, `svelte.config.*`, `vite.config.*`, `tailwind.config.*`, `postcss.config.*`, `components.json`
- `rust`: `src-tauri/**`

The Playwright E2E suite lives in a separate workflow ([`e2e.yml`](#e2e-e2eyml)) so it can evolve independently — different runner needs (Playwright browser cache), different cadence (heavier than `pnpm vitest`), and a different invocation contract (`bash scripts/e2e.sh`).

**What CI tests**

- `frontend`:
  - `pnpm check` (svelte-kit sync + svelte-check). Catches TypeScript errors, Svelte template errors, and unused imports.
  - `pnpm vitest run` (the full unit suite, ~5400 tests across the `src/tests/` tree). Covers pure logic, stores, services, parsers, and component-level behaviour.
  - `pnpm build` (Vite production build). Catches bundling regressions that the typecheck and unit suite miss: SSR-incompatible imports, dynamic import paths that don't resolve, type-only re-exports that become runtime errors, missing asset references. Without this step, those failures only surface inside `tauri-action` during release.
- `rust`: `cargo test --manifest-path src-tauri/Cargo.toml`. Covers the entire Tauri backend including the `VaultIndex`, FTS5 indexing, semantic chunker, history/snapshot logic, and crypto helpers.

**What CI does NOT test**

- End-to-end browser behaviour. Lives in [`e2e.yml`](#e2e-e2eyml) and only runs on PRs and tag pushes.
- Tauri build / packaging / signing (that is what `release.yml` does on tag).
- macOS-specific Tauri APIs that the mock layer stubs (Touch ID, Keychain, system fonts, history database via Rust, FTS5 / semantic search, terminal pty, native window events). The frontend exercises these via the mock layer under E2E; native paths are only validated by `cargo test`.
- Plugin features that the E2E mock layer treats as no-ops (encryption end-to-end, semantic search, file history, terminal, system fonts).
- Visual regression. There are no screenshot diffs.
- Multi-browser. The E2E suite (separate workflow) only configures Chromium.

---

## E2E (`e2e.yml`)

Playwright end-to-end suite, separated from CI so it can evolve independently (different cache strategy for the Chromium binary, different invocation via `bash scripts/e2e.sh`, different failure artifact set).

**Triggers**

- `pull_request` against `main`, filtered to paths that could affect the rendered frontend (`src/**`, `static/**`, `e2e/**`, lockfile, configs, `scripts/e2e.sh`).
- `workflow_dispatch` (manual rerun without a new commit).
- `workflow_call` (invoked by `release.yml` as a release gate on the tagged SHA, and by `run-all.yml`).

Intentionally NOT triggered on direct pushes to `main`. The project workflow is "PR → merge, or commit + tag together". The PR run before merge already covered the diff, and `release.yml` re-runs E2E on the tagged SHA before building — so a push-to-main trigger would only duplicate work.

**Jobs**

| Job ID | Display name | Runner | What it does |
|---|---|---|---|
| `playwright` | Frontend (Playwright E2E) | ubuntu-latest | Boots `PLAYWRIGHT=true pnpm dev`, installs Playwright Chromium (with browser binary cache keyed by `@playwright/test` version), runs `bash scripts/e2e.sh`. |

The suite covers ~166 tests across `e2e/specs/`: vault open, file CRUD, editor, tabs (open/cycle/close/pin/unpin), navigation (wikilink + quick switcher + command palette + search), live preview decorations, sidebars, settings, canvas/kanban/tasks virtual views, queryjs basics (manual mode + cache + Run button), embed widgets, wikilink completion / anchors / create-on-click, state persistence.

On failure, the Playwright HTML report, the `test-results/` directory, and `/tmp/kokobrain-e2e-server.log` are uploaded as a single 7-day artifact named `playwright-report`.

**What E2E tests**

The frontend layer end-to-end against the Tauri mock layer in `e2e/mocks/`. The mock layer implements an in-memory `VaultIndex` (parsing frontmatter / wikilinks / tags / tasks with the same pure logic the production code uses), a virtual filesystem, dialog/event/window stubs, and a passthrough for encryption/semantic/history/terminal commands. The Vite alias map (`vite.config.js`) swaps every `@tauri-apps/*` import for the corresponding mock under `PLAYWRIGHT=true`.

**What E2E does NOT test**

- The real Rust commands. The mock layer answers IPC calls with in-memory implementations. A bug in the actual `VaultIndex` (`src-tauri/src/vault/index.rs`) or in the FTS5 search service is not visible here.
- Plugin paths the mock returns no-op for: encryption end-to-end, semantic search, file history with the real SQLite database, terminal PTY, system fonts.
- Tauri runtime behaviour (auto-updater, native window events, deep links, menu bar). Listeners are mocked.
- Visual regression. No screenshot baselines.
- Multi-browser. Chromium only.

---

## Security (`security.yml`)

Dependency and supply-chain auditing.

**Triggers**

- `push` to `main`
- `pull_request` against `main`
- `schedule`: every Monday at 09:00 UTC (catches new CVEs even when no code changes)
- `workflow_dispatch`
- `workflow_call`
- Skipped when only `**/*.md` changed.

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `npm-audit` | ubuntu-latest | `pnpm audit --audit-level=moderate`. Fails if any moderate or higher vulnerability is reported. |
| `cargo-audit` | ubuntu-latest | `rustsec/audit-check@v2.0.0` against `src-tauri/`. Posts a check annotation when an advisory matches a dependency. |
| `supply-chain-quarantine` | ubuntu-latest | Verifies `pnpm-workspace.yaml` exists and sets `minimumReleaseAge` to at least `10080` minutes (7 days). This is the tamper-detection layer over the pnpm config that refuses to resolve packages younger than the configured age. |
| `dependency-review` | ubuntu-latest | PR only. Runs `actions/dependency-review-action@v4` with `fail-on-severity: moderate`. Blocks PRs that introduce dependencies with known vulnerabilities. |

**What Security tests**

- Known CVEs in npm + Cargo dependency trees (against advisory databases).
- That the pnpm supply-chain quarantine config has not been deleted or weakened.
- New dependency vulnerabilities introduced by a PR.

**What Security does NOT test**

- Whether application code is exploitable. There is no SAST step (CodeQL, semgrep, etc.).
- Container images, lockfile integrity checksums, or signed-commit verification.
- Runtime behaviour. It only inspects manifests, lockfiles, and advisory databases.

---

## Privacy (`privacy.yml`)

Greps the source tree for unauthorized external network calls. Backs the project promise that no data leaves the user's machine.

**Triggers**

- `push` to `main` with changes under `src/**` or `src-tauri/src/**`
- `pull_request` against `main` with the same path filter
- `workflow_dispatch`
- `workflow_call`

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `scan-external-calls` | ubuntu-latest | Runs the [`scan-external-calls`](#composite-actions) composite action twice (once for TypeScript / Svelte / JS, once for Rust) with language-specific PATTERN, SKIP, and KNOWN lists. |

**What Privacy tests**

- `.ts`, `.svelte`, `.js` files under `src/` and `.rs` files under `src-tauri/src/` for any of the following without explicit allowance:
  - HTTP clients (`fetch(`, `XMLHttpRequest`, `axios`, `node-fetch`, `reqwest`, `hyper::client`, `ureq::`, etc.)
  - Sockets (`WebSocket(`, `EventSource(`, `TcpStream::connect`, `UdpSocket::connect`)
  - Browser network APIs (`navigator.sendBeacon`, `RTCPeerConnection`, `navigator.geolocation`)
  - External resource loaders (`script.src =`, `iframe.src =`, `new Image().src =`, workers, service workers)
  - Hardcoded `https?://` URLs
- Exits non-zero on any match that does not appear in the KNOWN list (currently: `cdn.jsdelivr.net/npm/chart.js`, `todoist.com`, `@doist/todoist-api-typescript`, `@tauri-apps/plugin-http`, `huggingface.co/Xenova/bge-m3`).

**Opt-out marker**

Add `// privacy-ok` (or `# privacy-ok`, `/* privacy-ok */`) to any line that is intentionally matching a pattern but is not a real network call. Examples: test fixtures, code comments referencing URLs, mock URLs.

**What Privacy does NOT test**

- Runtime traffic. It is a static text scan, not a network monitor. A function that dynamically constructs a URL from variables will not be caught.
- Files outside `src/` and `src-tauri/src/` (e.g. `e2e/`, `scripts/`, `docs/`).
- Calls made through transitive npm/Cargo dependencies. The scope is first-party source only.

---

## Release (`release.yml`)

Builds, signs, notarizes, and publishes the macOS desktop binary.

**Triggers**

- `push` of a tag matching `*.*.*-alpha` (e.g. `2.0.8-alpha`).

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `validate` | ubuntu-latest | Cheap pre-flight: confirms the tag commit is an ancestor of `origin/main` via `git merge-base --is-ancestor`. Fails fast before any expensive runner starts. |
| `ci` | (reusable) | `uses: ./.github/workflows/ci.yml`. Re-runs the full CI matrix (changes / frontend / rust / ci-success) on the tagged SHA. |
| `e2e` | (reusable) | `uses: ./.github/workflows/e2e.yml`. Re-runs the Playwright suite on the tagged SHA. Blocks the release. |
| `build-macos` | macos-latest | `needs: [ci, e2e]`. The build/sign/publish pipeline. Only starts after both gates passed. |

`build-macos` pipeline:

1. Checkout with full history, setup environment (pnpm, Node, Rust toolchain for `aarch64-apple-darwin`).
2. Generate changelog from `git log` between the previous tag and the new tag (filters out `chore: bump version` lines).
3. `tauri-apps/tauri-action@v0.6` builds the Tauri app, code-signs with the Apple Developer cert, notarizes with the Apple ID, signs the auto-update payload with the Tauri signing key. Required secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. Generate SHA-256 checksums for `*.dmg`, `*.app.tar.gz`, and `*.app.tar.gz.sig`.
5. Upload `checksums-sha256.txt` to the GitHub release.

The previous "wait for ci.yml on this commit" polling step (a 5-minute `gh run list` poll followed by `gh run watch --exit-status`) is gone. CI and E2E are now native dependencies via `workflow_call` — no race conditions, no path-filter edge cases, and the UI shows the pipeline stages explicitly.

**What Release tests**

- That the tagged commit is on `main`, that CI passes on the exact tagged SHA, and that the Playwright E2E suite passes on the exact tagged SHA.
- That the macOS build succeeds end-to-end (compilation, bundling, signing, notarization).

**What Release does NOT test**

- The artifacts themselves. There is no smoke test that launches the produced `.app` to verify it boots, opens a vault, and survives basic interactions. The CI E2E covers the dev-mode frontend; the release artifact's frontend bundle is functionally identical but the wrapper is the real Tauri shell.
- Other platforms. The project is macOS-only by design (`README.md` says so explicitly).
- Auto-update channel health. The `.app.tar.gz.sig` is generated but not verified post-publish.

---

## Wiki Sync (`sync-wiki.yml`)

Mirrors `help/documentation/` and `help/examples/` into the repository's GitHub Wiki.

**Triggers**

- `push` to `main` with changes under `help/documentation/**` or `help/examples/**`.
- `workflow_dispatch`.

**Concurrency**

`group: sync-wiki-${{ github.ref }}` with `cancel-in-progress: false`. Two pushes in quick succession serialize; neither is dropped. Important here because each push may contain doc edits the previous push was about to publish, and cancelling would lose work.

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `sync` | ubuntu-latest | Clones the `<repo>.wiki` Git repo via `secrets.GITHUB_TOKEN`. Deletes existing `*.md` pages. Translates filenames (`01-getting-started.md` becomes `Getting-Started.md`) and rewrites internal markdown links to match the new names. Generates one wiki page per subfolder under `help/examples/` with code blocks colorized by extension. Commits and pushes to the wiki repo. |

**What Wiki Sync tests**

- Nothing. This is a publishing pipeline, not a validation step. Failures only mean the wiki may be out of date, never that the source-of-truth `help/documentation/` is broken.

**What Wiki Sync does NOT test**

- Documentation content (links, code samples, formatting). There is no spell-check or link-check.
- That generated wiki pages render correctly on GitHub.

---

## Run All Checks (`run-all.yml`)

Manual entry point that fans out CI, E2E, Security, and Privacy in one click. Useful after a rebase, when retrying flaky checks across the matrix, or during regression triage.

**Triggers**

- `workflow_dispatch` only. The downstream workflows' regular push / PR / schedule triggers are unaffected. They still fire for their own events independent of this wrapper.

**Jobs**

| Job ID | Display name | What it does |
|---|---|---|
| `ci` | CI | `uses: ./.github/workflows/ci.yml` |
| `e2e` | E2E | `uses: ./.github/workflows/e2e.yml` |
| `security` | Security | `uses: ./.github/workflows/security.yml` |
| `privacy` | Privacy | `uses: ./.github/workflows/privacy.yml` |

Permissions are granted at the wrapper level. The cargo-audit job in Security needs `checks: write` to post annotations, so the `security` caller declares it explicitly; everything else operates on `contents: read`.

**Why Release and Wiki Sync are excluded**

- `release.yml` has side effects (builds, signs, publishes a release). It would be dangerous to bundle into a "run everything" button.
- `sync-wiki.yml` is a publishing workflow, not a check. Re-running it does not validate anything; it would just push to the wiki.

---

## Composite actions

### `.github/actions/setup`

Reusable composite action used by every workflow that needs the pnpm + Node toolchain. Optionally installs Rust.

Inputs:

- `rust` (default `"true"`). When `"false"`, skips the Rust toolchain install. Frontend-only jobs pass `"false"`.
- `rust-targets` (default `aarch64-apple-darwin`). Comma-separated list of Rust targets.

Steps: install pnpm, install Node.js 22 with pnpm-store cache, run `pnpm install --frozen-lockfile`. If Rust is enabled, install via `dtolnay/rust-toolchain@stable` and cache build artefacts via `Swatinem/rust-cache@v2`.

### `.github/actions/scan-external-calls`

Reusable composite action used by `privacy.yml`. Greps a filesystem root for patterns indicating external network calls, classifying matches as skipped, known, or unknown. Fails when any unknown match remains.

Inputs:

- `language-label` (e.g. `TypeScript/Svelte`). Used in the scan header.
- `root` (e.g. `src` or `src-tauri/src`).
- `include-globs` (comma-separated, e.g. `*.ts,*.svelte,*.js`).
- `patterns` (newline-separated regex list of network-call signatures).
- `skip` (newline-separated regex list of lines to ignore).
- `known` (newline-separated regex list of approved external calls; surface as `::notice::`).

Lines starting with `#` and blank lines inside the multiline list inputs are ignored, so callers can group entries with comments.

---

## Dependabot (`dependabot.yml`)

Not a workflow. It is the configuration for the GitHub-native dependency update bot.

Ecosystems watched:

- `npm` at `/`, weekly schedule, `cooldown.default-days: 14`.
- `cargo` at `/src-tauri`, weekly schedule, `cooldown.default-days: 14`.
- `github-actions` at `/`, weekly schedule, `cooldown.default-days: 14`.

The 14-day cooldown aligns with the pnpm `minimumReleaseAge` setting (7 days at minimum) and supplements the supply-chain quarantine layer: Dependabot will not propose updates to packages younger than 14 days.

---

## Cross-cutting conventions

### Path filters

CI, Security, and Privacy use path filters to skip when only documentation changed:

- CI and Security use `paths-ignore: [**/*.md]`. Workflow file edits are NOT excluded — when you change a workflow, CI and Security run on that change so you can catch breakage before merge.
- Privacy uses an `allow-list` instead: `paths: [src/**, src-tauri/src/**]`. It only cares about source code.

### Concurrency

Every workflow has a `concurrency:` group keyed on `${{ github.ref }}`. Most use `cancel-in-progress: true` (newer commits supersede older runs). The exception is Wiki Sync, which uses `cancel-in-progress: false` (every push's docs are meaningful work; serialize, do not drop).

### Permissions

Every workflow declares `permissions: contents: read` at the file level. Jobs that need more escalate at the job level — and because GitHub Actions REPLACES (not merges) workflow-level permissions when a job declares its own, escalating jobs re-state the `contents: read` baseline alongside the extra scope they need. Current escalations:

- `security.yml` → `cargo-audit`: `contents: read` + `checks: write` (for `rustsec/audit-check` to post annotations).
- `release.yml` → `build-macos`: `contents: write` (for `tauri-action` to create the release and upload assets).
- `sync-wiki.yml`: workflow-level `contents: write` (publishes to the `<repo>.wiki` Git repo).

### Required status checks

When updating branch protection rules in the GitHub UI, refer to the current job display names. The recommended required check is the single sentinel from CI, which aggregates the rest:

| Display name | Workflow file | Notes |
|---|---|---|
| `CI success` | `ci.yml` | **Recommended** required check. Aggregates `changes` + `frontend` + `rust`; passes when each either succeeded or was deliberately skipped, fails on any real failure. Required because `frontend` and `rust` individually are skipped by paths-filter on changes that don't touch their tree, which makes them unusable as required checks directly. |
| `Frontend (Playwright E2E)` | `e2e.yml` | Can be required separately if you want a hard E2E gate on PRs. |

Historical names that should be removed from branch protection: `TypeScript Check`, `Frontend Tests`, `Rust Tests`, `Frontend (typecheck + tests)`, `Rust (cargo test)`, and any `Playwright E2E` entry pinned to `ci.yml` (it moved to `e2e.yml`).
