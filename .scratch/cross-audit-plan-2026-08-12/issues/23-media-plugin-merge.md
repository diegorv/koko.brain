# Issue 23: Merge the audio/video media plugin remnants

Status: ready-for-agent
Phase: P3 Track A step 5
Source: PONY #8 (re-scoped) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track A — Live preview)
Blocked by: 22-block-decorator-factory

## What

The audio and video live-preview plugins were near-duplicates. The block decorator factory (issue 22)
already deleted both duplicated plugin bodies, so this finding shrinks to about half its claimed
surface: only the parser, the widget, and the CSS remain to merge. No user-visible change.

## How

- **Re-scoped:** do NOT re-derive the plugin-body merge — arch 1.0 already deleted both bodies. The
  remaining merge is **parser + widget + CSS only**.
- **Keep the derived `cm-lp-${tag}` classes.** Audio and video are not interchangeable in CSS: one
  styles `width`, the other `maxWidth`. Collapsing to a single class would change rendering.
- **Preserve the four audio-only test cases** — they are not duplicates of the video cases.
- Delete by symbol, never by line range.
- Re-run `embed-widgets.spec.ts` after the merge; it is the spec that covers this surface.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- E2E: only the affected spec — `bash scripts/e2e.sh` for `embed-widgets.spec.ts`. Never run
  `PLAYWRIGHT=true pnpm dev` manually.
- Test collateral (including the preserved audio-only cases) lands in the same commit as the source
  change.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments

### 2026-08-18 - closing

One step, one commit, exactly as re-scoped: parser + widget + CSS only. The plugin bodies were left
alone - issue 22 (`bd6b1433`) had already collapsed both onto `core/block-decorator.ts`, so
`audio-plugin.ts` / `video-plugin.ts` change by four lines each (imports and the two call sites) and
nothing else.

| Step | Resolving SHA |
|------|---------------|
| PONY #8 (re-scoped) - merge the audio/video parser + widget + CSS | this commit |

**Gate + review:**

- **PONY #8** (this commit) - frontend gate re-run at commit time: `pnpm check` 191 files / 0 errors
  / 0 warnings; `pnpm vitest run` 283 files / 6334 tests passing (1 todo); `pnpm build` succeeded.
  E2E per the Gate section: `bash scripts/e2e.sh e2e/specs/embed-widgets.spec.ts` - 2 passed. Review:
  Fable 5 sub-agent under the presumed-flawed stance, verdict could_not_refute. Fix-round count was
  not recorded in the step summary handed to the commit agent, so it is not asserted here.

**Evidence in brief:**

- **Caller trace - no orphans.** `grep -rn "AudioWidget\|VideoWidget\|findAudioBlock\|findVideoBlock\|parsers/audio\|parsers/video" src/ e2e/`
  returns **zero** hits after the change. The four deleted symbols had exactly two production call
  sites each (`plugins/audio-plugin.ts:18,25` and `plugins/video-plugin.ts:18,25`), both rewritten
  to `findMediaBlock(lines, idx, tag)` / `new MediaWidget(tag, src)`.
- **The derived `cm-lp-${tag}` classes survived, and a test pins them.**
  `widgets/media-widget.test.ts:6-18` asserts the full `outerHTML` for both tags, so
  `cm-lp-audio-wrapper` / `cm-lp-audio` and `cm-lp-video-wrapper` / `cm-lp-video` are byte-checked
  rather than assumed. `styles.ts` keeps the two rules that are **not** interchangeable separate -
  `.cm-lp-audio { width: 100% }` vs `.cm-lp-video { maxWidth: 100% }` - and only merges the two
  rules that were already identical (`-wrapper` display/padding, and the `cm-activeLine:has(...)`
  transparency override) into comma selectors. Comma selectors are safe inside
  `EditorView.baseTheme`: style-mod's `splitSelector` splits on `/,\s*/` and applies the base-theme
  prefix per part (`style-mod@4.1.3/src/style-mod.js:26,45`), so each half still gets its own
  generated prefix.
- **Red-green on the one genuinely new behavior.** Merging the two widget classes into one means
  class identity no longer separates an audio widget from a video widget, so `eq()` gained a `tag`
  comparison (`widgets.ts`). `media-widget.test.ts:39-45` (`eq() returns false on tag mismatch with
  an identical src`) fails if that comparison is reverted to `src`-only - it is the mutation probe
  for the merge, not a restatement of pre-existing behavior.
- **Test-case parity, per tag.** The old suites were 14 audio cases + 11 video cases = 25. The new
  `media.test.ts` runs 11 shared cases through `describe.each(FIXTURES)` over both tags (22) plus
  the audio-only block (3) = 25. Per tag the count is unchanged: audio 14, video 11. No case was
  dropped and no tag silently gained or lost coverage.

**Discrepancies vs the issue text:**

- The issue's `## How` says "preserve the **four** audio-only test cases". There were **three**
  audio cases with no video counterpart - `handles single quotes for src attribute`, `returns
  correct positions for multi-line block`, `returns null for multi-line audio without src anywhere`
  (old `audio.test.ts:84,98,116`). All three are preserved verbatim under the
  `findMediaBlock - audio-only cases` describe block (`media.test.ts:142-165`). The count in the
  issue was off by one; nothing was lost.

**Minor findings for follow-up (none blocking):**

- minor - `e2e/specs/embed-widgets.spec.ts`: the spec the Gate names passes, but its two assertions
  cover **image** embeds only. The fixture seeds an `<audio src="clip.mp3"></audio>` block at
  `:33-35` with no assertion against it, and no spec anywhere in `e2e/specs/` asserts on a rendered
  `<audio>` or `<video>` player. Real coverage for this change is the new vitest
  `media-widget.test.ts`, not the e2e run. Worth adding an audio/video assertion to that spec so the
  Gate line means what it looks like it means.
- minor - `media.test.ts:150-160`: `returns correct positions for multi-line block` stayed
  audio-only because the issue said to preserve the audio-only cases as-is. It is tag-agnostic in
  substance and could be promoted into the shared `describe.each` block later, which would give
  video the same position assertions for free.
