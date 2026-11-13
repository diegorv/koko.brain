# 193: Example mod: idea to PRD and Issues

**Origin:** `vault-mods` Issue 11, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/vault-mods/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** the owner's own example as a working mod. A rail button, an action "Idea to PRD" whose input is the idea (or the open note), then a fan-out of Haiku scouts, Opus validators over their output and one synthesis that writes `PRD.md` and `issues/NN-<slug>.md` into a vault folder, the same shape as this feature's research.

- Lives in `help/examples/mods/idea-to-prd/` (scoped per `help/examples/SCOPING.md`), so the owner copies it into `_system/mods/`.
- Plain JS on `ctx.agents.run` (Issue 13), `ctx.vault` (Issue 05) and `run` (Issue 06): a promise pool (for example 4 at a time), counts configurable at the top of `main.js` (default 30 Haiku and 10 Opus, the owner's example), `run.progress` per finished job, the reported cost per job in `run.log`, a total, and `run.signal` checked between waves.
- Output folder and file names follow this repo's `.scratch/<feature>/` layout by default, configurable at the top of `main.js`.
- Docs: if Issue 07 has landed, add a short walkthrough to `28-mods.md`; otherwise 07 covers it.

**Blocked by:** 192

**Blocked by (origin):** closed blockers dropped: vault-mods 05, vault-mods 06.

No spend ceiling (owner decision, PRD 2026-11-06): print each job's reported cost and the running total in `run.log`.

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first: `src/tests/help/` loads the example through `mods.logic.ts` and runs its action against a fake `ctx` whose `agents.run` returns canned JSON: the PRD and the Issues are written with the expected paths and content; Stop between waves writes nothing further.
- [ ] One real run in the app, with the cost reported in the commit.

## Notes

- If the mod grows into hundreds of lines of boilerplate, promote a helper to `ctx` later (D3 R1). Not now.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** M.

## Comments
