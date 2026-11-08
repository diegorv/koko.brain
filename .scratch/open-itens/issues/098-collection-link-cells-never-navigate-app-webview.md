# 098: Collection link() cells never navigate the app webview and drop unsafe schemes

**Origin:** `audit-2026-11-05` Issue 132, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/audit-2026-11-04/issues/08-collection-link-safe-open.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs link() cells in a view. Owner decision D8 (a) is recorded.

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/features/collection/CollectionTableView.svelte:67-68 still renders `<a href={value.href}>` with no isSafeUrl check and no onclick. It sits inside `<tr onclick={() => onClickRow?.(record)}>` (:54-57), so a click navigates the main webview and also fires the row click. evaluator.ts:424-427 still builds the link from any string. `rg on_navigation src-tauri/src` finds nothing. git log on CollectionTableView.svelte shows only refactor/perf commits since (48bf52fe9, 94f9833e0), none touching links.

**Stale in the text below:** Line refs are roughly current. The tr onclick is at :55-56 (the Issue says :57), the <a> at :68 and the <img> at :70. The evaluator link builder is at evaluator.ts:424-427. Nothing else is stale.

**What to build:** In CollectionTableView.svelte (:67-68), a link() value renders as a clickable link only when isSafeUrl(href) (src/lib/utils/sanitize-url.ts) is true. Otherwise only the display text is shown. Clicking calls preventDefault and stopPropagation, so the webview never navigates and the row's onClickRow (:57) does not fire, then opens the target the same way canvas LinkNode does (openUrl from @tauri-apps/plugin-opener for http/https/mailto/tel). Any href that isSafeUrl rejects, or that is not http/https/mailto/tel (a note path, a relative path), renders as plain text.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first in src/tests/lib/features/collection/CollectionTableView.svelte.test.ts: render a result whose cell is link('javascript:alert(1)', 'x'), then assert no <a> has an href starting with javascript: and the text 'x' is rendered. Fails today.
- [ ] An https link cell, when clicked, calls the mocked plugin-opener openUrl with the URL, the click event is defaultPrevented, and onClickRow is not called.
- [ ] Existing CollectionTableView and expression methods tests (methods.test.ts:499-520) still pass.
- [ ] pnpm check, pnpm vitest run and pnpm build pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/archived/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `collection-href-scheme`:** real, low. Root cause: link() puts any string into <a href> with no scheme check and no click handling. Every other link sink in the app filters through isSafeUrl and opens through plugin-opener. The claimed javascript: execution is probably blocked by the CSP, which allows 'unsafe-eval' but not 'unsafe-inline'. That comes from memory of the CSP spec and WebKit behaviour, was not tested at runtime, and the dev-mode CSP was not checked. What clearly remains: with no Tauri navigation handler, a click on any link() cell (https, a note path, asset:) loads that target into the main app webview, so the app is lost along with any unsaved state. The click also bubbles to the row's onclick.
  Evidence: src/lib/features/collection/expression/evaluator.ts:424-428 builds { __display:'link', href: String(arg) } with no validation. src/lib/features/collection/CollectionTableView.svelte:68 renders <a href={value.href}> with no onclick, inside a <tr onclick> (:57). Safe sinks for comparison: src/lib/utils/sanitize-url.ts (isSafeUrl), used by live-preview click-handler.ts, widgets.ts, meta-bind-button-widget.ts, tasks.logic.ts and canvas/LinkNode.svelte, which calls openUrl at :83. grep finds no on_navigation in src-tauri/src. CSP at src-tauri/tauri.conf.json:29 is script-src 'self' 'unsafe-eval' with no 'unsafe-inline'. The sibling <img src={value.src}> at :70 is also unchecked but is limited by the img-src CSP. collection-block-widget.ts:449 renders only the html display type.
- **Owner decision (2026-11-04):** D8 (a): only http/https/mailto/tel are clickable and open in the system browser; everything else renders as plain text.
- The audit's javascript: execution claim is probably blocked by CSP (script-src without 'unsafe-inline', tauri.conf.json:29). That is from memory of WebKit/CSP behaviour, not tested, and the dev-mode CSP was not checked. The concrete harm today: no on_navigation handler in src-tauri, so a click loads the href into the main window and the app is lost. Applying isSafeUrl to the sibling <img src> at :70 is optional (img-src CSP already limits it). Confirm that opener:default in capabilities/default.json allows openUrl for https. From memory it does.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/archived/audit-2026-11-04/issues/08-collection-link-safe-open.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
