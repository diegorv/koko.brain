# 73: Every language the code-block dropdown and the guide offer is syntax-highlighted

**What to build:** highlightCode (src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:5) builds lowlight from the `common` bundle only, which has no powershell, dockerfile, elixir, haskell or scala grammar, so :41 `lowlight.registered(language)` is false and :46 returns escaped plain text. COMMON_LANGUAGES (widgets/code-block-widget.ts:41-42, :45-47) still offers all five, and help/documentation/04-markdown.md:424 lists them as supported. Make the three agree: either register the five grammars on top of `common` (lowlight.register with the highlight.js language modules; highlight.js is only a transitive dependency today, so that means adding it to package.json, or using lowlight's `all` if the bundle cost is acceptable), or drop the five from COMMON_LANGUAGES and the guide. Prefer registering them; do not switch to `all` without checking the bundle size.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Scope (owner, 2026-11-06):** remove powershell, dockerfile, elixir, haskell and scala from COMMON_LANGUAGES and from help/documentation/04-markdown.md:424, and keep the guard test that every dropdown entry highlights. No dependency is added. Registering those grammars moved to Issue 159.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- Moved to Issue 159 on 2026-11-06: Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.test.ts: highlightCode('Get-ChildItem -Path .', 'powershell').html contains an `hljs-` class span; it fails today (plain escaped text).
- Moved to Issue 159 on 2026-11-06: The same holds for dockerfile, elixir, haskell and scala samples.
- [ ] powershell, dockerfile, elixir, haskell and scala are removed from COMMON_LANGUAGES and from the guide; package.json and pnpm-lock.yaml do not change.
- [ ] In src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.test.ts: every COMMON_LANGUAGES entry other than plaintext produces hljs markup from highlightCode, so the dropdown cannot list a language that does not highlight again.
- [ ] help/documentation/04-markdown.md:424 lists only languages that highlight (jsx, tsx and toml keep working through hljs aliases).
- [ ] Unknown languages still fall back to escaped plain text (existing test).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** polish (bucket 3-polish). Polish/low. Only a few languages are missing.
- **Trigger:** Write a fenced block tagged powershell, dockerfile, elixir, haskell or scala, or pick one of them in the block's language dropdown.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:1-5 createLowlight(common); node_modules/lowlight/lib/common.js imports 37 grammars, none of powershell/dockerfile/elixir/haskell/scala; code-highlight.logic.ts:41-46 falls back to escapeHtml when not registered; src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:13-47 COMMON_LANGUAGES lists powershell :41, dockerfile :42, elixir :45, haskell :46, scala :47; help/documentation/04-markdown.md:424 'Supported languages include ... powershell, dockerfile ... elixir, haskell, scala'; package.json:68 lowlight ^3.3.0, no direct highlight.js dependency.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-07` (from live-preview-spec-4). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (polish, low). Confirmed. code-highlight.logic.ts:5 calls createLowlight(common), and nothing else registers grammars. node_modules/lowlight/lib/common.js has no powershell, dockerfile, elixir, haskell or scala. COMMON_LANGUAGES lists them at code-block-widget.ts:41-47, and help/documentation/04-markdown.md:424 claims them. Both named test files exist. Corrections to apply while implementing: The AC 'every COMMON_LANGUAGES entry other than plaintext produces hljs markup' needs a sample per language that really produces a hljs- span; a trivial sample such as one word of markdown or shell may produce none. Say that the test uses one representative snippet per language.

## Comments

- 2026-11-06: narrowed by the owner after the challenge review; adding the grammars moved to Issue 159.
