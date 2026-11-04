# 25: Meta-bind controls work in table cells, show a stored value outside the options, follow any wikilink, and have accessible names

**What to build:** Four meta-bind fixes. (1) An `INPUT[number():...]`, `INPUT[date():...]`, `INPUT[toggle():...]` or `INPUT[boolean():...]` inside a markdown table cell renders the same control it renders in a paragraph and writes through it; today every input in a cell becomes an inline select, empty when it has no options. (2) An inline select whose stored value is not one of its options shows that value as the selected, disabled first option, so the control does not claim a value the note does not hold, and picking any real option writes it. (3) A button `open` action follows every wikilink a body wikilink follows (`[[Note|alias]]`, `[[Note#heading]]`, a missing note created the same way a body link creates it), and an `open` whose link is empty, unparseable or an unsafe URL shows a toast and stops the action chain instead of reporting success. (4) Every meta-bind select, text input and toggle has an accessible name and a tooltip naming the property it writes (for example "status").

**Blocked by:** 07

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: a table widget whose cell holds `INPUT[toggle():done]` renders a checkbox, and `INPUT[number():count]` a number input, not a select (test in `table-widget.test.ts`, real parser)
- [ ] The cell path and the inline plugin use one widget choice (share `pickWidget` from `plugins/meta-bind-input-plugin.ts`, moved where both can import it without a cycle), and a cell control writes through `dispatchMetaBindUpdate` with the typed values Issue 07 introduced (test)
- [ ] An inline select with stored value `archived` and options `active`, `done` renders a disabled, selected first option `archived`; choosing `active` writes `active` (test in `meta-bind-input-widgets.test.ts`); a stored value that is an option renders as today
- [ ] Button `open` with `[[Note|alias]]` opens `Note`, with `[[Note#Heading]]` opens `Note` at the heading, and with a missing note behaves as a body wikilink to it does, all through `followWikilink(host, target, anchor)` from `live-preview/wikilink-navigation.ts`, with target and anchor parsed by the wikilink parser (`findWikilinkInfoAtPosition`, `extensions/wikilink/decoration.logic.ts`) rather than a second regex (test with a fake `EditorHost`, as the button tests in `src/tests/lib/core/markdown-editor/editor-host.test.ts` already do)
- [ ] Button `open` with an empty or unparseable link, or an unsafe URL, calls `toast.error` from `svelte-sonner` (as `widgets.ts` already does; mocked as in `meta-bind-writers.test.ts`) and returns false, so a multi-action button stops (test)
- [ ] Select, text input and toggle carry `aria-label` and `title` built from the bind target (canonical key after Issue 07) (widget tests)
- [ ] Help 24 documents table-cell inputs, the out-of-options display and what `open` accepts

## Notes

- **Owner decisions (2026-11-04):** meta-bind gets fixes only in this delivery; these four (review I25) are in it as Issue 25, after Issue 07.
- **Today (traced):** the table cell path calls `createMetaBindSelect` for any input (`core/markdown-editor/extensions/live-preview/widgets.ts:252-262`) while the inline plugin picks by type (`plugins/meta-bind-input-plugin.ts:103-125`). The select falls back to its first option when the stored value is not an option (`widgets.ts:713-760`). Button `open` resolves only the bare `[[...]]` text and silently does nothing when it cannot (`widgets/meta-bind-button-widget.ts:98-111`), then the action returns true. The controls set no `aria-label` (`widgets.ts:713-760,865-936`).
- **Layer rule:** `followWikilink` already lives in `core/` (`live-preview/wikilink-navigation.ts`) and takes the `EditorHost`, so the button widget calls it directly; no `features/` import.
- **Main-session decision (toast):** `toast.error` from `svelte-sonner` directly, the way `widgets.ts` already reports meta-bind write failures; no new `EditorHost` method.
- **Main-session decision (when the chain stops):** only for an empty or unparseable link and an unsafe URL. `followWikilink` returns `void` and keeps its behaviour for binary targets and a refused creation; it is not changed here, and those cases continue the chain as they do from a body link.
- **Overlaps:** `.scratch/cross-audit-plan-2026-08-12/issues/43` may move `meta-bind-input-plugin.ts`, where `pickWidget` lives, and `.scratch/file-io-audit/issues/48` touches the same button widget; check both before moving code.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F86, F19, F85, F99 (I25).
- **Size:** S.

## Comments
