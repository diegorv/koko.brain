# 01: The implement workflow runs the gate that matches what changed

**What to build:** The fix-and-deliver step of `.claude/workflows/implement-issue.js` (`implement-brain-issue`) picks the gate from the paths the branch changed against `main`, as CLAUDE.md Quick Reference rule 6 already describes, instead of always running the full frontend gate:
- only `src-tauri/` changed -> `cargo test --manifest-path src-tauri/Cargo.toml`
- frontend inputs changed (`src/`, styles, config, `package.json` / `pnpm-lock.yaml`) -> `pnpm check` + `pnpm vitest run` + `pnpm build`
- both -> all four
- only docs, `.scratch/`, `help/` or other markdown -> the tests that read the changed files (for `help/examples/`: `src/tests/help/`), or no gate when none read them; say which in the closing commit
An Issue's own **Gate:** line still wins when it is stricter. The rule lives in one place in the workflow (a small classifier the deliver prompt uses), and the build step's targeted checks are unchanged.

**Context:** 2026-10-29: six `help-examples` Issues that changed only markdown each ran `pnpm check` + `pnpm vitest run` + `pnpm build` in parallel with a code Issue; load average reached 65 on a 10-core Mac and the owner's machine became very slow. The owner asked why markdown-only changes ran the gate at all.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `.claude/workflows/implement-issue.js` (modify; deliver step gate instructions)
- `CLAUDE.md` (modify; "Implementation process" Gate bullet, if it restates the always-full gate)

**Gate:** no app code changes; verify by running the classifier (or a dry-run of the deliver prompt text) on three sample diffs: markdown-only, `src/` change, `src-tauri/` change

- [ ] The deliver step selects the gate from the changed paths per the table above
- [ ] An Issue's explicit Gate line overrides the default when stricter
- [ ] The closing commit message names the gate that ran and why

## Comments

- 2026-10-30 06:35 — discovery — classifier as an awk constant in implement-issue.js, run by deliver on `git diff --name-only`; unknown paths default to the frontend gate — (this commit)
- 2026-10-30 06:38 — implement — GATE_CLASSIFIER in implement-issue.js drives the deliver gate; dry-run on markdown-only, src/, src-tauri/, mixed and unclassified samples gives docs/frontend/rust/rust+frontend/frontend; docs tests it selects pass (5 files, 110 tests) — 03efa182
- 2026-10-30 06:41 — review — CHANGES_REQUESTED: docs test list not split-safe in zsh (medium), .tool-versions under-gated (low), path list duplicated in CLAUDE.md (low) — (this commit)
