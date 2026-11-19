# 08: Live-preview and QueryJS dimmed text stays readable

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause A). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build:**

1. **Live preview** (`src/lib/core/markdown-editor/extensions/live-preview/styles.ts`): `%%comment%%` text and `^block-id` are `--syntax-meta` at 0.5 opacity while the line is touched (`:593,595`; 1.6 to 3.2:1 on every theme), revealed `#` and `>` markers at 0.6 (`:108`), link reference definition lines at 0.5 while idle (`:149`), the table add-row/add-column `+` at under 3:1 when revealed (`:440`). Drop the extra opacity on text the user is editing and rely on the token (Issue 06 raises `--syntax-meta` to 4.5:1); keep a dim only where the text is decorative and say which.
2. **QueryJS `kb.ui`** (`src/lib/plugins/queryjs/kb-ui.ts`): secondary text faded with inline opacity 0.5 to 0.7 (kpi labels, date headers, grid labels, legends, list and timeline subtitles, `:390` and nearby), and `tagCloud` scaling whole-chip opacity down to 0.4 (`:279`, rare tags 1.7 to 3.2:1). Use a muted text color at full strength (`var(--muted-foreground)` or a mix toward `--editor-fg`), and scale tag cloud weight by size or font weight instead of opacity.

Read `docs/agents/live-preview-rules.md` first; both files render inside CodeMirror block widgets.

**Size:** S

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first: `kb-ui.test.ts` asserts the secondary text and the smallest tag cloud chip carry no `opacity` below 1 and resolve to at least 4.5:1 on `collectionBg` on `BUILTIN_THEMES` (surface as in `afb031c18`).
- [ ] A live-preview style test (the existing `styles.ts` tests) for the comment, block-id and link reference definition rules: no opacity below 1 on text.
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `core/markdown-editor/extensions/live-preview/styles.ts:595` Live-preview dimmed syntax (inline comments, block refs, hard break, link ref defs, revealed marks) is 1.6-4.1:1 | medium | %%comment%%, ^block-id and the hard-break arrow use --syntax-meta at 0.5 opacity (--lp-comment and --lp-hard-break are never set). This fails 4.5:1... |
| `plugins/queryjs/kb-ui.ts:390` QueryJS kb.ui secondary text faded with opacity 0.5-0.7 | medium | editor-fg over lp-collection-bg (flattened over editor-bg): @0.5 fails 22/28 (2.30:1 on Zettlr Berlin Light, 2.72:1 on Lavender Haze, 3.43:1 worst ... |
| `plugins/queryjs/kb-ui.ts:279` kb.ui.tagCloud scales whole-chip opacity down to 0.4, rare tags are 1.7-3.2:1 | medium | Chip text at whole-chip alpha over the default chip rgba(139,108,239,0.3) on the collection bg. Alpha 0.4: 28/28 fail, 1.69:1 on Zettlr Berlin Ligh... |
| `core/markdown-editor/extensions/live-preview/styles.ts:593` Revealed %%comment%% and ^block-id text is dimmed twice (meta color at 0.5 opacity) | medium | Same numbers as styles.ts:595: 28/28 below 4.5:1, 24/28 below 3:1, 1.60-3.24:1, KokoBrain Default 1.77:1, Lavender Haze 1.70:1. |
| `core/markdown-editor/extensions/live-preview/styles.ts:149` Link reference definition lines are dimmed to 0.5 opacity while idle | low | Label (editor-fg@0.5): 27/28 fail, 12 below 3:1, 2.29:1 on Zettlr Bielefeld Light. URL (syntax-url@0.5): 28/28 fail, 1.92:1 on Zettlr Bordeaux Ligh... |
| `core/markdown-editor/extensions/live-preview/styles.ts:108` Revealed # and > block markers are dimmed to 0.6 opacity | low | --syntax-processing at 0.6 on editor-bg: 28/28 below 4.5:1 and 19/28 below 3:1, 2.27:1 on Zettlr Bielefeld Light, 2.30:1 on Willemstad Dark, 3.41:1... |
| `core/markdown-editor/extensions/live-preview/styles.ts:440` Table add-row/add-column '+' button is under 3:1 when revealed | low | 1.87:1 on Zettlr Bielefeld Light (Lc 33), 1.80:1 on Zettlr Karl-Marx-Stadt Dark, 1.97:1 on KokoBrain Default, 1.92:1 on Lavender Haze; best 4.08:1 ... |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
