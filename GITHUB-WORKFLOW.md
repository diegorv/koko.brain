# GitHub Workflows

This document describes every GitHub Actions workflow in `.github/workflows/`, what triggers it, what it validates, and what it intentionally does not cover. Keep it in sync with reality when you change a workflow.

## Index

- [CI](#ci-ciyml)
- [E2E](#e2e-e2eyml)
- [Secret Scan](#secret-scan-secretsyml)
- [Security](#security-securityyml)
- [Privacy](#privacy-privacyyml)
- [Release](#release-releaseyml)
- [Main checks](#main-checks-main-checksyml)
- [Nightly](#nightly-nightlyyml)
- [Cache Cleanup](#cache-cleanup-cache-cleanupyml)
- [Wiki Sync](#wiki-sync-sync-wikiyml)
- [Run All Checks](#run-all-checks-run-allyml)
- [Composite actions](#composite-actions)
- [Dependabot](#dependabot-dependabotyml)
- [Cross-cutting conventions](#cross-cutting-conventions)

---

## CI (`ci.yml`)

Primary validation pipeline for code changes.

**Triggers**

- `workflow_call` only, plus `workflow_dispatch` (manual). Callers: `main-checks.yml` (every push to `main`), `pr.yml` (pull requests), `release.yml` (revalidates the tagged SHA before building) and `run-all.yml`.
- The callers' `paths-ignore` skips a push or PR that only touches `**/*.md`, `.scratch/**`, `help/**` or `LICENSE`.
- The gitleaks secret scan is not part of CI: it runs from [`secrets.yml`](#secret-scan-secretsyml) on every push and PR.

**Jobs**

| Job ID | Display name | Runner | When |
|---|---|---|---|
| `changes` | Detect Changes | ubuntu-24.04 | Always |
| `frontend` | Frontend (typecheck + tests) | ubuntu-24.04 | Only if `frontend` paths changed |
| `rust` | Rust (cargo test) | ubuntu-24.04 | Only if `rust` paths changed |
| `rust-fonts-macos` | Rust (cargo test — macOS fonts) | macos-latest | Only if `rust` paths changed |
| `ci-success` | CI success | ubuntu-24.04 | Always (sentinel for branch protection — passes when every preceding job either succeeded or was deliberately skipped, fails on any failure or cancellation) |

`changes` uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter) with two filters:

- `frontend`: `src/**`, `static/**`, `pnpm-lock.yaml`, `package.json`, `tsconfig.json`, `vite.config.*`, `tailwind.config.*`, `postcss.config.*`, `components.json`, `e2e/**`, `.github/actions/setup/**`, `.github/workflows/ci.yml`
- `rust`: `src-tauri/**`, `src/lib/contracts/generated/**`, `.cargo/**`, `.github/actions/setup/**`, `.github/workflows/ci.yml`

The Playwright E2E suite lives in a separate workflow ([`e2e.yml`](#e2e-e2eyml)) so it can evolve independently — different runner needs (Playwright browser cache), different cadence (heavier than `pnpm vitest`), and a different invocation contract (`bash scripts/e2e.sh`).

**What CI tests**

- `frontend`:
  - `pnpm check` (svelte-kit sync + svelte-check). Catches TypeScript errors, Svelte template errors, and unused imports.
  - `pnpm vitest run` (the full unit suite, ~5400 tests across the `src/tests/` tree). Covers pure logic, stores, services, parsers, and component-level behaviour.
  - `pnpm build` (Vite production build). Catches bundling regressions that the typecheck and unit suite miss: SSR-incompatible imports, dynamic import paths that don't resolve, type-only re-exports that become runtime errors, missing asset references. Without this step, those failures only surface inside `tauri-action` during release.
- `rust`: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`, then `cargo test --manifest-path src-tauri/Cargo.toml`. Any clippy warning fails the job, so a toolchain bump in `.github/actions/setup` must fix the lints the new clippy adds in the same change. The test step covers the entire Tauri backend including the `VaultIndex`, FTS5 indexing, semantic chunker, and history/snapshot logic. Runs on `ubuntu-24.04`, where code gated on `#[cfg(target_os = "macos")]` is compiled out: neither clippy nor the tests see `src/commands/fonts.rs`, the objc2 paths or the `semantic::qos` syscalls there, and code used only by such a branch (an import, a constant) is reported as unused on Linux alone.
- `rust-fonts-macos`: the same clippy command on `macos-latest`, then the macOS-gated tests (`commands::fonts`, `semantic_qos_test`, `utils_fs_test`, `semantic_embedder_qos_session_test`), each required to report a non-zero passed count. macOS is the only platform the binary ships to.

**What CI does NOT test**

- End-to-end browser behaviour. Lives in [`e2e.yml`](#e2e-e2eyml), which runs on PRs, tag pushes, and every push to `main` through `main-checks.yml` (non-blocking there).
- Tauri build / packaging / signing (that is what `release.yml` does on tag).
- macOS-specific Tauri APIs that the mock layer stubs (system fonts, history database via Rust, FTS5 / semantic search, native window events). The frontend exercises these via the mock layer under E2E; native paths are only validated by `cargo test`.
- Plugin features that the E2E mock layer treats as no-ops (semantic search, file history, system fonts).
- Visual regression. There are no screenshot diffs.
- Multi-browser. The E2E suite (separate workflow) only configures Chromium.

---

## E2E (`e2e.yml`)

Playwright end-to-end suite, separated from CI so it can evolve independently (different cache strategy for the Chromium binary, different invocation via `bash scripts/e2e.sh`, different failure artifact set).

**Triggers**

- `workflow_call` only — this workflow owns no event of its own. Callers: `pr.yml` (the `pull_request` gate, change-gated on the frontend paths), `release.yml` (hard gate on the tagged SHA), `main-checks.yml` (post-merge signal, gates nothing), and `run-all.yml`.
- `workflow_dispatch` (manual rerun without a new commit).

**Jobs**

| Job ID | Display name | Runner | What it does |
|---|---|---|---|
| `playwright` | Frontend (Playwright E2E N/4) | ubuntu-24.04 | Matrix of 4 shards (`fail-fast: false`). Each boots `PLAYWRIGHT=true pnpm dev`, installs Playwright Chromium (with browser binary cache keyed by `@playwright/test` version), runs `bash scripts/e2e.sh --shard=N/4`. The shard flag is passed only here: `scripts/e2e.sh` and `e2e/playwright.config.ts` are unchanged, so local runs cover the whole suite. |

The suite covers ~166 tests across `e2e/specs/`: vault open, file CRUD, editor, tabs (open/cycle/close/pin/unpin), navigation (wikilink + quick switcher + command palette + search), live preview decorations, sidebars, settings, canvas/kanban/tasks virtual views, queryjs basics (manual mode + cache + Run button), embed widgets, wikilink completion / anchors / create-on-click, state persistence.

On failure, the Playwright HTML report, the `test-results/` directory, and `/tmp/kokobrain-e2e-server.log` are uploaded as a 7-day artifact per failing shard, named `playwright-report-N`.

**What E2E tests**

The frontend layer end-to-end against the Tauri mock layer in `e2e/mocks/`. The mock layer implements an in-memory `VaultIndex` (parsing frontmatter / wikilinks / tags / tasks with the same pure logic the production code uses), a virtual filesystem, dialog/event/window stubs, and a passthrough for semantic/history commands. The Vite alias map (`vite.config.js`) swaps every `@tauri-apps/*` import for the corresponding mock under `PLAYWRIGHT=true`.

**What E2E does NOT test**

- The real Rust commands. The mock layer answers IPC calls with in-memory implementations. A bug in the actual `VaultIndex` (`src-tauri/src/vault/index.rs`) or in the FTS5 search service is not visible here.
- Plugin paths the mock returns no-op for: semantic search, file history with the real SQLite database, system fonts.
- Tauri runtime behaviour (auto-updater, native window events, deep links, menu bar). Listeners are mocked.
- Visual regression. No screenshot baselines.
- Multi-browser. Chromium only.

---

## Secret Scan (`secrets.yml`)

Gitleaks over the pushed commits. Split out of `ci.yml` so it runs on every push and PR, docs-only ones included (a secret pasted into a `.md` or a `.scratch` note leaks as easily as one in code), while CI, E2E, Nightly and Commit policy skip docs-only changes.

**Triggers**

- `push` to `main` and `pull_request` against `main`, with no path filter.
- `workflow_call` from `release.yml` (a release gate) and `run-all.yml`.

**Jobs**

| Job ID | Display name | Runner | What it does |
|---|---|---|---|
| `gitleaks` | Secret Scan (gitleaks) | ubuntu-24.04 | Every ref but a tag. `gitleaks/gitleaks-action` with `.gitleaks.toml` and gitleaks `8.30.1` (the action's default 8.24.3 silently ignores `[[allowlists]]`). Scans the pushed or PR commits; on `workflow_dispatch` (through `run-all.yml`) the action scans the full history. |
| `gitleaks-release` | Secret Scan (gitleaks, since previous release) | ubuntu-24.04 | Tags only, i.e. when `release.yml` calls it. On a tag push the action sees an empty commit list and exits with "No commits to scan", so this job downloads the gitleaks `8.30.1` release, checks it against the published `checksums.txt`, and scans `<previous X.Y.Z tag>..<tagged SHA>` (the full history when there is no previous tag). |

Concurrency is one group per calling workflow and SHA with `cancel-in-progress: false`: the action scans the pushed commits, so a cancelled run would leave that range unscanned. `github.workflow` is the caller's name under `workflow_call`, so a release run does not share the push's group.

`PR success` in `pr.yml` does not include this check: it is a separate workflow so docs-only PRs are scanned too. Require `Secret Scan (gitleaks)` on its own if branch protection is added.

---

## Security (`security.yml`)

Dependency and supply-chain auditing.

**Triggers**

- `push` to `main`, skipped when only docs (`**/*.md`, `.scratch/**`, `help/**`, `LICENSE`) or `.github/**` files other than `security.yml` and the setup action changed
- `schedule`: daily at 12:30 UTC (catches new CVEs even when no code changes)
- `workflow_dispatch`
- `workflow_call`: from `pr.yml` when a PR changes a manifest, a lockfile, `pnpm-workspace.yaml`, the audit script, `.github/actions/` or `.github/workflows/`; from `release.yml`; and from `run-all.yml`

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `npm-audit` | ubuntu-24.04 | `scripts/quarantine-aware-audit.mjs` runs `pnpm audit --audit-level=moderate` and fails on a moderate or higher advisory whose patch is past the 5-day quarantine and within the installed major. It only warns when every such patch is still quarantined, when the fix needs a major bump of the dependent, or when no patch exists yet. |
| `cargo-audit` | ubuntu-24.04 | `rustsec/audit-check@v2.0.0` against `src-tauri/`. Posts a check annotation when an advisory matches a dependency. Skipped on the `schedule` trigger: there audit-check opens an issue per new warning, which the token cannot do, so the daily run always failed. Pushes, `workflow_dispatch` and `release.yml` still run it; the daily OSV scan still reports advisories in `Cargo.lock`. |
| `supply-chain-quarantine` | ubuntu-24.04 | Verifies `pnpm-workspace.yaml` exists and sets `minimumReleaseAge` to at least `7200` minutes (5 days). This is the tamper-detection layer over the pnpm config that refuses to resolve packages younger than the configured age. |
| `gitleaks-history` | ubuntu-24.04 | `schedule` and `workflow_dispatch` of Security itself only. gitleaks `8.30.1` with `.gitleaks.toml` over the full git history. |
| `osv-scanner` | (reusable) | Security's own triggers only (callers narrow the token and the SARIF upload fails). `google/osv-scanner-action` over the full tree, results uploaded to code scanning. `fail-on-vuln: false`, so it does not fail on findings. |

**What Security tests**

- Known CVEs in npm + Cargo dependency trees (against advisory databases).
- That the pnpm supply-chain quarantine config has not been deleted or weakened.
- Secrets anywhere in the git history (daily).

**What Security does NOT test**

- Whether application code is exploitable. This workflow has no SAST step; CodeQL runs separately, as GitHub's default code-scanning setup.
- Container images, lockfile integrity checksums, or signed-commit verification.
- Runtime behaviour. It only inspects manifests, lockfiles, advisory databases and, for gitleaks, the git history.

---

## Privacy (`privacy.yml`)

Greps the source tree for unauthorized external network calls. Backs the project promise that no data leaves the user's machine.

**Triggers**

- `push` to `main` with changes under `src/**`, `src-tauri/src/**`, `src-tauri/tauri.conf.json`, `package.json`, `pnpm-lock.yaml` or the scan action
- `workflow_call` from `pr.yml` (same paths, folded into `PR success`), `release.yml` (a release gate) and `run-all.yml`
- `workflow_dispatch`

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `scan-external-calls` | ubuntu-24.04 | Runs the [`scan-external-calls`](#composite-actions) composite action twice (once for TypeScript / Svelte / JS, once for Rust) with language-specific PATTERN, SKIP, and KNOWN lists. |

**What Privacy tests**

- `.ts`, `.svelte`, `.js` files under `src/` and `.rs` files under `src-tauri/src/` for any of the following without explicit allowance:
  - HTTP clients (`fetch(`, `XMLHttpRequest`, `axios`, `node-fetch`, `reqwest`, `hyper::client`, `ureq::`, etc.)
  - Sockets (`WebSocket(`, `EventSource(`, `TcpStream::connect`, `UdpSocket::connect`)
  - Browser network APIs (`navigator.sendBeacon`, `RTCPeerConnection`, `navigator.geolocation`)
  - External resource loaders (`script.src =`, `iframe.src =`, `new Image().src =`, workers, service workers)
  - Hardcoded `https?://` URLs
- Exits non-zero on any match that does not appear in the KNOWN list (currently: `cdn.jsdelivr.net/npm/chart.js`, `todoist.com`, `@doist/todoist-sdk`, `@tauri-apps/plugin-http`, `huggingface.co/Xenova/bge-m3`).

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

- `push` of a tag matching `*.*.*` or `*.*.*-*`. The `validate` job accepts only `X.Y.Z` (stable) and `X.Y.Z-alpha.N` / `X.Y.Z-beta.N` / `X.Y.Z-rc.N` (published as a GitHub Pre-release, so `releases/latest` and the Stable updater channel keep serving the last stable).

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `validate` | ubuntu-24.04 | Cheap pre-flight: confirms the tag commit is an ancestor of `origin/main` via `git merge-base --is-ancestor`. Fails fast before any expensive runner starts. |
| `ci` | (reusable) | `uses: ./.github/workflows/ci.yml` with `force_all: true`. Re-runs the full CI matrix (frontend + rust forced, even if the only diff from the prior push was the version-bump commit). |
| `e2e` | (reusable) | `uses: ./.github/workflows/e2e.yml`. Re-runs the Playwright suite on the tagged SHA. Blocks the release. |
| `secrets` | (reusable) | `uses: ./.github/workflows/secrets.yml`. Gitleaks over the commits since the previous release tag (`gitleaks-release` job). Blocks the release. |
| `security` | (reusable) | `uses: ./.github/workflows/security.yml`. npm audit, cargo audit and the supply-chain quarantine check (OSV and the full-history gitleaks run only on Security's own triggers). Blocks the release. |
| `privacy` | (reusable) | `uses: ./.github/workflows/privacy.yml`. External-call scan. Blocks the release. |
| `build-macos` | macos-latest | `needs: [ci, e2e, secrets, security, privacy]`. The build/sign/publish pipeline. Only starts after every gate passed, so a new dependency advisory blocks a release until it is fixed or quarantined. Timeout is 90 minutes: only `release.yml` writes the `macos-release-aarch64` Rust cache, and GitHub evicts a cache unused for 7 days, so a release a week after the previous one compiles every dependency from scratch. |

`build-macos` pipeline:

1. Checkout with full history, setup environment (pnpm, Node, Rust toolchain for `aarch64-apple-darwin`).
2. Generate changelog from `git log` between the previous tag and the new tag (filters out `chore: bump version` lines). For a stable tag the previous tag is the previous stable, so its notes include the pre-releases; for a pre-release it is the tag just before it. Tags are sorted with `git -c versionsort.suffix=-` so `4.0.0-beta.1` ranks below `4.0.0`.
3. `tauri-apps/tauri-action@v0.6` builds the Tauri app, code-signs with the Apple Developer cert, notarizes with the Apple ID, signs the auto-update payload with the Tauri signing key. Required secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. [`publish-checksums`](#githubactionspublish-checksums) hashes `*.dmg`, `*.app.tar.gz` and `*.app.tar.gz.sig`, uploads `checksums-sha256.txt` and appends the block to the release body.

The previous "wait for ci.yml on this commit" polling step (a 5-minute `gh run list` poll followed by `gh run watch --exit-status`) is gone. CI and E2E are now native dependencies via `workflow_call` — no race conditions, no path-filter edge cases, and the UI shows the pipeline stages explicitly.

**What Release tests**

- That the tagged commit is on `main`, and that CI, the Playwright E2E suite, the gitleaks scan, the Security audits and the Privacy scan all pass on the exact tagged SHA before anything is built.
- That the macOS build succeeds end-to-end (compilation, bundling, signing, notarization).

**What Release does NOT test**

- The artifacts themselves. There is no smoke test that launches the produced `.app` to verify it boots, opens a vault, and survives basic interactions. The CI E2E covers the dev-mode frontend; the release artifact's frontend bundle is functionally identical but the wrapper is the real Tauri shell.
- Other platforms. The project is macOS-only by design (`README.md` says so explicitly).
- Auto-update channel health. The `.app.tar.gz.sig` is generated but not verified post-publish.

---

## Main checks (`main-checks.yml`)

Post-merge CI and E2E on `main`. Split from `nightly.yml` so the nightly build can queue (`cancel-in-progress: false`) while these checks still cancel on a newer push.

**Triggers**

- `push` to `main`, with the same `paths-ignore` list as `nightly.yml`.
- `workflow_dispatch`.

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `ci` | (reusable) | `uses: ./.github/workflows/ci.yml` with the default `force_all: false`. Paths-filter still applies, so a workflow- or docs-only commit can skip the frontend / rust jobs. |
| `e2e` | (reusable) | `uses: ./.github/workflows/e2e.yml`. Full Playwright suite on the pushed SHA, no paths-filter. |

Concurrency is `group: main-checks-${{ github.ref }}, cancel-in-progress: true`. Nothing depends on these jobs: they are a post-merge signal, and `release.yml` re-runs both as hard gates on the tagged SHA. There is no guard job: the `chore: bump version` commit that precedes a tag runs CI and E2E here and again in `release.yml`, `[skip nightly]` does not skip them, and forks run them too.

---

## Nightly (`nightly.yml`)

Push-to-main pre-release build for the Nightly channel. See [docs/RELEASE-CHANNELS.md](docs/RELEASE-CHANNELS.md) for the user-facing channel semantics.

**Triggers**

- `push` to `main`, except when the diff only touches `**/*.md`, `.scratch/**`, `help/**` or `LICENSE`.
- `workflow_dispatch` (manual rebuild, e.g. after a transient notarization failure).
- No cron — the cadence is one nightly per accepted commit.

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `guard` | ubuntu-24.04 | Fast fail. Verifies `github.repository == 'diegorv/koko.brain'` so forks do not attempt to publish nightlies to their own Releases. Also sets `should_build=false` when the head commit subject starts with `chore: bump version` — those commits trigger `release.yml` for the stable build of the same SHA, and `nightly.yml` would otherwise duplicate ~30 minutes of macOS work. The commit message is read through an `env:` mapping, not inline `${{ }}`, to defuse shell-injection from a malicious commit subject. |
| `build-macos` | macos-latest | Builds, signs, notarizes, and publishes the nightly DMG. `needs: [guard]` only. CI and E2E for the same push run in [`main-checks.yml`](#main-checks-main-checksyml) and gate nothing here. Sets `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16`: the release profile's `codegen-units = 1` compiles the `kokobrain` crate on one core, and the nightly trades a slightly slower binary for a parallel build. Uses its own rust-cache key (`macos-nightly-aarch64`), since the override changes every crate's artifacts. |

`build-macos` pipeline:

1. Checkout with `fetch-depth: 0` so the stable tag is present and `git rev-list --count <tag>..HEAD` returns the commits since it.
2. Compute `NIGHTLY_VERSION` by calling `resolveVersion()` from `src/lib/utils/build-info.js` with `package.json`'s version: `${MAJOR}.${MINOR}.$((PATCH + 1))-nightly.${COMMIT_COUNT}.${SHORT_SHA}` on a stable base, `<base>.nightly.${COMMIT_COUNT}.${SHORT_SHA}` on a pre-release base such as `4.0.0-beta.1`. The patch bump matters: semver ranks `X.Y.Z-pre` BELOW `X.Y.Z`, so without it the updater would treat every nightly as a downgrade from the current stable, and a larger bump would hide the next patch stable from nightly users. A pre-release base keeps its suffix instead, because the commit count restarts at every tag and only the base keeps nightlies ordered across `beta.1`, `beta.2`, `rc.1` and below the final release. Then patch `src-tauri/tauri.conf.json#version` in-place via `jq`. The patch is job-scoped and is never committed. Tauri reads that file for the bundle's `Info.plist` and the generated `latest.json`, so it must carry the nightly version for the auto-updater to see a semver-monotonic stream of nightlies. `package.json` is deliberately left unpatched: `resolveVersion()` in `src/lib/utils/build-info.js` appends the same suffix when `KOKO_RELEASE_CHANNEL=nightly`, so patching it too produced a doubled suffix. (Why commit count and not just sha: numeric semver identifiers compare numerically; raw shas compare lexically, which would break the "newer version" check for consecutive nightlies. See `src/lib/utils/build-info.js`.)
3. Record the ids of the assets currently attached to the `nightly` release, and un-draft it if it somehow became a draft (`getOrCreateRelease` reuses non-draft releases only). The release is never deleted: `tauri-action` builds before it touches the release API, so leaving it in place means a failed build keeps the last good nightly downloadable.
4. `tauri-apps/tauri-action@<sha>` builds the Tauri app with `KOKO_RELEASE_CHANNEL=nightly` (so the bundle's runtime `__APP_CHANNEL__` constant is `'nightly'`), code-signs with the Apple Developer cert, notarizes, signs the auto-update payload, and publishes to the fixed `nightly` tag with `prerelease: true`. Same secrets as `release.yml`.
5. Publish checksums through [`publish-checksums`](#githubactionspublish-checksums) with `tag: nightly`.
6. Delete the asset ids recorded in step 3 — the previous run's version-stamped DMG / tar.gz / sig. Ids that `tauri-action` already replaced (`latest.json`, same filename, new id) 404 and are skipped. Re-assert `--prerelease`, which the reuse path cannot set.
7. Smoke-check `latest.json` (polling until it advertises this run's version, not merely until it returns 200 — the previous run's file is still there while the CDN lags), then force-move the `nightly` tag to the built commit. Last on purpose: a run that dies in the build leaves the tag on the commit whose assets are published, and GitHub generates the "Source code" archives from the tag at download time.

Concurrency is `group: nightly, cancel-in-progress: false`: a running build always finishes, and GitHub keeps only the newest push pending (an older pending run is cancelled and replaced). With `cancel-in-progress: true`, pushes landed faster than a build finished, so most builds were cancelled near the end and no nightly got published during a busy stretch.

**What Nightly tests**

- Only that the app builds, signs, notarizes and publishes. CI and E2E for the same push run in [`main-checks.yml`](#main-checks-main-checksyml); they report status, `release.yml` is where they block.

**What Nightly does NOT test**

- **Nothing as a gate.** `main-checks.yml` runs CI and E2E separately, so a nightly DMG publishes even when they fail. `release.yml` is where both are hard gates. A failing build is contained: the previous nightly release stays published and downloadable, and the `nightly` tag has not moved either. A failure in the post-build publish steps is the one partial case — new assets, tag still one commit behind.
- **Security audits.** `security.yml` covers this SHA through its own `push: main` trigger, not through `nightly.yml`.
- Same gaps as Release (no `.app` smoke test, no post-publish auto-update verification).
- The `chore: bump version` skip: there's no positive assertion that the skipped run "would have produced the same bundle as `release.yml`". The two pipelines are equivalent by construction; if they diverge, both flows break at the same time.

---

## Cache Cleanup (`cache-cleanup.yml`)

Keeps the repository under GitHub's 10 GB Actions cache limit. CodeQL's default setup saves a ~175 MB overlay database per push and never prunes them; past the limit GitHub evicts the least recently used entries, which were the Rust caches `ci.yml` depends on.

**Triggers**

- `schedule`: `*/10 * * * *` (every 10 minutes; on a busy day CodeQL adds several GB in an hour).
- `workflow_dispatch`.

**Jobs**

| Job ID | Runner | What it does |
|---|---|---|
| `codeql` | ubuntu-24.04 | Lists `codeql-overlay-*` caches newest first and deletes all but the newest 2 per language (`gh cache delete`). Touches no other cache. Gated on `github.repository == 'diegorv/koko.brain'`. Needs `actions: write`. |

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
| `sync` | ubuntu-24.04 | Clones the `<repo>.wiki` Git repo via `secrets.GITHUB_TOKEN`. Deletes existing `*.md` pages. Translates filenames (`01-getting-started.md` becomes `Getting-Started.md`) and rewrites internal markdown links to match the new names. Generates one wiki page per subfolder under `help/examples/` with code blocks colorized by extension. Commits and pushes to the wiki repo. |

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
| `secrets` | Secret Scan | `uses: ./.github/workflows/secrets.yml` (full-history gitleaks under `workflow_dispatch`) |
| `security` | Security | `uses: ./.github/workflows/security.yml` |
| `privacy` | Privacy | `uses: ./.github/workflows/privacy.yml` |

Permissions are granted at the wrapper level. The cargo-audit job in Security needs `checks: write` to post annotations, and its osv-scanner job needs `actions: read` and `security-events: write` to upload results to code scanning, so the `security` caller declares all three; everything else operates on `contents: read`.

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

Steps: install pnpm, install Node.js 22 with pnpm-store cache, run `pnpm install --frozen-lockfile`. If Rust is enabled, install via `dtolnay/rust-toolchain@stable`, set an empty `RUSTC_WRAPPER` (overrides the `rustc-wrapper = "sccache"` that `.cargo/config.toml` sets for local builds; CI does not use sccache) and cache build artefacts via `Swatinem/rust-cache@v2`.

### `.github/actions/publish-checksums`

Composite action used by `release.yml` and `nightly.yml` after `tauri-action`. Hashes the macOS bundles, uploads `checksums-sha256.txt` with `--clobber` and replaces the `## Checksums (SHA256)` block at the end of the release body.

Inputs: `tag` (release to publish to) and `token` (contents:write).

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

- `npm` at `/`, weekly schedule, `cooldown.default-days: 5` (`@tauri-apps/*` excluded).
- `cargo` at `/src-tauri`, weekly schedule, `cooldown.default-days: 5`.
- `github-actions` at `/` and `/.github/actions/setup`, weekly schedule, `cooldown.default-days: 14`.

The npm and cargo cooldowns match the pnpm `minimumReleaseAge` (5 days), so Dependabot proposes a version once it is installable. `scripts/check-outdated-cargo.mjs` reads the cargo value as its release-age window.

---

## Cross-cutting conventions

### Path filters

CI, Security, and Privacy use path filters to skip when only documentation changed:

- `pr.yml` uses `paths-ignore`: `**/*.md`, `.scratch/**`, `help/**`, `LICENSE`. The push entry points (`main-checks.yml`, `nightly.yml`, `security.yml`, `commit-policy.yml`, which applies the same list to PRs) use an ordered `paths` filter instead: everything, minus that docs list, minus `.github/**`, plus the workflow's own file and the files it runs (`nightly.yml`: `.github/actions/setup/**`, `.github/actions/publish-checksums/**`; `main-checks.yml`: `ci.yml`, `e2e.yml`, `.github/actions/setup/**`; `security.yml`: `.github/actions/setup/**`). A workflow change is still validated by its own run, but editing one workflow no longer starts the nightly build and every other check. Inside `ci.yml` the `frontend` and `rust` filters likewise count only `ci.yml` and `.github/actions/setup/**` from `.github/`. A docs-only push therefore runs only `secrets.yml` (plus `sync-wiki.yml` when it touches `help/documentation/**` or `help/examples/**`, `privacy.yml` when it touches `PRIVACY.md`, and CodeQL's default setup, which has no path filter).
- Inside `pr.yml` and `ci.yml`, `dorny/paths-filter` decides which suites run; a skipped suite counts as passed in the `PR success` / `CI success` aggregates.
- Privacy's own push trigger uses an allow-list of source paths; it only cares about code that can make network calls.

### Concurrency

Most workflows have a `concurrency:` group keyed on `${{ github.ref }}` with `cancel-in-progress: true` (newer commits supersede older runs). The exceptions use `cancel-in-progress: false`: Wiki Sync (every push's docs are meaningful work; serialize, do not drop), Release, Nightly (fixed group `nightly`: a cancelled build publishes nothing; GitHub keeps only the newest push pending), and Commit policy and Secret Scan (one group per SHA, because each scans the pushed range). Cache Cleanup uses a fixed group that cancels in progress.

### Runner images

Linux jobs pin `ubuntu-24.04` instead of `ubuntu-latest`, so a GitHub image migration (`ubuntu-latest` moving to 26.04, actions/runner-images#14748) does not change the build environment under a push and does not annotate every run. Moving to a newer image is a deliberate change: the Tauri `apt` packages in `ci.yml` and `playwright install-deps` are the parts most likely to differ. CodeQL's default setup picks its own runner and still shows the notice; only an advanced setup would control it.

### Third-party action pinning

Third-party actions (anything outside the `actions/*` namespace) are pinned by full commit SHA, with the corresponding version tag in a trailing comment so Dependabot keeps them current:

```yaml
- uses: dorny/paths-filter@fbd0ab8f3e69293af611ebaee6363fc25e6d187d # v4
```

This protects the suite against a compromised maintainer account silently moving a tag to malicious code — the SHA we recorded is the only thing GitHub will resolve. The release pipeline (`tauri-apps/tauri-action`, which handles Apple signing certs and notarization credentials) is the highest-stakes case, but the same convention applies everywhere.

`actions/*` (e.g. `actions/checkout`, `actions/setup-node`, `actions/cache`, `actions/upload-artifact`) is left on version tags — those are GitHub-published and considered part of the trusted base.

`dtolnay/rust-toolchain@stable` is also intentionally NOT pinned by SHA: `stable` is a branch reference that tracks the rolling rustc stable channel, so pinning by SHA would freeze the channel as well as the action code.

### Permissions

Every workflow declares `permissions: contents: read` at the file level. Jobs that need more escalate at the job level — and because GitHub Actions REPLACES (not merges) workflow-level permissions when a job declares its own, escalating jobs re-state the `contents: read` baseline alongside the extra scope they need. Current escalations:

- `security.yml` → `cargo-audit`: `contents: read` + `checks: write` (for `rustsec/audit-check` to post annotations).
- `security.yml` → `osv-scanner`: `contents: read` + `actions: read` + `security-events: write` (for the reusable OSV workflow to upload SARIF to code scanning).
- `release.yml` → `build-macos`: `contents: write` (for `tauri-action` to create the release and upload assets).
- `sync-wiki.yml`: workflow-level `contents: write` (publishes to the `<repo>.wiki` Git repo).

### Required status checks

When updating branch protection rules in the GitHub UI, refer to the current job display names. The recommended required check is the single sentinel from CI, which aggregates the rest:

| Display name | Workflow file | Notes |
|---|---|---|
| `CI success` | `ci.yml` | **Recommended** required check. Aggregates `changes` + `frontend` + `rust`; passes when each either succeeded or was deliberately skipped, fails on any real failure. Required because `frontend` and `rust` individually are skipped by paths-filter on changes that don't touch their tree, which makes them unusable as required checks directly. |
| `Frontend (Playwright E2E N/4)` | `e2e.yml` | One check per shard (1/4 to 4/4). Can be required separately if you want a hard E2E gate on PRs. |

Historical names that should be removed from branch protection: `TypeScript Check`, `Frontend Tests`, `Rust Tests`, `Frontend (typecheck + tests)`, `Rust (cargo test)`, and any `Playwright E2E` entry pinned to `ci.yml` (it moved to `e2e.yml`).
