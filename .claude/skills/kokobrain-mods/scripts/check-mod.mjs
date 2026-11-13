#!/usr/bin/env node
/**
 * Checks a Kokobrain vault mod folder without the app.
 *
 *   node check-mod.mjs <mod-folder> [--repo <brain-checkout>]
 *   node check-mod.mjs <mod-folder> --run <action-id> [--vault <fixture-folder>]
 *       [--input <text>] [--answers '<json array>'] [--target note:<path>|folder:<path>]
 *       [--daily-folder <folder>] [--expect-fail] [--stop-at-loading <n>]
 *
 * Check mode loads the folder with the app's real loader (`parseModManifest`,
 * `evaluateModSource` from src/lib/plugins/mods/mods.logic.ts), runs `onload`
 * against a recording fake `ctx` that applies the host's registration rules
 * with the host's messages (mods-host.service.ts), then unloads the mod the
 * way the host does. Static warnings cover what `onload` does not run.
 *
 * Run mode does the same, then runs ONE action body against an in-memory
 * vault seeded from `--vault` (read from disk, never written: every change
 * stays in memory and is printed at the end). `ctx.vault`, `ctx.workspace`,
 * mod data, `run.*` and the dialogs follow the host's rules and messages;
 * `--answers` scripts the dialogs in order. `ctx.app` is modelled only for the
 * members `memoryApp` lists (the vault root, an editor with no open tab, two
 * settings, the daily note, and `updateNoteFrontmatter` through the app's own
 * properties.logic.ts); every other member, and `ctx.kb()`, throws
 * `not modelled by --run` inside the action.
 * File system rejections are bare strings, as in the app, but their OS text
 * is approximate, and paths are case-sensitive here (APFS is not).
 *
 * Isolation. The script re-runs itself as a child Node process under the
 * permission model (`--permission --allow-fs-read=*`): the child can read
 * files but cannot write any, open a network connection (Node 25 and later),
 * start a process or a worker, whatever the mod's code does. Inside the child
 * the mod runs in its own `node:vm` realm, where the app's `mods.logic.ts` is
 * compiled too, so the real `evaluateModSource` builds the mod's function
 * there. That realm's globals are what the web view offers (the recording
 * DOM proxies, the fake `fetch`, the tracked timers, web APIs such as `URL`
 * and `TextDecoder`) and no Node global: `process`, `Buffer`, `require`,
 * `setImmediate` are ReferenceErrors and `import()` rejects. Patching
 * `Array.prototype` or `console` there changes only the mod's realm. The
 * realm is not a sandbox: `ctx` and the values it returns are the checker's
 * objects, so code that climbs their constructors reaches the checker's realm;
 * the permission model still holds then. The parent process runs no mod code
 * and kills the child when its event loop stops turning for HANG_MS (a
 * synchronous loop that never ends, or promise callbacks that keep queueing
 * each other), reporting which part did not finish.
 *
 * Exit code: 0 when there is no error (warnings allowed) and a run did not
 * fail (with --expect-fail: did fail), 1 otherwise, 2 on bad usage, a repo
 * it cannot read, or a crash of the checker itself.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import * as nodeModule from 'node:module';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, types } from 'node:util';
import vm from 'node:vm';

const LOGIC_FILE = 'src/lib/plugins/mods/mods.logic.ts';
const APP_FILE = 'src/lib/plugins/mods/mod-app.service.ts';
const ICONS_FILE = 'src/lib/features/file-icons/file-icons.logic.ts';
const ICON_DATA_FILE = 'src/lib/features/file-icons/file-icons.icon-data.ts';
const TAURI_CONF = 'src-tauri/tauri.conf.json';
/** How long `onload`, `onunload` and a run may take before the check gives up on them */
const SETTLE_MS = 10_000;
/** How long a run is still watched after Stop, for writes the code makes after it */
const STOP_GRACE_MS = 1000;
/** Lines `new Function` adds above the mod's first line, and the `"use strict";` prefix on that line */
const FUNCTION_LINE_OFFSET = 2;
const STRICT_PREFIX = '"use strict";';
/** Browser globals a mod may touch at load; each becomes a recording proxy, since Node has no DOM */
const BROWSER_GLOBALS = [
	'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'history',
	'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'requestAnimationFrame',
	'cancelAnimationFrame', 'requestIdleCallback', 'getComputedStyle', 'matchMedia', 'HTMLElement',
	'Element', 'Node', 'KeyboardEvent', 'MouseEvent', 'DOMParser', 'customElements', 'CSS', 'Image',
];
/** DOM methods whose string argument is a selector or id of the app's own markup (raw tier) */
const SELECTOR_METHODS = ['querySelector', 'querySelectorAll', 'closest', 'matches', 'getElementById', 'getElementsByClassName'];
/** `ctx.vault` members that change files */
const VAULT_WRITES = ['create', 'write', 'rename', 'move', 'delete'];
/** Raw members that open a note */
const OPEN_CALLS = ['openNote', 'openFileInEditor', 'openNoteAt'];
/** Theme color keys of `ctx.theme.current.colors` (contract v1) */
const THEME_KEYS = [
	'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground', 'primary',
	'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground', 'accent',
	'accentForeground', 'destructive', 'destructiveForeground', 'border', 'input', 'ring', 'divider',
];
/** What a dialog resolves to on Esc, as in mod-dialogs.store.svelte.ts */
const CANCELLED = { alert: undefined, confirm: false, prompt: null, pick: null };
/** The stand-in absolute vault root: `ctx.app.vaultStore.path` under --run, and the root in bare-string file system errors */
const FAKE_ROOT = '/vault';
/** The app's pure frontmatter logic, which `updateNoteFrontmatter` runs under --run */
const FRONTMATTER_FILE = 'src/lib/core/frontmatter/properties.logic.ts';
/** The app's default daily note settings (settings.store.svelte.ts), which `dailyNotePath` uses under --run */
const DAILY_DEFAULTS = { folder: '_notes', format: 'YYYY/MM-MMM/_[journal]-[day]-DD-MM-YYYY' };
/** `settingsStore.templates.systemFolder` under --run: the app's default */
const SYSTEM_FOLDER = '_system';
/** Set in the child process the script starts for itself; see the header */
const CHILD_ENV = 'KOKOBRAIN_CHECK_MOD_CHILD';
/** How long the child's event loop may stay blocked before the parent kills it */
const HANG_MS = 5000;
/** How often the child tells the parent that its event loop still turns */
const BEAT_MS = 200;
/** How many times one onNoteSaved callback may be re-triggered by its own saves before it counts as a loop */
const SAVE_LOOP_LIMIT = 10;
/** Web APIs of the web view that Node has too; the mod's realm gets Node's implementation */
const WEB_GLOBALS = [
	'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'AbortController', 'AbortSignal', 'DOMException',
	'Event', 'EventTarget', 'CustomEvent', 'MessageChannel', 'MessagePort', 'MessageEvent', 'BroadcastChannel',
	'structuredClone', 'atob', 'btoa', 'queueMicrotask', 'crypto', 'performance', 'Blob', 'File', 'FormData',
	'Headers', 'Request', 'Response', 'ReadableStream', 'WritableStream', 'TransformStream', 'TextEncoderStream',
	'TextDecoderStream', 'CompressionStream', 'DecompressionStream',
];
/** Network classes of the web view; each becomes a recording proxy, so nothing connects */
const NETWORK_GLOBALS = ['WebSocket', 'EventSource', 'XMLHttpRequest'];
/** The `console` methods the mod's realm gets, each calling the checker's console */
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'table', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'assert', 'count', 'countReset'];

const errors = [];
const warnings = [];

/**
 * The `Error` and `TypeError` of the mod's realm, set once it exists, so an
 * error the fake `ctx` throws is `instanceof Error` in mod code as in the app
 */
let realm = { Error, TypeError };

/** What the child is running now, for the parent's message when it stops answering */
let phase = 'startup';

/** Sets the phase and tells the parent at once: a loop that blocks right after leaves no other chance */
function setPhase(next) {
	if (next === phase) return;
	phase = next;
	process.send?.({ phase }, () => {});
}

/**
 * Runs `fn` as phase `name` and restores the phase after its synchronous part.
 * Used around each entry into mod code that does not go through `settle`.
 */
function inPhase(name, fn) {
	const before = phase;
	setPhase(name);
	try {
		return fn();
	} finally {
		setPhase(before);
	}
}

/**
 * The message of anything thrown, as the host reads it, for an Error of any
 * realm. A value String() cannot convert (a null-prototype object, a symbol
 * in a template) is described instead of crashing the check.
 */
function messageOf(err) {
	try {
		return err instanceof Error || types.isNativeError(err) ? String(err.message) : String(err);
	} catch {
		return '(a thrown value with no string form; throw an Error so the app can show a message)';
	}
}

/** Whether an uncaught error is the checker's own: an Error of its realm with no frame from the mod's main.js */
function isCheckerCrash(err) {
	if (!(err instanceof Error)) return false;
	try {
		return !String(err.stack).includes('kokobrain-mods/');
	} catch {
		return true;
	}
}

const USAGE = `usage: node check-mod.mjs <mod-folder> [--repo <brain-checkout>]
       node check-mod.mjs <mod-folder> --run <action-id> [--vault <fixture-folder>]
           [--input <text>] [--answers '<json array>'] [--target note:<path>|folder:<path>]
           [--daily-folder <folder>] [--expect-fail] [--stop-at-loading <n>]

--repo     the Kokobrain checkout whose loader is used; default: the checkout this
           script lives in, else the current directory
--run      run one action body after onload, against an in-memory vault
--vault    folder whose files seed the in-memory vault (read only; default: empty).
           Every file and folder in it is seeded, empty folders included (but git
           keeps no empty folder, so a committed fixture loses them). Mod data goes
           in <vault>/.kokobrain/mods/<mod-id>/data.json
--input    the text the action receives (default '')
--answers  JSON array, one answer per dialog in order: prompt a string or null,
           confirm true or false, pick an item id or null, alert anything (an
           alert takes one too); "STOP" presses Stop at that dialog; with no answer
           left a dialog gets Esc. A loading takes no answer and is skipped here
--stop-at-loading <n>  presses Stop while the task of the nth loading (1 for
           the first, run.ui or ctx.ui) runs: run.ui.loading then rejects with
           AbortError and its task's signal aborts
--target   run.target: note:<path>, folder:<path>, or folder: for the vault root
--daily-folder  the daily note folder dailyNotePath uses (default ${DAILY_DEFAULTS.folder};
           '' for the vault root); the file name format is the app's default
           ${DAILY_DEFAULTS.format}
--expect-fail   the run is meant to fail (a deliberate refusal): exit 0 when it
           ends failed, 1 when it ends any other way

ctx.app under --run: vaultStore.path is ${FAKE_ROOT} (also isOpen and indexReady:
true); editorStore has no open tab (tabs [], activeIndex -1, activeTab,
activeTabPath, activeTabContent and editorView null); settingsStore.templates.
systemFolder is ${SYSTEM_FOLDER} and settingsStore.periodicNotes holds the daily folder
and format; dailyNotePath(date?) and openOrCreateDailyNote() (creates an empty
note: no template) use them; updateNoteFrontmatter(path, mutate) runs the app's
properties.logic.ts on the in-memory note, with its no-op, refusals and
FrontmatterWriteError reasons; syncExternalContentToEditor and saveFileByPath
are recorded no-ops (no tab is open). Any other member, and ctx.kb(), throws
"not modelled by --run"; a name MOD_APP lacks is undefined, as in the app.

The vault under --run: files are read as bytes and decoded like the app (a
BOM dropped, invalid UTF-8 replaced; data.json parsed from its bytes). A path
with a dot segment other than .kokobrain is refused as the app's file system
scope refuses it ("forbidden path: ..."). vault.list returns entries in
reverse name order: the app returns the OS directory order, which is not
sorted, so sort the entries when order matters. vault.write (outside the mods
folder) and updateNoteFrontmatter fire the onNoteSaved callbacks one timer
turn later, as the app's save does; a callback its own saves re-trigger
${SAVE_LOOP_LIMIT} times is reported as a save loop.`;

/** Parses argv; exits 2 on bad usage */
function parseCli(argv) {
	let parsed;
	try {
		parsed = parseArgs({
			args: argv,
			allowPositionals: true,
			options: {
				repo: { type: 'string' },
				run: { type: 'string' },
				vault: { type: 'string' },
				input: { type: 'string' },
				answers: { type: 'string' },
				target: { type: 'string' },
				'daily-folder': { type: 'string' },
				'expect-fail': { type: 'boolean' },
				'stop-at-loading': { type: 'string' },
				help: { type: 'boolean', short: 'h' },
			},
		});
	} catch (err) {
		usage(2, messageOf(err));
	}
	const { values, positionals } = parsed;
	if (values.help) usage(0);
	if (positionals.length !== 1) usage(2, 'pass exactly one mod folder');
	const runOnly = ['vault', 'input', 'answers', 'target', 'daily-folder', 'expect-fail', 'stop-at-loading'].filter((k) => values[k] !== undefined);
	if (values.run === undefined && runOnly.length > 0) usage(2, `--${runOnly[0]} needs --run`);
	let answers = [];
	if (values.answers !== undefined) {
		try {
			answers = JSON.parse(values.answers);
		} catch (err) {
			usage(2, `--answers is not JSON: ${messageOf(err)}`);
		}
		if (!Array.isArray(answers)) usage(2, '--answers must be a JSON array');
	}
	let target;
	if (values.target !== undefined) {
		const m = values.target.match(/^(note|folder):(.*)$/);
		if (!m) usage(2, '--target must be note:<path> or folder:<path>');
		if (m[1] === 'note' && m[2] === '') usage(2, '--target note: needs a path');
		target = { on: m[1], path: m[2] };
	}
	const dailyFolder = values['daily-folder'] ?? DAILY_DEFAULTS.folder;
	let stopAtLoading = null;
	if (values['stop-at-loading'] !== undefined) {
		stopAtLoading = Number(values['stop-at-loading']);
		if (!Number.isInteger(stopAtLoading) || stopAtLoading < 1) usage(2, '--stop-at-loading takes a loading number, 1 for the first');
	}
	return {
		folder: positionals[0], repo: values.repo, run: values.run, vault: values.vault, input: values.input ?? '', answers, target,
		dailyFolder, expectFail: values['expect-fail'] === true, stopAtLoading,
	};
}

/** Prints the usage (and why, on bad usage) and exits */
function usage(code, reason) {
	if (reason) console.error(`check-mod: ${reason}`);
	console.log(USAGE);
	process.exit(code);
}

/**
 * The Kokobrain checkout: `--repo`, else the checkout this script lives in
 * (.claude/skills/kokobrain-mods/scripts), else the current directory.
 */
function findRepo(explicit) {
	const scriptRepo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
	const candidates = explicit ? [resolve(explicit)] : [scriptRepo, process.cwd()];
	const repo = candidates.find((dir) => existsSync(join(dir, LOGIC_FILE)));
	if (!repo) {
		console.error(`check-mod: no ${LOGIC_FILE} under ${candidates.join(' or ')}; pass --repo <brain-checkout>`);
		process.exit(2);
	}
	return repo;
}

/** The member names of `MOD_APP` in mod-app.service.ts: what `ctx.app` really has */
function readAppMembers(repo) {
	const text = readFileSync(join(repo, APP_FILE), 'utf8');
	const block = text.match(/export const MOD_APP = \{([\s\S]*?)\n\};/)?.[1] ?? '';
	return new Set([...block.matchAll(/^\t([A-Za-z]\w*),$/gm)].map((m) => m[1]));
}

/** The icon packs the app accepts in `pack:name`, from file-icons.logic.ts */
function readIconPacks(repo) {
	const text = readFileSync(join(repo, ICONS_FILE), 'utf8');
	const block = text.match(/VALID_ICON_PACKS[^=]*=\s*\[([\s\S]*?)\]/)?.[1] ?? '';
	return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/**
 * The app's icon lookup (file-icons.icon-data.ts, which the rail uses through
 * `getIconSync`), loaded per pack on demand. `lookup` resolves to true or
 * false, or null when the pack cannot load in Node (some packs import JSON).
 */
async function loadIconIndex(repo) {
	let data = null;
	try {
		data = await import(pathToFileURL(join(repo, ICON_DATA_FILE)).href);
	} catch {
		// Without the module, no name is checked; the pack check still runs.
	}
	const loaded = new Map();
	return {
		async lookup(pack, name) {
			if (!data) return { known: null };
			if (!loaded.has(pack)) {
				let icons = [];
				try {
					icons = await data.getIconsForPack(pack);
				} catch {
					icons = [];
				}
				loaded.set(pack, icons);
			}
			const icons = loaded.get(pack);
			if (icons.length === 0) return { known: null };
			if (data.getIconSync(pack, name)) return { known: true };
			const needle = name.toLowerCase().replace(/^lucide-/, '');
			const close = icons.map((i) => i.name).filter((n) => n.includes(needle) || needle.includes(n)).slice(0, 5);
			return { known: false, close };
		},
	};
}

/**
 * The app's pure logic that the modelled `ctx.app` members run under --run:
 * properties.logic.ts (frontmatter) and periodic-notes.logic.ts (the daily
 * note path), plus dayjs. Their imports need what Vite does and Node does not:
 * `#lib/x.js` naming a `.ts` file, extensionless `dayjs/plugin/x`, and
 * TypeScript beyond type stripping (parameter properties), so a module hook
 * resolves and transpiles `.ts` files under `src/`. Resolves `{ error }` when
 * the logic cannot load; the members that need it then stay unmodelled.
 */
async function loadRunLogic(repo, ts) {
	if (typeof nodeModule.registerHooks !== 'function') return { error: `Node ${process.version} has no module.registerHooks` };
	const srcUrl = pathToFileURL(join(repo, 'src/')).href;
	nodeModule.registerHooks({
		resolve(specifier, context, next) {
			try {
				return next(specifier, context);
			} catch (err) {
				if (!context.parentURL?.startsWith(srcUrl)) throw err;
				const tries = specifier.endsWith('.js') ? [`${specifier.slice(0, -3)}.ts`] : [`${specifier}.ts`, `${specifier}.js`];
				for (const attempt of tries) {
					try {
						return next(attempt, context);
					} catch {
						// The next spelling may resolve.
					}
				}
				throw err;
			}
		},
		load(url, context, next) {
			if (!url.startsWith(srcUrl) || !url.endsWith('.ts')) return next(url, context);
			const fileName = fileURLToPath(url);
			const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
				fileName,
				compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
			});
			return { format: 'module', source: outputText, shortCircuit: true };
		},
	});
	try {
		const frontmatter = await import(pathToFileURL(join(repo, FRONTMATTER_FILE)).href);
		const periodic = await import(pathToFileURL(join(repo, 'src/lib/plugins/periodic-notes/periodic-notes.logic.ts')).href);
		const dayjs = createRequire(join(repo, 'package.json'))('dayjs');
		return { frontmatter, periodic, dayjs };
	} catch (err) {
		return { error: messageOf(err) };
	}
}

/** The `connect-src` sources of the app's CSP, from tauri.conf.json */
function readConnectSrc(repo) {
	const csp = JSON.parse(readFileSync(join(repo, TAURI_CONF), 'utf8')).app?.security?.csp;
	if (csp && typeof csp === 'object') {
		const value = csp['connect-src'];
		return Array.isArray(value) ? value : String(value ?? '').split(/\s+/).filter(Boolean);
	}
	const directive = String(csp ?? '').split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src '));
	return directive ? directive.split(/\s+/).slice(1) : [];
}

/**
 * Whether the CSP lets the web view connect to `url`. WebSocket schemes match
 * their HTTP counterparts, as CSP 3 specifies. Null for a URL it cannot parse.
 */
function connectAllowed(url, sources) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const scheme = { 'ws:': 'http:', 'wss:': 'https:' }[parsed.protocol] ?? parsed.protocol;
	return sources.some((source) => {
		if (source === scheme) return true;
		const m = source.match(/^(https?:)\/\/(\*\.)?([^/]+)\/?$/);
		if (!m || m[1] !== scheme) return false;
		return m[2] ? parsed.host.endsWith(`.${m[3]}`) : parsed.host === m[3];
	});
}

/** The web hosts of `connect-src`, for messages; the app's own IPC origin is left out */
function allowedHosts(sources) {
	return sources.filter((s) => s.startsWith('https://')).join(', ');
}

/** 1-based line and column of `offset` in `source`, counting lines by `\n` as editors do */
function positionOf(source, offset) {
	const before = source.slice(0, offset);
	const line = before.split('\n').length;
	return { line, column: offset - before.lastIndexOf('\n') };
}

/**
 * Warns on each literal U+2028 / U+2029 in the source. JavaScript reads them
 * as line breaks: inside a regex literal that is a syntax error, and they end
 * a `//` comment early. Editors and write tools rarely show them.
 */
function lineSeparatorChecks(source) {
	const found = [...source.matchAll(/[\u2028\u2029]/g)];
	for (const m of found.slice(0, 5)) {
		const { line, column } = positionOf(source, m.index);
		const name = m[0] === '\u2028' ? 'U+2028 LINE SEPARATOR' : 'U+2029 PARAGRAPH SEPARATOR';
		warnings.push(`main.js:${line}:${column}: a literal ${name}; JavaScript reads it as a line break (a syntax error inside a regex, the end of a // comment). Write the escape \\u${m[0].charCodeAt(0).toString(16)} or use \\p{Zl}\\p{Zp} with the u flag`);
	}
	if (found.length > 5) warnings.push(`main.js: ${found.length - 5} more literal U+2028 / U+2029 characters`);
	return found.length;
}

/**
 * Where V8 puts a syntax error in the code the loader builds: re-parses the
 * same rewrite with `vm.Script`, then maps V8's line (which counts U+2028,
 * U+2029 and a lone \r as line breaks) back to the file's `\n` lines.
 */
function syntaxLocation(source, loaderRegex) {
	const match = source.match(loaderRegex);
	const holder = '__kokobrainModExports.default = ';
	const body = match ? source.replace(loaderRegex, holder) : source;
	const prefix = `(function (__kokobrainModExports) {${STRICT_PREFIX}`;
	try {
		new vm.Script(`${prefix}${body}\n})`, { filename: 'main.js' });
		return null;
	} catch (err) {
		const [head, , caret] = String(err.stack).split('\n');
		const v8Line = Number(head.match(/^main\.js:(\d+)$/)?.[1]);
		if (!v8Line || caret === undefined || !caret.includes('^')) return null;
		let column = caret.indexOf('^');
		if (v8Line === 1) column -= prefix.length;
		const starts = [0];
		for (const m of body.matchAll(/\r\n|[\n\r\u2028\u2029]/g)) starts.push(m.index + m[0].length);
		let offset = (starts[v8Line - 1] ?? 0) + Math.max(0, column);
		// The rewrite changed the length of the export line; map offsets after it back.
		if (match && offset > match.index) offset = Math.max(match.index, offset - (holder.length - match[0].length));
		return { ...positionOf(source, Math.min(offset, source.length)), message: err.message };
	}
}

/**
 * Source-level checks of what the run of `onload` cannot see. Uses the
 * repo's TypeScript parser; heuristics, so each warning names its line.
 * Returns what the source uses, for the tier lines of the report.
 */
function staticChecks(ts, source, connectSrc, appMembers) {
	const file = ts.createSourceFile('main.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	const lineOf = (node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
	const used = { app: new Map(), kb: false, labs: false, globals: new Set(), selectors: new Set(), openAfterOutput: new Set() };
	const urls = [];
	const docVars = new Set();
	/** `const NAME = 'text'` anywhere in the file, so a selector held in a constant is still shown */
	const constStrings = new Map();
	/** `const NAME = { ... }`, so `addAction(spec)` with the spec in a constant is still checked */
	const constObjects = new Map();
	/** `const NAME = () => ...` and `function NAME() {}`, so a callback passed by name is still checked */
	const namedFunctions = new Map();
	/** Names bound to `ctx.vault` (`const { vault } = ctx`, `const v = ctx.vault`) */
	const vaultNames = new Set();
	/** Names bound to the result of `ctx.kb()`, and `kb` itself */
	const kbNames = new Set(['kb']);
	/** The parameter names of `onload`: what `ctx` is called in this file */
	const ctxNames = new Set();
	const isFunctionNode = (node) => Boolean(node) && (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node));
	const collectConsts = (node) => {
		if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Const)) {
			for (const d of node.declarations) {
				const init = d.initializer;
				if (!init) continue;
				if (ts.isIdentifier(d.name)) {
					if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) constStrings.set(d.name.text, init.text);
					if (ts.isObjectLiteralExpression(init)) constObjects.set(d.name.text, init);
					if (isFunctionNode(init)) namedFunctions.set(d.name.text, init);
					if (ts.isPropertyAccessExpression(init) && init.name.text === 'vault') vaultNames.add(d.name.text);
					const call = ts.isAwaitExpression(init) ? init.expression : init;
					if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'kb') kbNames.add(d.name.text);
				} else if (ts.isObjectBindingPattern(d.name)) {
					for (const el of d.name.elements) {
						const key = el.propertyName ?? el.name;
						if (ts.isIdentifier(key) && key.text === 'vault' && ts.isIdentifier(el.name)) vaultNames.add(el.name.text);
					}
				}
			}
		}
		if (ts.isFunctionDeclaration(node) && node.name) namedFunctions.set(node.name.text, node);
		const onloadFn = (ts.isMethodDeclaration(node) && node.name.getText(file) === 'onload') ? node
			: (ts.isPropertyAssignment(node) && node.name.getText(file) === 'onload' && isFunctionNode(node.initializer)) ? node.initializer
			: null;
		if (onloadFn?.parameters[0] && ts.isIdentifier(onloadFn.parameters[0].name)) ctxNames.add(onloadFn.parameters[0].name.text);
		ts.forEachChild(node, collectConsts);
	};
	collectConsts(file);
	/** Whether `node` names the mod's `ctx` (any identifier when no onload parameter was found) */
	const isCtx = (node) => ts.isIdentifier(node) && (ctxNames.size === 0 || ctxNames.has(node.text));
	/** A function node, or the function a name refers to in this file */
	const resolveFunction = (node) => (node && ts.isIdentifier(node) ? namedFunctions.get(node.text) ?? null : node);
	let dynamicNetwork = false;

	/** Checks the URL argument of fetch, WebSocket or EventSource */
	const checkTarget = (api, arg) => {
		const text = !arg ? null
			: ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg) ? arg.text
			: ts.isTemplateExpression(arg) ? arg.head.text
			: null;
		if (text === null || !text.includes('://') || connectAllowed(text, connectSrc) === null) {
			dynamicNetwork = true;
			return;
		}
		if (!connectAllowed(text, connectSrc)) {
			warnings.push(`main.js:${lineOf(arg)}: ${api} to ${new URL(text).origin} is blocked by the app's CSP connect-src (allowed: ${allowedHosts(connectSrc)}); see 11-network-and-platform.md#fetch-and-the-csp`);
		}
	};

	/** The method names called on the result of `call`, in chain order */
	const chainAfter = (call) => {
		const names = [];
		let node = call;
		while (ts.isPropertyAccessExpression(node.parent) && ts.isCallExpression(node.parent.parent) && node.parent.parent.expression === node.parent) {
			names.push(node.parent.name.text);
			node = node.parent.parent;
		}
		return { names, text: node.getText(file) };
	};

	/** Warns on a `kb.pages(...)` / `kb.pagePaths(...)` read that is not scoped */
	const checkKbRead = (call, method) => {
		const { names, text } = chainAfter(call);
		if (names.includes('limit')) return;
		if (names.some((n) => n === 'where' || n === 'filter') && /file\.(folder|path)/.test(text)) return;
		const arg = call.arguments[0];
		let problem = null;
		if (!arg) problem = 'has no source, so it returns every note in the vault';
		else if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
			const src = arg.text.trim();
			const folder = src.match(/^(["'])(.*)\1$/)?.[2];
			// A quoted folder joined with `and` (a tag and a folder, say) is a scope; `or` widens it again.
			const scopedCombination = folder === undefined && /"[^"/][^"]*"/.test(src) && !/\bor\b/i.test(src);
			if (scopedCombination) problem = null;
			else if (src === '') problem = 'has an empty source, so it returns every note in the vault';
			else if (folder === '' || folder === '/') problem = `source ${JSON.stringify(src)} is the whole vault`;
			else if (folder === undefined && src.startsWith('#')) problem = 'has a tag source, which filters across the whole vault and is not a scope';
			else if (folder === undefined) problem = `source ${JSON.stringify(src)} is unquoted, so it filters nothing (write '"${src}"')`;
		}
		if (problem) {
			warnings.push(`main.js:${lineOf(call)}: kb.${method}(...) ${problem}; scope it with a quoted folder or .limit(n), or say in a comment why the whole vault is needed (10-querying-the-index.md#scoping)`);
		}
	};

	/** The name of a called method or function, or null */
	const calleeName = (call) => {
		const callee = call.expression;
		if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
		if (ts.isIdentifier(callee)) return callee.text;
		return null;
	};
	/** Whether `call` is `<runName>.<member>(...)`, or `<runName>.ui.<x>(...)` for member 'ui' */
	const isRunCall = (call, runName, member) => {
		if (!runName || !ts.isPropertyAccessExpression(call.expression)) return false;
		let base = call.expression.expression;
		if (member === 'ui') return ts.isPropertyAccessExpression(base) && base.name.text === 'ui' && ts.isIdentifier(base.expression) && base.expression.text === runName;
		return call.expression.name.text === member && ts.isIdentifier(base) && base.text === runName;
	};
	/** Every node under `root`, in source order */
	const descendants = (root) => {
		const all = [];
		const walk = (node) => {
			all.push(node);
			ts.forEachChild(node, walk);
		};
		ts.forEachChild(root, walk);
		return all;
	};

	/**
	 * Whether control falls off the end of `fn` right after `stmt`, allowing
	 * only run.log / run.progress calls and `return;` after it on the way out.
	 */
	const endsAction = (stmt, fn, runName) => {
		if (ts.isReturnStatement(stmt)) return true;
		const trailing = (s) => (ts.isReturnStatement(s) && !s.expression)
			|| (ts.isExpressionStatement(s) && ts.isCallExpression(s.expression) && (isRunCall(s.expression, runName, 'log') || isRunCall(s.expression, runName, 'progress')));
		let node = stmt;
		for (;;) {
			const block = node.parent;
			if (!block || !ts.isBlock(block)) return false;
			const after = block.statements.slice(block.statements.indexOf(node) + 1);
			if (!after.every(trailing)) return false;
			if (block === fn.body) return true;
			const owner = block.parent;
			if (ts.isIfStatement(owner) || ts.isBlock(owner)) node = owner;
			else if (ts.isTryStatement(owner) && owner.tryBlock === block) node = owner;
			else return false;
		}
	};

	/** The innermost function around `node` */
	const scopeOf = (node) => {
		let n = node.parent;
		while (n && !ts.isFunctionLike(n)) n = n.parent;
		return n;
	};
	/** The functions from `node` out to `fn`, innermost first: the scopes whose awaits come before `node` runs */
	const scopeChain = (node, fn) => {
		const chain = [];
		for (let f = scopeOf(node); f; f = f === fn ? null : scopeOf(f)) chain.push(f);
		return chain;
	};
	/** Whether `inner` lies inside `outer` */
	const within = (inner, outer) => inner.getStart(file) >= outer.getStart(file) && inner.end <= outer.end;
	/**
	 * Whether `output` sits on a branch that leaves the action before `open`:
	 * inside a block that returns or throws and does not hold `open`
	 */
	const onExitBranch = (output, open, fn) => {
		for (let n = output.parent; n && n !== fn.body; n = n.parent) {
			if (ts.isBlock(n) && !within(open, n) && n.statements.some((s) => ts.isReturnStatement(s) || ts.isThrowStatement(s))) return true;
		}
		return false;
	};
	/** The written member of a vault or frontmatter write call (`write`, `updateNoteFrontmatter`), or null */
	const writeName = (call) => {
		const callee = call.expression;
		if (!ts.isPropertyAccessExpression(callee)) return null;
		const name = callee.name.text;
		if (name === 'updateNoteFrontmatter') return name;
		if (!VAULT_WRITES.includes(name)) return null;
		const base = callee.expression;
		const isVault = (ts.isPropertyAccessExpression(base) && base.name.text === 'vault') || (ts.isIdentifier(base) && vaultNames.has(base.text));
		return isVault ? `vault.${name}` : null;
	};

	/** Warnings about one action's `run` function; `ctxName` is the `ctx` its addAction was called on */
	const checkActionBody = (fn, id, ctxName) => {
		const runName = fn.parameters[1] && ts.isIdentifier(fn.parameters[1].name) ? fn.parameters[1].name.text : null;
		const nodes = descendants(fn);
		const calls = nodes.filter(ts.isCallExpression);

		for (const node of nodes) {
			if (ts.isPropertyAccessExpression(node) && node.name.text === 'ui' && ts.isIdentifier(node.expression) && node.expression.text === ctxName) {
				warnings.push(`main.js:${lineOf(node)}: ${ctxName}.ui inside action "${id}": use run.ui, which Stop closes (06-dialogs.md#which-set-to-use)`);
			}
		}

		// An action that logs or shows progress keeps its run view open when it ends done.
		const outputs = calls.filter((c) => isRunCall(c, runName, 'log') || isRunCall(c, runName, 'progress'));
		if (outputs.length > 0 && ts.isBlock(fn.body)) {
			for (const call of calls.filter((c) => OPEN_CALLS.includes(calleeName(c)))) {
				if (outputs.every((o) => onExitBranch(o, call, fn))) continue;
				let stmt = call;
				while (stmt && !ts.isBlock(stmt.parent)) stmt = stmt.parent;
				if (stmt && stmt !== fn && endsAction(stmt, fn, runName)) {
					used.openAfterOutput.add(id);
					warnings.push(`main.js:${lineOf(call)}: action "${id}" ends by opening a note after run.log / run.progress: on success its run view stays open on top of the note; drop the output on the success path or report with ctx.notify (03-runs.md#when-the-run-view-closes)`);
				}
			}
		}

		// A Stop during an await is only seen by a check after it; run.ui dialogs reject on Stop themselves.
		const awaits = nodes.filter((n) => ts.isAwaitExpression(n) && !(ts.isCallExpression(n.expression) && isRunCall(n.expression, runName, 'ui')));
		const checks = nodes.filter((n) => (ts.isPropertyAccessExpression(n) && n.name.text === 'aborted')
			|| (ts.isCallExpression(n) && calleeName(n) === 'throwIfAborted'));
		const unchecked = [];
		for (const call of calls) {
			const written = writeName(call);
			if (!written) continue;
			const start = call.getStart(file);
			// An await in a helper defined beside the write does not run before it; one in an enclosing function does.
			const chain = scopeChain(call, fn);
			const inScope = awaits.filter((a) => chain.includes(scopeOf(a)));
			const before = inScope.filter((a) => a.end <= start).sort((a, b) => a.end - b.end).pop();
			if (before && !checks.some((c) => c.getStart(file) >= before.end && c.getStart(file) < start)) {
				unchecked.push(`${written} on line ${lineOf(call)} (await on line ${lineOf(before)})`);
				continue;
			}
			// In a loop, the previous turn's await (the write's own included) also comes before the write.
			let loop = call.parent;
			while (loop && loop !== fn && !ts.isIterationStatement(loop, false)) loop = loop.parent;
			if (!loop || loop === fn || !chain.includes(scopeOf(loop) ?? fn)) continue;
			const loopAwait = inScope.find((a) => within(a, loop));
			if (loopAwait && !checks.some((c) => within(c, loop))) {
				unchecked.push(`${written} on line ${lineOf(call)} (the loop's await on line ${lineOf(loopAwait)}, from the previous turn)`);
			}
		}
		if (unchecked.length > 0) {
			warnings.push(`action "${id}" writes after an await with no signal.aborted check between, so a Stop during that await does not stop the write: ${unchecked.join(', ')} (03-runs.md#check-between-steps)`);
		}
	};

	/** Warns when a save or watch callback edits frontmatter without skipping the active note */
	const checkCallback = (arg, kind) => {
		const fn = resolveFunction(arg);
		if (!isFunctionNode(fn)) return;
		const nodes = descendants(fn);
		const writes = nodes.some((n) => ts.isIdentifier(n) && n.text === 'updateNoteFrontmatter');
		// Identifiers only: a comment or a string that mentions activeTab is no check.
		const skipsActive = nodes.some((n) => ts.isIdentifier(n) && /^activeTab/.test(n.text));
		if (!writes || skipsActive) return;
		warnings.push(`main.js:${lineOf(fn)}: a ${kind} callback calls updateNoteFrontmatter with no activeTabPath check: on the note the user is typing in, the rewrite moves the caret; skip the active note or stamp it after the tab changes (09-raw-app.md#updatenotefrontmatter)`);
	};

	/** Whether `node` is the result of `ctx.kb()`: a name bound to it, or `(await ctx.kb())` */
	const isKbObject = (node) => {
		if (ts.isIdentifier(node)) return kbNames.has(node.text);
		let inner = node;
		while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
		if (ts.isAwaitExpression(inner)) inner = inner.expression;
		return ts.isCallExpression(inner) && calleeName(inner) === 'kb';
	};

	/** Whether `node` reads `<x>.doc.toString()` or a variable holding it */
	const isDocText = (node) => {
		if (ts.isIdentifier(node)) return docVars.has(node.text);
		return ts.isCallExpression(node) && /\bdoc\.toString$/.test(node.expression.getText(file));
	};

	const visit = (node) => {
		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			const name = calleeName(node);
			if (ts.isPropertyAccessExpression(callee)) {
				if (name === 'addAction' && ts.isIdentifier(callee.expression)) {
					const arg = node.arguments[0];
					const spec = arg && ts.isIdentifier(arg) ? constObjects.get(arg.text) : arg;
					const props = spec && ts.isObjectLiteralExpression(spec) ? spec.properties : [];
					const idProp = props.find((p) => ts.isPropertyAssignment(p) && p.name.getText(file) === 'id');
					const id = idProp && ts.isStringLiteral(idProp.initializer) ? idProp.initializer.text : '?';
					const runProp = props.find((p) => p.name?.getText(file) === 'run');
					const runFn = !runProp ? null : ts.isMethodDeclaration(runProp) ? runProp : runProp.initializer;
					if (runFn && (ts.isArrowFunction(runFn) || ts.isFunctionExpression(runFn) || ts.isMethodDeclaration(runFn))) checkActionBody(runFn, id, callee.expression.text);
				}
				if ((name === 'pages' || name === 'pagePaths') && isKbObject(callee.expression)) checkKbRead(node, name);
				if (name === 'kb') used.kb = true;
				if (name === 'onNoteSaved') checkCallback(node.arguments[0], 'ctx.onNoteSaved');
				if (name === 'watch' && node.arguments.length === 2) checkCallback(node.arguments[1], 'ctx.watch');
				if (name === 'fetch' && ts.isIdentifier(callee.expression) && ['window', 'globalThis', 'self'].includes(callee.expression.text)) {
					checkTarget('fetch', node.arguments[0]);
				}
				if (name === 'replace') {
					const pattern = node.arguments[0];
					if (pattern && ts.isRegularExpressionLiteral(pattern) && /^\/\\\.(md|\(md\|markdown\)|\(markdown\|md\))\$\/[a-z]*$/.test(pattern.text)) {
						let scope = node.parent;
						while (scope && !ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
						const scopeText = scope && !ts.isSourceFile(scope) ? scope.getText(file) : '';
						// `[[${path}|${name}]]` pins the file and strips .md only from the alias.
						if (scopeText.includes('[[') && !/\[\[\$\{[^}]+\}\|/.test(scopeText)) {
							warnings.push(`main.js:${lineOf(node)}: a [[wikilink]] built from a path with .md stripped resolves by note name only (the first note with that name wins, whatever the folder); to pin the file keep the extension: [[Folder/Name.md|Name]]`);
						}
					}
				}
			} else if (ts.isIdentifier(callee) && callee.text === 'fetch') {
				checkTarget('fetch', node.arguments[0]);
			}
			if (SELECTOR_METHODS.includes(name) && ts.isPropertyAccessExpression(callee)) {
				const arg = node.arguments[0];
				const text = !arg ? null
					: ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg) ? arg.text
					: ts.isIdentifier(arg) ? constStrings.get(arg.text) ?? null
					: null;
				used.selectors.add(text === null ? `${name}(<dynamic>)` : JSON.stringify(text));
			}
		}
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && isDocText(node.initializer)) docVars.add(node.name.text);
		if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(node.operatorToken.kind)) {
			const sides = [node.left, node.right];
			const content = sides.find((s) => ts.isPropertyAccessExpression(s) && s.name.text === 'content');
			if (content && sides.some((s) => s !== content && isDocText(s))) {
				warnings.push(`main.js:${lineOf(node)}: compares the editor text with ${content.getText(file)}: the editor normalizes line endings to \\n but tab.content keeps a CRLF file's \\r\\n until the first edit, so on such a note this never matches; compare with ${content.getText(file)}.replace(/\\r\\n?/g, '\\n')`);
			}
		}
		if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && ['WebSocket', 'EventSource'].includes(node.expression.text)) {
			checkTarget(node.expression.text, node.arguments?.[0]);
		}
		if (ts.isPropertyAccessExpression(node)) {
			const base = node.expression;
			if (ts.isPropertyAccessExpression(base) && base.name.text === 'app' && isCtx(base.expression)) {
				const member = node.name.text;
				if (!used.app.has(member)) used.app.set(member, lineOf(node));
			}
			if (node.name.text === 'labs' && ts.isIdentifier(base)) used.labs = true;
		}
		if (ts.isIdentifier(node) && ['document', 'window'].includes(node.text)
			&& !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) used.globals.add(node.text);
		if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)) {
			const url = node.text.match(/^(?:https?|wss?):\/\/[^\s/'"`?#]+/)?.[0];
			if (url) urls.push({ url, line: lineOf(node) });
		}
		ts.forEachChild(node, visit);
	};
	visit(file);

	for (const [member, line] of used.app) {
		if (!appMembers.has(member)) warnings.push(`main.js:${line}: ctx.app.${member} is not a member of ctx.app (MOD_APP in ${APP_FILE}): in the app it is undefined`);
	}
	// A target held in a variable cannot be followed, so every URL literal stands in for it.
	if (dynamicNetwork) {
		for (const { url, line } of urls) {
			if (connectAllowed(url, connectSrc) === false) {
				warnings.push(`main.js:${line}: ${url} is outside the CSP connect-src (allowed: ${allowedHosts(connectSrc)}); a fetch to it is blocked`);
			}
		}
	}
	return used;
}

/** A hint for a loader error whose cause is easy to miss in the source */
function loaderHint(message, source, location, separators) {
	if (/found no "export default"/.test(message)) {
		if (/^[ \t]+export\s+default\b/m.test(source)) return 'the "export default" line is indented; start it at column 0';
		if (/^export\s+default[{(\[]/m.test(source)) return 'put a space after "export default"';
		if (/\Sexport\s+default\b/.test(source)) return '"export default" follows other code on its line; give it its own line';
	}
	if (/found \d+ "export default" lines/.test(message)) {
		const lines = source.split('\n').flatMap((l, i) => (/^export\s+default\s/.test(l) ? [i + 1] : []));
		return `lines ${lines.join(', ')} start with "export default" (a template literal or block comment counts too)`;
	}
	if (location) {
		const text = source.split('\n')[location.line - 1] ?? '';
		const visible = text.replace(/\u2028/g, '<U+2028>').replace(/\u2029/g, '<U+2029>').trim();
		const shown = visible.length > 120 ? `${visible.slice(0, 120)}...` : visible;
		const extra = separators > 0 ? '\n    the file holds a literal U+2028 / U+2029 (see the warnings), a likely cause' : '';
		return `at main.js:${location.line}:${location.column}: ${shown}${extra}`;
	}
	return null;
}

/**
 * Records what mod code touches. Raw paths are kept to three segments
 * (`app.editorStore.activeTab`), browser globals to two (`document.createElement()`).
 * While `blocked` is set (an action body under --run), a raw read throws.
 */
function createRecorder(appMembers) {
	const raw = new Set();
	const browser = new Set();
	const unknownApp = new Set();
	const appWrites = new Set();
	const listeners = [];
	const unmodelled = new Map();
	const modelled = new Set();
	return {
		raw, browser, unknownApp, appWrites, listeners, unmodelled, modelled, appMembers, blocked: false,
		/** Records a read of a `ctx.app` member that --run models; it never throws */
		use(path) {
			raw.add(path.split('.').slice(0, 3).join('.'));
			if (this.blocked) modelled.add(`ctx.${path}`);
		},
		touch(path) {
			const segments = path.split('.');
			if (segments[0] === 'app' || segments[0] === 'kb()') {
				if (this.blocked) {
					const member = `ctx.${segments.slice(0, 3).join('.')}`;
					unmodelled.set(member, (unmodelled.get(member) ?? 0) + 1);
					throw new realm.Error(`not modelled by --run: ${member}; verify this part in the app`);
				}
				raw.add(segments.slice(0, 3).join('.'));
			} else {
				browser.add(segments.slice(0, 2).join('.'));
			}
		},
		write(path) {
			if (path.startsWith('app.')) {
				this.touch(path);
				appWrites.add(path);
			}
		},
	};
}

/**
 * A proxy that stands for any raw object: every member read is another proxy
 * (the same one for the same key), calls and `new` return fresh proxies,
 * writes are kept. It is never thenable, iterates as empty, and converts to
 * `''` or `0`, so mod code runs through it without a real app or DOM. The
 * `ctx.app` proxy (path `app`) is the exception: a name MOD_APP lacks reads
 * as undefined, as in the app, so a read through it throws there too.
 */
function rawProxy(path, recorder) {
	const children = new Map();
	const stored = new Map();
	let self;
	const listenerMethod = (key) => (type, fn, options) => {
		recorder.touch(`${path}.${key}`);
		if (key === 'addEventListener') recorder.listeners.push({ target: self, path, type, fn, signal: options?.signal });
		else {
			const i = recorder.listeners.findIndex((l) => l.target === self && l.type === type && l.fn === fn);
			if (i !== -1) recorder.listeners.splice(i, 1);
		}
	};
	self = new Proxy(function raw() {}, {
		get(_target, key) {
			if (key === Symbol.toPrimitive) return (hint) => (hint === 'number' ? 0 : '');
			if (key === Symbol.iterator) return function* empty() {};
			if (key === Symbol.hasInstance) return () => false;
			if (typeof key === 'symbol' || key === 'then') return undefined;
			if (stored.has(key)) return stored.get(key);
			if (key === 'length' || key === 'size') return 0;
			if (key === 'toString' || key === 'valueOf' || key === 'toJSON') return () => '';
			if (key === 'addEventListener' || key === 'removeEventListener') return listenerMethod(key);
			if (path === 'app' && !recorder.appMembers.has(key)) {
				recorder.unknownApp.add(key);
				return undefined;
			}
			const child = `${path}.${key}`;
			recorder.touch(child);
			if (!children.has(key)) children.set(key, rawProxy(child, recorder));
			return children.get(key);
		},
		set(_target, key, value) {
			recorder.write(`${path}.${String(key)}`);
			stored.set(key, value);
			return true;
		},
		has: (_target, key) => path !== 'app' || typeof key !== 'string' || recorder.appMembers.has(key),
		apply: () => rawProxy(`${path}()`, recorder),
		construct: () => rawProxy(`new ${path}`, recorder),
	});
	return self;
}

/**
 * A `ctx.app` object (or part of one) that --run models: the keys of
 * `members` are read as they are; any other key is a raw read, which throws
 * `not modelled by --run` inside an action. Writes are raw too.
 */
function modelledObject(path, members, recorder) {
	return new Proxy(members, {
		get(target, key) {
			if (typeof key === 'symbol' || key === 'then') return undefined;
			if (Object.hasOwn(target, key)) {
				recorder.use(`${path}.${key}`);
				return target[key];
			}
			recorder.touch(`${path}.${key}`);
			return rawProxy(`${path}.${key}`, recorder);
		},
		set(_target, key) {
			recorder.write(`${path}.${String(key)}`);
			return true;
		},
	});
}

/**
 * The timers of the mod's realm: the checker's own, wrapped so the check
 * knows which ones the mod left running after unload. Like the web view's,
 * they return numeric ids. Callbacks still fire; a throw inside one becomes
 * a warning. `real` stays the checker's, for its own waits.
 */
function trackTimers() {
	const real = { setTimeout, setInterval, clearTimeout, clearInterval };
	/** id -> { kind, handle } of each timer still pending */
	const active = new Map();
	let nextId = 1;
	const guarded = (fn, args) => {
		if (typeof fn !== 'function') return;
		inPhase('a timer callback', () => {
			try {
				const result = fn(...args);
				if (result && typeof result.catch === 'function') result.catch((err) => warnings.push(`a timer callback rejected: ${messageOf(err)}`));
			} catch (err) {
				warnings.push(`a timer callback threw: ${messageOf(err)}`);
			}
		});
	};
	const clear = (id) => {
		const timer = active.get(id);
		if (!timer) return;
		active.delete(id);
		real.clearInterval(timer.handle);
	};
	const forMod = {
		setTimeout: (fn, ms, ...args) => {
			const id = nextId++;
			const handle = real.setTimeout(() => {
				active.delete(id);
				guarded(fn, args);
			}, ms);
			active.set(id, { kind: 'setTimeout', handle });
			return id;
		},
		setInterval: (fn, ms, ...args) => {
			const id = nextId++;
			active.set(id, { kind: 'setInterval', handle: real.setInterval(() => guarded(fn, args), ms) });
			return id;
		},
		clearTimeout: clear,
		clearInterval: clear,
	};
	return { real, active, forMod };
}

/**
 * The realm mod code runs in (see the header): a `node:vm` context whose
 * globals are the browser proxies, the network stand-ins, a `fetch` that
 * records instead of sending, the tracked timers, Node's web APIs and a
 * `console` of its own. The app's mods.logic.ts is compiled into it, so its
 * `evaluateModSource` runs `new Function` there: the mod's top-level code and
 * everything it defines belong to that realm. Returns that logic module and
 * the realm's error classes.
 */
function createModRealm(ts, repo, recorder, connectSrc, calls, timers) {
	const sandbox = {};
	for (const name of [...BROWSER_GLOBALS, ...NETWORK_GLOBALS]) sandbox[name] = rawProxy(name, recorder);
	for (const name of WEB_GLOBALS) if (name in globalThis) sandbox[name] = globalThis[name];
	sandbox.console = Object.fromEntries(CONSOLE_METHODS.map((name) => [name, (...args) => console[name](...args)]));
	Object.assign(sandbox, timers.forMod);
	sandbox.fetch = async (input) => {
		const url = typeof input === 'string' ? input : String(input?.url ?? input);
		calls.push(`fetch(${url})`);
		if (connectAllowed(url, connectSrc) === false) {
			warnings.push(`mod code fetched ${url}, which the app's CSP connect-src blocks (allowed: ${allowedHosts(connectSrc)})`);
		}
		throw new realm.TypeError('check-mod sends no network requests');
	};
	const context = vm.createContext(sandbox, { name: 'kokobrain mod' });
	const fileName = join(repo, LOGIC_FILE);
	const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
		fileName,
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	});
	const load = vm.runInContext(`(function (exports) {${outputText}\nreturn exports;})`, context, { filename: fileName });
	const logic = load(vm.runInContext('({})', context));
	return { logic, errors: vm.runInContext('({ Error, TypeError })', context) };
}

/**
 * Runs `promise` with a time limit. Resolves `{ ok, value | error }`, or
 * `{ timeout: true }` when it does not settle in time.
 */
function settle(promise, timers) {
	return new Promise((done) => {
		const timer = timers.real.setTimeout(() => done({ timeout: true }), SETTLE_MS);
		Promise.resolve(promise).then(
			(value) => {
				timers.real.clearTimeout(timer);
				done({ ok: true, value });
			},
			(error) => {
				timers.real.clearTimeout(timer);
				done({ ok: false, error });
			},
		);
	});
}

/** The parent folder of a vault-relative path; '' for the vault root */
function parentOf(path) {
	const i = path.lastIndexOf('/');
	return i === -1 ? '' : path.slice(0, i);
}

/** The text of a file system rejection: a bare string, as Tauri sends it (OS text approximate) */
function osError(op, path, reason) {
	return `${op} ${FAKE_ROOT}/${path}: ${reason}`;
}
const ENOENT = 'No such file or directory (os error 2)';

/**
 * Throws the rejection of the app's file system scope for a path it refuses.
 * The fs plugin's globs (src-tauri/capabilities/default.json) match no
 * segment that starts with a dot, unix's default `require_literal_leading_dot`,
 * except the `.kokobrain` the scope lists by name. Release builds reject with
 * `forbidden path: <absolute path>` as a bare string.
 */
function assertInScope(path) {
	if (path.split('/').some((s) => s.startsWith('.') && s !== '.kokobrain')) throw `forbidden path: ${FAKE_ROOT}/${path}`;
}

/** The text of a memory vault file as the app reads it: TextDecoder drops a BOM and replaces invalid UTF-8 */
function textOf(value) {
	return typeof value === 'string' ? value : new TextDecoder().decode(value);
}

/** The bytes of a memory vault file: seeds hold their bytes, writes hold strings saved as UTF-8 */
function bytesOf(value) {
	return typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
}

/** The text of a file for a diff, with a BOM kept so the diff shows it (`﻿`) */
function diffTextOf(value) {
	return typeof value === 'string' ? value : new TextDecoder('utf-8', { ignoreBOM: true }).decode(value);
}

/**
 * Tracks which onNoteSaved callback a save comes from, across its awaits, so
 * a save made by a callback that re-triggers the same callback is counted
 */
const saveOrigin = new AsyncLocalStorage();

/**
 * An in-memory vault seeded from `seedDir`, with the host's `ctx.vault`
 * checks and messages (mod-vault.service.ts, fs.service.ts). Nothing is
 * written to disk. A seeded file holds its bytes, a written one a string.
 * `ops` lists every call; each change is marked when it came after Stop or
 * from an onNoteSaved callback. `notifySaved` is set by the fake `ctx`.
 */
function createMemoryVault(seedDir) {
	const files = new Map();
	const folders = new Set();
	const walk = (abs, rel) => {
		for (const name of readdirSync(abs)) {
			const childAbs = join(abs, name);
			const childRel = rel ? `${rel}/${name}` : name;
			const info = lstatSync(childAbs);
			if (info.isSymbolicLink()) continue;
			if (info.isDirectory()) {
				if (name === '.git') continue;
				folders.add(childRel);
				walk(childAbs, childRel);
			} else if (info.isFile()) files.set(childRel, readFileSync(childAbs));
		}
	};
	if (seedDir) walk(seedDir, '');
	return {
		files, folders, seedFiles: new Map(files), seedFolders: new Set(folders), ops: [], opened: [], stopped: false,
		notifySaved: () => {},
	};
}

/** Records a change in the memory vault's op list and the call list, marked when it came after Stop or from an onNoteSaved callback */
function recordChange(mem, record, text) {
	const shown = saveOrigin.getStore() ? `${text} (from an onNoteSaved callback)` : text;
	mem.ops.push({ text: shown, change: true, afterStop: mem.stopped });
	record(shown);
}

/** Builds `ctx.vault`, `ctx.workspace` and mod data over a memory vault */
function memoryVaultApi(mem, modId, logic, assertLive, record) {
	const invalid = (message) => new realm.Error(`Mod "${modId}": ${message}`);
	const { files, folders } = mem;
	const exists = (path) => files.has(path) || folders.has(path);
	const check = (path) => {
		assertLive();
		logic.assertVaultPath(path);
	};
	const assertContent = (op, content) => {
		if (typeof content !== 'string') throw invalid(`vault.${op} needs string content`);
	};
	const change = (text) => recordChange(mem, record, text);
	const note = (text) => {
		mem.ops.push({ text, change: false });
		record(text);
	};
	/** Moves a file or a folder with everything under it */
	const moveTree = (from, to) => {
		if (files.has(from)) {
			files.set(to, files.get(from));
			files.delete(from);
			return;
		}
		for (const key of [...files.keys()]) {
			if (key.startsWith(`${from}/`)) {
				files.set(`${to}${key.slice(from.length)}`, files.get(key));
				files.delete(key);
			}
		}
		for (const key of [...folders]) {
			if (key === from || key.startsWith(`${from}/`)) {
				folders.delete(key);
				folders.add(`${to}${key.slice(from.length)}`);
			}
		}
	};
	/** Creates every missing ancestor folder of `path`, as Rust `create_folder` does */
	const makeParents = (path) => {
		const segments = parentOf(path).split('/').filter(Boolean);
		for (let i = 1; i <= segments.length; i++) {
			const dir = segments.slice(0, i).join('/');
			if (files.has(dir)) throw `mkdir failed for ${FAKE_ROOT}/${parentOf(path)}: File exists (os error 17)`;
			folders.add(dir);
		}
	};

	const vault = {
		read: async (path) => {
			check(path);
			note(`vault.read(${path})`);
			assertInScope(path);
			if (files.has(path)) return textOf(files.get(path));
			throw osError('read', path, folders.has(path) ? 'Is a directory (os error 21)' : ENOENT);
		},
		exists: async (path) => {
			check(path);
			note(`vault.exists(${path})`);
			assertInScope(path);
			return exists(path);
		},
		list: async (folder) => {
			assertLive();
			if (folder !== '') logic.assertVaultPath(folder);
			note(`vault.list(${folder})`);
			if (folder !== '') assertInScope(folder);
			if (folder !== '' && !folders.has(folder)) throw osError('list', folder, files.has(folder) ? 'Not a directory (os error 20)' : ENOENT);
			const children = [...folders].map((p) => [p, true]).concat([...files.keys()].map((p) => [p, false]))
				.filter(([p]) => parentOf(p) === folder);
			// Reverse name order stands in for the OS directory order the app returns, which is not sorted either.
			return children
				.map(([p, isFolder]) => ({ name: p.split('/').pop(), path: p, isFolder }))
				.filter((e) => !e.name.startsWith('.'))
				.sort((a, b) => b.path.localeCompare(a.path));
		},
		create: async (path, content) => {
			check(path);
			assertContent('create', content);
			assertInScope(path);
			if (exists(path)) throw new realm.Error(`"${path}" already exists; use write`);
			assertLive();
			makeParents(path);
			files.set(path, content);
			change(`vault.create(${path})`);
			return path;
		},
		write: async (path, content) => {
			check(path);
			assertContent('write', content);
			assertInScope(path);
			if (!exists(path)) throw new realm.Error(`"${path}" does not exist; use create`);
			assertLive();
			if (folders.has(path)) throw osError('write', path, 'Is a directory (os error 21)');
			files.set(path, content);
			change(`vault.write(${path})`);
			// The app's write skips the after-save path for a mod's own files, onNoteSaved included.
			if (!logic.isModCodePath(`${FAKE_ROOT}/${path}`, FAKE_ROOT)) mem.notifySaved(path);
		},
		rename: async (path, newName) => {
			check(path);
			logic.assertVaultPath(newName);
			if (newName.includes('/')) throw invalid('vault.rename needs a single name');
			const parent = parentOf(path);
			const target = parent ? `${parent}/${newName}` : newName;
			if (target === path) return path;
			assertInScope(target);
			if (exists(target)) throw new realm.Error(`"${newName}" already exists in this folder`);
			assertInScope(path);
			if (!exists(path)) throw osError('rename', path, ENOENT);
			moveTree(path, target);
			change(`vault.rename(${path} -> ${target})`);
			assertLive();
			return target;
		},
		move: async (path, targetFolder) => {
			check(path);
			if (targetFolder !== '') check(targetFolder);
			const name = path.split('/').pop();
			const target = targetFolder === '' ? name : `${targetFolder}/${name}`;
			if (target === path) return path;
			assertInScope(target);
			if (exists(target)) throw new realm.Error(`"${name}" already exists in this folder`);
			assertInScope(path);
			if (!exists(path)) throw osError('move', path, ENOENT);
			if (targetFolder !== '' && !folders.has(targetFolder)) throw osError('move', targetFolder, ENOENT);
			if (targetFolder === path || targetFolder.startsWith(`${path}/`)) throw osError('move', path, 'Invalid argument (os error 22)');
			moveTree(path, target);
			change(`vault.move(${path} -> ${target})`);
			assertLive();
			return target;
		},
		delete: async (path) => {
			check(path);
			assertInScope(path);
			if (!exists(path)) throw osError('delete', path, ENOENT);
			for (const key of [...files.keys()]) if (key === path || key.startsWith(`${path}/`)) files.delete(key);
			for (const key of [...folders]) if (key === path || key.startsWith(`${path}/`)) folders.delete(key);
			change(`vault.delete(${path}) to the Trash`);
			assertLive();
		},
	};

	const workspace = {
		openNote: async (path) => {
			check(path);
			assertInScope(path);
			if (!exists(path)) throw new realm.Error(`"${path}" does not exist`);
			mem.opened.push(path);
			record(`openNote(${path})`);
		},
	};

	const dataPath = `${logic.MOD_DATA_DIR}/${modId}/data.json`;
	let saveBlocked = false;
	const data = {
		loadData: async () => {
			assertLive();
			saveBlocked = true;
			record('loadData()');
			if (!files.has(dataPath)) {
				saveBlocked = false;
				return null;
			}
			const parsed = logic.parseModData([...bytesOf(files.get(dataPath))]);
			if (parsed.ok) {
				saveBlocked = false;
				return parsed.value;
			}
			const corruptPath = `${logic.MOD_DATA_DIR}/${modId}/data.corrupt-${Date.now()}.json`;
			moveTree(dataPath, corruptPath);
			saveBlocked = false;
			change(`loadData moved a corrupt data.json to ${corruptPath}`);
			throw Object.assign(new realm.Error(`Mod "${modId}": data.json is not valid JSON; its content was kept in ${corruptPath}`), { name: 'ModDataCorruptError', corruptPath });
		},
		saveData: async (value) => {
			assertLive();
			let content;
			try {
				content = logic.serializeModData(value);
			} catch (err) {
				throw invalid(`saveData needs a value JSON can represent: ${messageOf(err)}`);
			}
			if (saveBlocked) throw invalid('saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again');
			makeParents(dataPath);
			files.set(dataPath, content);
			change('saveData()');
		},
	};
	return { vault, workspace, data };
}

/**
 * Like the app's FrontmatterWriteError (frontmatter-write.service.ts), an
 * Error of the mod's realm: `reason` says why the write refused or failed
 */
function frontmatterWriteError(reason, path) {
	return Object.assign(new realm.Error(`Frontmatter write ${reason}: ${path}`), { name: 'FrontmatterWriteError', reason, path });
}

/**
 * The `ctx.app` of --run over a memory vault: the members listed here, as the
 * app has them with a vault open at FAKE_ROOT and no note open in a tab.
 * `runLogic` is from loadRunLogic; without it the daily note and frontmatter
 * members stay unmodelled. Every other member goes to `raw`, the recording
 * proxy, which throws inside an action.
 */
function memoryApp(mem, runLogic, dailyFolder, recorder, raw, record) {
	const change = (text) => recordChange(mem, record, text);
	/** The vault-relative path of an absolute app path, or null outside the vault; the OS collapses `//` */
	const relative = (absolute) => {
		const path = String(absolute).replace(/\/{2,}/g, '/');
		return path.startsWith(`${FAKE_ROOT}/`) ? path.slice(FAKE_ROOT.length + 1) : null;
	};
	const makeParents = (path) => {
		const segments = parentOf(path).split('/').filter(Boolean);
		for (let i = 1; i <= segments.length; i++) mem.folders.add(segments.slice(0, i).join('/'));
	};
	const daily = { format: DAILY_DEFAULTS.format };
	const app = {
		vaultStore: modelledObject('app.vaultStore', { path: FAKE_ROOT, name: 'vault', isOpen: true, indexReady: true }, recorder),
		editorStore: modelledObject('app.editorStore', {
			tabs: Object.freeze([]), activeIndex: -1, activeTab: null, activeTabPath: null, activeTabContent: null, editorView: null,
		}, recorder),
		settingsStore: modelledObject('app.settingsStore', {
			templates: modelledObject('app.settingsStore.templates', { systemFolder: SYSTEM_FOLDER }, recorder),
			periodicNotes: modelledObject('app.settingsStore.periodicNotes', {
				folder: dailyFolder,
				daily: modelledObject('app.settingsStore.periodicNotes.daily', daily, recorder),
			}, recorder),
		}, recorder),
		// No tab is open, so both act on nothing, as the app's do then.
		syncExternalContentToEditor: (path) => {
			record(`syncExternalContentToEditor(${path}) (no open tab: no-op)`);
		},
		saveFileByPath: async (path) => {
			record(`saveFileByPath(${path}) (no open tab: true)`);
			return true;
		},
	};
	if (runLogic.frontmatter) {
		const { periodic, dayjs, frontmatter: fm } = runLogic;
		app.dailyNotePath = (date = new Date()) => periodic.buildPeriodicNotePath(FAKE_ROOT, dailyFolder, daily.format, dayjs(date));
		app.openOrCreateDailyNote = async () => {
			const absolute = app.dailyNotePath();
			const path = relative(absolute);
			if (!mem.files.has(path)) {
				makeParents(path);
				mem.files.set(path, '');
				change(`openOrCreateDailyNote() created ${path} (empty: the app applies the daily template)`);
			}
			record(`openOrCreateDailyNote() opened ${path} (the editor model still has no open tab)`);
			mem.opened.push(path);
		};
		// The flow of updateNoteFrontmatter for a note with no open tab.
		app.updateNoteFrontmatter = async (absolute, mutate) => {
			const path = relative(absolute);
			if (path === null) {
				record(`updateNoteFrontmatter(${absolute}) (outside the vault: the file system scope refuses it)`);
				throw `forbidden path: ${absolute}`;
			}
			assertInScope(path);
			if (!mem.files.has(path)) {
				record(`updateNoteFrontmatter(${absolute}) (read failed: no such note)`);
				throw `failed to open file at path: ${absolute} with error: ${ENOENT}`;
			}
			const base = textOf(mem.files.get(path));
			const lossy = fm.detectLossyFrontmatter(base);
			if (lossy !== null) {
				record(`updateNoteFrontmatter(${path}) (refused: ${lossy})`);
				throw frontmatterWriteError(lossy, absolute);
			}
			const next = fm.rebuildContent(mutate(fm.parseFrontmatterProperties(base)), fm.extractBody(base), base);
			if (next === base) {
				record(`updateNoteFrontmatter(${path}) (no change: resolved to the unchanged text)`);
				return base;
			}
			if (!mem.files.has(path)) {
				record(`updateNoteFrontmatter(${path}) (the note is gone)`);
				throw frontmatterWriteError('missing', absolute);
			}
			mem.files.set(path, next);
			change(`updateNoteFrontmatter(${path})`);
			mem.notifySaved(path);
			return next;
		};
	}
	// Unlike modelledObject, an unmodelled top-level member goes to `raw`, which also flags names MOD_APP lacks.
	return new Proxy(app, {
		get(target, key) {
			if (typeof key === 'symbol' || key === 'then') return undefined;
			if (Object.hasOwn(target, key)) {
				recorder.use(`app.${key}`);
				return target[key];
			}
			return raw[key];
		},
		set(_target, key, value) {
			raw[key] = value;
			return true;
		},
	});
}

/**
 * The fake `ctx`: every member of the real one, the host's argument checks
 * and messages, the unloaded guard. `state` holds what was registered;
 * `runtime` mirrors the host's per-mod state for the unload. With `mem`, the
 * vault, workspace and mod data work on that memory vault; without it they
 * record the call and return empty values.
 */
function createFakeContext(manifest, logic, recorder, iconPacks, calls, mem, timers) {
	const id = manifest.id;
	const runtime = { controller: new AbortController(), disposers: [], labels: new WeakMap(), unloaded: false };
	const state = { actions: new Map(), buttons: new Map(), placements: [], subscriptions: [], toasts: [], logs: [], dialogs: [], saveRuns: [] };
	const assertLive = () => {
		if (runtime.unloaded) throw new realm.Error(`Mod "${id}" is unloaded`);
	};
	const invalid = (message) => new realm.Error(`Mod "${id}": ${message}`);
	const isText = (value) => typeof value === 'string' && value.length > 0;
	/** Like the host's: a cleanup that runs once, whether the mod or the unload calls it */
	const disposable = (dispose, label) => {
		let done = false;
		const once = () => {
			if (done) return;
			done = true;
			const index = runtime.disposers.indexOf(once);
			if (index !== -1) runtime.disposers.splice(index, 1);
			dispose();
		};
		runtime.labels.set(once, label);
		runtime.disposers.push(once);
		return once;
	};
	const subscribe = (kind) => {
		state.subscriptions.push(kind);
		return disposable(() => {}, kind);
	};

	/** The live onNoteSaved callbacks, and the promises of the ones still running */
	const saveObservers = [];
	const saveCallbacks = new Set();
	/**
	 * Like the host's after-save observer: a save queues each callback with
	 * setTimeout 0, out of the save's own call. A save made inside a callback
	 * (across its awaits) is one level deeper; a callback re-triggered
	 * SAVE_LOOP_LIMIT levels deep is a save loop and stops here.
	 */
	const notifySaved = (path) => {
		const origin = saveOrigin.getStore();
		for (const observer of [...saveObservers]) {
			const depth = origin?.observer === observer ? origin.depth + 1 : 0;
			if (depth >= SAVE_LOOP_LIMIT) {
				if (!observer.looped) {
					observer.looped = true;
					errors.push(`onNoteSaved callback #${observer.number} is a save loop: its own save of ${path} triggered it again ${SAVE_LOOP_LIMIT} times in a row, and in the app it never stops (vault.write and updateNoteFrontmatter fire onNoteSaved); write only when the new text differs from the current one (07-events-and-reactivity.md#avoiding-save-loops)`);
				}
				continue;
			}
			const timer = timers.real.setTimeout(() => {
				observer.pending.delete(timer);
				if (runtime.unloaded) return;
				state.saveRuns.push(`#${observer.number} ${path}${depth > 0 ? ` (re-triggered, level ${depth})` : ''}`);
				const running = saveOrigin.run({ observer, depth }, () => inPhase('an onNoteSaved callback', () => {
					try {
						return Promise.resolve(observer.callback(path));
					} catch (err) {
						return Promise.reject(err);
					}
				}));
				const settled = running.catch((err) => warnings.push(`onNoteSaved callback #${observer.number} failed for ${path} (the app only logs "onNoteSaved callback failed"): ${messageOf(err)}`));
				saveCallbacks.add(settled);
				settled.finally(() => saveCallbacks.delete(settled));
			}, 0);
			observer.pending.add(timer);
		}
	};
	if (mem) mem.notifySaved = notifySaved;
	/** Whether a queued or running onNoteSaved callback is left */
	const savesPending = () => saveCallbacks.size > 0 || saveObservers.some((o) => o.pending.size > 0);

	const checkIcon = (buttonId, icon) => {
		const trimmed = icon.trim();
		const colon = trimmed.indexOf(':');
		const valid = trimmed !== '' && (colon === -1 || (iconPacks.includes(trimmed.slice(0, colon)) && colon < trimmed.length - 1));
		if (!valid) {
			errors.push(`rail button "${buttonId}": icon ${JSON.stringify(icon)} is not an icon ref; use pack:name (packs: ${iconPacks.join(', ')}) or a bare Lucide name, else the app shows the Puzzle fallback (02-actions-and-entry-points.md#icons)`);
			return null;
		}
		return colon === -1 ? { pack: 'lucide', name: trimmed } : { pack: trimmed.slice(0, colon), name: trimmed.slice(colon + 1) };
	};

	let vault;
	let workspace;
	let data;
	if (mem) {
		({ vault, workspace, data } = memoryVaultApi(mem, id, logic, assertLive, (text) => calls.push(text)));
	} else {
		const vaultPath = (op, path) => {
			assertLive();
			logic.assertVaultPath(path);
			calls.push(`vault.${op}(${path})`);
		};
		const content = (op, value) => {
			if (typeof value !== 'string') throw invalid(`vault.${op} needs string content`);
		};
		vault = {
			read: async (path) => (vaultPath('read', path), ''),
			exists: async (path) => (vaultPath('exists', path), false),
			list: async (folder) => {
				assertLive();
				if (folder !== '') logic.assertVaultPath(folder);
				calls.push(`vault.list(${folder})`);
				return [];
			},
			create: async (path, text) => (vaultPath('create', path), content('create', text), path),
			write: async (path, text) => {
				vaultPath('write', path);
				content('write', text);
			},
			rename: async (path, newName) => {
				vaultPath('rename', path);
				logic.assertVaultPath(newName);
				if (newName.includes('/')) throw invalid('vault.rename needs a single name');
				return [...path.split('/').slice(0, -1), newName].join('/');
			},
			move: async (path, target) => {
				vaultPath('move', path);
				if (target !== '') logic.assertVaultPath(target);
				return target === '' ? path.split('/').pop() : `${target}/${path.split('/').pop()}`;
			},
			delete: async (path) => {
				vaultPath('delete', path);
			},
		};
		workspace = {
			openNote: async (path) => {
				assertLive();
				logic.assertVaultPath(path);
				calls.push(`workspace.openNote(${path})`);
			},
		};
		data = {
			loadData: async () => {
				assertLive();
				calls.push('loadData()');
				return null;
			},
			saveData: async (value) => {
				assertLive();
				try {
					logic.serializeModData(value);
				} catch (err) {
					throw invalid(`saveData needs a value JSON can represent: ${messageOf(err)}`);
				}
				calls.push('saveData()');
			},
		};
	}

	/**
	 * A set of dialogs with the host's checks: `ctx.ui` (no `run`) or a run's
	 * `run.ui`. `answers` (from --answers) answers them in order; without
	 * one, a dialog in check mode or past the last answer resolves as Esc.
	 */
	const createUi = (run) => {
		const set = run ? 'run.ui' : 'ctx.ui';
		const assertRunning = () => {
			if (run?.signal.aborted) throw new DOMException('The run was stopped', 'AbortError');
		};
		const options = (kind, opts, texts) => {
			if (!isText(opts?.title)) throw invalid(`ui.${kind} needs a non-empty string title`);
			for (const field of ['message', ...texts]) {
				if (opts[field] !== undefined && typeof opts[field] !== 'string') throw invalid(`ui.${kind} needs a string ${field}`);
			}
			return opts;
		};
		/** The scripted answer for one dialog; "STOP" presses Stop */
		const answer = (kind, title, accept) => {
			const shown = { set, kind, title, answer: 'Esc' };
			state.dialogs.push(shown);
			calls.push(`${set}.${kind}()`);
			const queue = run?.answers ?? mem?.answers;
			if (!queue || queue.length === 0) return CANCELLED[kind];
			const index = queue.index++;
			const value = queue.shift();
			shown.answer = JSON.stringify(value);
			if (value === 'STOP' && mem?.stop) {
				mem.stop();
				shown.answer = 'STOP';
				if (run) throw new DOMException('The run was stopped', 'AbortError');
				// A ctx.ui dialog does not close on Stop: in the app it stays open and the action keeps waiting.
				shown.answer = 'STOP (a ctx.ui dialog stays open, so the action waits on it)';
				return new Promise(() => {});
			}
			const problem = accept(value);
			if (problem) {
				errors.push(`--answers[${index}] for ${set}.${kind} "${title}": ${problem}; answered as Esc`);
				shown.answer = `${JSON.stringify(value)} (invalid: Esc)`;
				return CANCELLED[kind];
			}
			return kind === 'alert' ? undefined : value;
		};
		return {
			alert: async (opts) => {
				assertRunning();
				assertLive();
				const { title } = options('alert', opts, []);
				return answer('alert', title, () => null);
			},
			confirm: async (opts) => {
				assertRunning();
				assertLive();
				const { title } = options('confirm', opts, ['confirmLabel', 'cancelLabel']);
				return answer('confirm', title, (v) => (typeof v === 'boolean' ? null : 'confirm takes true or false'));
			},
			prompt: async (opts) => {
				assertRunning();
				assertLive();
				const { title } = options('prompt', opts, ['label', 'placeholder', 'value']);
				return answer('prompt', title, (v) => (v === null || typeof v === 'string' ? null : 'prompt takes a string or null'));
			},
			pick: async (opts) => {
				assertRunning();
				assertLive();
				const { title, items } = options('pick', opts, ['placeholder']);
				if (!Array.isArray(items)) throw invalid('ui.pick needs an items array');
				const byId = new Map();
				for (const item of items) {
					const { id: itemId, title: itemTitle, description } = item ?? {};
					if (!isText(itemId) || !isText(itemTitle)) throw invalid('ui.pick needs items with non-empty string ids and titles');
					if (description !== undefined && typeof description !== 'string') throw invalid('ui.pick needs a string item description');
					if (byId.has(itemId)) throw invalid(`ui.pick duplicate item id "${itemId}"`);
					byId.set(itemId, item);
				}
				const picked = answer('pick', title, (v) => (v === null || byId.has(v) ? null : `no item id ${JSON.stringify(v)} (ids: ${[...byId.keys()].slice(0, 10).join(', ')})`));
				return picked === null ? null : byId.get(picked);
			},
			loading: async (label, task, opts) => {
				assertRunning();
				assertLive();
				if (!isText(label)) throw invalid('ui.loading needs a non-empty string label');
				if (typeof task !== 'function') throw invalid('ui.loading needs a task function');
				const shown = { set, kind: 'loading', title: label, answer: opts?.cancellable === true ? '(cancellable, not cancelled)' : '(takes no answer)' };
				state.dialogs.push(shown);
				calls.push(`${set}.loading()`);
				const stopHere = Boolean(mem?.stop) && ++mem.loadings === mem.stopAtLoading;
				const controller = new AbortController();
				const abort = () => controller.abort();
				runtime.controller.signal.addEventListener('abort', abort);
				run?.signal.addEventListener('abort', abort);
				// The run's Stop rejects the call at once, while the task goes on.
				const stopped = new Promise((_resolve, reject) => {
					run?.signal.addEventListener('abort', () => reject(new DOMException('The run was stopped', 'AbortError')));
				});
				stopped.catch(() => {});
				const settled = (async () => {
					try {
						return await task(controller.signal);
					} finally {
						runtime.controller.signal.removeEventListener('abort', abort);
						run?.signal.removeEventListener('abort', abort);
					}
				})();
				if (stopHere) {
					shown.answer = `STOP while its task runs (--stop-at-loading ${mem.stopAtLoading})${run ? '' : '; a ctx.ui loading does not close on Stop'}`;
					mem.stop();
				}
				return Promise.race([settled, stopped]);
			},
		};
	};
	const colors = Object.fromEntries(THEME_KEYS.map((key) => [key, '#808080']));

	const labs = {
		place: (actionId, options) => {
			assertLive();
			if (!state.actions.has(actionId)) throw invalid(`unknown action id "${actionId}"`);
			const menu = options?.menu;
			if (options?.palette !== true && menu === undefined) throw invalid('labs.place needs palette: true or menu');
			if (options.palette !== undefined && options.palette !== true) throw invalid('labs.place needs palette: true');
			if (menu !== undefined) {
				if (!menu || !Array.isArray(menu.on) || !menu.on.every((on) => on === 'note' || on === 'folder')) {
					throw invalid('labs.place needs menu.on to list note or folder');
				}
				if (menu.files !== undefined && menu.files !== 'markdown' && menu.files !== 'all') {
					throw invalid('labs.place needs menu.files to be markdown or all');
				}
				if (menu.on.length === 0) warnings.push(`labs.place("${actionId}") has menu.on: [], so no menu shows it`);
				// One menu entry per action: a later menu placement replaces the earlier one.
				for (const p of state.placements) if (p.actionId === actionId) p.menu = null;
			}
			const placement = { actionId, palette: options.palette === true, menu: menu ? { on: [...menu.on], files: menu.files ?? 'markdown' } : null, live: true };
			state.placements.push(placement);
			const where = [placement.palette ? 'palette' : null, placement.menu ? `menu ${placement.menu.on.join('+')}` : null].filter(Boolean).join(', ');
			return disposable(() => {
				placement.live = false;
			}, `labs.place ${actionId} (${where})`);
		},
	};

	let registered = 0;
	const ctx = {
		apiVersion: 1,
		mod: { id, name: manifest.name, version: manifest.version, dir: `${logic.MODS_DIR}/${id}` },
		signal: runtime.controller.signal,
		register: (dispose) => {
			assertLive();
			registered++;
			const text = typeof dispose === 'function' ? dispose.toString().replace(/\s+/g, ' ') : String(dispose);
			runtime.labels.set(dispose, `ctx.register #${registered}: ${text.length > 60 ? `${text.slice(0, 60)}...` : text}`);
			runtime.disposers.push(dispose);
		},
		notify: (message, options) => {
			assertLive();
			const kind = ['info', 'success', 'warning', 'error'].includes(options?.kind) ? options.kind : 'info';
			state.toasts.push(`${kind}: ${manifest.name}: ${message}`);
			calls.push(`notify(${String(message)})`);
		},
		log: (...args) => {
			assertLive();
			state.logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a) ?? String(a))).join(' '));
		},
		addAction: (action) => {
			assertLive();
			if (!isText(action?.id)) throw invalid('addAction needs a non-empty string id');
			if (!isText(action.title)) throw invalid('addAction needs a non-empty string title');
			if (typeof action.run !== 'function') throw invalid('addAction needs a run function');
			if (action.description !== undefined && typeof action.description !== 'string') {
				throw invalid('addAction needs a string description');
			}
			const input = action.input;
			if (input !== undefined) {
				const placeholder = typeof input === 'object' && input !== null ? input.placeholder : undefined;
				const valid = typeof input === 'object' && input !== null && (placeholder === undefined || typeof placeholder === 'string');
				if (!valid) throw invalid('addAction needs input to be an object with an optional string placeholder');
			}
			if (state.actions.has(action.id)) throw invalid(`duplicate action id "${action.id}"`);
			const entry = { id: action.id, title: action.title, input: input !== undefined, run: action.run };
			state.actions.set(entry.id, entry);
			return disposable(() => {
				if (state.actions.get(entry.id) === entry) state.actions.delete(entry.id);
				for (const p of state.placements) if (p.actionId === entry.id) p.live = false;
			}, `action ${entry.id}`);
		},
		addRailButton: (button) => {
			assertLive();
			if (!isText(button?.id)) throw invalid('addRailButton needs a non-empty string id');
			if (!isText(button.title)) throw invalid('addRailButton needs a non-empty string title');
			if (typeof button.icon !== 'string') throw invalid('addRailButton needs a string icon');
			const ids = button.actions;
			if (ids !== undefined && !(Array.isArray(ids) && ids.every((a) => typeof a === 'string'))) {
				throw invalid('addRailButton needs actions to be a list of action ids');
			}
			if (state.buttons.has(button.id)) throw invalid(`duplicate rail button id "${button.id}"`);
			const icon = checkIcon(button.id, button.icon);
			const entry = { id: button.id, title: button.title, icon: button.icon, iconRef: icon, actions: ids ? [...ids] : undefined };
			state.buttons.set(entry.id, entry);
			return disposable(() => state.buttons.delete(entry.id), `rail button ${entry.id}`);
		},
		watch: (read, onChange) => {
			assertLive();
			if (typeof read !== 'function') throw invalid('watch needs a read function');
			if (typeof onChange !== 'function') throw invalid('watch needs a callback function');
			// The host reads once at subscribe and logs a failure instead of throwing.
			try {
				read();
			} catch (err) {
				warnings.push(`a ctx.watch read threw at subscribe (the app logs "watch read failed"): ${messageOf(err)}`);
			}
			return subscribe('watch');
		},
		onNoteSaved: (callback) => {
			assertLive();
			if (typeof callback !== 'function') throw invalid('onNoteSaved needs a callback function');
			const observer = { number: saveObservers.length + 1, callback, pending: new Set(), looped: false };
			saveObservers.push(observer);
			state.subscriptions.push('onNoteSaved');
			return disposable(() => {
				saveObservers.splice(saveObservers.indexOf(observer), 1);
				for (const timer of observer.pending) timers.real.clearTimeout(timer);
				observer.pending.clear();
			}, 'onNoteSaved');
		},
		vault,
		workspace,
		ui: createUi(null),
		theme: {
			get current() {
				assertLive();
				return { mode: 'light', colors: { ...colors } };
			},
			onChange: (callback) => {
				assertLive();
				if (typeof callback !== 'function') throw invalid('theme.onChange needs a callback function');
				return subscribe('theme.onChange');
			},
		},
		labs,
		...data,
		get app() {
			assertLive();
			return appProxy;
		},
		get kb() {
			assertLive();
			return () => {
				assertLive();
				recorder.touch('kb()');
				return Promise.resolve(rawProxy('kb()', recorder));
			};
		},
	};
	const appProxy = mem
		? memoryApp(mem, mem.runLogic, mem.dailyFolder, recorder, rawProxy('app', recorder), (text) => calls.push(text))
		: rawProxy('app', recorder);
	const unknownCtx = new Set();
	const guarded = new Proxy(ctx, {
		get(target, key, receiver) {
			if (typeof key === 'string' && !(key in target)) unknownCtx.add(key);
			return Reflect.get(target, key, receiver);
		},
	});
	return { ctx: guarded, state, runtime, unknownCtx, invalid, createUi, savesPending };
}

/**
 * Mirrors the host's unloadMod: abort, `onunload` (only after a good
 * onload), cleanups in reverse. Returns the label of each cleanup that ran.
 */
async function unload(mod, fake, dir, callOnunload, timers) {
	const { runtime } = fake;
	setPhase('the unload (ctx.signal listeners, onunload, cleanups)');
	runtime.unloaded = true;
	runtime.controller.abort();
	if (callOnunload && typeof mod.onunload === 'function') {
		const result = await settle((async () => mod.onunload())(), timers);
		if (result.timeout) warnings.push(`onunload did not settle within ${SETTLE_MS / 1000} s`);
		else if (!result.ok) errors.push(`${dir}: onunload failed: ${messageOf(result.error)}`);
	}
	const ran = [];
	for (const dispose of runtime.disposers.splice(0).reverse()) {
		const label = runtime.labels.get(dispose) ?? 'cleanup';
		ran.push(label);
		try {
			dispose();
		} catch (err) {
			errors.push(`${dir}: cleanup "${label}" failed: ${messageOf(err)}`);
		}
	}
	return ran;
}

/** Errors and warnings about what `onload` left registered, icon names included */
async function checkRegistrations(state, iconIndex) {
	const live = [...state.actions.keys()];
	for (const button of state.buttons.values()) {
		if (button.iconRef && button.iconRef.pack !== 'emoji') {
			const { known, close } = await iconIndex.lookup(button.iconRef.pack, button.iconRef.name);
			if (known === false) {
				warnings.push(`rail button "${button.id}": icon ${JSON.stringify(button.icon)} is not in the ${button.iconRef.pack} pack the app ships, so the rail shows the Puzzle fallback${close.length > 0 ? ` (close: ${close.join(', ')})` : ''} (02-actions-and-entry-points.md#icons)`);
			} else if (known === null) {
				warnings.push(`rail button "${button.id}": icon name not checked: the ${button.iconRef.pack} pack does not load outside the app; check it in the icon picker`);
			}
		}
		if (!button.actions) continue;
		if (button.actions.length === 0) {
			errors.push(`rail button "${button.id}" has actions: [], so its picker says "No actions."; omit actions to list every action`);
		}
		for (const actionId of new Set(button.actions)) {
			if (!state.actions.has(actionId)) {
				errors.push(`rail button "${button.id}" lists "${actionId}", which is not a registered action id (the app skips it silently)`);
			}
		}
		if (new Set(button.actions).size !== button.actions.length) warnings.push(`rail button "${button.id}" repeats an action id: each copy becomes a picker row`);
	}
	const reachable = (actionId) =>
		[...state.buttons.values()].some((b) => !b.actions || b.actions.includes(actionId))
		|| state.placements.some((p) => p.live && p.actionId === actionId && (p.palette || (p.menu && p.menu.on.length > 0)));
	for (const actionId of live) {
		if (!reachable(actionId)) {
			warnings.push(`action "${actionId}" has no entry point: list it on a rail button or place it with ctx.labs.place (02-actions-and-entry-points.md#entry-points-at-a-glance)`);
		}
	}
}

/** The recorded paths without those another path extends (`app.editorStore` under `app.editorStore.activeTabPath`), sorted */
function deepest(paths) {
	const all = [...paths];
	return all.filter((p) => !all.some((q) => q !== p && (q.startsWith(`${p}.`) || q.startsWith(`${p}(`)))).sort();
}

/** The registration lines of the report */
function describeRegistrations(state) {
	const lines = [];
	const actions = [...state.actions.values()].map((a) => `${a.id}${a.input ? ' (input)' : ''}`);
	lines.push(`actions     ${actions.join(', ') || 'none'}`);
	for (const b of state.buttons.values()) {
		lines.push(`rail        ${b.id} "${b.title}" icon ${b.icon} -> ${b.actions ? b.actions.join(', ') || '(empty)' : 'every action'}`);
	}
	const placed = new Map();
	for (const p of state.placements.filter((pl) => pl.live)) {
		const where = placed.get(p.actionId) ?? new Set();
		if (p.palette) where.add('palette');
		if (p.menu) where.add(`menu ${p.menu.on.join('+') || '(none)'}${p.menu.on.includes('note') ? ` (${p.menu.files})` : ''}`);
		placed.set(p.actionId, where);
	}
	if (placed.size > 0) lines.push(`labs.place  ${[...placed].map(([a, w]) => `${a}: ${[...w].join(', ')}`).join('; ')}`);
	if (state.subscriptions.length > 0) lines.push(`listens     ${state.subscriptions.join(', ')}`);
	return lines;
}

/** The tier and member lines: what the source uses, then what onload itself touched */
function describeUsage(used, recorder, state) {
	const raw = deepest(recorder.raw);
	const rawParts = [
		used.app.size > 0 || raw.some((p) => p.startsWith('app')) ? 'ctx.app' : null,
		used.kb || raw.some((p) => p.startsWith('kb()')) ? 'ctx.kb' : null,
		used.selectors.size > 0 ? 'DOM selectors' : null,
	].filter(Boolean);
	const usesLabs = used.labs || state.placements.length > 0;
	const lines = [`tiers       ${['stable', usesLabs ? 'unstable (ctx.labs)' : null, rawParts.length > 0 ? `raw (${rawParts.join(', ')})` : null].filter(Boolean).join(', ')}`];
	const source = [
		used.app.size > 0 ? `ctx.app.${[...used.app.keys()].sort().join(', ctx.app.')}` : null,
		used.kb ? 'ctx.kb()' : null,
		used.selectors.size > 0 ? `selectors ${[...used.selectors].join(', ')}` : null,
		used.globals.size > 0 ? `globals ${[...used.globals].sort().join(', ')}` : null,
	].filter(Boolean);
	if (source.length > 0) lines.push(`source      ${source.join('; ')}   (static: the whole file, nothing ran)`);
	const touched = [...raw, ...deepest(recorder.browser)];
	if (touched.length > 0) lines.push(`onload used ${touched.join(', ')}   (what running onload touched)`);
	return lines;
}

/** A line as printed in a diff: \r and other control characters made visible, tabs kept */
function visibleLine(line) {
	return line.replace(/[\x00-\x08\x0b-\x1f\x7f\u2028\u2029\ufeff]/g, (c) => (c === '\r' ? '\\r' : `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`));
}

/** A line diff of `before` and `after`: changed lines with 2 lines of context, at most `max` lines */
function lineDiff(before, after, max = 60) {
	const a = before.split('\n');
	const b = after.split('\n');
	if (a.length * b.length > 4_000_000) return [`    (${a.length} -> ${b.length} lines; too large to diff)`];
	const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
	}
	const ops = [];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) ops.push([' ', a[i++], j++]);
		else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) ops.push(['-', a[i++]]);
		else ops.push(['+', b[j++]]);
	}
	const keep = ops.map((op, k) => op[0] !== ' ' || ops.slice(Math.max(0, k - 2), k + 3).some((o) => o[0] !== ' '));
	const out = [];
	let skipped = false;
	ops.forEach((op, k) => {
		if (!keep[k]) {
			if (!skipped) out.push('    ...');
			skipped = true;
			return;
		}
		skipped = false;
		out.push(`    ${op[0]} ${visibleLine(op[1])}`);
	});
	return out.length > max ? [...out.slice(0, max), `    ... ${out.length - max} more diff lines`] : out;
}

/** The file changes of the memory vault against its seed */
function describeChanges(mem) {
	const lines = [];
	for (const [path, value] of mem.files) {
		const text = diffTextOf(value);
		if (!mem.seedFiles.has(path)) {
			const added = text === '' ? [] : (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
			lines.push(`  + ${path} (new, ${added.length === 0 ? 'empty' : `${added.length} line${added.length === 1 ? '' : 's'}`})`);
			lines.push(...added.slice(0, 40).map((l) => `    + ${visibleLine(l)}`));
			if (added.length > 40) lines.push(`    ... ${added.length - 40} more lines`);
		} else if (mem.seedFiles.get(path) !== value && !bytesOf(mem.seedFiles.get(path)).equals(bytesOf(value))) {
			lines.push(`  ~ ${path}`);
			lines.push(...lineDiff(diffTextOf(mem.seedFiles.get(path)), text));
		}
	}
	for (const path of mem.seedFiles.keys()) if (!mem.files.has(path)) lines.push(`  - ${path} (gone: deleted, renamed or moved)`);
	// A folder `create` made for its file is implied by the file; only an empty new one is listed.
	const holdsFile = (folder) => [...mem.files.keys()].some((p) => p.startsWith(`${folder}/`));
	for (const path of mem.folders) if (!mem.seedFolders.has(path) && !holdsFile(path)) lines.push(`  + ${path}/ (new empty folder)`);
	return lines;
}

/**
 * Runs one action the way the host's runAction does: a run with its signal,
 * log, progress and scripted `run.ui`; done, failed or cancelled. Raw reads
 * throw while it runs. Returns the report lines and whether it failed.
 */
async function runOne(fake, entry, args, mem, recorder, timers, manifest, calls, used) {
	const controller = new AbortController();
	let status = 'running';
	let failure = null;
	const lines = [];
	let progress = null;
	const progressLog = [];
	mem.answers = Object.assign([...args.answers], { index: 0 });
	mem.opened = [];
	mem.loadings = 0;
	mem.stopAtLoading = args.stopAtLoading;
	mem.stop = () => controller.abort();
	controller.signal.addEventListener('abort', () => {
		mem.stopped = true;
		if (status === 'running') status = 'cancelled';
	});
	const onUnload = () => controller.abort();
	fake.runtime.controller.signal.addEventListener('abort', onUnload);
	const run = {
		...(args.target ? { target: { ...args.target } } : {}),
		signal: controller.signal,
		log: (text) => {
			if (status !== 'running') return;
			lines.push(String(text));
		},
		progress: (done, total, label) => {
			if (!Number.isFinite(done) || !Number.isFinite(total)) throw fake.invalid('run.progress needs numbers done and total');
			if (label !== undefined && typeof label !== 'string') throw fake.invalid('run.progress needs a string label');
			if (status !== 'running') return;
			progress = { done, total, label };
			progressLog.push(`${done}/${total}${label === undefined ? '' : ` ${label}`}`);
		},
		ui: fake.createUi({ signal: controller.signal, answers: mem.answers }),
	};
	const startCalls = calls.length;
	const startToasts = fake.state.toasts.length;
	const startLogs = fake.state.logs.length;
	const startDialogs = fake.state.dialogs.length;
	const startSaveRuns = fake.state.saveRuns.length;
	recorder.blocked = true;
	const startedAt = performance.now();
	// After Stop the host stops waiting; the code goes on, so its late writes get a grace period to show.
	const graceAfterStop = new Promise((done) => {
		controller.signal.addEventListener('abort', () => timers.real.setTimeout(() => done({ pendingAfterStop: true }), STOP_GRACE_MS));
	});
	setPhase(`the run of action "${entry.id}"`);
	const result = await Promise.race([settle((async () => entry.run(args.input, run))(), timers), graceAfterStop]);
	const elapsed = Math.round(performance.now() - startedAt);
	// The onNoteSaved callbacks the run's saves queued run after it, as in the app; their changes belong to the report.
	const savesDeadline = performance.now() + SETTLE_MS;
	while (!result.timeout && fake.savesPending() && performance.now() < savesDeadline) {
		await new Promise((done) => timers.real.setTimeout(done, 5));
	}
	if (fake.savesPending()) warnings.push(`onNoteSaved callbacks were still queued or running ${SETTLE_MS / 1000} s after the run`);
	setPhase('the report');
	recorder.blocked = false;
	fake.runtime.controller.signal.removeEventListener('abort', onUnload);
	if (status === 'running') {
		if (result.timeout) status = 'timeout';
		else if (result.ok) status = 'done';
		else {
			status = 'failed';
			failure = result.error;
			fake.state.toasts.push(`error: ${manifest.name}: ${entry.title} failed: ${messageOf(failure)}`);
		}
	}

	const out = ['', `run         ${entry.id} with input ${JSON.stringify(args.input)}${args.target ? `, target ${JSON.stringify(args.target)}` : ', no target (rail or palette)'}`];
	if (entry.input === false && args.input !== '') out.push('            (this action asks for no input: in the app it always receives \'\')');
	const view = status === 'done' && lines.length === 0 && progress === null ? 'the run view closes by itself' : 'the run view stays open until closed';
	if (status === 'timeout') out.push(`outcome     still running after ${SETTLE_MS / 1000} s`);
	else out.push(`outcome     ${status} in ${elapsed} ms; ${view}`);
	if (status === 'failed') {
		out.push(`error       ${typeof failure === 'string' ? `(bare string) ${failure}` : messageOf(failure)}`);
		const frame = String(failure?.stack ?? '').match(/kokobrain-mods\/[^/]+\/main\.js:(\d+):(\d+)/);
		if (frame) {
			const line = Number(frame[1]) - FUNCTION_LINE_OFFSET;
			const column = line === 1 ? Number(frame[2]) - STRICT_PREFIX.length : Number(frame[2]);
			out.push(`            at main.js:${line}:${column} (the mod's frame in the stack)`);
		}
	}
	if (status === 'cancelled' && result.pendingAfterStop) out.push(`            the action's promise was still pending ${STOP_GRACE_MS} ms after Stop; in the app the code keeps running`);
	else if (status === 'cancelled' && !result.timeout) out.push(`            the action's promise ${result.ok ? 'resolved' : `rejected (${messageOf(result.error)}), dropped as the host does after Stop`}`);
	const dialogs = fake.state.dialogs.slice(startDialogs);
	dialogs.forEach((d, k) => out.push(`${k === 0 ? 'dialogs    ' : '           '} ${k + 1}. ${d.set}.${d.kind} "${d.title}" -> ${d.answer}`));
	// A run that failed before any dialog took an answer leaves them all over; that says nothing new.
	if (mem.answers.length > 0 && !(status === 'failed' && mem.answers.index === 0)) warnings.push(`--answers has ${mem.answers.length} answer(s) left over: ${JSON.stringify([...mem.answers])}`);
	if (lines.length > 0) out.push(...lines.map((l, k) => `${k === 0 ? 'log         ' : '            '}${l}`));
	if (progressLog.length > 0) out.push(`progress    ${progressLog.join('; ')}`);
	const saveRuns = fake.state.saveRuns.slice(startSaveRuns);
	if (saveRuns.length > 0) out.push(`onNoteSaved ran ${saveRuns.length}x after the run's saves: ${saveRuns.length > 12 ? `${saveRuns.slice(0, 12).join(', ')}, and ${saveRuns.length - 12} more` : saveRuns.join(', ')}`);
	const toasts = fake.state.toasts.slice(startToasts);
	if (toasts.length > 0) out.push(...toasts.map((t, k) => `${k === 0 ? 'toasts      ' : '            '}${t}`));
	const logs = fake.state.logs.slice(startLogs);
	if (logs.length > 0) out.push(...logs.map((t, k) => `${k === 0 ? 'ctx.log     ' : '            '}${t}`));
	const runCalls = calls.slice(startCalls);
	if (runCalls.length > 0) out.push(`calls       ${runCalls.length > 40 ? `${runCalls.slice(0, 40).join(', ')}, and ${runCalls.length - 40} more` : runCalls.join(', ')}`);
	if (mem.opened.length > 0) out.push(`opened      ${mem.opened.join(', ')}`);
	if (status === 'done' && mem.opened.length > 0 && view.includes('stays open') && !used.openAfterOutput.has(entry.id)) {
		warnings.push(`the run ended done after opening ${mem.opened.at(-1)}, with log or progress output: in the app its run view stays open on top of the note (03-runs.md#when-the-run-view-closes)`);
	}
	const afterStop = mem.ops.filter((o) => o.change && o.afterStop);
	if (afterStop.length > 0) warnings.push(`changes after Stop: ${afterStop.map((o) => o.text).join(', ')}; check run.signal.aborted before each write`);
	if (recorder.modelled.size > 0) out.push(`app         modelled by --run: ${deepest(recorder.modelled).join(', ')}`);
	if (args.stopAtLoading !== null && mem.loadings < args.stopAtLoading) warnings.push(`--stop-at-loading ${args.stopAtLoading}: the run showed ${mem.loadings} loading(s), so Stop was never pressed`);
	for (const [member, count] of recorder.unmodelled) {
		out.push(`not modelled ${member} (touched ${count}x): the run threw there; verify this path in the app`);
	}
	const changes = describeChanges(mem);
	out.push(changes.length > 0 ? 'changes     (in memory only; nothing was written to disk)' : 'changes     none');
	const ops = mem.ops.filter((o) => o.change);
	if (ops.length > 0) out.push(...ops.map((o) => `  ${o.text}${o.afterStop ? '   (after Stop)' : ''}`));
	out.push(...changes);
	return { lines: out, failed: status === 'failed' || status === 'timeout', status };
}

/** Checks one mod folder (and runs one action with --run) and prints the report; returns the exit code */
async function main() {
	const args = parseCli(process.argv.slice(2));
	const repo = findRepo(args.repo);
	const folderPath = resolve(args.folder);
	const folder = basename(folderPath);
	const dir = `_system/mods/${folder}`;
	const logic = await import(pathToFileURL(join(repo, LOGIC_FILE)).href);
	if (args.target && args.target.path !== '') {
		try {
			logic.assertVaultPath(args.target.path);
		} catch (err) {
			usage(2, `--target: ${messageOf(err)}; run.target paths are vault-relative`);
		}
	}
	const ts = createRequire(join(repo, 'package.json'))('typescript');
	const connectSrc = readConnectSrc(repo);
	const iconPacks = readIconPacks(repo);
	const iconIndex = await loadIconIndex(repo);
	const appMembers = readAppMembers(repo);
	const recorder = createRecorder(appMembers);
	const report = [`check-mod ${folderPath}`, `repo        ${repo}`];
	const calls = [];
	let runFailed = false;
	let runStatus = null;
	let mem = null;
	if (args.run !== undefined) {
		if (args.vault !== undefined && !existsSync(args.vault)) usage(2, `--vault ${args.vault} does not exist`);
		mem = createMemoryVault(args.vault ? resolve(args.vault) : null);
		mem.runLogic = await loadRunLogic(repo, ts);
		mem.dailyFolder = args.dailyFolder;
		report.push(`vault       ${args.vault ? `${resolve(args.vault)} (read only), ${mem.files.size} files` : 'empty'}, in memory at ${FAKE_ROOT} (ctx.app.vaultStore.path)`);
		report.push(`daily note  folder ${JSON.stringify(args.dailyFolder)}, format ${DAILY_DEFAULTS.format}`);
		if (mem.runLogic.error) warnings.push(`the app's frontmatter and daily note logic did not load (${mem.runLogic.error}), so dailyNotePath, openOrCreateDailyNote and updateNoteFrontmatter are not modelled`);
	}

	let manifest = null;
	try {
		const parsed = logic.parseModManifest(readFileSync(join(folderPath, 'manifest.json'), 'utf8'), folder);
		if (parsed.ok) {
			manifest = parsed.manifest;
			report.push(`manifest    ok: ${manifest.id} "${manifest.name}" ${manifest.version}`);
		} else {
			errors.push(parsed.error);
			report.push('manifest    invalid: the app stops here; main.js is checked anyway');
		}
	} catch (err) {
		errors.push(`${dir}: cannot read manifest.json: ${messageOf(err)}`);
	}
	// Without a valid manifest the app stops here; the check goes on to report the code too.
	const id = manifest?.id ?? (folder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mod');
	manifest ??= { id, name: folder, version: '0.0.0' };

	let source = null;
	try {
		source = readFileSync(join(folderPath, 'main.js'), 'utf8');
	} catch (err) {
		errors.push(`${dir}: cannot read main.js: ${messageOf(err)}`);
	}

	if (source !== null) {
		const separators = lineSeparatorChecks(source);
		let used = { app: new Map(), kb: false, labs: false, globals: new Set(), selectors: new Set(), openAfterOutput: new Set() };
		try {
			used = staticChecks(ts, source, connectSrc, appMembers);
		} catch (err) {
			warnings.push(`static checks skipped: ${messageOf(err)}`);
		}
		const timers = trackTimers();
		const modRealm = createModRealm(ts, repo, recorder, connectSrc, calls, timers);
		realm = modRealm.errors;

		let mod = null;
		try {
			setPhase('the top-level code of main.js');
			mod = modRealm.logic.evaluateModSource(source, id);
			report.push('main.js     evaluated by the app loader, in a realm with only the web view\'s globals');
		} catch (err) {
			let isSyntax = false;
			try {
				isSyntax = err?.name === 'SyntaxError';
			} catch {
				// A thrown value whose name cannot be read is no syntax error.
			}
			const location = isSyntax ? syntaxLocation(source, /^export\s+default\s+/m) : null;
			const hint = loaderHint(messageOf(err), source, location, separators);
			errors.push(`${dir}: ${messageOf(err)}${hint ? `\n    hint: ${hint}` : ''}`);
		}

		if (mod) {
			const fake = createFakeContext(manifest, modRealm.logic, recorder, iconPacks, calls, mem, timers);
			const startedAt = performance.now();
			setPhase('onload');
			const result = await settle((async () => mod.onload(fake.ctx))(), timers);
			setPhase('the checks after onload');
			const elapsed = Math.round(performance.now() - startedAt);
			const loaded = result.ok === true;
			if (result.timeout) errors.push(`${dir}: onload did not settle within ${SETTLE_MS / 1000} s, so the Labs row never shows Loaded`);
			else if (!loaded) errors.push(`${dir}: onload failed: ${messageOf(result.error)}`);
			else report.push(`onload      settled in ${elapsed} ms`);

			if (loaded) {
				await checkRegistrations(fake.state, iconIndex);
				report.push(...describeRegistrations(fake.state));
			}
			for (const key of fake.unknownCtx) warnings.push(`ctx.${key} is not a ctx member (13-api-reference.md)`);
			for (const key of recorder.unknownApp) {
				if (!used.app.has(key)) warnings.push(`ctx.app.${key} is not a member of ctx.app (MOD_APP in ${APP_FILE}): in the app it is undefined`);
			}
			for (const path of recorder.appWrites) warnings.push(`onload assigns ${path}: a raw write into the app's live state${path.startsWith('app.settingsStore') ? ', which is saved to the user\'s settings' : ''}`);
			const writes = calls.filter((c) => /^vault\.(create|write|rename|move|delete)\(/.test(c));
			if (writes.length > 0) warnings.push(`onload changes vault files on every load and every reload on save: ${writes.join(', ')}`);
			report.push(...describeUsage(used, recorder, fake.state));
			if (calls.length > 0) report.push(`onload ran  ${calls.join(', ')}`);

			let runLines = [];
			if (args.run !== undefined && loaded) {
				const entry = fake.state.actions.get(args.run);
				if (!entry) errors.push(`--run ${args.run}: no such action; registered: ${[...fake.state.actions.keys()].join(', ') || 'none'}`);
				else {
					const outcome = await runOne(fake, entry, args, mem, recorder, timers, manifest, calls, used);
					runLines = outcome.lines;
					runFailed = outcome.failed;
					runStatus = outcome.status;
				}
			}

			const cleanups = await unload(mod, fake, dir, loaded, timers);
			report.push(`unload      ${cleanups.length} cleanup${cleanups.length === 1 ? '' : 's'} ran${loaded && typeof mod.onunload === 'function' ? ' after onunload' : ''}${cleanups.length > 0 ? ':' : ''}`);
			report.push(...cleanups.map((c) => `              ${c}`));
			for (const { kind } of timers.active.values()) {
				warnings.push(`a ${kind} from the mod is still pending after unload: clear it in a ctx.register cleanup (07-events-and-reactivity.md#timers)`);
			}
			for (const l of recorder.listeners) {
				if (l.signal?.aborted) continue;
				warnings.push(`a "${l.type}" listener on ${l.path} is still attached after unload: remove it in a ctx.register cleanup (07-events-and-reactivity.md#dom-listeners)`);
			}
			report.push(...runLines);
		}
		for (const { handle } of timers.active.values()) timers.real.clearInterval(handle);
		// Node reports an unhandled rejection only between macrotasks, and every await above may settle as a microtask.
		await new Promise((done) => timers.real.setTimeout(done, 0));
	}
	setPhase('the report');

	console.log(report.join('\n'));
	if (warnings.length > 0) console.log(`\nwarnings (${warnings.length}):\n${warnings.map((w) => `  - ${w}`).join('\n')}`);
	if (errors.length > 0) console.log(`\nerrors (${errors.length}):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
	// --expect-fail turns a failed run into the pass and any other outcome into the failure.
	const runBad = args.expectFail ? runStatus !== 'failed' : runFailed;
	const verdict = errors.length > 0 ? 'FAIL'
		: args.expectFail ? (runBad ? `RUN DID NOT FAIL (--expect-fail; it ended ${runStatus ?? 'without running'})` : 'PASS (the run failed, as --expect-fail expects)')
		: runFailed ? 'RUN FAILED' : 'PASS';
	console.log(`\n${verdict}: ${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
	return errors.length > 0 || runBad ? 1 : 0;
}

/** Prints a crash of the checker itself and exits 2 */
function crash(err) {
	let text;
	try {
		text = err?.stack ?? messageOf(err);
	} catch {
		text = messageOf(err);
	}
	console.error(`check-mod: internal error: the checker itself failed, not the mod: ${text}`);
	process.exit(2);
}

/**
 * The child: beats to the parent while its event loop turns, runs `main`,
 * and tells its own crashes (exit 2) from stray errors of mod code (warnings).
 */
async function runChild() {
	setInterval(() => process.send?.({ phase }, () => {}), BEAT_MS).unref();
	const stray = (kind) => (err) => {
		if (isCheckerCrash(err)) crash(err);
		warnings.push(`${kind} from mod code: ${messageOf(err)}`);
	};
	process.on('unhandledRejection', stray('unhandled rejection'));
	process.on('uncaughtException', stray('uncaught error'));
	let code;
	try {
		code = await main();
	} catch (err) {
		crash(err);
	}
	process.exit(code);
}

/**
 * The parent: checks the usage, starts the child under the permission model,
 * and kills it when it stops beating for HANG_MS. Resolves the exit code.
 */
function supervise() {
	const argv = process.argv.slice(2);
	const args = parseCli(argv);
	if (!process.allowedNodeEnvironmentFlags.has('--permission')) {
		console.error(`check-mod: Node ${process.version} has no --permission flag; use Node 22.13 or later`);
		return Promise.resolve(2);
	}
	return new Promise((done) => {
		const child = spawn(process.execPath, [...process.execArgv, '--permission', '--allow-fs-read=*', fileURLToPath(import.meta.url), ...argv], {
			stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
			env: { ...process.env, [CHILD_ENV]: '1' },
		});
		let lastBeat = performance.now();
		let lastPhase = 'startup';
		let killed = false;
		child.on('message', (message) => {
			lastBeat = performance.now();
			if (typeof message?.phase === 'string') lastPhase = message.phase;
		});
		const watchdog = setInterval(() => {
			if (performance.now() - lastBeat < HANG_MS) return;
			killed = true;
			clearInterval(watchdog);
			child.kill('SIGKILL');
			if (lastPhase === 'startup') {
				console.error(`check-mod: the checker stopped responding for ${HANG_MS} ms during its startup, before any mod code ran`);
				done(2);
				return;
			}
			const dir = `_system/mods/${basename(resolve(args.folder))}`;
			console.log(`check-mod ${resolve(args.folder)}`);
			console.log(`\nerrors (1):\n  - ${dir}: the mod's code did not finish in ${HANG_MS} ms (during ${lastPhase}): it never let the event loop turn, a loop that never ends or promise callbacks that keep queueing each other; the check stopped it, and in the app it freezes the window`);
			console.log('\nFAIL: 1 error, 0 warnings (the rest of the report was lost with the stopped process)');
			done(1);
		}, BEAT_MS);
		child.on('error', (err) => {
			clearInterval(watchdog);
			console.error(`check-mod: cannot start the checker process: ${messageOf(err)}`);
			done(2);
		});
		child.on('exit', (code, signal) => {
			clearInterval(watchdog);
			if (killed) return;
			if (code === null) {
				console.error(`check-mod: the checker process ended by ${signal}`);
				done(2);
				return;
			}
			done(code);
		});
	});
}

if (process.env[CHILD_ENV] === '1') await runChild();
else process.exit(await supervise());
