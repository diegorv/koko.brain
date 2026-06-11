# Dependency Updates — June 2026

Update every outdated dependency (pnpm + cargo) one library at a time. For
each lib: update a single package, run the relevant test suite, and only if
everything is green, commit. Then move to the next. pnpm libraries first,
then cargo crates.

Candidate list discovered 2026-06-11 via `pnpm outdated` and
`cargo outdated --root-deps-only`. The 7-day `minimumReleaseAge` quarantine
from `pnpm-workspace.yaml` is enforced automatically by pnpm at resolution
time (cutoff ≈ 2026-06-04). No `.dep-age-allowlist` entries are needed — all
targets except two (see Notes) are already past the 7-day window.

## Per-lib procedure (non-negotiable, one commit per lib)

**pnpm lib:**
1. `pnpm update <pkg> --latest` (bumps the caret range in package.json + lockfile; honors `minimumReleaseAge`)
2. `pnpm check`
3. `pnpm vitest run`
4. If both green → `git add package.json pnpm-lock.yaml` → `git diff --cached --stat` → commit
5. If pnpm reports "no change" (version still quarantined) → skip, leave task unchecked, revisit after it ages out

**cargo crate:**
1. `cargo update -p <crate>` (Cargo.lock only; stays within Cargo.toml range)
2. `cargo test --manifest-path src-tauri/Cargo.toml`
3. If green → `git add src-tauri/Cargo.lock` → `git diff --cached --stat` → commit
4. Next crate

**Commit format** (mirror the established `chore(deps)` history, e.g. commit `4199aad`):

```
chore(deps): update <pkg> <old> → <new>

<Patch|Minor> update to <pkg> <dep|dev|crate> dependency.

pnpm check: OK
pnpm vitest run: <N> passed
```

(cargo commits: replace the test lines with `cargo test: <N> passed`.)

## Tasks — pnpm (low-risk data/icons first, runtime next, katex last)

- [ ] @doist/todoist-sdk 10.2.0 → 10.3.0
- [ ] @lucide/svelte 1.16.0 → 1.17.0 (dev)
- [ ] lucide-static 1.16.0 → 1.17.0
- [ ] simple-icons 16.20.0 → 16.22.0
- [ ] @primer/octicons 19.26.0 → 19.28.1  *(quarantine clears ~15:52Z 2026-06-11; skip if pnpm refuses)*
- [ ] @codemirror/autocomplete 6.20.2 → 6.20.3
- [ ] @lezer/markdown 1.6.3 → 1.6.4
- [ ] dayjs 1.11.20 → 1.11.21
- [ ] dompurify 3.4.5 → 3.4.8
- [ ] marked 18.0.4 → 18.0.5  *(quarantine clears ~14:17Z 2026-06-11; skip if pnpm refuses)*
- [ ] @xyflow/svelte 1.5.2 → 1.6.0
- [ ] katex 0.16.47 → 0.17.0  *(MINOR bump, outside `^0.16.47` — `--latest` edits package.json range; verify math rendering in tests)*

## Tasks — cargo

- [ ] chrono 0.4.44 → 0.4.45
- [ ] regex 1.12.3 → 1.12.4
- [ ] rusqlite 0.40.0 → 0.40.1
- [ ] sysinfo 0.39.2 → 0.39.3
- [ ] uuid 1.23.1 → 1.23.3

## Final verification (after all updates land)

- [ ] `bash scripts/e2e.sh` (single smoke run; E2E was not run per-lib in prior dep commits, so this is a one-time gate at the end)
- [ ] `mv tasks/todo/dependency-updates-2026-06.md tasks/done/`

## Notes

- **Test scope per lib follows CLAUDE.md rule 6**: a pnpm JS bump touches no Rust, so it runs only the frontend suite (`pnpm check` + `pnpm vitest run`); cargo bumps run only `cargo test`. This matches the existing dep-commit history (e.g. `4199aad` ran only the frontend suite).
- **katex is the only package.json range change.** `^0.16.47` does not allow `0.17.0`, so `pnpm update katex --latest` bumps the range to `^0.17.0`. All other pnpm targets are within their existing caret ranges; `--latest` still normalizes the range to the new floor, matching the repo's renovate-style history (package.json carets get bumped, see `@internationalized/date` at `^3.12.2`).
- **Two borderline-quarantine libs:** `marked@18.0.5` (published 06-04 14:17Z) and `@primer/octicons@19.28.1` (06-04 15:52Z) cross the 7-day line during the day on 2026-06-11. If `pnpm update --latest` lands a no-op because the version is still quarantined, leave the task unchecked and retry later — there is no intermediate version to fall back to, so pnpm keeps the current version rather than erroring.
- **@lucide/svelte / lucide-static** already resolve to 1.17.0 in the lockfile (package.json range is `^1.16.0`); the update mainly normalizes the package.json caret to `^1.17.0`. Confirm `git diff --cached` actually shows a change before committing; if nothing changed, skip the commit.
- **cargo crates** are all patch-level and semver-compatible (`cargo outdated` Compat == Latest), so only `Cargo.lock` changes — no `Cargo.toml` edits.
- **`@tauri-apps/*`** has no pending updates; the `minimumReleaseAgeExclude` entry is irrelevant this round.
- **Commit hygiene:** stage only the two pnpm files (or the single Cargo.lock) per commit; verify with `git diff --cached --stat` before each commit (CLAUDE.md rule 9).
