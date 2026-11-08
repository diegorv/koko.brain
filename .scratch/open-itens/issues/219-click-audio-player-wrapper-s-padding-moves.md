# 219: A click in the audio player wrapper's padding moves the cursor like a click next to the widget

**Origin:** `audit-2026-11-05` Issue 72, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/live-preview-click-reveal/issues/12-media-wrapper-padding-click.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Still present, polish/low in live preview. The owner's manual check in the app follows the agent's fix.

**Audit check at `5f8003d67`:** still_present (polish, low). MediaWidget.toDOM (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:196-207) still builds the wrapper with no mousedown handling, and ignoreEvent returns true (:215-217). The wrapper padding is styled at styles.ts:274 for both .cm-lp-audio-wrapper and .cm-lp-video-wrapper. Both E2E cases in e2e/specs/live-preview/click-reveal/audio-player.spec.ts:84-86 and :104-106 still carry test.fail(). A video-player.spec.ts exists alongside it for the video check.

**Stale in the text below:** widgets.ts lines shifted. The MediaWidget class is at about :187-218, toDOM at :196-207 and ignoreEvent at :215-217 (the Issue cites :195-205 and :214). Otherwise current.

**Status:** ready-for-agent

Priority: P3 (found by Issue 09's coverage; the player stays rendered, only the cursor moves)

**What to build:** A press in the 4 px padding of the media wrapper, above or below the `<audio>` element, keeps the player rendered but moves the cursor to the start of the line above ("Above line." in the spec). `MediaWidget.ignoreEvent()` returns true (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:214`) and `toDOM` (`widgets.ts:195-205`) adds no mousedown handling on the wrapper, so Chromium places its own caret at offset 0 of the text node above and CodeMirror adopts that DOM selection. Owner rule (2026-11-03): blank space around a widget never reveals it and leaves the cursor where it was. The player's own controls must keep working.

Check the video player, which uses the same widget class: if its wrapper padding has the same effect, cover it too.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** Issue 09 Notes (known bug 1), `e2e/specs/live-preview/click-reveal/audio-player.spec.ts:84,104`, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:187-216

- [ ] `audio-player.spec.ts` "the wrapper's own padding above the player keeps it rendered and the cursor where it was" and "... below the player ..." pass with `test.fail()` removed
- [ ] "the player controls take the press and the cursor does not move" stays green
- [ ] The video wrapper is checked; if it moves the cursor, it gets a test and the fix
- [ ] Not verified by the agent: the owner clicks around an audio embed in the macOS app

## Notes

- Found by Issue 09 (2026-11-03).

## Comments

- 2026-11-06: migrated from `.scratch/archived/live-preview-click-reveal/issues/12-media-wrapper-padding-click.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
