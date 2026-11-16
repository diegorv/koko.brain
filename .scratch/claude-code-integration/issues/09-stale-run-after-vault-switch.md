# 09: A run started before a vault switch leaks into the new vault's chat

**What to build:** A `claude_run_turn` that resolves after the chat was reset (vault switch) is cancelled instead of attached to the new chat, and a reply's code fence closed by a longer fence is recognized.

**Blocked by:** 03

**Files:** src/lib/features/claude-code/,src/tests/lib/features/claude-code/,src/lib/app/lifecycle/app-lifecycle.service.ts,src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first (service): reset the chat between `invoke('claude_run_turn')` and its resolution; after it resolves, the store has no run id, `claude_cancel_turn` was called with the returned id, and later events for that id change nothing (no `slashCommands`, error or `sessionId` from the old vault).
- [ ] `sendPrompt` (`src/lib/features/claude-code/claude.service.ts:43`) or `startRun` (`claude.logic.ts:84-89`) attaches a returned run id only while the chat still waits for one (`status === 'running' && runId === null`); otherwise it cancels that run.
- [ ] A vault open whose restore meets a turn sent in another vault (a switch that skipped `teardownVault`) does not keep that chat: test a send in B, a switch to C with no reset, then C's `restoreLastChat` and the turn's Done; the panel does not show B's chat and the next send neither writes into C nor resumes B's session.
- [ ] `wikilinksToLinks` (`claude.logic.ts:233`): a fence closed by a longer fence of the same character ends the code block (CommonMark), so wikilinks after it become links. Tested with three backticks opened and four closed.

## Problem

Issue 03's re-review (`.scratch/claude-code-integration/work/03/review-2.md`, findings 1 and 2), left open by a ship-only delivery:

1. **minor:** `resetClaude` sets the chat to `EMPTY_CHAT` on a vault switch, but if `claude_run_turn` resolves afterwards, `startRun(runId)` sets that id on the new chat. The old vault's events then apply: `Init` replaces `slashCommands`, an error shows in the panel, and `Result` stores the old vault's `sessionId`, so the next send in the new vault passes `--resume` with a session from another directory. Narrow window (dirty-tab save plus spawn).
2. **nit:** the fence pattern closes only on a fence of exactly the opening length (`^\1[ \t]*$`); a longer closing fence leaves the rest of the reply treated as code, so its wikilinks stay literal. Rare in model replies.
3. **minor** (claude-session-history Issue 02 review, finding 2): a turn sent while vault B is still initializing, followed by a B -> C switch that skips `teardownVault`, survives into C. `restoreLastChat(C)` (`claude.service.ts`, called from `initializeVault` Step 9 in `src/lib/app/lifecycle/app-lifecycle.service.ts`) is a no-op while a turn runs (`restoreChat` in `claude.logic.ts` returns the state unchanged), so after the turn's Done the panel shows B's chat in C, and the next send writes B's chat into C's `.kokobrain/claude/chats/` and resumes B's session from another directory. The Done itself writes nothing (`saveChatOnDone` checks the vault path). Possible fix: when the vault path at send differs from the vault being restored, cancel that run and reset the chat instead of skipping the restore. Small window: a send during init plus a double switch.
