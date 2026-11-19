# 14: Kanban date badges read on coloured cards

**Origin:** Issue 04 re-review round 2, finding 1 (`.scratch/color-audit/work/04/review-2.md:22`), deferred by its fix step. Follow-up filed by the main session after the delivery of 04 (`d2d8f050a`).

**What to build:**

The proximity date badges (`src/lib/plugins/kanban/kanban.logic.ts:752`) use the shared `--*-tint-fg` text-on-tint tokens from Issues 03 and 04 (`src/app.css`, around `:77-86` for the Tailwind aliases). On a `{color:x}` card or row the badge's tint sits on the card's own 15% preset tint, and the text drops to 4.05 to 4.50:1 on Zettlr Bielefeld Light (the fix step's probe).

Pick one, by measurement on the built-in themes and the hard palettes (the in-file `HARD_PALETTES` of `src/tests/lib/tint-text-tokens.test.ts`, or the shared fixture if a later Issue moved them there):

1. a lower preset share for the `--*-tint-fg` tokens everywhere (check every other use still reads its hue);
2. a badge-only token used when the card is coloured;
3. a solid badge background on coloured cards.

Say in the commit which one and why.

**Size:** S

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, in the kanban or tint-text-tokens tests: a date badge on each coloured card preset reaches 4.5:1 on the flattened stack (badge tint over card preset tint over the lane over `editorBg`) on `BUILTIN_THEMES` and Zettlr Bielefeld Light 1.1.0; it fails today.
- [ ] The other `--*-tint-fg` tests stay green (or move on purpose, with the reason in the commit).
- [ ] Frontend gate passes.

## Comments

- 2026-11-19, triage: ready-for-agent (follow-up of a deferred review finding; no owner decision needed).
