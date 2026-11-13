# V5: Architecture rules, errors, tests and docs (vault mods)

Validator: opus. Date: 2026-11-05. Read-only research.

**Scout status:** none of the five scout reports exist. `.scratch/vault-mods/research/haiku/` holds only S01, S02, S03, S05, S15, S18 and S19, and no S21 to S25 file. All five scouts are treated as dead, and every question below is answered from the code. Nothing here is a scout claim, so "Refuted" lists only corrections to assumptions the task prompt and the repo docs invite.

---

## 1. Verified facts (file:line)

### 1.1 Layers and the import-graph ratchet (S21)

- ADR-0003 is active and has two amendments dated 2026-11-01. The first adds a fifth layer, `src/lib/app/`, as the composition root: `app/` may import every layer, only `src/routes` may import `app/`, and code below `app/` exposes register functions that `app/` wires (`docs/adr/0003-four-layer-source-taxonomy.md:9-17`).
- The enforced rules are `core->features`, `core->plugins`, `features->plugins`, `utils->non-utils`, `types->lib`, `components/ui->app`, `plugin->plugin` and `app-inbound` (`docs/adr/0003-four-layer-source-taxonomy.md:25-33`). The checker is `scripts/import-graph.mjs` and the test is `src/tests/lib/architecture/layer-rules.test.ts`.
- **A non-literal `import()` anywhere in `src/lib` is forbidden outright** (`docs/adr/0003-four-layer-source-taxonomy.md:35`). The scanner records `spec: null` for any `import()` whose argument is not a string literal (`scripts/import-graph.mjs:97-100`), and the test fails on it (`src/tests/lib/architecture/layer-rules.test.ts:61-64`).
- Feature-to-feature imports are allowed while they form no cycle, and `feature-cycle.test.ts` guards that (`docs/adr/0003-four-layer-source-taxonomy.md:37`).
- `plugin->plugin` imports are forbidden except for an allowlist in which `calendar`, `one-on-one` and `quick-capture` may import `periodic-notes` (`scripts/import-graph.mjs:47-51`, `docs/adr/0003-four-layer-source-taxonomy.md:32`).
- The baseline has exactly 3 entries, all `utils/` to `core/settings` (`src/tests/lib/architecture/layer-baseline.json:1-5`). `BASELINE_SIZE = 3` (`layer-rules.test.ts:32`), and the size may only go down (`layer-rules.test.ts:78-86`). Adding a baseline entry or a composition root needs owner sign-off (`ADR-0003:39`).
- Plugins today are `calendar`, `graph-view`, `kanban`, `one-on-one`, `periodic-notes`, `queryjs`, `quick-capture`, `table-of-contents`, `templates` and `word-count` (directory listing of `src/lib/plugins/`). ADR-0003 says plugins are "always compiled; toggling off is a runtime choice" (`ADR-0003:94`).
- The registration pattern for layer inversion is documented in `ADR-0003:92`, and each registration "is pinned by a lifecycle test".
- Other architecture guards a mods module must pass:
  - `pure-logic.test.ts:3-11`: `.logic.ts`, `.types.ts` and `utils/*.ts` must not reach the framework, Tauri, a store or a service.
  - `raw-invoke.test.ts:2-5`: Rust commands go through the typed `call()` in `#lib/contracts/ipc.js`, never through a raw `invoke`.
  - `event-listen.test.ts:2-7`: events go through the typed `on()`, never through a raw `listen`.
  - `ipc-mirrors.test.ts:2-8`: no hand-written copies of ts-rs types.

### 1.2 Existing registration points a mod entry point could reuse

- `railRegistryStore` (`src/lib/features/rail-shell/rail-registry.store.svelte.ts:22-77`) has `registerNavigator`, `registerLensProvider`, `registerTodaySection` and `registerFolderCreator`, and each returns an unregister function. The file comment says it exists because `features/` may not import `plugins/` (`:3-11`).
- `RailNavigator` is `{ id, label, icon: Component, component: Component, lens: () => Lens }` (`src/lib/features/rail-shell/rail-shell.types.ts:175-186`). A navigator is a panel plus a lens. It is **not** an action button that opens a modal.
- `noteActionBarActionsStore.register(action)` (`src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:13-34`) takes a `NoteHubAction` with a `run(path)`. Its only consumer is `registerOneOnOneActionBarAction` (`src/lib/plugins/one-on-one/one-on-one.service.ts:105-117`).
- Vault-lifetime registrations are wired in `initializeVault` as one unregister list (`src/lib/app/lifecycle/app-lifecycle.service.ts:247-264`), for example `registerCalendarRail()` at `:263`. App-lifetime ports are wired in `registerAppPorts()` (`src/lib/app/boot.ts`, for example `registerQueryjsBlockPorts()` and `registerDeepLinkActions`).
- The command palette takes `commands: AppCommand[]` as a prop (`src/lib/features/command-palette/CommandPalette.svelte:9-11`). `AppOverlays.svelte` passes `getBuiltInCommands()` from `src/lib/app/commands.ts`. There is no runtime command registry.

### 1.3 How QueryJS executes user code (the precedent)

- User code runs through `new Function('kb','dv','input', code)` (`src/lib/plugins/queryjs/kb-api.ts:413`) and `new Function('kb','dv', 'return (async () => {...})()')` (`kb-api.ts:552`). Neither is an `import()`, so the layer scanner does not flag them.
- The CSP allows this: `script-src 'self' 'unsafe-eval'` (`src-tauri/tauri.conf.json:29`).
- Script paths are resolved under the vault, and any path containing `..` is rejected (`kb-api.ts:526-538`). Scripts are read with `readTextFile` (`src/lib/plugins/queryjs/queryjs.service.ts:1-6`).
- User-facing docs say "QueryJS runs without a sandbox, you have full access to the DOM" (`help/documentation/13-queryjs.md:1119`).
- ADR-0010 rejected a Web Worker sandbox because `kb.ui` writes to the DOM directly (`docs/adr/0010-queryjs-kb-api-caching.md:71`). The script API is a versioned, hand-written contract (`src/lib/plugins/queryjs/contract/kb-api.v1.ts`, `ADR-0010:11`), frozen by `kb-api-contract.test.ts`.

### 1.4 Errors, toasts and Sentry (S22)

- The toast library is `svelte-sonner` (`package.json:73`). `<Toaster richColors theme="dark" />` is mounted once in `src/lib/app/AppOverlays.svelte:12`, which `src/routes/(app)/+layout.svelte:183` mounts. 41 files import `toast`.
- `debug(tag, ...)` writes to the log file when `debugLogToFile` is on and to the console when `debugMode` is on (`src/lib/utils/debug.ts:16-22`).
- `error(tag, ...)` always calls `captureSentryException(tag, <first Error arg or last arg>)` and `console.error` (`src/lib/utils/debug.ts:27-33`).
- Sentry is opt-in per vault. `captureSentryException` returns early unless a DSN is active (`src/lib/core/settings/sentry.service.ts:112-118`).
- `beforeSend` strips `breadcrumbs`, `extra`, `request` and `user` only (`sentry.service.ts:28-36`). **The exception message and stack are sent.** `frameContextLines: 0` and `stackFrameVariables: false` are set (`:81-82`).
- When Sentry is enabled, the `GlobalHandlers` integration is kept (`sentry.service.ts:63-70`), so an unhandled rejection or error is captured. There is no app-level `unhandledrejection` handler (grep over `src` and `e2e/fixtures` found none).
- The project rule says to use try/catch around `invoke` and plugin calls, to propagate errors, to show user-facing errors as toasts or inline states rather than `console.error` alone, and not to write partial data to stores (`CLAUDE.md:157-165`, rule 7 at `CLAUDE.md:31`).
- The canonical "action with run()" error pattern is `try { ... } catch (err) { error('ONE_ON_ONE', 'Failed ...', err); toast.error('Failed to create 1:1 note.'); }` (`src/lib/plugins/one-on-one/one-on-one.service.ts:110-116`).
- **QueryJS script errors do not go through `error()`/Sentry.** The block widget catches and renders an inline structured error (title, stack in `<details>`, "Run again") (`src/lib/plugins/queryjs/queryjs-block-widget.ts:271-314`). `kb.view()` errors render as `.cm-lp-qjs-error` (`kb-api.ts:415-420`). So the precedent for user-authored code is a user-visible error that is not reported to Sentry.
- The meta-bind button is the closest existing "button runs actions" surface. It runs actions in sequence and stops on the first failure (`src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:33-40`), and reports failures with `toast.error` (`:132`, `:141`).

### 1.5 Unit tests (S23)

- The vitest config sets no environment, so **the default is node**, and `resolve.conditions: ['browser']` is set for component tests (`vitest.config.ts:4-18`). Tests opt in with `// @vitest-environment jsdom` on line 1.
- QueryJS tests live in `src/tests/lib/plugins/queryjs/` (11 files). jsdom is used by `kb-api.test.ts`, `kb-api-contract.test.ts`, `kb-ui.test.ts`, `queryjs-block-widget.test.ts` and `queryjs-session.store.test.ts`. The rest run in node.
- Mocks used in those tests:
  - `@tauri-apps/api/core` (`queryjs-block-widget.test.ts:6`, `kb-api.view-page.test.ts:6`)
  - `@tauri-apps/plugin-fs` (`queryjs-block-widget.test.ts:12`, `queryjs.service.test.ts:3`)
  - `@tauri-apps/api/path` (`queryjs-block-widget.test.ts:17`)
  - the side-effect service `#lib/core/editor/editor.service.js` (`kb-api.test.ts:13`, `kbapi-firewall.test.ts:11`)
  - `chart.js/auto` (`kb-ui.test.ts:7`)
  - `queryjs-block-widget.test.ts:4-5` states "No mocks for stores or logic files... Only the Tauri IPC boundary is mocked".
- Mock allowlist: Tauri fs, core, dialog, side-effect services and DOM services. Never mock `.store.svelte.ts`, `.logic.ts` or other feature stores (`docs/TESTING.md:13-27`). Every service suite covers happy path, empty input and error (`TESTING.md:108-111`). Every `beforeEach` resets the stores it uses (`TESTING.md:114`). The "10-second litmus test" is at `TESTING.md:137`.
- 80 test files mock `svelte-sonner`, for example `vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))` (`src/tests/lib/core/settings/AppearanceSection.test.ts:7`). A toast is treated as a side-effect boundary.
- `@tauri-apps/plugin-http` is mocked in `theme-catalog.service.test.ts`, `AppearanceSection.test.ts` and `tasks/tauri-fetch-adapter.test.ts`.
- The help examples are executed as tests. `src/tests/help/queryjs-contract.test.ts` runs every QueryJS block and `__system/queryjs` script under `help/examples/` through `runQueryjsBlock` and snapshots the output (`:17-25`). `examples-scoping.test.ts` guards against unscoped queries (`:14-21`).

### 1.6 E2E (S24)

- `scripts/e2e.sh` runs `PLAYWRIGHT=true pnpm dev` on `E2E_PORT` (1421 in the main checkout, 1422-1499 in a worktree), waits up to 30 s, then runs `pnpm exec playwright test --config e2e/playwright.config.ts -x "$@"` (`scripts/e2e.sh:27-45, 89, 116`).
- The Playwright config uses chromium only, a 30 s timeout, 4 local workers and 1 local retry (`e2e/playwright.config.ts:5-24`).
- With `PLAYWRIGHT` set, Vite aliases nine Tauri modules to `e2e/mocks/*`: core, fs, dialog, event, opener, http, deep-link, window and webviewWindow (`vite.config.js:57-67, 133-136`). The same modules are excluded from the dep optimizer so that only one `virtual-fs` instance exists (`vite.config.js:113-129`).
- The `invoke` mock routes commands to `virtualFS`, `vaultIndex` or typed no-ops. `HANDLERS` is an exhaustive map over `CommandMap` (`e2e/mocks/tauri-core.ts:1-12, 431`). **A new Rust command fails `pnpm check` until it has an E2E handler.**
- The console guard fails a spec on any unknown command (`e2e/fixtures/console-guard.ts:11-35`, `ALLOWED_UNKNOWN_COMMANDS = {}`).
- Fixture vaults are in memory. `populateAndOpenVault` calls `window.__e2e.fs.populate(files)`, sets the dialog response, and clicks "Open Vault" (`e2e/fixtures/test-vault.ts:141-152`). The `vaultFiles` option overrides the files per spec (`:166-168`). The default `TEST_FILES` include `.kokobrain/settings.json` (`:120-132`). Specs that use custom files: `queryjs-basic.spec.ts:46-50`, `collection-block.spec.ts`, `rail-shell.spec.ts`, `rail-list-toolbar.spec.ts`.
- The fs mock exports `readTextFile`, `writeTextFile`, `readDir`, `exists` and others (`e2e/mocks/tauri-fs.ts:3-35`). The virtual scan skips dot-prefixed entries, as Rust does (`e2e/mocks/virtual-fs.ts:242-243`).
- The HTTP mock always returns `200 {}` (`e2e/mocks/tauri-http.ts:1-8`).
- Toasts are assertable with `page.locator('[data-sonner-toast]', { hasText })` (`e2e/specs/event-calendar.spec.ts:555`).
- **No CSP is applied in E2E.** The CSP lives only in `src-tauri/tauri.conf.json:29`. Neither `vite.config.js` nor `src/app.html` sets one (grep found nothing).

### 1.7 Docs (S25)

- User docs live in `help/documentation/NN-topic.md` (01 to 27, with 17 missing) and are indexed by a table in `help/documentation/README.md`. Each page starts with an H1, uses `##`/`###` sections, and uses `> [!TIP]`, `> [!NOTE]` and `> [!WARNING]` callouts (conventions at `help/documentation/README.md`, "Conventions Used in This Guide").
- **The help is not shipped inside the app.** It is not a Tauri resource (`tauri.conf.json` has no `resources` key per grep), and no `src/lib` code imports it. Code only cites it in comments, for example `QueryjsSection.svelte:49` and `contract/kb-api.v1.ts:23`. Users reach it through the repo README links (`README.md:19, 82`).
- QueryJS docs: `help/documentation/13-queryjs.md` (1313 lines) covers the API, the execution policy, a "full access / no sandbox" note (`:1119`) and "API version and compatibility" (`:1139`). Examples live in `help/examples/queryjs-features/` (including `__system/`), and typings in `help/examples/queryjs-globals.d.ts`. Scoping rules: `help/examples/SCOPING.md`.
- `docs/FEATURES.md` lists features by area with guide links. QueryJS is at `:45` under "Views and tools", and "Power user" is at `:50-56`. It says nothing about plugins, mods or user scripts beyond QueryJS.
- `docs/INSPIRATIONS.md:13-23` maps features to Obsidian community plugins: QueryJS to Dataview (`:16`), Templates to Templater (`:17`). There is nothing about mods, a plugin API, MCP or agents.

---

## 2. Refuted or corrected claims

No scout reports exist, so these corrections target assumptions the task framing or the repo docs invite.

1. **"A mods module can just go in `plugins/` and reuse QueryJS's `kb`."** Wrong as stated. A `plugins/mods` file importing `plugins/queryjs` breaks the `plugin->plugin` rule (`scripts/import-graph.mjs:47-51`). A `features/mods` file importing it breaks `features->plugins`. Reusing `KBAPI` needs one of three things: `app/` injecting a factory through a registration port (the ADR-0003:92 pattern), an ADR-0003 allowlist amendment with owner sign-off (`ADR-0003:39`), or living inside `plugins/queryjs`.
2. **"Load a mod as an ES module with `import(url)`."** In `src/lib`, `import(variable)` fails `layer-rules.test.ts:61-64` (`ADR-0003:35`). Use `new Function` as QueryJS does (`kb-api.ts:413, 552`), keep the dynamic import outside `src/lib`, or amend the rule. The rule exists so that a variable specifier cannot bypass the layer checks, and it was not written with user code in mind.
3. **"The rail already accepts plugin buttons."** It accepts plugin *navigators* (panel plus lens: `rail-shell.types.ts:175-186`), not click-to-run actions. A "button opens a modal" entry point needs a new registry kind in `railRegistryStore` and rendering in `Rail.svelte`. INFERRED from the type shape. I did not read `Rail.svelte`'s render loop.
4. **"Report mod failures with `error()` so they are logged."** `error()` forwards the message and stack to Sentry when the vault opted in (`debug.ts:31`, `sentry.service.ts:28-36` do not scrub the message). A mod's error text can contain note content, API responses or paths. The QueryJS precedent keeps user-script errors inline and out of Sentry (`queryjs-block-widget.ts:271-276`). Use `debug()` plus a toast or an inline error state, and keep `error()` for failures of Kokobrain's own loader code.
5. **"CLAUDE.md and TESTING.md agree on the frontend gate."** They do not. `docs/TESTING.md:197` puts `pnpm build` in every frontend gate ("all four commands" at `:198`), while `CLAUDE.md:21-23` requires `pnpm build` only when `package.json` or `pnpm-lock.yaml` changes. CLAUDE.md is the project instruction and the memory note "Gate matches what changed" agrees with it. Issues should cite CLAUDE.md rule 6.
6. **"An E2E run proves a mod works under the app's security policy."** It cannot. E2E runs in plain Chromium on the Vite dev server with no CSP, and the HTTP mock returns `{}` for every URL. CSP `connect-src` blocks and Tauri capability scopes (`http:allow-fetch` scoped to Todoist and the themes repo, `src-tauri/capabilities/default.json:224-263`) only show up in the real Tauri app.
7. **`queryjs.service.ts` `loadExternalScript` has no try/catch** (`queryjs.service.ts:4-6`), even though `CLAUDE.md:157` requires one around plugin calls. The caller catches it (`kb-api.ts:402-420`), so nothing breaks today. A mods loader should not copy this pattern without the try/catch. This is a pre-existing gap and is only noted here.

---

## 3. Answers to the scouts' open questions

**S21: where does a mods module live?**
- `plugins/mods/` fits ADR-0003's definition: optional, toggleable by settings, and the app works without it (`ADR-0003:58, 78`). The app itself must still work when a mod fails, which a plugin guarantees.
- It may import `core/`, `features/` (for example `railRegistryStore`, `noteActionBarActionsStore`) and `utils/` freely (`layer-rules.test.ts:135-151`).
- It may not import another plugin (`queryjs`, `templates`). Reusing `kb` therefore needs an `app/`-injected port, or an allowlist entry `'plugins/mods': ['plugins/queryjs']` in `scripts/import-graph.mjs:47-51` plus an ADR-0003 amendment.
- Registration happens from `app/lifecycle/app-lifecycle.service.ts` (vault lifetime, the list at `:247-264`) and is pinned by a lifecycle test (`ADR-0003:92`).
- `features/mods` would be wrong, because it cannot be toggled off and is blocked from `plugins/`. `core/` would be wrong, because the app does not break without mods.
- `layer-baseline.json` must not grow. With a plugin placement nothing needs adding.

**S22: what pattern should a failing mod action use?**
- Run every mod entry (load, manifest parse, action) inside `try/catch` with `await`. An unawaited rejection has no app handler, and when Sentry is on it goes to Sentry through `GlobalHandlers` (`sentry.service.ts:67`).
- On failure, show `toast.error('<Mod name>: <action> failed: <message>')` (the svelte-sonner pattern at `one-on-one.service.ts:113-116`) or an inline error in the mod modal with the stack in a `<details>`, as `renderStructuredError` does (`queryjs-block-widget.ts:288-314`). Log with `debug('MODS', ...)`.
- Do not write partial results to stores (`CLAUDE.md:160`).
- Reserve `error()` for loader or IPC failures in Kokobrain's own code. Whether mod errors may reach Sentry is an owner decision.
- A long-running action (the owner's "30 haiku + 10 opus" example) needs a cancel and progress surface. Nothing equivalent exists today. `toast.promise` is available in svelte-sonner, but this is INFERRED: I did not check whether the repo uses it.

**S23: how would loading and actions be tested?**
- Node environment for `mods.logic.ts`: manifest parsing, entry-point validation, path sanitising like `kb-api.ts:526-538`.
- jsdom for the modal and any component test (`// @vitest-environment jsdom` on line 1, `vitest.config.ts:13` already gives the browser runtime).
- Mock only `@tauri-apps/plugin-fs` (`readTextFile`, `readDir`) for loading, `@tauri-apps/plugin-http` for an HTTP action, and `@tauri-apps/api/core` for any new Rust command. `svelte-sonner` can be mocked as 80 files already do.
- Use the real `railRegistryStore` (and `noteActionBarActionsStore`) and assert on its getters, for example that `railRegistryStore.<newKind>` contains the mod's button after load and is empty after the unregister function runs. Never mock a store or `.logic.ts` file (`TESTING.md:23-27`).
- Each service suite needs happy path, an empty vault or no mods folder, and an error case: a mod that throws, a syntax error, or a missing file (`TESTING.md:108-111`).
- Add a lifecycle test that `initializeVault` registers and teardown unregisters, as ADR-0003:92 requires for every registration.
- If help examples ship mods, add a `src/tests/help/` contract test like `queryjs-contract.test.ts`.

**S24: can an E2E drop a mod file and click its rail button?**
- Yes for files. Pass `vaultFiles` with, for example, `'/test-vault/<mods dir>/hello/mod.js'` (`test-vault.ts:166-168`). `readTextFile` and `readDir` in `e2e/mocks/tauri-fs.ts:3-35` serve it from `virtualFS`. A dot-folder such as `.kokobrain/mods/` is hidden from the scan (`virtual-fs.ts:242-243`) but still readable by path, which matches Rust.
- Then click the rail button (`[data-rail]` is visible after open, `test-vault.ts:151`), pick the action in the modal, and assert rendered content or `[data-sonner-toast]` text.
- Limits:
  - An HTTP action needs `e2e/mocks/tauri-http.ts` extended beyond `{}`.
  - Any new Rust command (an MCP stdio spawn, for example) needs a typed handler in `HANDLERS` or `pnpm check` fails (`tauri-core.ts:9-11`).
  - A new Tauri plugin package (there is no `@tauri-apps/plugin-shell` in the repo) needs a new alias in `vite.config.js:57-67` and in the optimizer exclude list at `:116-129`.
  - CSP and capability scopes are not exercised.
- The spec would be new: TESTING.md's "run only the affected spec" table has no mods row (`TESTING.md:150-159`), so add one when the spec lands. TESTING.md:167 requires at least one E2E happy path for a new user-facing feature.

**S25: where do mod authoring docs go?**
- A new `help/documentation/28-mods.md`. 28 is the next free number, and 17 is a pre-existing gap I did not investigate. Follow the page format (H1, sections, `> [!WARNING]` callouts) and add a row to the README index table.
- Add a `docs/FEATURES.md` bullet under "Power user" (`:50-56`) and, optionally, a `docs/INSPIRATIONS.md` row (Obsidian community plugins / Templater user scripts).
- Example mods would go in `help/examples/mods-features/`, following `help/examples/SCOPING.md` (examples get copied into real vaults, so no whole-vault reads), plus a typings file like `help/examples/queryjs-globals.d.ts`.
- If the mod API is a contract, mirror ADR-0010's amendment: a hand-written `contract/mods-api.v1.ts`, a freeze test and an "API version and compatibility" section.
- The help is not bundled into the app, so an in-app "learn more" link must point to GitHub. Shipping help in the app is out of scope.
- A security/trust section is mandatory: QueryJS already says "runs without a sandbox" (`13-queryjs.md:1119`), and mods add network and agent spending.
- An ADR is warranted once the decision lands (ADR-0036). `docs/adr/README.md:102` forbids speculative ADRs, so write it with the implementation, not with the PRD.

---

## 4. Remaining gaps

- I did not read `Rail.svelte`. Exactly how navigators render as buttons, and whether a non-navigator "action" item fits the rail item list (`rail-items.logic.ts`), is unverified.
- I did not check the `NoteHubAction` shape in `note-action-bar.logic.ts`, so I cannot say whether a mod could register there as-is (it seems tied to note creation, typed by `typeName`).
- I did not check whether svelte-sonner's `toast.promise` or `toast.loading` is used anywhere, which matters for long agent runs.
- Not investigated: whether `new Function` code can reach `window.__TAURI_INTERNALS__` and call any Tauri command allowed by the capability. This is a trust-boundary question for the security validator (S05/S18 theme), not verified here.
- How MCP or LLM calls would be made is out of this theme: there is no shell plugin and HTTP is scoped to two hosts. Each needs a Rust command or a capability change, plus a CSP review.
- `help/documentation/17-*.md` is missing. The reason was not investigated.
- `feature-cycle-baseline.json` was not read. It only matters if mods were placed in `features/`, which this report advises against.

---

## 5. Constraints the vault-mods design must respect

1. **Placement:** `src/lib/plugins/mods/`. Register into feature registries (`railRegistryStore`, a new action kind) from `app/lifecycle` (vault lifetime) and unregister at teardown, with a lifecycle test (`ADR-0003:92`). Do not grow `layer-baseline.json` (`layer-rules.test.ts:32, 78-86`).
2. **No plugin-to-plugin import.** Reusing `kb`/QueryJS needs an `app/` port or an owner-approved allowlist amendment in `scripts/import-graph.mjs:47-51` plus ADR-0003.
3. **No `import(variable)` in `src/lib`** (`ADR-0003:35`). Evaluate mod code the QueryJS way (`new Function`, which `'unsafe-eval'` at `tauri.conf.json:29` allows), or ask the owner for a rule change.
4. **Typed IPC only:** new Rust commands go through `call()`/`CommandMap` (`raw-invoke.test.ts`), events through `on()` (`event-listen.test.ts`), DTOs through ts-rs (`ipc-mirrors.test.ts`), and each command gets an E2E `HANDLERS` entry (`tauri-core.ts:9-11`).
5. **Pure logic stays pure.** Manifest parsing and validation go in `mods.logic.ts` with no Tauri, store or framework imports (`pure-logic.test.ts:3-11`). Fs and HTTP go in `mods.service.ts`.
6. **Errors:** every mod call is awaited inside `try/catch`, the user sees a toast or inline error naming the mod and action, and diagnostics go to `debug('MODS', ...)`. Mod-authored errors do not go to `error()`/Sentry by default (`debug.ts:31`, `sentry.service.ts:28-36`, precedent `queryjs-block-widget.ts:271-276`). Stores are not updated with partial results (`CLAUDE.md:160`).
7. **Network:** a mod HTTP or MCP call cannot use webview `fetch` to arbitrary hosts (CSP `connect-src`, `tauri.conf.json:29`). The Tauri HTTP plugin is scoped per URL (`capabilities/default.json:224-263`). ADR-0035 rejected widening the CSP (`docs/adr/0035-remote-theme-catalog.md:21, 30`). Any widening is an owner decision and should get its own ADR.
8. **Tests:** no store or `.logic.ts` mocks. Assert on real registry getters. Cover happy, empty and error for each service. Use jsdom only where DOM or derived caching is asserted. Add at least one E2E happy path that seeds a mod via `vaultFiles` and asserts rendered output or toast text (`TESTING.md:167, 174`).
9. **Gate:** frontend-only changes run `pnpm check` + `pnpm vitest run`. Add `pnpm build` only on dependency changes (`CLAUDE.md:21-23`; TESTING.md:197 conflicts and is the stale one). Rust plus frontend runs all three.
10. **Docs:** `help/documentation/28-mods.md` plus a README index row, a `docs/FEATURES.md` bullet, scoped examples under `help/examples/` with a guard or contract test, and an ADR when the decision is implemented, not before (`docs/adr/README.md:102`).
