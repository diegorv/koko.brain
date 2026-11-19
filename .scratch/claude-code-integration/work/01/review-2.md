VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | ClaudeCodeSection.svelte:66-69 drives the Switch prop from `settingsStore.claudeCode.enabled \|\| confirmingEnable`, so Cancel moves the prop true -> false and the bound switch resets. ClaudeCodeSection.test.ts:152 asserts `aria-checked="true"` after Enable; :166-171 asserts `"false"` after Cancel and that the next click reopens the notice. I reverted the one line temporarily and the Cancel test failed with `expected 'true' to be 'false'`, then restored it; with the fix the file passes. One narrower path of the same class remains, see new finding 1. |
| 2 | minor | rejection stands | No change asked by the review: out of Issue 01 scope, tracked on mvp-claude by Issue 02 (b3d086c72) and Issue 04 (810cc135d). |
| 3 | minor | resolved | claude.rs:171-174, doc comment on `run_with_timeout` states the timeout covers only the child and `wait_with_output` blocks while a leftover process holds the pipe. Comment only, no behavior change. |
| 4 | minor | resolved | help/documentation/19-settings.md:9 lists "Integrations (Todoist, Claude Code)"; new "## Claude Code" section (lines 264-273) with `claudeCode.enabled`, `claudeCode.binaryPath`, the status row and Check again, matching the component labels and the Rust candidate list. settings-copy.test.ts and sync-wiki-docs.test.ts pass. |
| 5 | nit | resolved | claude.rs:55-67: `login_shell()` delegates to pure `shell_from_env(Option<OsString>)`; claude_test.rs:249-254 covers set, empty and unset. |

## Acceptance criteria re-checked

- [met] Resolution order: the Settings override path when set, else `$SHELL -lc 'command -v claude'` (fallback `/bin/zsh`), else the first executable of `~/.local/bin/claude`, `~/.claude/local/claude`, `/opt/homebrew/bin/claude`, `/usr/local/bin/claude`, else not found. The override must be an existing executable file, otherwise the status says so. — the refactor keeps the `$SHELL`/`/bin/zsh` behavior (claude.rs:55-67) and now tests it (`login_shell_uses_shell_env_and_falls_back_to_zsh`); `cargo test --test commands_test claude`: 16 passed, 0 failed.
- [met] Settings: `claudeCode.enabled` (default `false`) and `claudeCode.binaryPath` (default empty) persist through the settings store; section has a "Check again" button; tests cover the store getters and the section render for installed and missing. — the fixes do not touch the store or service; ClaudeCodeSection.test.ts (installed, missing, Check again) passes; documented in 19-settings.md.
- [met] Enabling the toggle for the first time shows two sentences: note content goes to Anthropic through the user's Claude Code account, and the agent runs with full permissions (any shell command, any file the user can write, no prompt). — notice unchanged (ClaudeCodeSection.svelte:73-86); the switch now reflects the stored state after Enable and after Cancel (tests above). New finding 1 is an edge of the switch display, not of the two sentences.

## Findings

1. **major** src/lib/features/claude-code/ClaudeCodeSection.svelte:42-48 (with :66-69) — Clicking the switch a second time while the consent notice is open, then choosing Enable, leaves the feature ON with the switch showing OFF. The second click flips the switch's internal bound state to false and calls `setEnabled(false)`, which writes `enabled: false` (no change) but leaves `confirmingEnable` true, so the prop stays `true` and does not re-sync; Enable then sets `enabled: true`, and the prop stays `true -> true`, so the switch keeps showing OFF. Probe (temporary jsdom test, deleted after): after click, click: `aria-checked="false"`, notice still open; after Enable: `enabled=true`, `aria-checked="false"`. The user did consent (clicked Enable), but the full-permissions toggle then displays OFF while the agent is enabled. Fix: in `setEnabled`, when `!enabled && confirmingEnable`, set `confirmingEnable = false` and return (a second click on the switch cancels the notice, so the prop moves true -> false and matches the switch); add a test: click, click, assert the notice closed, `aria-checked="false"` and `privacyAcknowledged === false`.
2. **nit** src-tauri/tests/commands/claude_test.rs:251 — the first `assert_eq!` line is about 130 characters, past rustfmt's default width; `cargo fmt` would wrap it. Not gated in CI; reformat if you touch the file.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/claude-code src/tests/lib/core/settings/settings-copy.test.ts src/tests/scripts/sync-wiki-docs.test.ts`: 4 files, 30 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test commands_test claude`: 16 passed, 0 failed.
- Reverting the Switch prop line makes `Cancel leaves the feature off and the notice unacknowledged` fail, so the new assertions test the fix.
- No test weakened or deleted; no layer-baseline entry or composition root added; the fix diff touches only the files named by the previous findings plus the review file. The full suite is deliver's to run.

## Resolution

1. **major, fixed.** `setEnabled` in ClaudeCodeSection.svelte:42-48 now closes the notice and returns when called with `false` while `confirmingEnable` is true, so the Switch prop moves true -> false and matches the bound state. New test `a second click on the switch while the notice is open cancels it` (click, click; notice closed, `aria-checked="false"`, `enabled` and `privacyAcknowledged` false) failed before the change and passes after.
2. **nit, not changed.** The fix does not touch claude_test.rs, and the review asks for the reformat only when the file is touched; formatting is not gated in CI.
