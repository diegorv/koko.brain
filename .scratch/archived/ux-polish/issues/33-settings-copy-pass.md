# 33: Settings copy drops library names, model IDs and em dashes, and labels use sentence case

**What to build:** Settings descriptions read as product copy: no library names, no model IDs in labels, no em dashes, and sentence-case labels and buttons. Sites and replacements (match each to what the code does before committing):

- "dayjs" (9 sites): `PeriodicNotesSection.svelte` about lines 37, 68, 85, 102, 119 become "Date pattern for the note path and name"; `QuickCaptureSection.svelte` about line 41 "Date pattern for the subfolder under the vault, e.g. YYYY/MM-MMM", about line 53 "Date pattern for the filename. Text in [ ] is kept as is, e.g. [capture-note-]YYYY-MM-DD"; `OneOnOneSection.svelte` about line 48 "Date pattern for the subfolder, e.g. YYYY/MM-MMM", about line 60 "Date pattern with a {person} placeholder, e.g. [-1on1-]{person}[-]DD-MM-YYYY".
- `EditorSection.svelte` about line 41: "Fonts for the editor, comma-separated; the first one installed is used".
- `FileHistorySection.svelte` about line 30: say what "thinning" does (read the retention code first, then for example "Days to keep every snapshot before older ones are kept less often (1–365)").
- `src/lib/plugins/queryjs/QueryjsSection.svelte` about line 73: "Clear cached query results for this session. Each block runs again on its next render, following the policy above."
- `src/lib/features/search/SearchSection.svelte` about line 102: "Find notes by meaning as well as by words. Downloads a 542 MB model once."; about lines 133-134: label "Reranker", description "Re-scores the top results with a second model for better precision. About 280 MB more to download, 2 to 3 s per query on CPU, CC-BY-NC-4.0 license. Used automatically once downloaded."
- `UpdateSection.svelte` about lines 253 and 260: reword both sentences without an em dash; about line 340 "You're up to date!" becomes "You're up to date" (keep its colour; a success token belongs to the colour cluster).
- `SentrySection.svelte` about line 49: "Off by default. When on, unhandled errors are sent to the Sentry project of the DSN you enter."
- Sentence case: `TodoistSection.svelte` "API Token" to "API token"; `src/lib/features/auto-move/AutoMoveSection.svelte` "Add Rule" to "Add rule" (and the empty state's quote of it), "Excluded Folders" to "Excluded folders"; `AppearanceSection.svelte` "Create New Theme" to "Create new theme"; `HeadingTypographyEditor.svelte` "Heading Typography" to "Heading typography".

Update the help pages that quote a changed string in the same change: `help/documentation/19-settings.md` (about lines 55, 61, 74, 88-145, 210, 238, 259) and `help/documentation/15-file-history.md` (about line 43). Help pages may keep naming dayjs as the date-token reference; add one sentence saying date patterns use dayjs tokens where the Periodic Notes table starts, if it is not there.

**Blocked by:** 26, 27

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: `src/tests/lib/core/settings/settings-copy.test.ts` gains a source scan over the Settings files (the shared helper `settings-files.ts`) that strips `<!-- -->` blocks, `/* */` blocks and lines starting with `//`, then fails on "dayjs" and on U+2014 (em dash). It fails today on the 9 dayjs sites and the 2 UpdateSection em dashes
- [x] Same file: rendered checks that Search shows a row labelled exactly "Reranker" (semantic search enabled in the store, Tauri calls mocked as the search tests do) and that the Editor font family description no longer contains "CSS"
- [x] `AppearanceSection.test.ts:338` is updated on purpose to "Create new theme"
- [x] The four existing `settings-copy.test.ts` cases stay green unchanged (Periodic base folder, Templates system folder, QueryJS help path, QueryJS Always)
- [x] Every changed string is either in the list above or follows the same rules; nothing else in the sections changes

## Notes

- Source: review section 3 Settings row "Page structure and copy" and section 2 copy rules; `.scratch/ux-polish/work/settings.md` P6 and P13.
- Kept on purpose: the Templates system folder text with `kb.pages()` and the QueryJS help path are pinned word for word by `settings-copy.test.ts` so help 19 can quote them; "(📅)" in `EventCalendarSection.svelte` about line 182 is the due-date syntax users type; "▶ Run" in `QueryjsSection.svelte` about line 22 names the button's real label; the Types nav label versus the "Types & Lifecycle" title is documented in two help pages.
- Out of scope: placeholders on empty fields (`work/settings.md` P12), the `text-green-500` colour, Troubleshooting copy (its own ticket in this cluster).
- Size: M.

## Partial work outside relay (2026-11-05)

**Done:**
- Commit `c41976f92` removed the `UpdateSection.svelte` paragraph holding one of the two em dashes, so only the one in the Install Stable description remains. Line numbers in that file moved.
- The same commit dropped "Fires once per vault open, with no throttle." from the Auto-check row, and folded Last checked into the Check for updates description. `help/documentation/19-settings.md` and `docs/RELEASE-CHANNELS.md` follow those two changes.

**Missing:** every other replacement and criterion here. `ecd4cadc2` changed classes and buttons, not copy. "You're up to date!", "Add Rule", "Create New Theme" and the dayjs sites all keep their current text.

## Comments

Closed by hand on main at the owner's request, not through relay, by `ccf65866b`. This supersedes the "Partial work" section above.

Beyond the list, at the owner's request: Periodic Notes > Base folder is now Notes folder, Types > Base folder is now Typed notes folder, and the Calendar row Event type is now Type name.

Departures from the text, after checking the code:
- Quick Capture's Folder format says "inside the notes folder", because `buildCaptureFolder` nests it under the base folder. The Issue's "under the vault" was wrong.
- Retention days states the `cleanup_history` policy outright.

Issue 26 is still open although this Issue lists it as a blocker; these strings do not touch the paragraphs it moves.

Gate: only the touched tests, the help tests and `pnpm check` ran, at the owner's request. The full vitest suite and `pnpm build` did not.
