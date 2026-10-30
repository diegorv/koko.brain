# 09: Templates point at the queryjs folder that exists

**What to build:** The notes in `help/examples/templates/` call queryjs scripts under `_system/queryjs/`, but the folder that holds them is `__system/queryjs/` (two underscores), so those calls cannot load. Make the templates and the scripts agree on one path (check which name the rest of `help/` and the app's docs use, and change the side that is wrong), and make sure a note created from a template still finds its scripts.

**Context:** Found during help-examples issue 05 (pre-existing, recorded as a gap in its closing commit `d690ba1b`). Owner asked for a ticket on 2026-10-29.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `help/examples/templates/**` (modify), and the `__system/queryjs/` folder it references if it is the side that changes

**Gate:** examples only: `./node_modules/.bin/vitest run src/tests/help`. No `pnpm check` / `pnpm build`.

- [ ] No template references a queryjs path that does not exist under `help/`
- [ ] A test in `src/tests/help/` fails if a template references a missing script path (seen failing first)

## Comments

- 2026-10-29 22:56 — discovery — templates use `_system/queryjs/`, every other help/ site and both script folders use `__system/queryjs/`; fix the 11 template paths, guard with a test — work/09/discovery.md
