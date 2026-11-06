# 55: A widget that throws on every render leaves its tab showing the previous note and drops typing

**Status:** wontfix

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

**Owner decision needed.** Options: after the rebuild throws, rebuild once more with the live-preview block decorators disabled (or in source mode) so the note is editable as text; and/or show a toast saying the note could not be rendered.

- [ ] A component test with a `host.assetUrl` that throws on every call: after switching to a note with a `file://` image, the rendered DOM shows that note and typing reaches `editorStore` and marks the tab dirty
- [ ] The same after `syncExternalContentToEditor` into the active tab
- [ ] The user sees a message when a note cannot be rendered in live preview (if the owner picks the toast)

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/131-note-whose-live-preview-widget-throws-every.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
