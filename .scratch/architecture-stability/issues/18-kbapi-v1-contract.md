# 18: Versioned KBAPI v1 contract (typed contract, kb.version, surface snapshot)

**What to build:**
- **Contract file.** Add a hand-written `src/lib/plugins/queryjs/contract/kb-api.v1.ts` (a `.ts`, not a `.d.ts`: `tsconfig.json:9` sets `skipLibCheck: true`, which would silently skip type errors inside a `.d.ts`). It declares `KBApiV1`, `KBUIV1`, `DataArrayV1<T>`, `KBDateTimeV1`, `KBPageV1`, `KBLinkV1`, `KBTaskV1` and the ui option types.
- **Strict variance.** Declare contract members as function-typed properties (`pages: (source?: string) => DataArrayV1<KBPageV1>`), not method signatures. Methods are checked bivariantly, so making a parameter required or narrowing a union would still pass `implements`.
- **DataArray.** Split it into an implementable `DataArrayV1<T>` (the class implements it) and a script-facing `DataArrayV1<T> & { [k: string]: DataArrayV1<unknown> }` for the Proxy property mapping. A class cannot implement the index signature.
- **No outside imports.** The contract imports nothing from `#lib/types/`, `#lib/features/` or generated bindings.
- **Compile-time check.** `KBAPI implements KBApiV1`, `KBUI implements KBUIV1`, `DataArray implements DataArrayV1`, `KBDateTime implements KBDateTimeV1`. KBPage, KBLink and KBTask are interfaces: `queryjs.types.ts` re-exports or aliases the V1 types instead.
- **Script globals.** Put `declare const kb: KBApiV1; declare const dv: KBApiV1;` in a separate file outside the app tsconfig `include`, for editor tooling only. `input` exists only inside `view()` scripts; declare it there, not globally.
- **Version.** Add `readonly version = 1`, an integer major.
- **Version policy.** Scripts feature-detect with `typeof kb.x`. A new KBAPI or KBUI member is additive. A new DataArray member or a new page-root key is a MAJOR change: the Proxy maps unknown names across items only when `!Reflect.has(target, prop)` (`data-array.ts:20`), and frontmatter is spread onto the page root (`queryjs.logic.ts:159-163`), so both can shadow a user's frontmatter key.
- **Surface snapshot.** Add a runtime test that freezes, for KBAPI/KBUI/DataArray/KBDateTime, the prototype member names plus the instance's own keys (so `version` and `container` are covered), with `awaitAllPending`, `_values` and the TS-private methods (`runView`, `ensureCache`, `renderValue`, `resolveScriptPath`) marked internal. It also freezes the key set and value `typeof` of a fixture `KBPage` and `KBPage.file`.
- **Docs.** Fix `13-queryjs.md` to match the code (never the other way round), and document the version policy.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/plugins/queryjs/{kb-api.ts,kb-ui.ts,kb-ui.types.ts,data-array.ts,kb-datetime.ts,queryjs.types.ts,queryjs.logic.ts:107-166}; src/lib/features/collection/collection.logic.ts:28-56; help/documentation/13-queryjs.md:122-160,281; docs/adr/0010; CLAUDE.md Live Preview 8-10, Indexing & Watcher 12

- [x] The contract file exists, declares every public member, and imports nothing from `#lib/types`, `#lib/features` or generated bindings
- [x] The four classes `implements` their V1 interfaces. Deleting `paragraph` from KBAPI, or making an optional parameter of `pages` required, fails `pnpm check` (check by hand once, then revert)
- [x] A test asserts `kb.version === 1` and `dv.version === 1`
- [x] The surface snapshot test fails when a member is added or removed on any of the four classes, and when `KBPage` or `KBPage.file` gains or loses a key or changes a value type
- [x] 13-queryjs.md matches the code, and an "API version and compatibility" section states the policy above
- [x] ADR-0010 gets a short amendment naming the contract file as the public surface

## Notes

- **Why:** user notes embed scripts against this API, which has no version and no types, so any change can silently break user content.
- **Docs drift from the code:**

  | Field | Docs say | Code does |
  |---|---|---|
  | `file.path`, `file.folder` | relative | absolute |
  | `file.name` | without extension | with extension |
  | `file.basename` | alias for name | differs from name (name has the extension) |
  | `ctime` / `mtime` | DateTime | number, in ms |
  | type names | DV* | KB* |
  | `kb.page("projects/my-project.md")` example | finds the page | always undefined (keyed by absolute path, `kb-api.ts:89-91`) |
  | `.find(p => p.file.name === 'README')` example (doc line 281) | matches | never matches |
  | root keys `tags`, `organized`, `archived`, `favorite` | undocumented | always present |

- **Hand-written, not generated:** `tsc --declaration` would emit private members and the constructor's DTO types, and would make the contract follow the code instead of constraining it.
- **Compatibility risk:** some user script may rely on the documented (wrong) behaviour.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/18-kbapi-v1-contract`: typed KBAPI v1 contract (`contract/kb-api.v1.ts`) implemented by KBAPI / KBUI / DataArray / KBDateTime, `kb.version` = 1, surface + page-shape snapshot test, script globals typed with the recursive `KBScriptApiV1` / `ScriptDataArrayV1` view (compiler-probed), 13-queryjs.md corrected with an "API version and compatibility" section, ADR 0010 amendment. Deliver fix round: compile-time assertion that the script view's chain-key lists match the DataArray-returning members of DataArrayV1; ADR amendment names the script-facing view. Reviews: round 1 CHANGES_REQUESTED (1 major, 1 minor, 2 nits, all fixed), round 2 APPROVED (2 nits, both fixed). Tests: `pnpm check` 0 errors; full suite 390 files, 9314 passed, 1 skipped, 1 todo; `pnpm build` ok (log test-logs/architecture-stability/18-deliver.log).
