# Kokobrain

A desktop note-taking app inspired by [Obsidian.md](https://obsidian.md) built with Svelte 5 + Tauri 2.

## Approach (Mandatory)
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.#

## Quick Reference (Most Common Mistakes)

1. **Never mock stores or `.logic.ts` files** in tests — use real stores, verify real state
2. **Always wrap service calls in `$effect` with `untrack()`** — see [docs/PATTERNS.md](docs/PATTERNS.md)
3. **Stores expose getters; a getter may return a module-level `$derived`** when memoizing pays off (Svelte cannot export derived state from a module). Do not migrate existing getters en masse; every computed getter must have a test. See [ADR-0034](docs/adr/0034-derived-allowed-behind-store-getters.md)
4. **Never remove code claiming "redundant"** without tracing the full execution chain first
5. **Use tabs, not spaces** — all code files use tabs for indentation. Exempt: the ts-rs output in `src/lib/contracts/generated/` (written by `cargo test`, never edited by hand)
6. **Run the right tests before EVERY commit** — match the tests to what you changed:
   - **Rust only** (`src-tauri/`): `cargo test --manifest-path src-tauri/Cargo.toml`
   - **Frontend only** (`src/`, styles, config, `package.json`/`pnpm-lock.yaml`): `pnpm check` + `pnpm vitest run`
   - **Both**: all three commands. No exceptions.
   - **`package.json` or `pnpm-lock.yaml` changed**: also `pnpm build`.
   - **IPC DTO change** (any `src-tauri/` type with `#[ts(export)]`, including its doc comments, which ts-rs emits as JSDoc) is **Both**: `cargo test` regenerates `src/lib/contracts/generated/`, which you commit and `pnpm check` type-checks. CI fails the Rust job when the committed bindings are stale. Run cargo from the checkout or worktree root (see [docs/DEV-ENVIRONMENT.md](docs/DEV-ENVIRONMENT.md) § Generated TS bindings).

   `pnpm build` runs locally only for dependency changes because vitest does not
   exercise the production bundler: a bump that moves `rolldown`, `vite` or
   `es-module-lexer` can pass `check` and `vitest` and still break the build. CI
   runs `pnpm build` on every PR, which also catches circular imports and
   adapter-static prerender failures.
7. **Services return errors via try/catch** — propagate to caller, never silently swallow
8. **Assert on rendered content** in E2E tests, not just container existence
9. **Verify staging area before every commit** — run `git diff --cached --stat` to ensure only intended files are staged. See [docs/COMMITS.md](docs/COMMITS.md)
10. **Commit after EVERY completed task in a plan** — each task = one commit, immediately after passing the relevant tests (see rule 6). NEVER batch multiple tasks into one commit. See [docs/COMMITS.md](docs/COMMITS.md)
11. **Check test files BEFORE committing** — for every source file you changed, find its test file and update/create it. NEVER commit source changes without test changes. `.svelte` components count as source. A `fix:` commit that changes app code without a test is rejected by the `commit-msg` hook and flagged by CI, unless it carries a `Test-Exempt: <reason>` trailer (for a fix no test can cover, e.g. CSS only). See [docs/TESTING.md](docs/TESTING.md) § Task Completion Gate and [docs/COMMITS.md](docs/COMMITS.md) § fix: commits need a test.

## Stack

- **Frontend:** Svelte 5 (runes), SvelteKit, TypeScript
- **UI:** shadcn-svelte (Tailwind CSS + bits-ui)
- **Backend:** Tauri 2 (Rust)
- **Package manager:** pnpm

## Commands

```bash
pnpm tauri dev        # Run app in dev mode (frontend + Tauri)
pnpm dev              # Run frontend only (no Tauri window)
pnpm build            # Build frontend for production
pnpm tauri build      # Full release build with bundle (.dmg) - shipping
pnpm tauri:build:fast # Local fast build: release-fast profile, no bundle/codesign
pnpm check            # TypeScript type checking
pnpm check:watch      # Type checking in watch mode
bash scripts/e2e.sh   # Run E2E tests (starts server, runs Playwright, cleans up)
```

**Build performance:** `.cargo/config.toml` requires `sccache` on PATH (`brew install sccache`); on a box without it, `RUSTC_WRAPPER=` (empty) disables the wrapper. Linux / remote-container prerequisites and the ONNX Runtime download workaround are in [docs/DEV-ENVIRONMENT.md](docs/DEV-ENVIRONMENT.md). The `beforeBuildCommand` is `bash scripts/tauri-before-build.sh`, which skips `pnpm build` when frontend inputs are unchanged; bypass with `KOKO_FORCE_FRONTEND_BUILD=1`.

**Worktrees:** give each git worktree its own `node_modules` with `pnpm install --frozen-lockfile --offline` (a few seconds, reused from the shared pnpm store). NEVER symlink `node_modules` from the main checkout: `svelte-kit sync` writes the generated tsconfig into `node_modules/$app/`, so through a symlink `pnpm check` in the worktree reports false errors and the worktree's route types overwrite the main checkout's. See [docs/DEV-ENVIRONMENT.md](docs/DEV-ENVIRONMENT.md) § Frontend gate.

**E2E tests:** ALWAYS run via `bash scripts/e2e.sh`. NEVER run `PLAYWRIGHT=true pnpm dev` manually — the script handles server lifecycle, port cleanup, and teardown automatically.

## Project Structure

```
src/lib/
  components/ui/      # shadcn-svelte components (generated via CLI)
  core/               # Essential: app-lifecycle, editor, filesystem, frontmatter, keybindings, layout,
                      #   markdown-editor, note-creator, settings, status-bar, trash, vault, zoom
  features/           # Built-in features: auto-organize, backlinks, canvas, collection,
                      #   command-palette, copy-block-link, deep-link, dock-badge, event-calendar,
                      #   file-history, file-icons, note-action-bar, note-list, outgoing-links,
                      #   properties, quick-switcher, rail-shell, search, tags, tasks, todoist-sync,
                      #   type-definitions
  plugins/            # Optional modules: calendar, graph-view, kanban, one-on-one, periodic-notes,
                      #   queryjs, quick-capture, table-of-contents, templates, word-count
  utils/              # Pure shared utilities (no state, no side effects)
```

### Layer Rules

| Layer | Rule |
|-------|------|
| `components/ui/` | shadcn-svelte generated components. Customized via Tailwind. |
| `core/` | App breaks without it. Stores + services + core components. |
| `features/` | Always loaded. Each feature is self-contained in its own folder. |
| `plugins/` | App works without them. Self-contained, could be toggled off. |
| `utils/` | No state, no side effects. Can be used by any layer. Known exception: `utils/debug.ts` (settings store, Sentry service) and `utils/app-channel.ts` (a settings type) import `core/`. |

These rules do not all hold today. The known violations (`core/` importing `features/` or `plugins/`, `features/` importing `plugins/`, and the two `utils/` files above importing `core/`) are debt listed in `src/tests/lib/architecture/layer-baseline.json` (ADR-0003, 2026-11-01 amendment). `layer-rules.test.ts` fails on any new violation, and the baseline only shrinks.

## Architecture Guidelines

Keep logic testable by separating pure functions from framework-coupled code. Extract files **when complexity justifies it** — don't create files preemptively.

| File type | When to create | Rules |
|-----------|---------------|-------|
| `.logic.ts` | When there's real pure logic (parsing, transformations, validations) | No framework imports. Only imports other `.logic.ts` or `utils/`. |
| `.store.svelte.ts` | When a feature needs shared reactive state | Reactive state only. May call `.logic.ts`. |
| `.service.ts` | When there are Tauri API calls that need to be mockable in tests | Can import `.logic.ts` + stores. |

Start simple, extract when it grows:

```
# Simple feature — start here
features/tags/
  Tags.svelte               # Component with inline logic

# As complexity grows — extract
features/backlinks/
  backlinks.logic.ts        # extractLinks(), findBacklinks()
  backlinks.store.svelte.ts # Shared reactive state
  backlinks.service.ts      # Tauri calls + store updates
  Backlinks.svelte          # UI component
```

For Svelte 5 reactive patterns (`$effect`/`untrack()`, PaneForge, store pattern), see [docs/PATTERNS.md](docs/PATTERNS.md).

## Pre-Change Checklist

Before modifying ANY service or store, answer these questions:

1. **What stores does this function write to?** List every `store.setX()` call.
2. **What computed getters depend on those stores?** Trace the reactive chain.
3. **What UI components read those computed getters?** Search for store imports in `.svelte` files.
4. **Does the existing test verify those computed getters?** If not, add tests BEFORE making changes.
5. **Can I write a failing test for the bug/change?** If yes, write it FIRST.

If you cannot answer #1-#3 with specific file paths and line numbers, you do NOT understand the code well enough to modify it safely.

## Removing or Refactoring Code — Mandatory Checks

**NEVER remove a function call, import, or code path claiming it's "redundant" or "already handled elsewhere" without FIRST tracing the full execution chain to PROVE it.** This is the single most dangerous class of bugs — silent regressions where something that used to work simply stops.

### Before removing any call or code path, you MUST:

1. **Trace all callers:** Search for every call site of the function. Understand what each one does and why it's there.
2. **Trace the replacement:** If you claim "X already handles this", read X's implementation line-by-line and confirm it actually performs the EXACT same side effects (store updates, API calls, event emissions). "Calls the same Rust command" ≠ "updates the same store."
3. **Check store consumers:** If the removed code updates a store, find every component that reads from that store. Verify they will still receive data through the alternative path.
4. **State the proof explicitly:** In your reasoning, write: "Function A at [file:line] updates [store/state]. The replacement path B at [file:line] also updates [store/state] via [mechanism]." If you cannot write this sentence with specific file paths and line numbers, DO NOT remove the code.

### Common traps:

- **Same Rust command ≠ same effect:** `buildIndex()` and `loadDirectoryTree()` both call `scan_vault`, but only `loadDirectoryTree` updates `fsStore.fileTree`. Removing one because "the other already scans" breaks the file explorer.
- **"Redundant" calls that target different stores:** Two functions may appear to do the same thing but write results to different stores consumed by different UI components.
- **Initialization order matters:** A call in `+page.svelte` that runs on user click vs. an `$effect` in `+layout.svelte` that runs reactively may have different timing. Don't assume one replaces the other.

### When modifying service orchestration (e.g., initializeVault):

5. **Write a regression test BEFORE changing:** Create a test that captures the current behavior. Run it to confirm it passes. Then make your change.
6. **Test the full initialization sequence, not just individual calls.**

## Error Handling

### Services (Tauri API calls)

- **Always use try/catch** around `invoke()` and Tauri plugin calls.
- **Propagate errors to the caller** — never silently swallow them. Let the component or orchestrator decide how to handle.
- **Log before re-throwing** when context would be lost: `console.error('buildIndex failed:', error)`.
- **Do not update stores with partial/corrupt data** on error. Either update on success or leave the store untouched.

### Components

- **User-facing errors** should be shown via toast notifications or inline error states — not `console.error` alone.
- **Network/file errors** that the user can't fix (e.g., corrupt file) should show a clear message explaining what happened and what to do.

## Debugging

**Logging is ALWAYS the first debugging tool.** When something isn't working, add log statements to inspect values, execution flow, and state BEFORE trying to reason about the problem or rewrite code. Do NOT waste time guessing — log it, see the actual data, then fix it.

### Log file location

All app logs are written to `~/Library/Logs/com.diegorv.kokobrain/` (one file per session, e.g. `2026-04-08_10-33-38.log`). Use `python3 scripts/log-watcher.py` to tail in real-time.

### Frontend logging

**Use `debug(tag, ...args)` and `error(tag, ...args)` from `#lib/utils/debug.js`** — NOT `console.log`. This is the idiom across the frontend:

- `debug()` writes to the session log file when Settings > Troubleshooting "Save debug log to file" (`settingsStore.debugLogToFile`) is on, and to the devtools console when "Debug mode" (`settingsStore.debugMode`) is on. Off by default, so it is safe to leave in.
- `error()` always logs to the console, reports to Sentry (`captureSentryException`), and writes to the log file when `debugLogToFile` is on.
- `timeAsync()` / `timeSync()` in the same file log an operation's elapsed time through `debug()`.

```typescript
import { debug, error } from '#lib/utils/debug.js';
debug('MY-TAG', `value=${someVar} state=${otherVar}`);
// Output in log file: [HH:mm:ss.SSS] [FRONT-END:MY-TAG] value=... state=...
error('MY-TAG', 'save failed:', err);
```

`appendLog(tag, ...args)` from `#lib/utils/log.service.js` is the raw writer underneath: it writes to the session log file whenever a log session is active, regardless of the settings. Use it for temporary debugging that must reach the file without toggling a setting, and for hot-path timing logs such as the LP-PROFILE lines (`core/profiling.ts`). `console.log` only goes to browser devtools (right-click → Inspect in the Tauri window) and is not persisted.

### Rust logging

- Use `debug_log(tag, msg)` from `utils::logger` — emits to stderr (terminal) and to the frontend via `tauri-debug-log` event (when debug mode is enabled).
- For low-level debugging: `eprintln!` outputs to the terminal where `pnpm tauri dev` is running.
- For structured logging: `RUST_LOG=debug pnpm tauri dev`.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the full testing guide: mock rules, assertion patterns, service/store test rules, E2E tests, and the task completion gate.

**Key rules (detailed examples in the doc):**

- **Mock only** Tauri APIs, side-effect services, and DOM services. **Never mock** stores or `.logic.ts` files.
- **Assert on real store state** and computed getters — never `.toHaveBeenCalled()` as the sole assertion.
- **Every test suite** must cover: happy path, empty/null input, and error handling.
- **Every computed getter** in a store must have a corresponding test.
- **Stores expose getters**; a getter may return a module-level `$derived` (ADR-0034). Under vitest a derived read through a getter is fresh right after a `$state` write, in the node and jsdom environments (`src/tests/lib/svelte-derived-sync*.test.ts`).
- **Task completion gate:** Run the relevant tests for what you changed (see Quick Reference rule 6) before any commit.

## Conventions

- **Indentation:** Tabs, not spaces. All code files use tabs for indentation.
- **Language:** English for all code, variables, and UI text.
- **Features:** Each feature/plugin is isolated in its own folder with components + logic.
- **Logic:** Extract to `.logic.ts` when there's real pure logic to test. No framework imports.
- **Stores:** `.svelte.ts` extension, getter-based access pattern, reactive state only (no business logic).
- **Services:** Functions that perform side effects (Tauri API calls) and update stores.
- **Components:** shadcn-svelte for UI primitives, custom only when needed (e.g., Tree View).
- **File naming:**

| File type | Convention | Example |
|-----------|-----------|---------|
| Components | PascalCase `.svelte` | `MarkdownEditor.svelte` |
| Stores | kebab-case `.store.svelte.ts` | `editor.store.svelte.ts` |
| Services | kebab-case `.service.ts` | `vault.service.ts` |
| Logic | kebab-case `.logic.ts` | `code-highlight.logic.ts` |
| Utilities | kebab-case `.ts` | `fuzzy-match.ts` |
| Types | kebab-case `.types.ts` | `canvas.types.ts` |

- **Imports:** Group in order: (1) external packages (`svelte`, `@codemirror`, `lucide-svelte`, etc.), (2) `#lib/` imports with an explicit extension, e.g. `#lib/core/editor/editor.service.js` (core → features → plugins), (3) local relative imports (`./`).
- **Comments:** Use JSDoc (`/** */`) on all exported functions, interfaces, interface fields, store methods, and state variables. Write in English.
- **Tests:** Every code change MUST include corresponding test updates (`src/tests/` for TypeScript, `src-tauri/tests/` for Rust).
- **Commits:** Use Conventional Commits with **full detailed descriptions** — every commit must include Context, Problem (if applicable), Solution, Behavior, and Files (with line ranges). No short-form commits. See [docs/COMMITS.md](docs/COMMITS.md) for the full format and examples.

## Performance Guidelines

These files hold correctness invariants as well as performance rules. Read the one that applies before changing or reviewing that code, and follow it. A one-line reminder to read it attaches by itself only when a session started in the same checkout reads or edits a file in its `paths`. The file itself never loads, and no reminder does not mean the rules do not apply. A relay-lite agent in `brain.worktrees/issue-NN` never gets the reminder and opens the file by hand, at the same path under the worktree root. Citations such as "CLAUDE.md Indexing 12" or "Live Preview rule 11" in comments, ADRs and Issues mean these files, with the same numbering.

- **Live Preview:** `docs/agents/live-preview-rules.md`. CodeMirror decorations, block and inline plugins, widgets, QueryJS block rendering.
- **Indexing & Watcher:** `docs/agents/indexing-watcher-rules.md`. Saves, `VaultIndex`, the watcher, `applyNoteChange`, path changes, index dedupe, search and semantic index updates, the vault entries cache.

## Documentation Index

| Document | Contents |
|----------|----------|
| [docs/PATTERNS.md](docs/PATTERNS.md) | Svelte 5 reactive patterns: `$effect`+`untrack()`, PaneForge conditional panes, store pattern |
| [docs/TESTING.md](docs/TESTING.md) | Full testing guide: mock rules, assertions, service/store tests, E2E, completion gate |
| [docs/COMMITS.md](docs/COMMITS.md) | Commit message convention with format and examples |
| [docs/DEV-ENVIRONMENT.md](docs/DEV-ENVIRONMENT.md) | Machine prerequisites for the test gates: sccache, rustc floor, Tauri Linux libs, ONNX Runtime download workaround for proxied containers |
| [docs/LIVE-PREVIEW.md](docs/LIVE-PREVIEW.md) | Live preview plugin architecture: plugin types, templates, core utilities |
| [docs/SEARCH.md](docs/SEARCH.md) | Search architecture: text / semantic / hybrid pipeline, chunking, models, RRF, versioning levers |
| [docs/adr/README.md](docs/adr/README.md) | Architecture Decision Records — decision log of foundational choices (stack, layers, patterns, testing, performance) |

## Implementation process

Implement `ready-for-agent` Issues from `.scratch/<feature>/issues/` with the relay-lite plugin: `/relay-lite:run <feature> [NN ...]` (set up by `/relay-lite:setup`, config in `.agent-relay-lite/config.json`). The old `/next-issue` command and `implement-brain-issue` workflow are removed; git history keeps them.

### Inside a relay-lite run

In a prompt that names a workflow role (build, review, fix, re-review, deliver), the role prompt decides these two things where it differs from this file:

- **Test scope:** the role's targeted checks replace Quick Reference rule 6 and the Task Completion steps. The full suite runs only in deliver.
- **Workflow inputs:** `.scratch/<feature>/work/NN/discovery.md` and `review*.md` are required, versioned inputs to subsequent workflow steps. `discovery.md` preserves the implementation plan and evidence for later agents. Review files are consumed by `review-lint`, `review-ticks`, `after-review`, and the fix, re-review and deliver steps. These files fall under the allowance for files written as input to another tool, rather than optional reports for the parent agent. When your role requires one, write and commit it before returning. A final chat message or structured result does not replace the file: the step is complete only when the required file exists and is committed.

Every other rule in this file still applies.

**Worktree removal at delivery:** the owner authorizes `relay deliver merge` to remove the Issue's worktree (`<repo>.worktrees/issue-NN-slug`) and delete its branch (`issue/NN-slug`), for every relay-lite delivery in this repository. This is not irreversible local destruction: the command removes them only after the squash commit is pushed to `origin/main`, so the work is already on `main`, and the only files lost are ignored and regenerable (`node_modules`, `.svelte-kit`, `test-results`). Run it without asking for a separate authorization.

### Post-delivery review (main session)

Relay-lite's deliver step fixes the findings of an APPROVED review and merges them, and nothing reviews that fix (`reReviews` loops only on CHANGES_REQUESTED). The main session closes the gap after every `/relay-lite:run` delivery:

1. **When:** right after the delivery, before any `git gc`. The squash leaves the branch sub-commits unreachable, so gc will eventually delete them.
2. **Range:** the squash commit body lists every sub-commit with its full SHA, in order. The range starts at the last sub-commit that adds a review file (`review.md` or `review-N.md`) under `.scratch/<feature>/work/NN/`: `git log -1 --diff-filter=A --format=%H <first sub-commit>^..<last sub-commit> -- '.scratch/<feature>/work/NN/review*.md'`. Do not match on commit subjects: review commits are not named consistently, and deliver's "review resolution" commits, which only edit the review file, come after the fixes. Review `git diff <that SHA> <last sub-commit SHA>`, leaving out the Issue's own `.scratch` bookkeeping. With no commit after it other than that bookkeeping, there is nothing to review.
3. **Skip** when that diff changes only tests, docs or copy (user-visible strings).
4. **Review:** one opus sub-agent, written to refute the diff (assume it is wrong), not to confirm it. A dead or null reviewer is not a pass: run it again.
5. **Findings** go into a follow-up `.scratch` Issue, or into an open Issue that already touches the same code.

Do not edit the generated launch scripts under `.agent-relay-lite/launch/` to change this.

## Plan Mode Workflow

**Every plan created in plan-mode MUST be saved under `.scratch/<feature-slug>/` as a task file** (see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)). This is non-negotiable.

### Lifecycle

1. **Create the plan file:** Save to `.scratch/<feature-slug>/plan-<YYYY-MM-DD>.md` (e.g., `.scratch/search-improvements/plan-2026-08-19.md`), creating the directory if needed.
2. **Work through tasks sequentially:** One at a time, in order.
3. **After EACH task, execute this exact sequence (NO EXCEPTIONS):**
   1. Mark the task `[x]` in the plan file.
   2. **Verify test coverage** for every source file you changed — see [docs/TESTING.md](docs/TESTING.md) § Task Completion Gate, Step 0.
   3. **Run the relevant tests** (see Quick Reference rule 6):
      - Rust only → `cargo test --manifest-path src-tauri/Cargo.toml`
      - Frontend only → `pnpm check` + `pnpm vitest run`
      - Both → all three
      - `package.json` or `pnpm-lock.yaml` changed → also `pnpm build`
   4. Stage only files related to this task (`git add <specific files>`).
   5. Run `git diff --cached --stat` to verify staging area.
   6. **Commit immediately** — one commit per task, using the full detailed format (Context, Problem, Solution, Behavior, Files with line ranges). See [docs/COMMITS.md](docs/COMMITS.md).
   7. **Only then** proceed to the next task.
4. **Close out when finished:** delete the plan file in its own closing commit (done is recorded in the commit message), matching the `.scratch` issue flow. If the plan produced follow-up issues, they stay as `.scratch/<feature-slug>/issues/<NN>-<slug>.md` until each is closed the same way.

### Task File Format

```markdown
# <Title>

<Brief description of what this plan accomplishes and why.>

## Tasks

- [ ] Task 1: Short description of what needs to be done
- [ ] Task 2: Short description of what needs to be done
- ...

## Notes

<Any relevant context, decisions made, or constraints.>
```

### Rules

- **One task at a time.** Do not skip ahead or work on multiple tasks in parallel.
- **COMMIT after EVERY task.** This is NON-NEGOTIABLE. Each completed task MUST be committed immediately — run the relevant tests (rule 6) → `git add <files>` → `git commit` with the full detailed format (Context, Problem, Solution, Behavior, Files with line ranges). NEVER batch multiple tasks into one commit. NEVER proceed to the next task without committing first. If you finish task 3 and realize you haven't committed tasks 1–2, STOP — you are violating this rule.
- **Update immediately.** The plan file under `.scratch/<feature-slug>/` must always reflect the current progress.
- **Never leave stale files.** If a plan is abandoned, delete it with a note in the closing commit message.
- **Task granularity matters.** Each task should be a concrete, completable unit of work — not a vague goal.

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (one `CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.
