# 243: The Tasks section tags are saved per vault

**Origin:** owner request, 2026-11-12, during the Tasks view UX review. Issue numbers in this text are open-itens numbers.

**What to build:** The section tags typed in the Tasks view (Issue 242) come back after an app restart, per vault. Today the field is not saved and returns to `#to-list` on every start.

- A `tasksView` key in the per-vault `.kokobrain/settings.json`, through the settings store and service like the other sections (`src/lib/core/settings/settings.types.ts`, `settings.store.svelte.ts`, and the per-section merge in `settings.service.ts`, as `todoist` does). `core/settings` must not import types from `features/tasks` (core to features fails `layer-rules.test.ts`), so core types `tasksView` as an opaque JSON value and `features/tasks` parses and validates it. In this Issue it holds `{ version: 1, sectionTag: string }`, the textbox text as typed.
- **Load.** When the vault's settings have loaded, `tasksStore.sectionTag` takes the saved value. A missing key or a missing `sectionTag` gives `#to-list`. An invalid value gives `#to-list`, logs with `error()` and shows a toast, and is not written back until the user changes the field.
- **Save.** A change that `updateSectionTagFilter` applies (after the textbox's debounce, or from Clear tag) saves the new text through the settings service's existing save path. No new `writeTextFile` site. Unknown keys inside `tasksView` survive a save, so Issue 123 can add the rest of the view's state to the same key.
- `tasksStore.reset()` still restores `#to-list`; the next vault's settings then load its own value.
- `help/documentation/10-tasks-and-todoist.md` says the section field is remembered per vault.

**Blocked by:** 242, 030

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: save the section tags per vault.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, with the real settings store and the real `tasksStore`, mocking only `@tauri-apps/plugin-fs`: type `#to-list #work` and let the debounce run; the saved JSON holds it under `tasksView.sectionTag`; a fresh load from that JSON restores it in `tasksStore`. Fails today.
- [ ] A settings file without `tasksView` loads `#to-list`. One with `tasksView: 42` loads `#to-list`, logs, and is not written until the next change.
- [ ] Unknown keys inside `tasksView` survive a save.
- [ ] A vault switch loads the second vault's value, never the first one's.
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108). It sits off the main chain because it waits on Issue 030: a settings file that was never loaded must not be saved over. Launch it between two chain Issues once 030 is done.
- Issue 123 extends `tasksView` with the rest of the view's state and keeps `sectionTag` until Issue 116 turns the saved tags into heading source cards.
