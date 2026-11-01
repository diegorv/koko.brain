---
type: ADR
id: "0014"
title: "Supply-chain defense: pnpm quarantine + pre-commit hook + CI guardrail"
status: active
date: 2026-04-22
---

## Context

The modern npm supply chain has a well-established threat model: compromised or malicious packages are most dangerous in the first hours-to-days after publication, before maintainers, security scanners, and deletion requests catch them. Incidents around `event-stream`, `ua-parser-js`, `node-ipc`, and more recent typosquats have all had the same shape — malicious version published, installed by thousands within hours, detected within days.

Kokobrain has ~60 direct npm dependencies and transitive closure is larger. A single auto-updated dev dependency compromised in the first day after release could ship to every developer who ran `pnpm install`.

The project needed a defense that:

- Is enforced locally so `pnpm install` never pulls a same-day release.
- Survives disabling — a determined developer can always `--no-verify`, but accidental or scripted installs are blocked.
- Is verified in CI so someone can't silently remove the config from `pnpm-workspace.yaml`.

## Decision

**Enforce a 7-day package-age quarantine in three independent layers**, each strong enough on its own that removing one still leaves defense:

### Layer 1 — pnpm `minimumReleaseAge` (primary)

`pnpm-workspace.yaml` (complete file):

```yaml
minimumReleaseAge: 10080     # 7 days in minutes
minimumReleaseAgeExclude:
  - '@tauri-apps/*'
```

pnpm 10 refuses to resolve any package version published less than 7 days ago. The `@tauri-apps/*` exclusion is deliberate — Rust (`Cargo.toml`) and TS (`package.json`) Tauri dependencies must stay version-aligned; forcing a 7-day delay on one side and not the other would break Tauri updates.

### Layer 2 — Pre-commit hook (`scripts/pre-commit-dep-age.sh`)

Installed via `bash scripts/setup-hooks.sh`. On every commit that stages `pnpm-lock.yaml`, the hook:

1. Parses newly-added / changed packages from the lockfile diff (scoped-package-aware).
2. Queries `npm view <pkg> time --json` for each version's publish timestamp.
3. Blocks the commit if any package version is less than 7 days old, with an explicit violation list.
4. Supports an allowlist at `.dep-age-allowlist` (`package@version` per line, `#` comments) for justified exceptions.
5. Emergency bypass: `git commit --no-verify`.

### Layer 3 — CI guardrail (`.github/workflows/security.yml`)

The `supply-chain-quarantine` job (`security.yml:56-84`) runs on every push and PR:

- Verifies `pnpm-workspace.yaml` exists.
- Verifies `minimumReleaseAge` is set to at least 10080 (7 days). Fails the build if missing or lower.

Adjacent jobs in the same workflow run `pnpm audit --audit-level=moderate`, `rustsec/audit-check` for Cargo, and GitHub's `dependency-review-action` on PRs.

## Alternatives considered

- **Pin every version exactly + manual audit**: prohibitive for a small team; every minor bump is a judgement call.
- **Snyk / Socket.dev / Dependabot alerts only**: reactive — detects after exposure. We want proactive blocking.
- **14-day quarantine instead of 7**: longer windows catch more slow-detection compromises but in practice forced too many CVE backports through the allowlist and held us behind security patches in `vite`, `@sveltejs/kit`, `dompurify`, etc. 7 days still covers the bulk of fast-detection windows for hostile packages while letting first-week security patches land.
- **`minimumReleaseAge` without CI verification**: a rogue PR could remove the config silently. The CI check catches that.
- **No local pre-commit, CI-only**: attacks slip past CI when a developer runs `pnpm install` locally and executes malicious install scripts before CI ever sees the lockfile diff. Local hook catches that.
- **No exclude list**: Tauri TS + Rust alignment would break on every Tauri release. Rejected.

## Consequences

- New package versions cannot be adopted for 7 days after release. For actively tracked ecosystems (CodeMirror, Svelte) this is a mild drag; for security CVE backports, 7 days is usually within the patch-availability window — the allowlist at `.dep-age-allowlist` remains the escape hatch when even 7 days is too long, and it requires a justification comment.
- The pre-commit hook is shell-bash-3.2-compatible (macOS default) and handles both BSD and GNU `date`. It is also quiet on fast-path — no staged `pnpm-lock.yaml` means early exit.
- Scoped packages (`@scope/name@version`) are parsed by splitting on the last `@`, handling leading `@` correctly.
- `pnpm audit --audit-level=moderate` and `cargo audit` run alongside as CVE detection — they catch known vulnerabilities rather than brand-new compromises.
- Re-evaluation triggers: pnpm changes the `minimumReleaseAge` option; a supply-chain attack slips through the 7-day window and we need to lengthen it; the allowlist grows unmanageable, indicating the default is too strict; we adopt a different package manager.
- **Amendment 2026-10-29: the window is 5 days (7200 minutes), not 7.** The
  maintainer shortened it to adopt releases sooner. The three layers are
  unchanged and enforce the new value together: `minimumReleaseAge: 7200`,
  `QUARANTINE_DAYS=5` in the pre-commit hook, and a `min_age=7200` floor in
  the `supply-chain-quarantine` CI job. The npm and cargo Dependabot cooldowns
  moved to 5 days to match. Day counts above describe the original decision.
- **Amendment 2026-11-01: the CI and config facts above drifted.** The three
  quarantine layers still hold; these details changed around them.
  - **No `dependency-review-action`.** The PR-only `dependency-review` job was
    removed in c5acf01a (2026-06-03), when the workflow started running on
    every push to `main`; the OSV scanner below took its place.
  - **The npm audit is quarantine-aware.** The `npm-audit` job
    (`.github/workflows/security.yml:23-36`) runs
    `node scripts/quarantine-aware-audit.mjs` (`security.yml:36`), not
    `pnpm audit --audit-level=moderate`. It wraps `pnpm audit` and fails on an
    advisory only when a patch within the installed major is older than the
    quarantine window; a patch still in quarantine, or one that needs a major
    bump, is a warning (`scripts/quarantine-aware-audit.mjs:5-44`). The audit
    and the quarantine no longer contradict each other.
  - **The `pnpm-workspace.yaml` snippet is not the complete file.** Beyond
    `minimumReleaseAge` (`pnpm-workspace.yaml:11`) and
    `minimumReleaseAgeExclude` (12-18), it sets `blockExoticSubdeps`,
    `strictDepBuilds` and `trustPolicy: no-downgrade` (34-36),
    `trustPolicyExclude` (50-51), `overrides` (53-79) and `allowBuilds`
    (87-88).
  - **Line references.** `supply-chain-quarantine` is `security.yml:55-81`
    (floor at 76), `cargo-audit` is `security.yml:38-53`, and the hook's window
    is `scripts/pre-commit-dep-age.sh:11`. The workflow runs on push to `main`,
    a daily schedule, `workflow_dispatch`, and `workflow_call` from
    `.github/workflows/pr.yml:78-88` for pull requests.
  - **Actions cooldown.** Dependabot holds GitHub Actions updates for 14 days
    (`.github/dependabot.yml:19-26`), next to the 5-day npm (3-10) and cargo
    (12-17) cooldowns from the 2026-10-29 amendment.
  - **Two more scanners.** `gitleaks-history` (`security.yml:83-101`) scans
    the full git history for secrets with `.gitleaks.toml`, on the schedule and
    `workflow_dispatch` only. `osv-scanner` (`security.yml:103-113`) runs
    Google's reusable OSV workflow over the full dependency tree, under the
    workflow's own triggers only, with `fail-on-vuln: false` (it reports to code
    scanning, it does not fail the run).
