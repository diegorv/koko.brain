# Types, Build and Test

How to get type checking for a mod, how to write a mod in TypeScript (or with npm packages) and bundle it into the one `main.js` the app loads, and how to test a mod in vitest without the app.

None of this is required: the app loads a hand-written `main.js` as it is. These are tools for the author, and they all run outside the app.

## The declaration file

[`help/examples/mods/kokobrain-mod.d.ts`](../../examples/mods/kokobrain-mod.d.ts) types everything a mod receives. It is standalone: no imports, and it compiles on its own with the DOM lib. Copy it next to your `main.js` (or into the `types/` folder of a build project).

It has three parts:

| Part | Types | Stability |
|------|-------|-----------|
| 1. Contract v1 | `ModV1`, `ModContextV1`, `ModRunV1`, `ModActionV1`, `ModUiV1`, `ModVaultV1` and the other `...V1` types | **stable**. Verbatim from the app's contract. A test in the app (`src/tests/help/mods-types.test.ts`) fails the app's type check when this part differs from the contract the app is built against |
| 2. `ctx.labs` | `ModLabs`, `ModPlacement` | **unstable**. Experimental, outside the contract |
| 3. `ctx.app`, `ctx.kb()` | `RawApp`, `RawKb`, `RawKbPage`, `RawEditorView` and the other `Raw...` types | **raw**. Hand-written, partial and loose. Nothing checks them against the app |

Two entry types sit on top:

| Type | `onload` receives | Use it when |
|------|-------------------|-------------|
| `Mod` | `ModContext`: the contract plus `labs`, `app` and `kb` | the mod uses `ctx.labs`, `ctx.app` or `ctx.kb()`, or you do not care |
| `ModV1` | `ModContextV1`: the contract only | you want any use of `labs`, `app` or `kb` to be a type error |

> [!NOTE]
> The raw types list only the members a mod usually needs, and some are narrower than the real objects (`RawSettingsStore` types two fields, `RawDataArray` a dozen methods, the rail registry's Svelte-component registrations take `unknown`). The real members are in [Raw app access](09-raw-app.md) and [Querying the index](10-querying-the-index.md). For a member the types miss, cast: `/** @type {any} */ (ctx.app).someMember`, or extend your copy of the file.

## Type checking a plain main.js

The app evaluates `main.js` as plain JavaScript and refuses any `import` (see [Anatomy and loading](01-anatomy-and-loading.md)). So the types have to live in comments: a JSDoc annotation that points at the `.d.ts` with an inline `import('./kokobrain-mod')`. Comments are never evaluated, so the loader sees a normal file.

### Turning the check on

1. Put `kokobrain-mod.d.ts` next to `main.js`.
2. Make `// @ts-check` the first line of `main.js`. Editors with the TypeScript language service (VS Code, for example) then check the file without any config.
3. Annotate the default export, with one of the patterns below. Without an annotation nothing is checked (see [What does not work](#what-does-not-work)).

Extra files in a mod folder are harmless: the app reads only `manifest.json` and `main.js`, and a change to any other file there does not reload the mod.

To check from a terminal, a `jsconfig.json` (or `tsconfig.json`) next to `main.js`:

```json
{
	"compilerOptions": {
		"checkJs": true,
		"strict": true,
		"noEmit": true,
		"target": "ES2022",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"lib": ["ES2022", "DOM"],
		"types": []
	},
	"include": ["main.js", "kokobrain-mod.d.ts"]
}
```

Then `npx tsc -p jsconfig.json` (TypeScript installed anywhere outside the vault).

### Patterns that work

All of these type `ctx` and report wrong arguments. Every one keeps exactly one line that starts with `export default`.

**A typed constant.** Best for a long mod: the `export default` line is a plain identifier.

```javascript
// @ts-check
/** @type {import('./kokobrain-mod').Mod} */
const mod = {
	onload(ctx) {
		ctx.addAction({
			id: 'hello',
			title: 'Say hello',
			run: async (_input, run) => {
				const name = await run.ui.prompt({ title: 'Your name' });
				if (name === null || run.signal.aborted) return;
				ctx.notify(`Hello, ${name || 'stranger'}`, { kind: 'success' });
			},
		});
	},
};
export default mod;
```

**An inline cast.** The cast sits after `export default` on the same line, which the loader accepts:

```javascript
// @ts-check
export default /** @type {import('./kokobrain-mod').Mod} */ ({
	onload(ctx) {
		ctx.notify('Loaded');
	},
});
```

**`@satisfies`** (TypeScript 5.0 and later). Same shape as the cast, but it checks the object instead of asserting it:

```javascript
// @ts-check
export default /** @satisfies {import('./kokobrain-mod').Mod} */ ({
	onload(ctx) {
		ctx.notify('Loaded');
	},
});
```

**Per-function `@param`.** Useful for helpers that take `ctx` or `run`, and with `@typedef` to keep the comments short:

```javascript
// @ts-check
/** @typedef {import('./kokobrain-mod').ModContext} Ctx */
/** @typedef {import('./kokobrain-mod').ModRunV1} Run */

/**
 * Appends a line to a note, creating it when missing.
 * @param {Ctx} ctx
 * @param {Run} run
 * @param {string} path vault-relative
 * @param {string} line
 */
async function appendLine(ctx, run, path, line) {
	if (!(await ctx.vault.exists(path))) {
		await ctx.vault.create(path, `${line}\n`);
		return;
	}
	if (run.signal.aborted) return;
	const text = await ctx.vault.read(path);
	await ctx.vault.write(path, `${text}${text.endsWith('\n') ? '' : '\n'}${line}\n`);
}

export default {
	/** @param {Ctx} ctx */
	onload(ctx) {
		ctx.addAction({
			id: 'log-line',
			title: 'Log a line',
			input: { placeholder: 'Text' },
			run: async (text, run) => {
				if (!text.trim()) return;
				await appendLine(ctx, run, 'Mod log.md', text.trim());
			},
		});
	},
};
```

What a check reports, for example:

| Code | Error |
|------|-------|
| `ctx.notify('x', { kind: 'bogus' })` | `Type '"bogus"' is not assignable to type 'ModNotifyKindV1 \| undefined'` |
| `ctx.vault.read(1)` | `Argument of type 'number' is not assignable to parameter of type 'string'` |
| `ctx.addAction({ id: 'a', run: () => {} })` | `Property 'title' is missing ... but required in type 'ModActionV1'` |
| `ctx.labs.place('a', { palette: false })` | `Type 'false' is not assignable to type 'true'` |
| `ctx.app` in a mod typed `ModV1` | `Property 'app' does not exist on type 'ModContextV1'` |

> [!TIP]
> A clean type check is not a loader check. The types cannot see the line rules (one `export default` at column 0, no `import`). Run the [loader-rule guard](#the-loader-rule-guard) too.

### What does not work

| Attempt | Result |
|---------|--------|
| `export default { onload(ctx) { ... } }` with `// @ts-check` and no annotation | `ctx` is implicitly `any`. With `strict` the check reports `TS7006: Parameter 'ctx' implicitly has an 'any' type`; without it nothing is checked at all |
| `import type { Mod } from './kokobrain-mod';` as a real statement | TypeScript: `TS8006`, type imports are only valid in `.ts` files. The app: the file fails to load with `main.js: use exactly one "export default" and no "import"; a mod is one file` |
| Any real `import` or `export` statement besides the one `export default` | same load failure. Only the `import('...')` inside a JSDoc comment is safe |
| Indenting `export default`, or writing `export default{` with no whitespace after `default` | the loader does not see it: `main.js: found no "export default"; a mod default-exports an object with onload` |
| A comment or template literal with a line that starts with `export default` | the loader counts it: `main.js: found 2 "export default" lines; use exactly one` |

## Building a mod from TypeScript

Write the mod in TypeScript, split it into files, use npm packages, and let esbuild bundle everything into one `main.js` that follows the loader rules. Nothing here needs any repository but your own.

### Keep the project outside the vault

Put the project anywhere outside the vault (for example `~/dev/my-mods/`) and let the build write only `main.js` and `manifest.json` into `<vault>/_system/mods/<id>/`. Inside the vault, `node_modules` and your sources would be thousands of files the app's file tree, watcher and index walk, and `.md` files in them would show up in search and QueryJS results.

The built `main.js` is generated: edit the sources, never the installed file. The next build overwrites it.

### Project layout

```
my-mods/
  package.json
  tsconfig.json
  types/kokobrain-mod.d.ts        copied from help/examples/mods/
  scripts/loader-rules.mjs
  scripts/build.mjs
  scripts/check-bundle.mjs
  mods/hello/manifest.json
  mods/hello/src/index.ts
  mods/hello/src/greeting.ts
  test/fake-ctx.ts
  test/load-mod.ts
  test/hello.test.ts
```

The folder name under `mods/` is the mod id: it must equal the manifest `id` and becomes the folder name in the vault.

`package.json`:

```json
{
	"name": "my-mods",
	"private": true,
	"type": "module",
	"scripts": {
		"build": "node scripts/build.mjs",
		"watch": "node scripts/build.mjs --watch",
		"check-bundle": "node scripts/check-bundle.mjs",
		"typecheck": "tsc -p tsconfig.json",
		"test": "vitest run"
	},
	"devDependencies": {
		"@types/node": "26.6.6",
		"esbuild": "0.28.2",
		"typescript": "7.0.2",
		"vitest": "5.1.0"
	}
}
```

These are the versions this setup was tested with (Node 26). Newer versions are likely fine. With pnpm, esbuild's install script must be allowed to run: add `allowBuilds:` with `esbuild: true` to `pnpm-workspace.yaml`. npm runs it without any setting.

`tsconfig.json` (type checking only; esbuild does the compiling):

```json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"target": "ES2022",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"lib": ["ES2022", "DOM"],
		"types": ["node"],
		"noEmit": true,
		"verbatimModuleSyntax": true,
		"skipLibCheck": true
	},
	"include": ["types", "mods/*/src", "test"]
}
```

`types: ["node"]` is for the tests and scripts. Mod sources run in the app's web view, which has no Node APIs: do not use `node:` modules in `mods/*/src`.

`mods/hello/manifest.json`:

```json
{ "id": "hello", "name": "Hello", "version": "0.1.0", "description": "Says hello" }
```

`mods/hello/src/greeting.ts` (plain logic, no `ctx`, easy to test):

```ts
/** Greeting for the hour of `now`, in local time */
export function greeting(now: Date): string {
	const hour = now.getHours();
	return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
```

`mods/hello/src/index.ts`. In a source file `import` is fine: esbuild inlines every import, and `import type` disappears. `satisfies Mod` types `ctx` without widening the object:

```ts
import type { Mod } from '../../../types/kokobrain-mod';
import { greeting } from './greeting';

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'say-hello',
			title: 'Say hello',
			run: async (_input, run) => {
				const name = await run.ui.prompt({ title: 'Your name' });
				if (name === null || run.signal.aborted) return;
				ctx.notify(`${greeting(new Date())}, ${name || 'stranger'}`, { kind: 'success' });
			},
		});
		ctx.addRailButton({ id: 'main', title: 'Hello', icon: 'lucide:sparkles' });
	},
} satisfies Mod;
```

### The esbuild options

| Option | Value | Why |
|--------|-------|-----|
| `bundle` | `true` | One self-contained file. The app installs no packages and resolves no imports |
| `format` | `'iife'` | The output is `var __mod = (() => { ... })();`, with no `import` or `export` of its own |
| `globalName` | `'__mod'` | The IIFE's exports land in `var __mod`, which the footer reads |
| `footer` | `{ js: 'export default __mod.default;' }` | The one `export default` line the loader needs, as the last line, at column 0 |
| `banner` | a `//` comment line | Optional. It must never start with `export default` |
| `target` | `'safari16'` | The app runs in WebKit on macOS; esbuild lowers syntax newer than that |
| `keepNames` | `true` | Keeps function and class `.name` after bundling, so names in stack traces and logs stay readable |
| `legalComments` | `'none'` | Drops license comments from bundled packages |
| `charset` | `'utf8'` | Keeps non-ASCII text as is instead of `\uXXXX` escapes |
| `write` | `false` | The output stays in memory, so the build can check it before it touches the vault |
| `minify` | not set | Minifying turns a string such as `"a\nexport default b"` into a template literal with a real line break, and that line then counts as a second `export default` (verified with esbuild 0.28.2). It also makes stack traces unreadable and saves almost nothing |

The default export of `index.ts` must be the mod object. esbuild exposes it as `__mod.default`.

### The loader-rule guard

`scripts/loader-rules.mjs` copies the app's two loader rules: exactly one line matching `^export\s+default\s+`, and the file must parse as a strict-mode function body after that line is rewritten. It only parses (`new Function` builds the function but never calls it), so it cannot catch errors that happen when the code runs, such as a throw in `onload`; [the tests](#testing-in-vitest) do that.

```js
// The app's loader rules for main.js, copied so a bad bundle fails here and
// not in the app: exactly one line starting with "export default", and the
// file must parse as a strict-mode function body. Parse only: nothing runs.
const EXPORT_DEFAULT = /^export\s+default\s+/m;
const EXPORT_DEFAULT_ALL = /^export\s+default\s+/gm;

/** Throws when `source` would not load as a mod's main.js. */
export function checkBundle(source, label) {
	const count = source.match(EXPORT_DEFAULT_ALL)?.length ?? 0;
	if (count !== 1) throw new Error(`${label}: the loader needs exactly one "export default" line, found ${count}`);
	const body = source.replace(EXPORT_DEFAULT, '__kokobrainModExports.default = ');
	try {
		new Function('__kokobrainModExports', `"use strict";${body}`);
	} catch (err) {
		throw new Error(`${label}: ${err.message}`);
	}
}

/** Throws when the manifest would not load (the main rules only). */
export function checkManifest(text, folder) {
	const m = JSON.parse(text);
	if (typeof m.id !== 'string' || m.id.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)) throw new Error(`${folder}: manifest id must be lowercase letters and digits, joined by single hyphens`);
	if (m.id !== folder) throw new Error(`${folder}: manifest id "${m.id}" does not match the folder name`);
	if (typeof m.name !== 'string' || m.name === '') throw new Error(`${folder}: manifest name must be a non-empty string`);
	if (typeof m.version !== 'string' || m.version === '') throw new Error(`${folder}: manifest version must be a non-empty string`);
}
```

What it catches (each checked against the guard):

| Source | Guard message |
|--------|---------------|
| No `export default` line (forgot the footer, `module.exports = ...`) | `the loader needs exactly one "export default" line, found 0` |
| A template literal with a line starting `export default`, plus the footer | `... found 2` |
| `import x from "x";` left in the output | `Cannot use import statement outside a module` |
| A strict-mode violation (`with`, legacy octal) | the engine's message, e.g. `Strict mode code may not include a with statement`, `Octal literals are not allowed in strict mode.` |

The manifest check covers `id`, `name` and `version` only. The full manifest rules (`color`, `minAppVersion`, ...) are in [Anatomy and loading](01-anatomy-and-loading.md).

`scripts/check-bundle.mjs` runs the guard on any file, including a hand-written `main.js`:

```js
// node scripts/check-bundle.mjs <main.js> [...]
// Checks hand-written or built files against the app's loader rules.
import { readFileSync } from 'node:fs';
import { checkBundle } from './loader-rules.mjs';

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('Pass one or more main.js files');
for (const file of files) checkBundle(readFileSync(file, 'utf8'), file);
console.log(`${files.length} file(s) follow the loader rules`);
```

### The build script

`scripts/build.mjs` builds every mod (or the ids you name), checks each bundle and manifest, and installs them into `MODS_OUT`:

```js
// node scripts/build.mjs [--watch] [id ...]
// MODS_OUT=<vault>/_system/mods (any empty folder works for a dry run)
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';
import { checkBundle, checkManifest } from './loader-rules.mjs';

const OUT = process.env.MODS_OUT?.trim();
if (!OUT) throw new Error('Set MODS_OUT to <vault>/_system/mods');
const SRC = fileURLToPath(new URL('../mods/', import.meta.url));
const args = process.argv.slice(2);
const watch = args.includes('--watch');
const named = args.filter((a) => a !== '--watch');
const ids = named.length ? named : (await readdir(SRC)).filter((id) => existsSync(`${SRC}${id}/manifest.json`));

/** Writes through a temp file and a rename; skips identical bytes, because every write reloads the mod. */
async function put(file, content) {
	if (existsSync(file) && (await readFile(file, 'utf8')) === content) return;
	const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
	await writeFile(temp, content);
	await rename(temp, file);
}

/** Checks the bundle and the manifest, then installs both, main.js last. */
const install = (id) => ({
	name: 'install',
	setup(build) {
		build.onEnd(async (result) => {
			if (result.errors.length > 0) return;
			try {
				const code = result.outputFiles[0].text;
				const manifest = await readFile(`${SRC}${id}/manifest.json`, 'utf8');
				checkBundle(code, `${id}/main.js`);
				checkManifest(manifest, id);
				await mkdir(`${OUT}/${id}`, { recursive: true });
				await put(`${OUT}/${id}/manifest.json`, manifest);
				// Last, so the app never runs new code with an old manifest.
				await put(`${OUT}/${id}/main.js`, code);
				console.log(`built ${id}`);
			} catch (err) {
				return { errors: [{ text: err.message }] };
			}
		});
	},
});

let failed = false;
for (const id of ids) {
	const ctx = await context({
		entryPoints: [`${SRC}${id}/src/index.ts`],
		bundle: true,
		format: 'iife',
		globalName: '__mod',
		target: 'safari16',
		keepNames: true,
		legalComments: 'none',
		charset: 'utf8',
		write: false,
		logLevel: 'warning',
		// The loader counts lines that start with "export default": the banner must never be one.
		banner: { js: `// Built from mods/${id}/src. Do not edit: the next build overwrites it.` },
		footer: { js: 'export default __mod.default;' },
		plugins: [install(id)],
	});
	if (watch) {
		await ctx.watch();
		continue;
	}
	const result = await ctx.rebuild().catch(() => ({ errors: [1] }));
	if (result.errors.length > 0) failed = true;
	await ctx.dispose();
}
if (watch) console.log('watching; Ctrl+C stops');
else if (failed) process.exitCode = 1;
```

Run it:

```bash
MODS_OUT="$HOME/kokobrain-vaults/My Vault/_system/mods" npm run build
MODS_OUT=/tmp/mods-dry-run npm run build hello     # one mod, outside the vault
```

Why it is written this way:

- **Check before install.** A bundle that fails the guard (or a manifest that fails its check) is reported as a build error and nothing is written, so the mod in the vault keeps its last good version.
- **Skip identical bytes.** The app reloads a mod on every change to its `main.js` or `manifest.json`, so rewriting the same content would reload it for nothing.
- **Temp file and rename.** The app never reads a half-written file. The app's watcher ignores this temp-name pattern (`<name>.tmp-<digits>-<digits>`).
- **`main.js` last.** A reload never pairs new code with an old manifest.
- **One mod failing does not stop the others**; the exit code is 1 at the end.

The app reloads the mod about half a second after the files change. A reload waits for the mod's running actions to end (the run view shows `Reload pending`).

### Watch mode

`MODS_OUT=... npm run watch` keeps esbuild running and rebuilds a mod whenever one of its source files changes. Each rebuild goes through the same check and install, so a broken edit prints the error and leaves the installed mod alone. Stop it with Ctrl+C. The manifest is read at each rebuild but is not watched: after editing only `manifest.json`, save a source file or run the build again.

## Testing in vitest

A mod is a function of `ctx`: give it a fake `ctx` and a fake `run`, call the action, and assert on what the fakes recorded. No app is needed.

### What a fake should model

- **Only what your mods use.** Every member you leave out throws `fakeCtx: <member> is not modelled`, so a test fails loudly when a mod starts using something new instead of silently getting `undefined`.
- **The app's messages.** Reject with the same text the app uses (`Invalid vault path "<path>"`, `"<path>" already exists; use write`, `"<path>" does not exist; use create`, `Mod "<id>": duplicate action id "<id>"`, `Mod "<id>": run.progress needs numbers done and total`), so a test that expects a failure fails in the same way the app would. The full list is in the [API reference](13-api-reference.md).
- **Stop.** After Stop, `run.ui` calls reject with a `DOMException` named `AbortError` and `run.log` drops its lines, as in the app.
- **Dialog answers as a script.** Tests pass the answers up front, in the order the mod asks: `true`/`false` for `confirm`, a string or `null` for `prompt`, an item id or `null` for `pick`. Asking more than the script holds throws.
- **Unload.** `unload()` aborts `ctx.signal`, then runs every cleanup in reverse, as the app does.

What this fake does not model, on purpose: `ctx.watch`, `ctx.onNoteSaved`, `ctx.onNoteMoved`, `ctx.onNoteCreated`, `ctx.theme`, `ctx.kb()`, `vault.list`, `vault.rename`, `vault.move`, the dirty-tab refusal of `vault.write`, and the full JSON checks of `saveData` (the app also rejects functions, `NaN` and class instances). Add them when a mod needs them. A test that needs a member of `ctx.app` passes it in (`fakeCtx({ app: { vaultStore: { path: '/vault' } } })`).

### fake-ctx.ts

```ts
// A fake ctx and run for tests. It models only what the mods here use, with
// the app's own rejection messages; anything else throws, so a test notices
// when a mod starts depending on something new.
import type { ModActionV1, ModContext, ModPlacement, ModRunV1, ModUiV1, RawApp } from '../types/kokobrain-mod';

const notModelled = (what: string) => () => {
	throw new Error(`fakeCtx: ${what} is not modelled`);
};

/** A dialog answer: confirm takes a boolean, prompt a string or null, pick an item id or null */
export type Answer = boolean | string | null;

/** Dialogs that pop scripted answers in call order */
function scriptedUi(answers: Answer[], signal?: AbortSignal): ModUiV1 & { alerts: string[] } {
	const alerts: string[] = [];
	const stopped = () => new DOMException('The run was stopped', 'AbortError');
	const next = () => {
		if (signal?.aborted) throw stopped();
		if (answers.length === 0) throw new Error('fakeCtx: a dialog asked more than the test answered');
		return answers.shift()!;
	};
	return {
		alerts,
		alert: async (o) => {
			if (signal?.aborted) throw stopped();
			alerts.push(o.title);
		},
		confirm: async () => next() === true,
		prompt: async () => {
			const answer = next();
			return typeof answer === 'string' ? answer : null;
		},
		pick: async (o) => {
			const ids = new Set<string>();
			for (const item of o.items) {
				if (ids.has(item.id)) throw new Error(`Mod "fake": ui.pick duplicate item id "${item.id}"`);
				ids.add(item.id);
			}
			const answer = next();
			if (answer === null) return null;
			const item = o.items.find((i) => i.id === answer);
			if (!item) throw new Error(`fakeCtx: no pick item "${String(answer)}"`);
			return item;
		},
		loading: async (_label, task) => {
			if (signal?.aborted) throw stopped();
			return task(signal ?? new AbortController().signal);
		},
	};
}

/** The app's path rule for ctx.vault */
function checkPath(path: string): void {
	if (path === '' || !path.split('/').every((s) => s !== '' && s !== '.' && s !== '..')) {
		throw new Error(`Invalid vault path "${path}"`);
	}
}

export function fakeCtx(
	options: { files?: Record<string, string>; data?: unknown; answers?: Answer[]; app?: Partial<RawApp> } = {},
) {
	const files = new Map(Object.entries(options.files ?? {}));
	const actions = new Map<string, ModActionV1>();
	const notices: { message: string; kind: string }[] = [];
	const saved: unknown[] = [];
	const opened: string[] = [];
	const placements: { actionId: string; options: ModPlacement }[] = [];
	const disposers: (() => void)[] = [];
	const controller = new AbortController();
	let data = options.data === undefined ? null : JSON.stringify(options.data);
	const ui = scriptedUi(options.answers ?? []);

	const ctx: ModContext = {
		apiVersion: 1,
		mod: { id: 'fake', name: 'Fake', version: '0.0.0', dir: '_system/mods/fake' },
		signal: controller.signal,
		register: (dispose) => void disposers.push(dispose),
		notify: (message, o) => void notices.push({ message, kind: o?.kind ?? 'info' }),
		log: () => {},
		addAction: (action) => {
			if (actions.has(action.id)) throw new Error(`Mod "fake": duplicate action id "${action.id}"`);
			actions.set(action.id, action);
			const off = () => void actions.delete(action.id);
			disposers.push(off);
			return off;
		},
		addRailButton: () => () => {},
		watch: notModelled('watch'),
		onNoteSaved: notModelled('onNoteSaved'),
		onNoteMoved: notModelled('onNoteMoved'),
		onNoteCreated: notModelled('onNoteCreated'),
		vault: {
			read: async (path) => {
				checkPath(path);
				const text = files.get(path);
				// The app rejects with the file system's own message; tests only need a rejection.
				if (text === undefined) throw new Error(`"${path}" does not exist`);
				return text;
			},
			exists: async (path) => {
				checkPath(path);
				return files.has(path) || [...files.keys()].some((f) => f.startsWith(`${path}/`));
			},
			list: notModelled('vault.list'),
			create: async (path, content) => {
				checkPath(path);
				if (files.has(path)) throw new Error(`"${path}" already exists; use write`);
				files.set(path, content);
				return path;
			},
			write: async (path, content) => {
				checkPath(path);
				if (!files.has(path)) throw new Error(`"${path}" does not exist; use create`);
				files.set(path, content);
			},
			rename: notModelled('vault.rename'),
			move: notModelled('vault.move'),
			delete: async (path) => {
				checkPath(path);
				if (!files.delete(path)) throw new Error(`"${path}" does not exist`);
			},
		},
		workspace: {
			openNote: async (path) => {
				checkPath(path);
				if (!files.has(path)) throw new Error(`"${path}" does not exist`);
				opened.push(path);
			},
		},
		ui,
		get theme(): never {
			throw new Error('fakeCtx: theme is not modelled');
		},
		labs: {
			place: (actionId, placement) => {
				if (!actions.has(actionId)) throw new Error(`Mod "fake": unknown action id "${actionId}"`);
				if (placement.palette !== true && placement.menu === undefined) throw new Error('Mod "fake": labs.place needs palette: true or menu');
				const entry = { actionId, options: placement };
				placements.push(entry);
				return () => {
					const at = placements.indexOf(entry);
					if (at >= 0) placements.splice(at, 1);
				};
			},
		},
		// Only the members a test passes in exist; the cast is the test's promise to pass what the mod uses.
		get app(): RawApp {
			if (!options.app) throw new Error('fakeCtx: app is not modelled; pass options.app');
			return options.app as RawApp;
		},
		kb: notModelled('kb'),
		loadData: async () => (data === null ? null : JSON.parse(data)),
		saveData: async (value) => {
			const text = JSON.stringify(value);
			if (text === undefined) throw new Error('Mod "fake": saveData needs a value JSON can represent: undefined');
			data = text;
			saved.push(JSON.parse(text));
		},
	};

	return {
		ctx,
		files,
		actions,
		notices,
		saved,
		opened,
		placements,
		alerts: ui.alerts,
		/** Like the app's unload: abort the signal, then run every cleanup in reverse */
		unload: () => {
			controller.abort();
			for (const dispose of disposers.splice(0).reverse()) dispose();
		},
	};
}

export function fakeRun(options: { answers?: Answer[]; target?: ModRunV1['target'] } = {}) {
	const controller = new AbortController();
	const logs: string[] = [];
	const progressed: [number, number, string | undefined][] = [];
	const ui = scriptedUi(options.answers ?? [], controller.signal);
	const run: ModRunV1 = {
		...(options.target ? { target: options.target } : {}),
		signal: controller.signal,
		// The app drops log lines once the run stopped.
		log: (text) => void (controller.signal.aborted || logs.push(String(text))),
		progress: (done, total, label) => {
			if (!Number.isFinite(done) || !Number.isFinite(total)) throw new Error('Mod "fake": run.progress needs numbers done and total');
			if (label !== undefined && typeof label !== 'string') throw new Error('Mod "fake": run.progress needs a string label');
			progressed.push([done, total, label]);
		},
		ui,
	};
	return { run, logs, progressed, alerts: ui.alerts, stop: () => controller.abort() };
}
```

Like the app, `fakeRun` leaves the `target` key out unless you pass one: pass `{ target: { on: 'note', path: 'Ideas/Idea.md' } }` to test a menu invocation.

### Testing a TypeScript mod

Import the mod's default export and call `onload` with the fake:

```ts
import { describe, expect, it } from 'vitest';
import mod from '../mods/hello/src/index';
import { fakeCtx, fakeRun } from './fake-ctx';

function load() {
	const fake = fakeCtx();
	mod.onload(fake.ctx);
	return fake;
}

describe('hello', () => {
	it('greets the typed name', async () => {
		const fake = load();
		const { run } = fakeRun({ answers: ['Ana'] });
		await fake.actions.get('say-hello')!.run('', run);
		expect(fake.notices).toHaveLength(1);
		expect(fake.notices[0]!.message).toMatch(/, Ana$/);
		expect(fake.notices[0]!.kind).toBe('success');
	});

	it('does nothing when the prompt is cancelled', async () => {
		const fake = load();
		const { run } = fakeRun({ answers: [null] });
		await fake.actions.get('say-hello')!.run('', run);
		expect(fake.notices).toEqual([]);
	});

	it('rejects with AbortError after Stop, like run.ui in the app', async () => {
		const fake = load();
		const { run, stop } = fakeRun({ answers: ['Ana'] });
		stop();
		await expect(fake.actions.get('say-hello')!.run('', run)).rejects.toMatchObject({ name: 'AbortError' });
		expect(fake.notices).toEqual([]);
	});

	it('removes its action at unload', () => {
		const fake = load();
		fake.unload();
		expect(fake.actions.size).toBe(0);
	});
});
```

### Testing a plain main.js

A hand-written `main.js` could be imported as an ES module, but that skips the loader's rules: an `import` or a top-level `await` the app refuses would work in the test. Load it the way the app does instead: `test/load-mod.ts` rewrites the one `export default` line and runs the file as a strict-mode function body. Unlike the guard, this runs the top-level code, so it also catches a throw there.

```ts
// Loads a mod's main.js the way the app does: one "export default" line
// rewritten to an assignment, the file run as a strict-mode function body.
import { readFileSync } from 'node:fs';
import type { Mod } from '../types/kokobrain-mod';

export function loadMod(file: string): Mod {
	const source = readFileSync(file, 'utf8');
	const count = source.match(/^export\s+default\s+/gm)?.length ?? 0;
	if (count !== 1) throw new Error(`${file}: the loader needs exactly one "export default" line, found ${count}`);
	const body = source.replace(/^export\s+default\s+/m, '__kokobrainModExports.default = ');
	const holder: { default?: Mod } = {};
	new Function('__kokobrainModExports', `"use strict";${body}`)(holder);
	if (typeof holder.default?.onload !== 'function') throw new Error(`${file}: the default export must be an object with an onload function`);
	return holder.default;
}
```

The same function loads a built bundle, which makes a cheap smoke test for the build output. A test of the example [hello mod](../../examples/mods/hello/main.js), which creates a note from its input and opens it, with no run output so its run view closes on success:

```ts
import { describe, expect, it } from 'vitest';
import { fakeCtx, fakeRun } from './fake-ctx';
import { loadMod } from './load-mod';

describe('hello main.js', () => {
	it('creates the note and opens it, with no run output', async () => {
		const fake = fakeCtx();
		loadMod('path/to/hello/main.js').onload(fake.ctx);
		const { run, logs, progressed } = fakeRun();
		await fake.actions.get('new-note')!.run('Idea', run);
		expect(fake.files.get('Hello mod/Idea.md')).toBe('# Idea\n\nCreated by the hello mod.\n');
		expect(fake.opened).toEqual(['Hello mod/Idea.md']);
		expect(logs).toEqual([]);
		expect(progressed).toEqual([]);
	});

	it('stops after the write when Stop comes during it', async () => {
		const fake = fakeCtx();
		loadMod('path/to/hello/main.js').onload(fake.ctx);
		const { run, stop } = fakeRun();
		const create = fake.ctx.vault.create;
		fake.ctx.vault.create = async (path, content) => {
			const result = await create(path, content);
			stop();
			return result;
		};
		await fake.actions.get('new-note')!.run('Idea', run);
		expect(fake.files.has('Hello mod/Idea.md')).toBe(true);
		expect(fake.opened).toEqual([]);
	});

	it('fails on a taken title with the app message', async () => {
		const fake = fakeCtx({ files: { 'Hello mod/Idea.md': 'x' } });
		loadMod('path/to/hello/main.js').onload(fake.ctx);
		await expect(fake.actions.get('new-note')!.run('Idea', fakeRun().run)).rejects.toThrow('"Hello mod/Idea.md" already exists; use write');
	});
});
```

### Patterns

- **Stop in the middle.** Wrap the fake member the mod calls at the moment you want to stop, and call `stop()` inside it (the second test above). Then assert on the partial state: what was written, what was not, and the warning toast the mod should show.
- **Answers decide the path.** `fakeRun({ answers: [true] })` takes the confirm branch, `[false]` the cancel branch, `['']` an empty prompt (which the app resolves as `''`, not `null`).
- **Assert on state, not calls.** Check `files`, `notices`, `saved`, `opened`, `logs` and `progressed`. A spy that only proves a call happened passes while the result is wrong.
- **Keep logic pure.** Code that does not need `ctx` (parsing, building note text, dates with `now` as a parameter) goes in its own file and is tested with plain data.
- **Pass `ctx` in.** A helper that takes `ctx` (and `run`) as its first parameter, instead of closing over the one from `onload`, can be called from a test with a fresh fake.

> [!WARNING]
> The fake is your model of the app, not the app. Before relying on a behavior in a test, check it in [the API reference](13-api-reference.md), and try the mod once in the app with Settings > Troubleshooting > Save debug log to file on (see [Errors and debugging](15-errors-and-debugging.md)).
