# 12: A click in the audio player wrapper's padding keeps the cursor where it was

**Status:** wontfix

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

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/72-click-audio-player-wrapper-s-padding-moves.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
