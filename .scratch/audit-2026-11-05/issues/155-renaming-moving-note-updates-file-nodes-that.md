# 155: Renaming or moving a note updates the file nodes that point at it in canvases

**What to build:** Split from Issue 31 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 31 first; its Details and evidence apply here. The canvas half: rewrite a canvas file node path on rename and on a pure folder move (updateLinksAfterRename returns early on a same-name move today), in the stored path format Issue 15 settles, and keep an open canvas tab in sync (Issue 06 keys canvas persists by path).

**Blocked by:** 15, 06, 31

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] A canvas whose file node points at the renamed or moved note has its file field updated to the new path.
- [ ] A pure move (same file name, new folder) also updates the canvas file node.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
