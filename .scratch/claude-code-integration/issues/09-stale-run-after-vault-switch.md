# 09: A turn that survives a double vault switch keeps the old vault's chat, and a longer closing fence is missed

**What to build:** A vault open whose restore meets a turn sent in another vault cancels that turn and starts an empty chat, and a reply's code fence closed by a longer fence is recognized.

**Blocked by:** 03

**Files:** src/lib/features/claude-code/,src/tests/lib/features/claude-code/,src/lib/app/lifecycle/app-lifecycle.service.ts,src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] A vault open whose restore meets a turn sent in another vault (a switch that skipped `teardownVault`) does not keep that chat: failing test first, a send in B, a switch to C with no reset, then C's `restoreLastChat` and the turn's Done; the panel does not show B's chat and the next send neither writes into C nor resumes B's session.
- [ ] `wikilinksToLinks` (`claude.logic.ts:444`): a fence closed by a longer fence of the same character ends the code block (CommonMark), so wikilinks after it become links. Tested with three backticks opened and four closed.

## Problem

1. **minor** (claude-session-history Issue 02 review, finding 2): a turn sent while vault B is still initializing, followed by a B -> C switch that skips `teardownVault`, survives into C. `restoreLastChat(C)` (`claude.service.ts:122`, called from `initializeVault` Step 9 in `src/lib/app/lifecycle/app-lifecycle.service.ts:558`) is a no-op while a turn runs (`restoreChat` in `claude.logic.ts:241` returns the state unchanged), so after the turn's Done the panel shows B's chat in C, and the next send writes B's chat into C's `.kokobrain/claude/chats/` and resumes B's session from another directory. The Done itself writes nothing (`saveChatOnDone` checks the vault path). Possible fix: when the vault path at send differs from the vault being restored, cancel that run and reset the chat instead of skipping the restore. Small window: a send during init plus a double switch. New chat recovers, and no note is lost.
2. **nit** (Issue 03 re-review, `.scratch/claude-code-integration/work/03/review-2.md`, finding 2): the fence pattern (`CODE`, `claude.logic.ts:458`) closes only on a fence of exactly the opening length (`^\1[ \t]*$`); a longer closing fence leaves the rest of the reply treated as code, so its wikilinks stay literal. Rare in model replies.

## Notes

- **Triage (owner, 2026-11-16):** kept as needs-triage, not to be launched. Both cases are rare and recoverable; launch this only if the panel is seen showing one vault's chat in another, or the fence case comes up.
- **Delivery:** onto `mvp-claude` (relay-lite base `mvp-claude`), then merged into `preview`.

## Comments

- 2026-11-16: the late run id from Issue 03's re-review, finding 1 (a `claude_run_turn` that resolves after a reset attached its id to the new chat) is resolved by claude-session-history Issue 02 (746874e52): `sendPrompt` cancels that run (`claude.service.ts:84-87`), tested in `claude.service.test.ts:457` ("a run id that arrives after the chat was reset").
