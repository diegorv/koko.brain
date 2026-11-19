# Validation 01 (findings from scouts 03 and 05)

Method: own script on theme-tokens.json (28 themes) with color-tools.mts; element opacity composited as fg at alpha over the real surface; translucent surfaces flattened over their parent (lp-collection-bg over editor-bg, input-bg over right-sidebar-bg, highlight and selection over editor-bg). APCA via the copied apcaContrast. Scripts: scratchpad/audit-validate-01/{lib,lp,app,app2,m}.mts.

Traced facts that matter:
- `--lp-comment` and `--lp-hard-break` are never set (grep src, themes repo), so comment, block-ref and hard-break use `--syntax-meta`.
- Live preview paints no active-line fill (styles.ts:64-80), so revealed syntax sits on plain editor-bg. The editor has no drawSelection, so `::selection` (editor-theme.ts:58) is the native selection over editor-bg.
- Themes-repo themes are palettes; every token (taskBorder, olMarker, meta, highlightBg, selection) is derived by theme-builder.logic.ts:223-289, built-ins included (theme.logic.ts:117, 231). taskBorder = faintFg (273), olMarker = primary (274), no pair for taskBorder, highlight or selection.
- CollectionView root is `bg-card` (CollectionView.svelte:517), not editor-bg: the results count sits on card. Re-measured there.
- KanbanLane.svelte:418 is the "Add a card..." placeholder, not the lane title.
- kb.ui kpi labels sit on the default card tint rgba(160,160,160,0.15) over lp-collection-bg (kb-ui.ts:118, 921), measured there too.

## Verdicts

| # | Finding | Verdict | My measurement |
|---|---|---|---|
| 1 | LP dimmed syntax family (styles.ts:595 etc.) | confirmed, medium, app | comment/block-ref/hard-break meta@0.5: 28/28 <4.5, 24/28 <3; 1.66 Zettlr Bielefeld Light (Lc 27), 1.60 Zettlr KMS Dark, 1.77 KB Default, best 3.24. link-ref-def label fg@0.5 27/28 (2.29), URL@0.5 28/28 (1.92). Revealed marks (processing@0.6) 28/28 <4.5, 19/28 <3. Table indicator fg@0.7 on collection bg 5/28 (3.50). Error details 22/28 (3.10 LH, 2.76 Zettlr Bordeaux Dark). |
| 2 | Canvas secondary text opacity | confirmed, high, app | fg@0.4 on card 28/28: 1.96 Zettlr Berlin Light (Lc 38), 2.60 worst dark; @0.3 1.62; subpath @0.5 27/28 (2.37); picker path 1.92; muted@0.5 placeholders 1.99 Tolaria Light. Best 3.65. |
| 3 | Results count /60, Add property /60 | confirmed (results bg corrected to card), high, app | results on card 28/28: 2.35 Tolaria Light (Lc 46), 2.53 Twilight Violet, KB 2.81, best 3.77. Add property 28/28: 2.25 Tolaria Light, 2.75 Zettlr Bordeaux Dark. Plain tokens pass on all 28. |
| 4 | Unresolved rows via container opacity | confirmed, medium, app (+ destructive token) | destructive@0.6 on rsb 28/28: 2.30 Tolaria Light, 1.95 Zettlr Bordeaux Dark. Heading @0.6 28/28. Relationship fg@0.5 23/28 (2.30 Zettlr Berlin Light). Note: destructive at full strength still fails 13/28 on rsb (3.39 Zettlr Bordeaux Dark): scout 01's destructive-token finding. |
| 5 | Icon-only controls /50, /60 | confirmed, medium, app | muted/50 on background 27/28 <3 (1.94 Tolaria Light); on popover (Sort/Properties/Formula panels) 28/28 <3 (1.93 Sakura). Plus icon /60 21/28 <3. |
| 6 | Placeholders /50, /30 | confirmed, medium, app | kanban muted/50 on background 28/28 (1.94 Tolaria Light, 2.23 Twilight Violet); properties list /30 on input-bg 28/28, 1.46 LH (Lc 19), best 1.91. |
| 7 | kb.ui secondary text opacity | confirmed, medium, app | on collection bg: 0.5 22/28 (2.30 Zettlr Berlin Light), 0.6 15/28, 0.7 5/28; kpi label on its card tint 10/28 (3.29). |
| 8 | tagCloud opacity | confirmed, medium, app | alpha 0.4 28/28 (1.69 Zettlr Berlin Light), 0.7 15/28, 1.0 0/28. |
| 9 | Task checkbox border | confirmed, high, app (builder) | lp-task-border vs editor-bg 19/28 <3, 13/28 <2: 1.50 Zettlr Bielefeld Light, 1.61 Twilight Violet, 1.69 LH, 2.02 KB. Scout's "9 Zettlr light" is wrong (there are 5), count of 19 holds. Themes repo needs no change: the builder derives it from faintFg. |
| 10 | Revealed comment/block-id 0.5 | confirmed, duplicate of #1 | same numbers. |
| 11 | Text on ==highlight== | confirmed, medium, both | plain text 4/28 (3.93 four Zettlr dark); strong 6/28; emphasis 8/28 (2.97 Twilight Violet); lp-link 15/28 <4.5, 6/28 <3 (1.43 Zettlr Frankfurt Dark), KB 2.88. |
| 12 | Tag pill on 5 Zettlr light | confirmed, low, app | 4.01-4.37, Lc 55+, dark all pass (min 4.55). |
| 13 | Link ref def 0.5 | confirmed, low, subset of #1 | see #1. |
| 14 | Revealed # and > at 0.6 | confirmed, low, subset of #1 | processing@0.6 19/28 <3 (2.27 Zettlr Bielefeld Light, 2.30 Willemstad Dark). Heading color would be 9/28 <3; processing wins by rule order in markdownHighlight. |
| 15 | OL markers ~3:1 | confirmed, low, both | 3.05 LH, 3.01 Sakura (Lc 54); all others >= 4.53. LH olMarker set at theme.logic.ts:299, Sakura via palette/overrides in themes repo, pair floor 3 at theme-builder:142. |
| 16 | Blockquote bar on Shimmering Focus | confirmed, low, themes-repo | 1.34 both SF themes (palette blockquoteAccent #303241 / light equivalent), KB 2.79. |
| 17 | syntax-meta at 3:1 | confirmed, low, app | 9/28 <4.5, 3.00-3.33 (KMS Dark Lc 27). By design (pair floor 3); only matters for HTML comment text. |
| 18 | Text on native selection | confirmed, low, both | editor-fg 1/28 (3.35 Zettlr Berlin Dark); lp-link 21/28 <4.5, 4/28 <3 (1.40 Zettlr Berlin Dark). Transient state. |

## Shared fixes

- A (app components, opacity on text): #2 #3 #4 #5 #6 #7 #8. Replace alpha/opacity with the full-strength token (muted-foreground, right-sidebar-muted-fg, tab-text-inactive); each plain token passes 4.5 on its surface in 28/28.
- B (live-preview styles.ts flat opacity): #1 #10 #13 #14, plus the missed table add button. Use the token at full strength or a mix toward editor-bg capped at the target ratio.
- C (theme-builder READABILITY_PAIRS): #9 taskBorder >= 3 vs editorBg; #11 editorFg/strong/emphasis/link vs flattened highlightBg; #15 olMarker to 4.5; #18 editorFg vs flattened selection; #17 meta to 4.5 if comment text counts as content. Palette edits in the themes repo for #16 and the Zettlr dark highlight/selection colors.

## Missed (adjacent)

- Table add-row/add-column "+" button (widgets.ts:485, 502; styles.ts:430-441): color `--syntax-meta` at opacity 0.6 when the table is hovered, transparent fill. The glyph is the only content of the control. 17/28 below 3:1: 1.87 Zettlr Bielefeld Light, 1.80 Zettlr KMS Dark, 1.97 KB Default, 1.92 LH. Low (hover-revealed). Not in any scout file.

Not verified: rendered pixels (no app run); WebKit's ::selection text-color behavior assumed to keep the element color.
