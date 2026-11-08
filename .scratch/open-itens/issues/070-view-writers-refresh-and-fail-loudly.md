# 070: View writers refresh promptly and fail loudly

**Origin:** `view-engine-fixes` Issue 12, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:**
- `updateViewToolbarKey`, `updateViewIcon`, `updateViewIconColors` and `removeViewIcon` (`src/lib/features/type-definitions/type-definitions.service.ts:444-456`, `:490-492`, `:518-533`) do not pass `promptIndexRefresh`, so the Views row and pin wait for the 2 s / 10 s entries throttle after an icon or toolbar change. The pin, Show in Views, list properties and Edit view writers already pass it.
- `updateViewIconYaml` and `updateViewColorsYaml` return the input on YAML that does not parse (`type-sidebar.logic.ts:533-537`, `:555-560`), so Change icon on a broken file does nothing and says nothing. Throw as `updateViewRailYaml` does (`:579-591`), and let the caller toast.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts`: after the write, the real `vaultStore` prompt-refresh request is set.
  - The `type-sidebar.logic` test file: broken YAML throws from both icon writers.

## Notes

- **Other feature:** shares `type-sidebar.logic.ts` and `type-definitions.service.ts` with view-editor 02, 03, 05, 06 and 07. Run it beside view-editor 04 (which edits neither) or after view-editor 07, never in parallel with those five or with 09. relay-lite does not enforce this.
- `type-definitions.service.ts` is a hotspot (`docs/HOTSPOTS.md`): keep the change to the four options objects.
- **Size:** S.
