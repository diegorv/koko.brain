# Commit Convention

Only stage files actually changed for the task — do NOT use `git add -A` or `git add .`.

## Staging Discipline

Before every commit, follow this exact sequence:

1. **Run `git status`** to check for already-staged files from previous work.
2. **If there are staged files not related to the current commit**, unstage them with `git reset HEAD <file>` (this is safe — changes stay in the working directory, only the staging is undone).
3. **Stage only the files for this commit** by name: `git add path/to/file1 path/to/file2`.
4. **Run `git diff --cached --stat`** to verify that ONLY the intended files are staged.
5. **Then commit.**

Never assume the staging area is clean. Unrelated files staged from previous operations will silently get included in the next commit.

> **Note:** `git reset HEAD` does NOT delete changes — it only moves files from "staged" back to "unstaged". Your work-in-progress for other tasks remains intact in the working directory.

## Atomic Commits per Task (Plan Mode)

**When working through a plan (`tasks/todo/*.md`), EVERY completed task MUST be committed immediately as its own commit.** This is the single most important commit rule.

### Post-Task Commit Sequence

After finishing each task in a plan, execute this exact sequence BEFORE starting the next task:

1. **Mark the task `[x]` in the plan file** (`tasks/todo/<name>.md`).
2. **Verify test coverage** for every source file you changed — see [docs/TESTING.md](TESTING.md) § Task Completion Gate, Step 0.
3. **Run the relevant tests** based on what changed:
   - **Rust only** (`src-tauri/`): `cargo test --manifest-path src-tauri/Cargo.toml`
   - **Frontend only** (`src/`, styles, config): `pnpm check` + `pnpm vitest run`
   - **Both**: all three commands
5. **Stage only files related to this task** (see Staging Discipline above).
6. **Commit** using the full detailed format (Context, Problem, Solution, Behavior, Files with line ranges) — see Commit Message Format below.
7. **Only then** proceed to the next task.

### Why This Matters

- Each task is a reviewable, revertable unit of work.
- If task 5 breaks something, you can revert it without losing tasks 1–4.
- Batching multiple tasks into one commit makes debugging and reverting impossible.

### Anti-Patterns (NEVER do these)

- Completing tasks 1–3, then making a single commit for all of them.
- Finishing the entire plan and committing everything at the end.
- Skipping tests between tasks (running vitest for Rust-only changes, or skipping `cargo test` for Rust changes).
- Committing task N's files together with task N+1's files.

## Prefixes (Conventional Commits)

`feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `perf`

## Commit Message Format

**ALL commits — trivial or not — MUST use the full detailed format.** No exceptions, no shortcuts. Every commit is a historical record that must be self-explanatory to anyone reading it in the future.

```
<type>(<scope>): <short summary>

Context: Why this change was needed — what motivated it, what the user/developer
was trying to accomplish, and any relevant background.

Problem: What was broken, missing, or suboptimal. Describe the symptoms, not just
the root cause. (Omit only if purely additive — e.g., a brand new feature with no
prior behavior.)

Solution: What was done to address it — the approach taken, why this approach was
chosen over alternatives, and any trade-offs made.

Behavior: What changed from the user/developer perspective. Describe the before
and after — what used to happen vs. what happens now. For new features, describe
the new behavior in detail.

Files:
- path/to/file.ts:L-L: What changed in this file and why
- path/to/other-file.ts:L-L: What changed in this file and why
```

### Rules

1. **Every field is mandatory** — Context, Solution, Behavior, and Files must always be present. Problem can be omitted ONLY for purely additive features.
2. **Files section must list ALL changed files** with line ranges and a description of what changed in each.
3. **Be specific, not vague** — "Fixed the bug" is useless. "Replaced recursive scan with iterative traversal to prevent stack overflow on vaults with 500+ nested folders" is useful.
4. **Scope is required** — use the feature/module name in parentheses: `fix(vault)`, `feat(search)`, `refactor(editor)`.
5. **Summary line under 72 characters** — details go in the body, not the subject.

### Examples

#### Bug Fix

```
fix(vault): prevent infinite loop in vault initialization

Context: Users reported the app freezing on startup with large vaults.
The initialization sequence in VaultManager was being triggered multiple
times due to unintended reactive dependencies.

Problem: The $effect watching vaultStore.isOpen was reading settingsStore
internally, creating an unintended reactive dependency loop. Every time
settingsStore updated (which happens during init), the effect re-fired,
calling initializeVault() again in an infinite cycle.

Solution: Extracted reactive reads (vaultStore.isOpen, settingsStore.config)
before the service call and wrapped initializeVault() in untrack() to
prevent Svelte from tracking internal store reads as dependencies.
This ensures the effect only re-runs when its explicit dependencies change.

Behavior: Previously, opening a large vault caused the app to freeze
indefinitely as initializeVault() ran in a loop. Now, vault initialization
runs exactly once when the vault is opened, regardless of vault size.

Files:
- src/lib/core/vault/VaultManager.svelte:42-58: Wrapped initializeVault
  in untrack(), extracted reactive reads before the async call
- src/tests/core/vault/vault-init.test.ts:1-35: Added regression test
  verifying initializeVault is called exactly once per vault open
```

#### New Feature

```
feat(search): add fuzzy matching to file search

Context: Users with large vaults (1000+ files) requested the ability to
find files without typing the exact name. The current search required
exact substring matches, making it slow to navigate large vaults.

Solution: Integrated the fzf-inspired fuzzy matching algorithm from
the fuzzy-match utility. The search input now scores results by
character proximity and highlights matched characters in the results
list. Results are sorted by score descending, with ties broken by
file path length (shorter paths first).

Behavior: Typing "vlt srv" now matches "vault.service.ts" and ranks
it above "vault-server-config.ts". Matched characters are highlighted
in bold. Exact substring matches still score highest.

Files:
- src/lib/features/search/search.logic.ts:12-45: Added fuzzyMatch()
  scoring function with character proximity weighting
- src/lib/features/search/search.store.svelte.ts:8-15: Added
  sortedResults getter that sorts by fuzzy score
- src/lib/features/search/SearchResults.svelte:22-38: Added character
  highlighting using <mark> tags on matched indices
- src/lib/features/search/search.service.ts:30-42: Replaced exact
  substring filter with fuzzyMatch() scoring and threshold cutoff
- src/tests/features/search/search.logic.test.ts:1-60: Tests for
  fuzzyMatch scoring, edge cases (empty input, no match, exact match)
```

#### Refactor

```
refactor(editor): extract markdown parsing into logic file

Context: The MarkdownEditor component had grown to 400+ lines with
inline parsing logic mixed into the Svelte template, making it
difficult to test the parsing behavior independently.

Solution: Extracted all pure parsing functions (parseHeadings,
parseLinks, parseFrontmatter) into a dedicated editor.logic.ts file.
The component now imports and calls these functions, keeping only
UI-related logic inline.

Behavior: No user-visible changes. Editor behavior is identical.
Developer experience improves: parsing logic is now independently
testable without mounting the Svelte component.

Files:
- src/lib/core/editor/editor.logic.ts:1-120: New file with extracted
  parseHeadings(), parseLinks(), parseFrontmatter() functions
- src/lib/core/editor/MarkdownEditor.svelte:45-52,89-95,130-138:
  Replaced inline parsing with imports from editor.logic.ts
- src/tests/core/editor/editor.logic.test.ts:1-85: New test suite
  covering all three parsing functions with edge cases
```
