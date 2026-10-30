# Discovery: Issue 01, gate by changed paths

## Files that change
- `.claude/workflows/implement-issue.js:47` BASE_RULES "full gate" bullet: point at the deliver step's classifier instead of restating the always-frontend gate.
- `.claude/workflows/implement-issue.js:126-141` deliver prompt: step 2 runs the gate the classifier picks (not "the full gate"); step 3 closing commit (and the pr comment) names that gate and why.
- `.claude/workflows/implement-issue.js` new constant `GATE_CLASSIFIER` near the configuration block: the one place the rule lives.
- `CLAUDE.md:310-311` "Implementation process": the Three-agents bullet ("only full-gate run") and the Gate bullet.

## Plan
1. The workflow script has no shell or filesystem access, so the classifier cannot run in JS on the branch diff. It is an awk program kept as a `String.raw` constant; the deliver prompt tells the agent to run `git diff --name-only main...HEAD | awk '<classifier>'` after its last change and to run what it prints. This makes the rule runnable on sample input (the Issue's Gate line).
2. Classes (first match wins per path):
   - rust: `src-tauri/`, `.cargo/`
   - frontend: `src/`, `static/`, `e2e/`, `scripts/` (tested by `src/tests/scripts/`, and `tauri-before-build.sh` drives the build), root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.js`, `vitest.config.ts`, `components.json`
   - docs: `.scratch/`, `help/`, `docs/`, any other `*.md`
   - anything else (`.claude/`, `.github/`, dotfiles): treated as frontend, and printed as "unclassified" so the closing commit says why.
3. Output: one `gate:` line (`rust+frontend`, `frontend`, `rust`, `docs`, `none`), the commands, and for `docs` the test files to run: `src/tests/help/` when `help/examples/` changed, plus every `src/tests` file that names a changed path's top two segments (`grep -rlF`); no gate when none.
4. Deliver: an Issue **Gate:** line that asks for more than the classifier picked is added on top (stricter wins). Closing commit names the gate, the classifier line and the override.

## Prior art
- No test harness for `.claude/workflows/`. Verification per the Issue's Gate line: extract the constant with node and run it on three sample path lists (markdown-only, `src/`, `src-tauri/`), plus a mixed and an unclassified one.
- Tests that read docs: `src/tests/help/*.test.ts` (help/examples), `event-calendar-keys.logic.test.ts:159` (help/documentation), `pipeline-dom.test.ts:316` (help/examples/markdown-editor-vault).

## Risks / defaults
- Unknown paths default to the frontend gate (safe). So this Issue itself (`.claude/workflows/*.js` + CLAUDE.md) gets the frontend gate unless the deliver agent follows the Gate line; the Gate line here is not stricter, so the frontend gate runs. Accepted: slower, never under-gated.
- The awk program must contain no single quote and no `${` (template literal); String.raw keeps the regex backslashes.
- Quick Reference rule 6 is left alone (the Issue scopes CLAUDE.md to the Implementation process bullet).
