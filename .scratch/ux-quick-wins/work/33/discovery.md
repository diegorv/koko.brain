# Issue 33 discovery

Same files as Issue 32 (`work/32`); line numbers below are at 7a578411e.

## Files that change

- `src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte`
  - `:51-56` `MODE_LABELS` becomes `MODES` (label + description); `:323-341` each `Select.Item` renders a `div` with `[data-option-label]` and `[data-option-description]` (a `div`, since `select-item.svelte:21` styles the last child `span`). Trigger `w-28` -> `w-40`.
  - `$props.id()` for `${uid}-expr-error` and `${uid}-key-error`; `:266-272` expression input and `:223-230` key input get `aria-invalid` / `aria-describedby` while `exprError` / `isRefusedKey`.
  - `:354-355` `exprError` paragraph shows `Not saved: {exprError}` (always an unsaved refusal). Refused key copy unchanged: the key is saved, a run skips it.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`
  - `$props.id()` ids for create path, template and rename errors; `aria-invalid` / `aria-describedby` on Create note path (`:564`), Create note template (`:579`), Rename to (`:489`).
  - Copy: refused (`pathRefused`, `templateRefused`, `renameRefusal`) -> "Not saved: ..."; stored invalid -> "A run ignores this path/template/rename: ...". `:458` blank filter -> `Not saved: {BLANK_VALUE_ERROR}` (constant untouched, help `:62` substring kept).
  - `:519-533` icon button only `{#if rule.icon}`: outline, text "Legacy icon on move", title `Legacy icon on move: pack:name`; muted `[data-legacy-icon-hint]` under Move to folder pointing to `_icon`. `iconLabel` (`:364`) goes.
- `src/lib/features/auto-organize/auto-organize.logic.ts:511` `"if missing"` -> `"Set if missing"`.
- `help/documentation/22-auto-organize.md:68,328,339,341,485` new labels; `:485` says the button shows only on rules with a legacy icon.
- Tests: `AutoOrganizeRuleRow.test.ts` (choose helper matches `[data-option-label]`, falling back to the option text for Selects without one; mode labels; new describes), `auto-organize.logic.test.ts:859-860,1247-1248`, `auto-organize.service.test.ts:268,272`. e2e `auto-organize.spec.ts`: add a check that the mode triggers show their labels whole.

## Prior art

- `AutoOrganizeRuleRow.test.ts` `render`, `commit`, `choose`, `propertyRows`, `field`; option list reads at `:403-416`, `:810-823`.
- e2e "the source menus show Expression whole" (`auto-organize.spec.ts:132-149`) for the clipping check.

## Risks

- Select.Item `children` typed as a snippet with `{selected, highlighted}`; passing plain content must type-check (`pnpm check`).
- Wider trigger: guarded by the e2e row-fit test.

## Defaults taken

- Generated messages are kept verbatim after "Not saved: " (no case change), e.g. "Not saved: The name uses ...". Copy this ticket owns starts lower case: "Not saved: the path must end in .md and must not start with /."
- A refusal wins over a stored-invalid message while both hold.
- Hint copy (prototype `:674`): "The legacy icon applies only from the moving rule. For new rules set the `_icon` property instead."
