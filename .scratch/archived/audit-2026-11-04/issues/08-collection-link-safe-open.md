# 08: Collection link() cells never navigate the app webview and drop unsafe schemes

**What to build:** In CollectionTableView.svelte (:67-68), a link() value renders as a clickable link only when isSafeUrl(href) (src/lib/utils/sanitize-url.ts) is true. Otherwise only the display text is shown. Clicking calls preventDefault and stopPropagation, so the webview never navigates and the row's onClickRow (:57) does not fire, then opens the target the same way canvas LinkNode does (openUrl from @tauri-apps/plugin-opener for http/https/mailto/tel). Any href that isSafeUrl rejects, or that is not http/https/mailto/tel (a note path, a relative path), renders as plain text.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first in src/tests/lib/features/collection/CollectionTableView.svelte.test.ts: render a result whose cell is link('javascript:alert(1)', 'x'), then assert no <a> has an href starting with javascript: and the text 'x' is rendered. Fails today.
- [ ] An https link cell, when clicked, calls the mocked plugin-opener openUrl with the URL, the click event is defaultPrevented, and onClickRow is not called.
- [ ] Existing CollectionTableView and expression methods tests (methods.test.ts:499-520) still pass.
- [ ] pnpm check, pnpm vitest run and pnpm build pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `collection-href-scheme`:** real, low. Root cause: link() puts any string into <a href> with no scheme check and no click handling. Every other link sink in the app filters through isSafeUrl and opens through plugin-opener. The claimed javascript: execution is probably blocked by the CSP, which allows 'unsafe-eval' but not 'unsafe-inline'. That comes from memory of the CSP spec and WebKit behaviour, was not tested at runtime, and the dev-mode CSP was not checked. What clearly remains: with no Tauri navigation handler, a click on any link() cell (https, a note path, asset:) loads that target into the main app webview, so the app is lost along with any unsaved state. The click also bubbles to the row's onclick.
  Evidence: src/lib/features/collection/expression/evaluator.ts:424-428 builds { __display:'link', href: String(arg) } with no validation. src/lib/features/collection/CollectionTableView.svelte:68 renders <a href={value.href}> with no onclick, inside a <tr onclick> (:57). Safe sinks for comparison: src/lib/utils/sanitize-url.ts (isSafeUrl), used by live-preview click-handler.ts, widgets.ts, meta-bind-button-widget.ts, tasks.logic.ts and canvas/LinkNode.svelte, which calls openUrl at :83. grep finds no on_navigation in src-tauri/src. CSP at src-tauri/tauri.conf.json:29 is script-src 'self' 'unsafe-eval' with no 'unsafe-inline'. The sibling <img src={value.src}> at :70 is also unchecked but is limited by the img-src CSP. collection-block-widget.ts:449 renders only the html display type.
- **Owner decision (2026-11-04):** D8 (a): only http/https/mailto/tel are clickable and open in the system browser; everything else renders as plain text.
- The audit's javascript: execution claim is probably blocked by CSP (script-src without 'unsafe-inline', tauri.conf.json:29). That is from memory of WebKit/CSP behaviour, not tested, and the dev-mode CSP was not checked. The concrete harm today: no on_navigation handler in src-tauri, so a click loads the href into the main window and the app is lost. Applying isSafeUrl to the sibling <img src> at :70 is optional (img-src CSP already limits it). Confirm that opener:default in capabilities/default.json allows openUrl for https. From memory it does.
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/098-collection-link-cells-never-navigate-app-webview.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
