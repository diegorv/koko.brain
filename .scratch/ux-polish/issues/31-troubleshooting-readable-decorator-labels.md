# 31: Troubleshooting shows readable decorator names under one group, with copy that matches what the switches do

**What to build:** Settings > Troubleshooting labels its 22 live-preview kill switches with readable names ("Math blocks", "Embedded notes") instead of internal identifiers (`blockMath`, `wikilinkEmbed`, `inlineMarks`), groups them under a "Live preview decorators" heading, and replaces the floating "Disable individual decorators for debugging. Changes require app restart." paragraph (`TroubleshootingSection.svelte` about line 101). That paragraph says "disable" above switches whose on state means enabled, and claims a restart that is not needed: `MarkdownEditor.svelte:115, 221, 545` pass `settingsStore.disabledDecorators` when an editor state is built for a note and when the live-preview mode effect runs, so a change applies on the next note open or mode switch.

- `src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts`: add `DECORATOR_LABELS: Record<DecoratorName, string>` next to the names (still no imports; the total `Record` makes a missing label a `pnpm check` error). Labels: frontmatter "Properties block", codeBlock "Code blocks", blockComment "Comment blocks", table "Tables", callout "Callouts", collectionBlock "Collection blocks", queryjs "QueryJS blocks", metaBindButton "Meta Bind buttons", mermaid "Mermaid diagrams", blockMath "Math blocks", audio "Audio embeds", video "Video embeds", image "Images", footnote "Footnotes", wikilinkEmbed "Embedded notes", metaBindInput "Meta Bind inputs", heading "Headings", blockquote "Blockquotes", simpleWidget "Checkboxes, list markers, rules and inline math", link "Links and wikilinks", inlineMarks "Hidden formatting marks", markdownStyle "Bold, italic, strikethrough and code styling". Check each against its handler or decorator file (for the inline groups: `inline/inline-extensions.ts:62-69`) before committing, and correct a label that misdescribes its scope.
- `src/lib/core/settings/sections/TroubleshootingSection.svelte`: the paragraph at about line 101 becomes `<h3 class="section-label mt-6 mb-2">Live preview decorators</h3>` followed by `<p class="text-meta text-muted-foreground">Turn one off to isolate a rendering problem. A change applies the next time a note opens.</p>`; each row uses `label={DECORATOR_LABELS[name]}` and drops `description=""`; the persisted key passed to `toggleDecorator(name, !v)` does not change. Each Switch gets `aria-label={DECORATOR_LABELS[name]}`.
- Same file, Heartbeat row (about lines 61-63): label "Heartbeat"; description "Log a tick every 250 ms, UI and main-thread stalls, and click-to-paint time. Needs a log file. Leave off unless you are chasing a stall." Open log folder button (about line 82): "Show in Finder". The "Live Preview" heading (about line 87) becomes "Live preview".
- `help/documentation/19-settings.md` Troubleshooting table (about lines 282-294): the Disabled decorators row lists the readable labels with their keys, the Heartbeat row names the `[HB]`, `[NAV]` and `[MAIN-HB]` log tags (they leave the UI, so the help page keeps them), and the restart claim goes.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: a new `src/tests/lib/core/settings/TroubleshootingSection.test.ts` (real `settingsStore`, mock only `#lib/utils/log.service.js` and `setTauriDebugMode`) asserts: 22 decorator rows render with the labels from `DECORATOR_LABELS` and no row label equals a raw key; the section text contains no "require app restart" and no "[HB]"; turning off the "Math blocks" switch sets `settingsStore.disabledDecorators.blockMath` to true (persisted key unchanged)
- [x] `src/tests/lib/core/markdown-editor/extensions/live-preview/decorator-toggles.test.ts` gains: `DECORATOR_LABELS` has a non-empty, unique label for every name in `DECORATOR_NAMES` and no extra keys
- [x] `decorator-names.ts` still imports nothing (its header comment explains why)
- [x] The restart wording is gone from the UI and from help 19
- [x] No change to `settingsStore`, `settings.types.ts` or any decorator implementation

## Notes

- Source: review section 3 Settings row "Troubleshooting exposes internals"; `.scratch/ux-polish/work/settings.md` P3; dossier (22 names = 12 block + 4 inline plugins + 6 handler groups).
- Persisted keys are user data (`decorator-names.ts:5-6`); this ticket renames nothing.
- Out of scope: the Build row (the IA ticket in this cluster removes it), the 22 rows still being 22 cards (grouped cards are a later visual change).
- Size: S.

## Partial work outside relay (2026-11-05)

**Done:** commit `ecd4cadc2` only restyled the floating decorators paragraph (`mt-2 px-4 text-meta text-muted-foreground`). Its text, including the wrong restart claim, did not change.

**Missing:** everything this ticket asks for.

**Conflict to resolve:** `settings-text.test.ts`, "aligns a note after a row", requires `px-4` on every `<p>` in `TroubleshootingSection.svelte`. The paragraph this ticket adds under its heading has no `px-4`, so that test will fail. A paragraph under a sub-heading aligns with the heading, so take `TroubleshootingSection.svelte` out of that test's list on purpose.

## Comments

Closed by hand on main at the owner's request, not through relay, by `1299e13f9`. This supersedes the "Partial work" section above; its test conflict was resolved by taking this page out of the after-a-row list in `settings-text.test.ts`.

Two labels were widened after checking the handlers: `simpleWidget` also covers line breaks, and `markdownStyle` also covers highlights.

Gate: only the touched tests and `pnpm check` ran, at the owner's request. The full vitest suite and `pnpm build` did not.
