# Kokobrain

A desktop note-taking app inspired by [Obsidian.md](https://obsidian.md) built with Svelte 5 + Tauri 2.

## Quick Reference (Most Common Mistakes)

1. **Never mock stores or `.logic.ts` files** in tests — use real stores, verify real state
2. **Always wrap service calls in `$effect` with `untrack()`** — see [docs/PATTERNS.md](docs/PATTERNS.md)
3. **Use getters, not `$derived`** in stores — `$derived` doesn't work in vitest; every computed getter must have a test
4. **Never remove code claiming "redundant"** without tracing the full execution chain first
5. **Use tabs, not spaces** — all code files use tabs for indentation
6. **Run the right tests before EVERY commit** — match the tests to what you changed:
   - **Rust only** (`src-tauri/`): `cargo test --manifest-path src-tauri/Cargo.toml`
   - **Frontend only** (`src/`, styles, config): `pnpm check` + `pnpm vitest run`
   - **Both**: all three commands. No exceptions.
7. **Services return errors via try/catch** — propagate to caller, never silently swallow
8. **Assert on rendered content** in E2E tests, not just container existence
9. **Verify staging area before every commit** — run `git diff --cached --stat` to ensure only intended files are staged. See [docs/COMMITS.md](docs/COMMITS.md)
10. **Commit after EVERY completed task in a plan** — each task = one commit, immediately after passing the relevant tests (see rule 6). NEVER batch multiple tasks into one commit. See [docs/COMMITS.md](docs/COMMITS.md)
11. **Check test files BEFORE committing** — for every source file you changed, find its test file and update/create it. NEVER commit source changes without test changes. See [docs/TESTING.md](docs/TESTING.md) § Task Completion Gate.

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
pnpm check            # TypeScript type checking
pnpm check:watch      # Type checking in watch mode
bash scripts/e2e.sh   # Run E2E tests (starts server, runs Playwright, cleans up)
```

**E2E tests:** ALWAYS run via `bash scripts/e2e.sh`. NEVER run `PLAYWRIGHT=true pnpm dev` manually — the script handles server lifecycle, port cleanup, and teardown automatically.

## Project Structure

```
src/lib/
  components/ui/      # shadcn-svelte components (generated via CLI)
  core/               # Essential: app-lifecycle, editor, file-explorer, filesystem, keybindings,
                      #   layout, markdown-editor, note-creator, settings, status-bar, trash, vault, zoom
  features/           # Built-in features: auto-move, backlinks, bookmarks, canvas, collection,
                      #   command-palette, copy-block-link, deep-link, file-history, file-icons,
                      #   folder-notes, outgoing-links, properties, quick-switcher, search, tags, tasks, views
  plugins/            # Optional modules: calendar, encrypted-notes, graph-view, kanban, one-on-one,
                      #   periodic-notes, queryjs, quick-note, templates, terminal, word-count
  utils/              # Pure shared utilities (no state, no side effects)
```

### Layer Rules

| Layer | Rule |
|-------|------|
| `components/ui/` | shadcn-svelte generated components. Customized via Tailwind. |
| `core/` | App breaks without it. Stores + services + core components. |
| `features/` | Always loaded. Each feature is self-contained in its own folder. |
| `plugins/` | App works without them. Self-contained, could be toggled off. |
| `utils/` | No state, no side effects. Can be used by any layer. |

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

**`console.log` is ALWAYS the first debugging tool.** When something isn't working, add `console.log` statements to inspect values, execution flow, and state BEFORE trying to reason about the problem or rewrite code. Do NOT waste time guessing — log it, see the actual data, then fix it.

- **Frontend (webview):** `console.log` outputs to the browser devtools (right-click → Inspect in the Tauri window).
- **Rust (backend):** Use `println!` or `eprintln!` — output goes to the terminal where `pnpm tauri dev` is running. For structured logging, use `RUST_LOG=debug pnpm tauri dev`.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the full testing guide: mock rules, assertion patterns, service/store test rules, E2E tests, and the task completion gate.

**Key rules (detailed examples in the doc):**

- **Mock only** Tauri APIs, side-effect services, and DOM services. **Never mock** stores or `.logic.ts` files.
- **Assert on real store state** and computed getters — never `.toHaveBeenCalled()` as the sole assertion.
- **Every test suite** must cover: happy path, empty/null input, and error handling.
- **Every computed getter** in a store must have a corresponding test.
- **Use getters, not `$derived`** in stores — `$derived` doesn't update synchronously in vitest.
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

- **Imports:** Group in order: (1) external packages (`svelte`, `@codemirror`, `lucide-svelte`, etc.), (2) `$lib/` imports (core → features → plugins), (3) local relative imports (`./`).
- **Comments:** Use JSDoc (`/** */`) on all exported functions, interfaces, interface fields, store methods, and state variables. Write in English.
- **Tests:** Every code change MUST include corresponding test updates (`src/tests/` for TypeScript, `src-tauri/tests/` for Rust).
- **Commits:** Use Conventional Commits with **full detailed descriptions** — every commit must include Context, Problem (if applicable), Solution, Behavior, and Files (with line ranges). No short-form commits. See [docs/COMMITS.md](docs/COMMITS.md) for the full format and examples.

## Documentation Index

| Document | Contents |
|----------|----------|
| [docs/PATTERNS.md](docs/PATTERNS.md) | Svelte 5 reactive patterns: `$effect`+`untrack()`, PaneForge conditional panes, store pattern |
| [docs/TESTING.md](docs/TESTING.md) | Full testing guide: mock rules, assertions, service/store tests, E2E, completion gate |
| [docs/COMMITS.md](docs/COMMITS.md) | Commit message convention with format and examples |
| [docs/LIVE-PREVIEW.md](docs/LIVE-PREVIEW.md) | Live preview plugin architecture: plugin types, templates, core utilities |

## Plan Mode Workflow

**Every plan created in plan-mode MUST be saved to `tasks/todo/` as a task file.** This is non-negotiable.

### Lifecycle

1. **Create the plan file:** Save to `tasks/todo/<name>.md` (e.g., `feature-search-improvements.md`).
2. **Work through tasks sequentially:** One at a time, in order.
3. **After EACH task, execute this exact sequence (NO EXCEPTIONS):**
   1. Mark the task `[x]` in the plan file.
   2. **Verify test coverage** for every source file you changed — see [docs/TESTING.md](docs/TESTING.md) § Task Completion Gate, Step 0.
   3. **Run the relevant tests** (see Quick Reference rule 6):
      - Rust only → `cargo test --manifest-path src-tauri/Cargo.toml`
      - Frontend only → `pnpm check` + `pnpm vitest run`
      - Both → all three
   4. Stage only files related to this task (`git add <specific files>`).
   5. Run `git diff --cached --stat` to verify staging area.
   6. **Commit immediately** — one commit per task, using the full detailed format (Context, Problem, Solution, Behavior, Files with line ranges). See [docs/COMMITS.md](docs/COMMITS.md).
   7. **Only then** proceed to the next task.
4. **Move to done when finished:** `mv tasks/todo/<name>.md tasks/done/`.

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
- **Update immediately.** The file in `tasks/todo/` must always reflect the current progress.
- **Never leave stale files.** If a plan is abandoned, delete it or move it to `tasks/done/` with a note.
- **Task granularity matters.** Each task should be a concrete, completable unit of work — not a vague goal.
