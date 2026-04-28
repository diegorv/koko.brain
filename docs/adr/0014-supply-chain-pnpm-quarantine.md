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

- New package versions cannot be adopted for 14 days after release. For actively tracked ecosystems (CodeMirror, Svelte) this is a mild drag; for security CVE backports, 14 days could be too long — the allowlist at `.dep-age-allowlist` is the escape hatch, and it requires a justification comment.
- The pre-commit hook is shell-bash-3.2-compatible (macOS default) and handles both BSD and GNU `date`. It is also quiet on fast-path — no staged `pnpm-lock.yaml` means early exit.
- Scoped packages (`@scope/name@version`) are parsed by splitting on the last `@`, handling leading `@` correctly.
- `pnpm audit --audit-level=moderate` and `cargo audit` run alongside as CVE detection — they catch known vulnerabilities rather than brand-new compromises.
- Re-evaluation triggers: pnpm changes the `minimumReleaseAge` option; a supply-chain attack slips through the 14-day window and we need to lengthen it; the allowlist grows unmanageable, indicating the default is too strict; we adopt a different package manager.
