# 37 discovery: mod descriptions in Labs, legible run view status and progress

No `spec.md` in `.scratch/ux-quick-wins/`; the Issue is the spec.

## Files that change

- `src/lib/plugins/mods/mods.store.svelte.ts:4-24`: `ModStatusEntry.description?: string`.
- `src/lib/plugins/mods/mods-host.service.ts`: the four upserts carry it with a conditional spread (no `description: undefined` key, so existing `toEqual` entry tests stay exact): `recordLoadError` `:758` (`manifest?.description`), `loadMod` `:843`, `listDisabledMod` `:873`, `disableMod` `:1126` (`previous?.description`).
- `src/lib/plugins/mods/ModsStatusList.svelte:94-102`: a muted `text-meta` `<p data-mod-description>` under the name row when the description is non-empty; the state label gets `title="Loaded in 42 ms"` (`< 1 ms` at 0); the inline " · 42 ms" goes; `data-mod-load-ms` moves onto the state label span.
- `src/lib/plugins/mods/ModActionPicker.svelte:108`: status class `text-success` on done, `text-destructive` on failed, `text-muted-foreground` otherwise; text unchanged. `:111-117`: progressbar `aria-label="{title}, {done} of {total}"`. `:128`: log box `role="log"`.
- `help/documentation/28-mods.md:54-55`: the description line and the tooltip.
- Tests: `src/tests/lib/plugins/mods/mods-host.service.test.ts`, `ModsStatusList.test.ts` (`:107-135` updated on purpose), `ModActionPicker.test.ts`.

## Plan

1. Failing host tests (real host, fs mocked): description in the entry after load; none gives no key; kept by `disableMod`, by a disabled-at-start listing, and by a load error after the manifest parsed (`main.js` with no default export).
2. Failing list tests: description line shown; absent or empty gives no `[data-mod-description]`; row has no "Loaded · "; label `title` "Loaded in 42 ms" / "Loaded in < 1 ms"; `data-mod-load-ms` intact.
3. Failing picker tests: progressbar `aria-label` "Slow job, 1 of 4"; status class on Failed/Done with same text; log `role="log"`.
4. Implement, then help.

## Prior art

- Host entry tests in `mods-host.service.test.ts` "per-mod switch" (`:934-1000`) and "load time" (`:2468-2610`).
- List tests `ModsStatusList.test.ts:107-135`; picker run tests `ModActionPicker.test.ts:144-200`.

## Risks and defaults

- Default 37.1: load time moves to the tooltip, as triage recorded.
- Default: the `title` sits on the state label span (the one that says Loaded), which also carries `data-mod-load-ms`; an error or disabled label has neither.
- Default: an empty-string description renders no line (same as absent).
- Default: `help/documentation/mods/01-anatomy-and-loading.md:432,453` and `mods/15-errors-and-debugging.md:277` also say "Loaded · 42 ms"; those lines are reworded to the tooltip so the help does not describe a UI that is gone. Nothing else in those files changes.
- Cancelled stays muted (not in the criteria). E2E reads only the status text, which is unchanged; the E2E gate runs in deliver.
