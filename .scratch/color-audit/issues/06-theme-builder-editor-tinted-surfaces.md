# 06: Editor text on tinted surfaces: callouts, blockquote, highlight, code, collection

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause C). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build:**

Text in the editor is only guaranteed on `editorBg`. Several live-preview elements draw text on a tint of their own accent or on a derived surface, and fail there.

1. **Callouts** (`live-preview/styles.ts:481,503,520`): the type label is the accent at 85% opacity (far under 4.5:1 on 25 of 28 themes, high), title and body drop under 4.5:1 on the callout tint on 9 themes including Lavender Haze, the fold chevron at 60% is under 3:1. Label at full strength and lifted against the callout tint; body text checked on the tint.
2. **Blockquote** (`theme-builder.logic.ts:272`): `--syntax-quote` on the blockquote tint.
3. **Highlight** (`styles.ts:268,269`): `==highlight==` text and links inside it (1.4 to 2.7:1 including the default theme).
4. **Tags and list markers** (`styles.ts:272,281`): tag pill text and ordered-list markers on light themes.
5. **Meta and frontmatter text** (`highlight-styles.ts:41`, `source-frontmatter.ts:60`): `--syntax-meta` is guarded at 3:1 but colors visible text (frontmatter, comments); raise to 4.5:1 for text use.
6. **Code** (`src/app.css:427,444`): language label and copy button on the tinted header, punctuation and comment token colors on light themes.
7. **Collection and QueryJS block** (`styles.ts:660,933,963,992`, `theme-builder.logic.ts:283`, `theme.logic.ts:210`): `--lp-collection-error` has no contrast guard (QueryJS and widget errors), null/empty placeholders are nearly invisible, wikilinks on `collectionBg`, the Run button text, and the table zebra token equals the block background (a no-op).
8. **Mermaid error** (`styles.ts:898`), **event pills** (`app.css:321,403`), **search snippet match highlight** (`app.css:488`, high), **meta-bind hover** (`app.css:460`), **active-line gutter number** (`editor-theme.ts:66`).

Where a token is derived in the builder, add the pair to `READABILITY_PAIRS` against the real (flattened) tint; where the color is a CSS mix in `app.css` or `styles.ts`, change the mix and test it with `mixColors`.

Read `docs/agents/live-preview-rules.md` before changing `styles.ts` or any widget.

**Size:** M. Split point: items 1 to 5 (live-preview text) first, items 6 to 8 second.

**Blocked by:** 05, 07

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first, `theme-builder.logic.test.ts` over `BUILTIN_THEMES` and the hard palettes fixture: callout label and title on the callout tint, quote on the blockquote tint, text and link on `highlightBg`, `collectionError`, `collectionNull` and `collectionEmpty` on `collectionBg`, `meta` on `editorBg` at 4.5:1; `collectionTableAlt` differs from `collectionBg`. It fails today.
- [x] A test for each `app.css` mix that changes (code header, snippet highlight, event pills), resolving the mix with `mixColors` per theme.
- [x] Snapshot updated on purpose; frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `core/markdown-editor/extensions/live-preview/styles.ts:268` ==highlight== background makes text and accent colors unreadable on dark themes | medium | Text on lp-highlight-bg flattened over editor-bg. editor-fg: 4/28 fail (3.93:1 on Zettlr Berlin, Bielefeld, Frankfurt and Karl-Marx-Stadt Dark). St... |
| `core/markdown-editor/extensions/live-preview/styles.ts:272` Tag pill text is below 4.5:1 on five Zettlr light themes | low | color-mix(primary 70%, editor-fg) on color-mix(primary 20%, editor-bg): 4.01:1 on Zettlr Bielefeld Light, then 4.14, 4.18, 4.22 and 4.37:1 on the o... |
| `core/markdown-editor/extensions/live-preview/styles.ts:281` Ordered-list markers on two light themes are about 3:1 | low | 3.05:1 on Lavender Haze (#ca7536 on #F3F0F8) and 3.01:1 on Sakura (Lc 54). All other themes are at 4.53:1 or above. |
| `core/markdown-editor/highlight-styles.ts:41` --syntax-meta guarded at only 3:1 colors visible text on 9 themes | low | --syntax-meta on editor-bg: 9/28 below 4.5:1, 3.00-3.33:1 (3.05:1 on KokoBrain Default, 3.00:1 on Zettlr Karl-Marx-Stadt Dark with Lc 27). |
| `core/settings/theme-builder.logic.ts:272` Blockquote text (--syntax-quote) falls below 4.5:1 on the blockquote tint | medium | Over the blockquote tint at depth 1: Zettlr Bielefeld Dark 3.88, Bordeaux Dark 4.02, Berlin Dark 4.06, Frankfurt Dark 4.07, Karl-Marx-Stadt Dark 4.... |
| `core/markdown-editor/extensions/live-preview/styles.ts:520` Callout type label (accent colour at 85% opacity) is far below 4.5:1 in 25 of 28 themes | high | Measured at opacity .85 over the 7% callout-note tint: 127 of 168 theme x type pairs are under 4.5 and 46 are under 3; 25 of 28 themes fail at leas... |
| `core/markdown-editor/extensions/live-preview/styles.ts:481` Callout title and body text drop below 4.5:1 on the callout tint in 9 themes, including the built-in light default | medium | Over the 7% note tint: Lavender Haze 4.15 (4.55 on the bare editor), Zettlr Bielefeld Light 4.18, Zettlr Berlin, Bielefeld, Frankfurt and Karl-Marx... |
| `core/markdown-editor/extensions/live-preview/styles.ts:503` Callout fold chevron at 60% opacity is under 3:1 in five Zettlr light themes | low | 2.72:1 on Zettlr Bielefeld Light and 2.85:1 on Zettlr Berlin, Bordeaux, Frankfurt and Karl-Marx-Stadt Light. The other 23 themes pass 3:1. |
| `core/markdown-editor/extensions/live-preview/styles.ts:898` Mermaid error message below 4.5:1 on 11 themes | medium | On --lp-codeblock-bg (the .cm-lp-mermaid container): Zettlr Bordeaux Dark 3.39, Zettlr Berlin, Bielefeld, Frankfurt and Karl-Marx-Stadt Dark 3.55, ... |
| `core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:60` Source-mode frontmatter and comment text (--syntax-meta) only 3.0-3.3:1 on 9 themes, including both built-ins | medium | --syntax-meta on --editor-bg: KokoBrain Default 3.05 (Lc -26), Lavender Haze 3.28, Sakura 3.33, Twilight Violet 3.08 (Lc -24), Zettlr Berlin Light ... |
| `core/markdown-editor/extensions/live-preview/styles.ts:660` Widget error text --lp-collection-error has no contrast guard | medium | On --lp-collection-bg: Zettlr Bordeaux Dark 3.39, Zettlr dark family 3.55, Willemstad Light 3.62, Lavender Haze 3.66, Shimmering Focus Light 3.69, ... |
| `core/markdown-editor/extensions/live-preview/styles.ts:933` QueryJS error text (--lp-collection-error) below 4.5:1 on the collection surface in 11 themes | medium | --lp-collection-error on --lp-collection-bg: Zettlr Bordeaux Dark 3.39 (Lc-27), Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark 3.55, Willemstad Light 3... |
| `core/markdown-editor/extensions/live-preview/styles.ts:992` Wikilinks inside QueryJS tables and lists are below 4.5:1 on the collection surface in 7 themes | low | --lp-wikilink on collection bg: Sakura 3.79, SF Light 4.08, Willemstad Dark 4.18, Zettlr Berlin Light 4.19, Bordeaux Light 4.29, KMS Light 4.32, La... |
| `core/markdown-editor/extensions/live-preview/styles.ts:963` QueryJS Run button text on --primary has low APCA contrast on a few themes, hover fails WCAG on Zettlr Berlin Light | low | Zettlr Berlin Light 4.51 Lc33, hover 4.16 Lc30 (fails WCAG); Willemstad Dark 4.51 Lc33; Twilight Violet 4.95 Lc39; Zettlr Frankfurt Dark 4.54 Lc41;... |
| `core/markdown-editor/setup/editor-theme.ts:66` Active-line gutter number: muted text on the active-line gutter fill | low | muted-foreground on syntax-active-line-gutter: 11/28 under 4.5 (Zettlr Bordeaux Dark 2.52 Lc 27, other Zettlr dark 2.58, Zettlr light 3.68, Tolaria... |
| `src/app.css:403` Event chip text just under 4.5 on Zettlr Light themes | low | Zettlr Bielefeld Light: cyan 4.06, green 4.10, orange 4.15, pink 4.31, blue 4.36, purple 4.40. Zettlr Berlin/Frankfurt/Karl-Marx-Stadt Light: green... |
| `src/app.css:321` Event calendar pills drop under 4.5:1 on Zettlr Bielefeld Light and the other Zettlr light themes | low | Same as app.css:403: Bielefeld Light cyan 4.06 to purple 4.40; green/cyan 4.43-4.48 on the other four Zettlr Light themes. |
| `src/app.css:444` Code token punctuation and comment colors fall under 4.5 on light themes | medium | Punctuation on codeblock-bg: 3.32:1 on Zettlr Berlin/Frankfurt/KMS Light, 3.47 on Bielefeld/Bordeaux Light, 4.28 on Lavender Haze, 4.40 on Tolaria ... |
| `src/app.css:427` Code block header language label and copy button use muted text on a tinted header | medium | muted-foreground on the header (codeblock-bg 92% + editor-fg 8%, oklab) fails on 13/28 themes: Sakura 3.84, Lavender Haze 3.88, Tolaria Light 3.93,... |
| `core/settings/theme-builder.logic.ts:283` Collection null and empty placeholder text is nearly invisible | medium | faintFg on collection-bg fails on 27/28 themes: Sakura 1.33, Lavender Haze 1.37, Zettlr Light 1.53, Twilight Violet 1.75, Tolaria Light 1.92, KokoB... |
| `core/markdown-editor/extensions/live-preview/styles.ts:269` ==highlight== text under 4.5 on four Zettlr dark themes | low | editor-fg on highlight (#ffff0060 over editor-bg = #7b7b1b) is 3.93:1 (Lc67) on Zettlr Berlin/Bielefeld/Frankfurt/KMS Dark. Strong text inside a hi... |
| `src/app.css:460` Meta-bind hover fills mix toward the label color | low | Destructive hover (destructive 85% + editor-fg 15%): 3.16:1 (Lc25) on Willemstad Light, 3.84 on Shimmering Focus Light, 3.87 on Tolaria Light, 3.66... |
| `src/app.css:488` Search snippet match highlight puts muted text on the yellow highlight tint | high | <mark> in FTS/hybrid snippets, file-explorer-muted-fg on lp-highlight-bg over list-bg: 15/28 under 4.5. 1.60:1 (Lc 15) on Zettlr Berlin/Bielefeld/F... |
| `core/settings/theme.logic.ts:210` Collection table zebra rows are a no-op: the alt-row token equals the block background | low | 1.00:1 on 5 themes, 1.01 to 1.06:1 on 17 more; zebra striping is decorative, so this is a polish gap, not a WCAG failure |
| `core/markdown-editor/extensions/live-preview/styles.ts:269` Links and wikilinks inside ==highlight== drop to 1.4-2.7:1, including the default theme | medium | 2.69:1 (Lc32) KokoBrain Default, 1.43 (Lc12) Zettlr Frankfurt Dark, 1.44 KMS Dark, 1.65 Berlin Dark, 1.96 Willemstad Dark, 2.63 Twilight Violet |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
- 2026-11-19, deliver (branch issue/06-theme-builder-editor-tinted-surfaces): builder lifts callout, blockquote, highlight, meta and collection text to 4.5:1 on their tinted surfaces, collection zebra rows differ from the block background, app.css mixes for code headers, event pills and search matches stay readable. Full suite 685 files, 18319 passed, 56 skipped. Review round 1 CHANGES_REQUESTED, fix round ran, round 2 APPROVED with no findings.
