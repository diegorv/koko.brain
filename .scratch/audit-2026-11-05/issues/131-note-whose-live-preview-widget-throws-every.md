# 131: A note whose live-preview widget throws on every render stays editable and in sync with its tab

**Migrated from:** `.scratch/file-io-audit/issues/55-persistent-widget-throw-desyncs-tab.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs a widget that throws on every render. The owner decision is recorded below (2026-11-06).

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/core/markdown-editor/MarkdownEditor.svelte:168-198 replaceDoc catches the dispatch throw and rebuilds with v.setState (:193). If the rebuild throws too, it is only logged via error() (:194-196). setViewState (:137-149) does the same on the tab-switch path. The JSDoc at :164-165 documents that the view stays desynced. No toast and no fallback to source mode. The trigger needs a widget that throws on every render. The Issue's example, host.assetUrl, is convertFileSrc in production (src/lib/app/editor-host.ts:112-114) and does not throw for a normal path, so no daily-use trigger is known. The consequence (silent dropped typing) is serious if a real widget bug ever hits it.

**Stale in the text below:** replaceDoc now diffs (docDiff) instead of doing a whole-doc replace, and a separate setViewState helper (:137-149) covers the showTabState/freshState path with the same log-only second catch. The owner decision (source-mode fallback and a toast) was recorded on 2026-11-06.

**Owner decision (2026-11-06):** after the rebuild also throws, rebuild with live-preview block decorators off (source mode) so the note stays editable, and show a toast that it could not be rendered.

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Blocked by:** none
Priority: P2
Severity: data-loss-in-tab
Source: Issue 46 review (.scratch/file-io-audit/work/46/review.md, finding 1), reproduced by the reviewer with a temporary component test

## Details

Since Issue 46, `replaceDoc` in `src/lib/core/markdown-editor/MarkdownEditor.svelte` catches a throw from the whole-doc replace dispatch and rebuilds the view with `setState`. When the widget throws on every render (for example a `host.assetUrl` that always throws, with a `file://` image in the note), the rebuild throws too and is only logged. Then:

- `view.state.doc` is the new note, but `contentDOM` still shows the previous note's text under the new tab.
- Typing throws `TypeError: Cannot destructure property 'tile' of 'parents.pop(...)'`; `editorStore` keeps the old content and the tab never turns dirty, so the edit is lost silently.
- The same happens after `syncExternalContentToEditor` into the active tab.
- Switching to another tab recovers fully, and the suppress flags reset, so other tabs keep saving.

The user gets no signal: `error()` logs to the console and Sentry only.

**Owner decision (2026-11-06):** both. After the rebuild also throws, rebuild once more with the live-preview block decorators off (source mode) so the note is editable as text, and show a toast saying the note could not be rendered.

- [ ] A component test with a `host.assetUrl` that throws on every call: after switching to a note with a `file://` image, the rendered DOM shows that note and typing reaches `editorStore` and marks the tab dirty
- [ ] The same after `syncExternalContentToEditor` into the active tab
- [ ] After the second throw, the view is rebuilt with the live-preview block decorators off, so the note shows as editable markdown text and typing still reaches editorStore (same component test)
- [ ] The user sees a toast when a note cannot be rendered in live preview

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/55-persistent-widget-throw-desyncs-tab.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
