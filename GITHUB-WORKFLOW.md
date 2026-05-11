# GitHub Workflows

This document describes every GitHub Actions workflow in `.github/workflows/`, what triggers it, what it validates, and what it intentionally does not cover. Keep it in sync with reality when you change a workflow.

## Index

- [CI](#ci-ciyml)
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
- `workflow_call` (invoked by `run-all.yml`)
- Skipped automatically when the changeset only touches `**/*.md` or `.github/workflows/**`.

**Jobs**

| Job ID | Display name | Runner | When |
|---|---|---|---|
| `changes` | Detect Changes | ubuntu-latest | Always |
| `frontend` | Frontend (typecheck + tests) | ubuntu-latest | Only if `frontend` paths changed |
| `rust` | Rust (cargo test) | macos-latest | Only if `rust` paths changed |
| `e2e` | Frontend (Playwright E2E) | ubuntu-latest | Only if `frontend` paths changed |

`changes` uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter) with two filters:

- `frontend`: `src/**`, `static/**`, `pnpm-lock.yaml`, `package.json`, `tsconfig.json`, `svelte.config.*`, `vite.config.*`, `tailwind.config.*`, `postcss.config.*`, `components.json`
- `rust`: `src-tauri/**`

**What CI tests**

- `frontend`:
  - `pnpm check` (svelte-kit sync + svelte-check). Catches TypeScript errors, Svelte template errors, and unused imports.
  - `pnpm vitest run` (the full unit suite, ~5400 tests across the `src/tests/` tree). Covers pure logic, stores, services, parsers, and component-level behaviour.
- `rust`: `cargo test --manifest-path src-tauri/Cargo.toml`. Covers the entire Tauri backend including the `VaultIndex`, FTS5 indexing, semantic chunker, history/snapshot logic, and crypto helpers.
- `e2e`: `bash scripts/e2e.sh`. Boots `PLAYWRIGHT=true pnpm dev` (Vite serves the frontend with the Tauri mock layer in `e2e/mocks/`), runs the full Playwright suite (~166 tests across `e2e/specs/`). Covers vault open, file CRUD, editor, tabs, navigation (wikilink + quick switcher + command palette + search), live preview decorations, sidebars, settings, canvas/kanban/tasks virtual views, queryjs basics, and embed widgets.

On `e2e` failure, the Playwright HTML report, the `test-results/` directory, and `/tmp/kokobrain-e2e-server.log` are uploaded as a single 7-day artifact named `playwright-report`.

**What CI does NOT test**

- Tauri build / packaging / signing (that is what `release.yml` does on tag).
- macOS-specific Tauri APIs that the mock layer stubs (Touch ID, Keychain, system fonts, history database via Rust, FTS5 / semantic search, terminal pty, native window events). The frontend exercises these against in-memory mocks under PLAYWRIGHT mode, not the real Rust commands.
- Plugin features that the E2E mock layer treats as no-ops (encryption end-to-end, semantic search, file history, terminal, system fonts).
- Visual regression. There are no screenshot diffs.
- Multi-browser. Only Chromium is configured.

---

## Security (`security.yml`)

Dependency and supply-chain auditing.

**Triggers**

- `push` to `main`
- `pull_request` against `main`
- `schedule`: every Monday at 09:00 UTC (catches new CVEs even when no code changes)
- `workflow_dispatch`
- `workflow_call`
- Skipped when only `**/*.md` or `.github/workflows/**` changed.

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
| `build-macos` | macos-latest | The release pipeline. |

Pipeline steps:

1. `checkout` with full history.
2. Validate the tag commit is an ancestor of `origin/main` via `git merge-base --is-ancestor`. Aborts if someone tagged a feature branch.
3. Setup environment (pnpm, Node, Rust toolchain for `aarch64-apple-darwin`).
4. Verify CI passed on this commit. Queries `gh run list --workflow=ci.yml --commit "$GITHUB_SHA"` and aborts unless the conclusion is `success`. This gates release on the full CI matrix (frontend typecheck, vitest, E2E, Rust).
5. Generate changelog from `git log` between the previous tag and the new tag.
6. `tauri-apps/tauri-action@v0.6` builds the Tauri app, code-signs with the Apple Developer cert, notarizes with the Apple ID, signs the auto-update payload with the Tauri signing key. Required secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
7. Generate SHA-256 checksums for `*.dmg`, `*.app.tar.gz`, and `*.app.tar.gz.sig`.
8. Upload `checksums-sha256.txt` to the GitHub release.

**What Release tests**

- That the tagged commit is on `main` AND that CI passed on that exact commit before building.
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

Manual entry point that fans out CI, Security, and Privacy in one click. Useful after a rebase, when retrying flaky checks across the matrix, or during regression triage.

**Triggers**

- `workflow_dispatch` only. The downstream workflows' regular push / PR / schedule triggers are unaffected. They still fire for their own events independent of this wrapper.

**Jobs**

| Job ID | Display name | What it does |
|---|---|---|
| `ci` | CI | `uses: ./.github/workflows/ci.yml` |
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

CI, Security, and Privacy use path filters to skip when only documentation or workflow files changed:

- CI and Security use `paths-ignore: [**/*.md, .github/workflows/**]`.
- Privacy uses an `allow-list` instead: `paths: [src/**, src-tauri/src/**]`. It only cares about source code.

### Concurrency

Every workflow has a `concurrency:` group keyed on `${{ github.ref }}`. Most use `cancel-in-progress: true` (newer commits supersede older runs). The exception is Wiki Sync, which uses `cancel-in-progress: false` (every push's docs are meaningful work; serialize, do not drop).

### Permissions

Default to `contents: read`. Jobs that need more declare it inline (e.g. `cargo-audit` needs `checks: write`, `tauri-action` needs `contents: write` for the release job).

### Required status checks

When updating branch protection rules in the GitHub UI, refer to the current job display names:

- `Frontend (typecheck + tests)` (replaces the old `TypeScript Check` + `Frontend Tests`)
- `Frontend (Playwright E2E)` (replaces the old `Playwright E2E`)
- `Rust (cargo test)` (replaces the old `Rust Tests`)

Job IDs were also normalized (`frontend`, `e2e`, `rust`) so historical names should be removed.
