# 12: View writers refresh promptly and fail loudly

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

- **Run after (other feature):** view-editor 07 (`type-sidebar.logic.ts`, `type-definitions.service.ts`). relay-lite does not enforce this.
- `type-definitions.service.ts` is a hotspot (`docs/HOTSPOTS.md`): keep the change to the four options objects.
- **Size:** S.
