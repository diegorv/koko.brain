# Validation: transcript format, real data and resume behavior (feature B)

Adversarial check of research files 01 to 04 for session history across restarts. claude 2.1.325, branch `mvp-claude`. Structure only: no message text, titles, prompts or tool output appears here. `~` is the home dir, `<vault>` the owner's main vault.

## Method

- **Bundle.** `strings -n 6 ~/.local/share/claude/versions/2.1.325 > /tmp/vfmt/b.txt` (79,041,192 bytes), searched with `grep -ao` and `python3 -I` regexes. Bundle citations name the minified identifier or literal; they change between releases.
- **Real data.** `python3 -I` scripts over `~/.claude/projects/<encoded vault>/` and its 3 sibling dirs that print only counts, key names, lengths and type names.
- **Docs.** Re-fetched https://code.claude.com/docs/en/sessions and https://code.claude.com/docs/en/claude-directory on 2026-11-15.
- **Env.** Printed only the *names* of `CLAUDE*`/`ANTHROPIC*` variables in (a) this agent's env and (b) a login shell started the way `shell_env.rs` starts it (`env -i HOME USER LOGNAME SHELL TMPDIR PATH=/usr/bin:/bin:/usr/sbin:/sbin` + the 4 `INJECTED` vars, `zsh -l -i -c /usr/bin/env`).
- I ran no model-calling probe. The free initialize probe was not needed: none of the claims checked here depends on it.

## Main finding: probe 04 ran in a different environment from the panel's

This agent's env (and so, very likely, the scout's env for 04) has `CLAUDE_CODE_ENTRYPOINT=t3-code`, `CLAUDE_AGENT_SDK_VERSION`, `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SESSION_ID`, `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` set (names only, printed with `env | grep`). Probe 04 removed only `CLAUDECODE` (`env -u CLAUDECODE`, 04 line 3). The panel's emulated login-shell capture prints **zero** `CLAUDE*`/`ANTHROPIC*` names, and `turn_command` starts from `env_clear()` (`src-tauri/src/commands/claude/turn.rs:123`, `shell_env.rs:46,60`).

Why it matters:
- Bundle `function N(e){if(i.CLAUDE_CODE_ENTRYPOINT){... if(i.CLAUDE_CODE_ENTRYPOINT==="cli"&&e)i.set(...,"sdk-cli");return} ... i.set("CLAUDE_CODE_ENTRYPOINT",e?"sdk-cli":"cli")}`. An inherited value other than `cli` is kept, so 04's probe sessions were almost certainly written as `t3-code`, not `sdk-cli`.
- Title generation for print mode is skipped by `function zNi(){return tfs()||(i.CLAUDE_CODE_ENTRYPOINT==="sdk-cli"||i.CLAUDE_CODE_REMOTE_SESSION_ID!==void 0)&&!process.env.CLAUDE_AGENT_SDK_VERSION&&!_()&&b("tengu_quizzical_thimble",!0)}`, used as `lbi(Ya,ct||zNi())`. That latches "title already attempted" for `sdk-cli` without an SDK version. So 04's observation of `ai-title` and `mode` lines in a `-p` transcript (04 line 43) reflects the T3/SDK env, **not** what a panel turn writes. The two real `sdk-cli` 2.1.325 files in the vault dir have neither (recount below).
- `zNi` also reads a server-side gate (`b("tengu_quizzical_thimble",!0)`, default true). Title behavior for `-p` can therefore change without a CLI release. That fits 332 of 333 `sdk-cli` 2.1.270 files having `ai-title` while 0 of 2 at 2.1.325 do. The cause of that change is UNVERIFIED (2.1.270 is not installed).
- The connector warning on stderr in every 04 run comes from `ANTHROPIC_AUTH_TOKEN` in that env. The panel env has no such var, so the warning probably does not appear there (inferred, not run).
- 04's resume, fork, persistence and error results concern id lookup and file writes. I found nothing that gates them on the entrypoint, so I accept them, but they were not observed with `entrypoint: "sdk-cli"`.

Rule for any later probe: launch `claude` with the panel's env (`env -i` plus the captured login env), never with this agent's env.

## Verdicts

| # | Claim (source) | Verdict | Evidence |
|---|---|---|---|
| 1 | Dir name = `cwd.replace(/[^a-zA-Z0-9]/g,"-")`, cut at 200 + `-` + base36 hash (01) | Confirmed (hash function: likely) | Bundle: `function k(e){return e.replace(/[^a-zA-Z0-9]/g,"-")}`, `var vDe=200`, `function WH(e){let n=k(e);if(n.length<=vDe)return n;return\`${n.slice(0,vDe)}-${Oe(e)}\`}`, `function Oe(e){return Math.abs(AX(e)).toString(36)}`, all in one chunk at offset ~20.69M. `AX` (31-hash) is defined in another chunk (~17.7M). Docs ("Where transcripts are stored") state the same rule and "appends a hash of the full path". Longest of 672 dir names: 149 chars, so the branch is unseen on disk. |
| 2 | The cwd is canonicalized with realpath first (01, 04) | Confirmed | Bundle: `function ts(e){let s=Cr(e??"."),r;try{r=_r(s)}catch{r=s}return cn(r)}` with `import{realpathSync as _r}from"fs"`, then `ve(e,s)` returns `Q0(r)` or `WH(r)`. On disk: 04 saw `-private-var-...` for a `/var/...` temp dir. |
| 3 | `eor()` override is unknown (01 open question) | Resolved | Bundle: `eor=p(()=>fut()\|\|Nfe()?rgi(f()):void 0,S)`, `f()` = `process.env.CLAUDE_CODE_PROJECT_DIR_NAME`, `rgi` validates `/^[A-Za-z0-9_-]{1,64}$/`, `fut()` = `process.env.CLAUDE_CONFIG_DIR`. The sessions docs ("Name the project directory yourself") say the same: it is ignored unless `CLAUDE_CONFIG_DIR` is set. |
| 4 | Config root = `$CLAUDE_CONFIG_DIR` or `~/.claude` (01) | Confirmed | Bundle: `var Ge=p(()=>(fut()??u(D(),".claude")).normalize("NFC"),fut)`. The panel env has no `CLAUDE_CONFIG_DIR` (emulated capture). |
| 5 | One content block per `assistant` line, lines of one reply share `message.id` (01) | Confirmed, one detail wrong | Recount: 1,615 of 1,615 assistant lines have a 1-element `content`. Lines per `message.id`: 1 (237), 2 (330), 3 (188), 4 (17), 5 (4), 6 (5), and 7, 8, 10, 11 (1 each). 01's "up to 6" is wrong: the max is 11. |
| 6 | Vault dir: 31 files, 74,776 / 495,655 / 4,380,713 B, 9,487 lines (03) | Confirmed | Recount gives identical numbers. Lines per file 26 / 57 / 2,114, 0 unparsable, 0 leading NUL, 0 files without a final newline. |
| 7 | Entry points: `cli` 14, `sdk-py` 14, `sdk-cli` 2 (2.1.325), `t3-code` 1; one value per file (01, 03) | Confirmed | Recount, 0 files with more than one entrypoint. |
| 8 | `sdk-cli` files: no `ai-title`, `custom-title`, `mode`, `permission-mode`, `file-history-snapshot`; have `last-prompt` (01, 03) | Confirmed for the vault files; the mechanism is now known | Per-file type counts: `last-prompt` 4 in each, the others 0. Mechanism: `zNi` above. 04 contradicts this only because of its env. |
| 9 | `sdk-cli` files have 26 and 50 lines (03 line 56) | Refuted | They have 50 and 69 lines (01 is right). |
| 10 | Both `sdk-cli` files have every `cwd` equal to the vault root (03 line 53) | Refuted | One file has 29/29 conversation rows at the vault root. The other has 20 at the vault root and 23 elsewhere. 01 line 46 is right. |
| 11 | 7 lines before the first user line in `sdk-cli` files (03) | Confirmed | Order: `session-owner`, `queue-operation` x2, `attachment` x4 (hook subtypes), `user`. Each file has exactly 1 typed prompt, so neither file shows a resumed (multi-turn) `-p` session. |
| 12 | 163 subagent files, 24,558 lines, 10,732 sidechain user/assistant lines, all meta.json with 10 keys (03) | Refuted | `find . -path '*/subagents/*' -name 'agent-*.jsonl'` = 140 (143 with 3 `journal.jsonl`), 140 `.meta.json`, 15,117 lines. Sidechain conversation rows: 11,974 (6,508 user/assistant), all `isSidechain: true`. meta.json key sets: 10 keys (20 files), 8 keys (120 files). 01's numbers (140, 11,974, `workflowPhase` on 120) are right. |
| 13 | `isSidechain` is false on every top-level conversation row (01, 03) | Confirmed | 0 of 5,293. |
| 14 | 3 sibling dirs: 333 `sdk-cli` 2.1.270 (332 with `ai-title`), 1, 1 (03) | Confirmed, one detail wrong | Recount matches. 03 lists the versions of the two `sdk-py` siblings as "n/a", but both carry version 2.1.318. |
| 15 | `user`+`assistant` about 35% of bytes, `api-request*` about 28%, `attachment` 34% (01, 03) | Confirmed | 0.351 / 0.277 / 0.336 of 28,269,198 bytes. |
| 16 | Title rows within 2 to 31 lines of EOF in 27 files (01) | Confirmed | Recount: 27 files, distances 2 to 31. The lite-read window is `Tk=65536` (bundle), which fits the changelog fix for titles lost after about 64 KB (02 line 50). `planReAppendSessionMetadata` re-appends them. |
| 17 | `lastPrompt` cut at 200 + ellipsis (01) | Confirmed | Bundle: `...n,200).trim()+"…":n}` right before `planReAppendSessionMetadata`. Data: max length 201, 80 of 454 rows lack the field. |
| 18 | Edit/Write `toolUseResult` embeds whole files (01) | Confirmed | 81 rows carry `originalFile` (max 9,731 chars), 8 Write results carry `content`. |
| 19 | `summary` rows absent; compaction = `compact_boundary` (parentUuid null, `logicalParentUuid`) + `isCompactSummary` user row (01) | Confirmed (n=1) | 0 `summary` rows, 1 boundary with both properties, 1 compact-summary row. |
| 20 | `build_args` never passes `--no-session-persistence` or `--session-id` (02) | Confirmed, line range off by one | `build_args` is at `turn.rs:88-112`. Only `--resume` is added (`:101`). Spawn uses `current_dir(vault)`, `env_clear`, null stdin (`:122-126`). |
| 21 | `cleanupPeriodDays` default 30, min 1, 0 is an error; sweep skips `history.jsonl`, auto memory, `--bare` (02, 03) | Confirmed | claude-directory page ("Cleaned up automatically", "Kept until you delete them"). Bundle: `Y$e=30`, schema `k().int().positive()`. Unset in the 4 settings files (03): not re-read, low stakes. |
| 22 | Which timestamp the sweep compares (02 open question) | Resolved: file mtime | Bundle sweep `mt(e)` compares `x.mtime` from `lstat` per transcript. So a session that is resumed refreshes its own clock. The sweep exempts transcripts whose head/tail `entrypoint` is a desktop host (`TPt`), matching the docs' Desktop/Cowork exemption. |
| 23 | `-p` sessions are hidden from the picker and `--continue` but resumable by id (02) | Confirmed | Sessions page, "`/loop`, `-p`, Agent SDK, and background sessions". |
| 24 | Transcript format declared internal and unstable (02) | Confirmed | Sessions page, verbatim: "The entry format is internal to Claude Code and changes between versions, so scripts that parse these files directly can break on any release." |
| 25 | `--session-id` needs `--fork-session` when combined with `--resume`/`--continue` (02) | Confirmed as a string only | Bundle literal: "--session-id can only be used with --continue or --resume if --fork-session is also specified." Not run. |
| 26 | Plain `--resume <id>` keeps the id and appends to the same file (01 inferred, 04 run) | Confirmed by 04, with an env caveat | 04 runs 2 and 3. Vault data cannot confirm it: both `sdk-cli` files are single-turn. The env caveat is in the main finding above. |
| 27 | Resume from another cwd works; the transcript stays in the original dir (04) | Confirmed by docs | Sessions page: looks in the current project and its worktrees, then "every other project", and "resolves the ID only when exactly one other project holds a transcript". 01's `kEn` "exactly one" reading agrees. |
| 28 | Unknown id: exit 1, one `result/error_during_execution` with `errors[0]`, no init (04) | Confirmed for text, UNVERIFIED for shape | Docs text `No conversation found with session ID: <session-id>`. Bundle literal `No conversation found with session ID: ${M}`. The stream shape comes from 04's run alone. |
| 29 | `CLAUDE_CODE_ENTRYPOINT=cli` in print mode becomes `sdk-cli`; other inherited values are kept (01) | Confirmed | `N(e)` quoted above. In the panel the variable is unset, so `-p` gives `sdk-cli`. |
| 30 | `sdk-cli` cannot prove "written by the Kokobrain panel" (03) | Confirmed | Any `claude -p` gets it. The 333 sibling files show other `-p` callers in vault subfolders. Kokobrain sets nothing that marks its sessions (`grep ENTRYPOINT` in `src-tauri/src/commands/claude/` is empty). |

## Contradictions between the files

1. **`ai-title` and `mode` in `-p` transcripts.** 01 and 03 say they are absent. 04 saw both. Resolved by the env difference (main finding): the panel's shape is the 01/03 one.
2. **Subagent counts.** 01 (140 files, 11,974 rows) against 03 (163, 24,558, 10,732). 01 reproduces, 03 does not.
3. **`sdk-cli` file lengths and `cwd`.** 03 says 26/50 lines with a constant `cwd`. 01 says 50/69 with mixed `cwd`. 01 reproduces.
4. **Retention.** 04 calls it UNVERIFIED. 02 and 03 cite the docs. Docs and bundle agree: 30 days by mtime.
5. **Docs on titles.** The docs say `-p` "from a shell or script" gets no title, but "Agent SDK sessions" do. The bundle sets the boundary by `CLAUDE_AGENT_SDK_VERSION`, which is why `sdk-py` files (14/14) and 04's probe have titles. A panel turn has neither, so it gets no title.

## Recommendation

Build history from Kokobrain's own data. Use the CLI transcript only for Claude's context, through `--resume`.

1. **App-owned session index, per vault.** Record `{sessionId, createdAt, updatedAt, title, cliVersion}` when `system/init` arrives (the id is already captured, `claude.logic.ts:124,153`). Derive the title from the first prompt in the app. Panel transcripts get no `ai-title` (verdict 8), and ownership cannot be read back from transcript fields (verdict 30).
2. **App-owned message log** written from the `ChatState` the panel already builds from stream events. It holds what the user saw, survives the 30-day sweep, and avoids the internal JSONL (verdict 24). It also avoids grouping by `message.id`, unwrapping tags, compaction chains and multi-MB lines.
3. **Resume stays id-based** (`--resume <id>`, cwd = vault). On a `result` with `subtype=error_during_execution`, `num_turns=0`, no prior `init`, and `errors[0]` starting with `No conversation found`, keep the log visible and read-only, drop the id, and offer a new chat that starts without context.
4. **Do not parse `~/.claude/projects` in the MVP.** If an import of older panel chats is wanted later, keep it best-effort and version-tagged, and follow the reader rules in 01 section 6 (realpath plus encoding, skip `toolUseResult`, `attachment`, `api-request*`, meta rows).
5. **Do not** set `CLAUDE_CODE_ENTRYPOINT`, `CLAUDE_CONFIG_DIR` or `CLAUDE_CODE_PROJECT_DIR_NAME` to tag or protect sessions. Desktop-host exemption from the sweep keys on entrypoint, and claiming one would misreport the client.

## Risks

- **Context and display drift.** After compaction, Claude remembers less than the app log shows. A cancelled turn (killpg) may be partly in the app log but have "no result" in the CLI (headless docs, cited in 02). Mark cancelled turns in the log.
- **Lost id on early cancel.** The id arrives only with `system/init`, after about 13 hook lines (04). `--session-id <uuid>` on the first turn would fix this, but it is UNVERIFIED live.
- **Expired transcripts.** History outlives the CLI file after 30 days of no writes (mtime). The owner can raise `cleanupPeriodDays`; the app cannot rely on it.
- **Privacy of the app log.** It stores tool output and note text in plaintext. If it lives under `<vault>/.kokobrain/`, it travels with the vault. Pick the location deliberately and decide on a retention or delete action.
- **Server-gated title behavior** (`tengu_quizzical_thimble`) can flip, and an `ai-title` may start to appear. The app title must not depend on it.
- **Research hygiene.** Probes run from an agent inherit `t3-code`/SDK/proxy env. Later probes must use the panel's env.

## Open questions

- Does `-p` with `--session-id <uuid>` (first turn) echo the same id in `system/init`? (Needs a model-calling probe in the panel env.)
- What does a `-p` turn killed by killpg leave in the transcript (`isAbortedMidStream`, a missing `result`), and does the next `--resume` work? (Needs a probe.)
- Is the resume and append behavior of 04 identical when the entrypoint is `sdk-cli` and the auth is the owner's OAuth instead of a proxy token? Likely yes, unverified.
- Why 2.1.270 `sdk-cli` runs got titles: the server gate, a version change, or a caller env with `CLAUDE_AGENT_SDK_VERSION`?
- Where should the app log live (vault `.kokobrain/`, SQLite `kokobrain.db`, or the app data dir)? That is out of scope here; see 06.

## Claims to verify

1. Panel turns run with no `CLAUDE*`/`ANTHROPIC*` variables, so the transcript entrypoint is `sdk-cli` and no `ai-title` is written (emulated capture plus bundle `N(e)` and `zNi`; not observed from a real panel turn).
2. 04's probe transcripts carried `entrypoint: "t3-code"` (inferred from this agent's env; the probe files were deleted).
3. The retention sweep compares per-file `mtime` (bundle `mt(e)`, `x.mtime`).
4. `Oe` in the `WH` chunk resolves to the 31-hash `AX` (cross-chunk, not proven).
5. The 03 subagent figures (163 / 24,558 / 10,732) are wrong; the correct figures are 140 / 15,117 / 11,974 conversation rows.
6. Assistant lines per `message.id` go up to 11, not 6.
