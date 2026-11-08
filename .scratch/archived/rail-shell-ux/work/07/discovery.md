# Issue 07 discovery

No `spec.md` for rail-shell-ux; the Issue is self-contained.

## Files that change

- `src/lib/core/frontmatter/properties.logic.ts:636-648` `setPropertyByBindTarget` widens to `string | number | boolean`; type follows a number / boolean value. New `typedOptionValue(option)` next to it.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`
  - `:804` `dispatchMetaBindUpdate` widens its value type.
  - `:713-760` `createMetaBindSelect`: writes `typedOptionValue`, out-of-options value as a disabled selected first option, `aria-label` / `title`.
  - `:903-936` toggle writes booleans; `:939-1016` number input writes `Number(value)` ('' stays ''), resets the shown value after a write the serializer leaves unchanged (`5.0` over `5`).
  - `:252-262` table cell: canonical-key lookup and `pickWidget(...)?.toDOM(view)` instead of always a select.
- `plugins/meta-bind-input-plugin.ts:76,103-126` canonical-key lookup; `pickWidget` moves to `widgets.ts` (plugin already imports widgets.ts, so no cycle) and is exported.
- `meta-bind-button.logic.ts:12,63-82,125` typed `value`; new `buttonConfigError(yaml)`; `validateButtonConfig` built on the same per-reason checks so the two cannot drift.
- `plugins/meta-bind-button-field.ts:23` passes the reason.
- `widgets/meta-bind-button-widget.ts:98-111` `open`: wikilink parsed by `findWikilinkInfoAtPosition`, followed through `followWikilinkInfo` (which calls `followWikilink(host, target, anchor)` and also handles a same-note `[[#heading]]` like a body link); empty / unparseable / unsafe -> `toast.error` + `false`.
- Help: `help/documentation/24-meta-bind.md`, `help/examples/markdown-editor-vault/19-meta-bind.md` (check only).

## Tests

- Move `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/meta-bind-value-types.test.ts` -> `src/tests/lib/core/markdown-editor/extensions/live-preview/`.
- `meta-bind-writers.test.ts:120,124,300-313`; `frontmatter-number-spelling.test.ts:122`; `e2e/.../meta-bind-toggle.spec.ts` drops `test.fail()`.
- `properties.logic.test.ts` (typed cases, `typedOptionValue`), `meta-bind-input-widgets.test.ts`, `meta-bind-input-plugin.test.ts`, `table-widget.test.ts`, `meta-bind-button.logic.test.ts`, `meta-bind-button-field.test.ts`, `editor-host.test.ts` (button `open`, fake host).

## Risks

- `editor-host.test.ts:246-262` pin the old `open` behaviour (`openLink(path)` with no anchor, a missing note opens nothing); updated on purpose since the Issue asks for body-link behaviour.
- A cell control is built with `toDOM` of a widget instance, so the cell gets the same listeners; `TableWidget.ignoreEvent` already covers `input`.

## Defaults taken

- Accessible name and tooltip are the canonical key itself (`status`, `_archived`).
- A whitespace-only number input writes `''` (clearing), never `0`.
- A non-wikilink, non-`http` link (`Note`, `mailto:`) counts as unparseable: toast and stop.
- A non-map YAML (empty block, a scalar) reports `expected a map with label and action`.
