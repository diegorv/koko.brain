#!/usr/bin/env node
/**
 * Checks a Kokobrain vault mod folder without the app.
 *
 *   node check-mod.mjs <mod-folder> [--repo <brain-checkout>]
 *   node check-mod.mjs <mod-folder> --run <action-id> [--vault <fixture-folder>]
 *       [--input <text>] [--answers '<json array>'] [--target note:<path>|folder:<path>]
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
 * `--answers` scripts the dialogs in order. `ctx.app` and `ctx.kb()` are not
 * modelled: touching either inside the action throws `not modelled by --run`.
 * File system rejections are bare strings, as in the app, but their OS text
 * is approximate, and paths are case-sensitive here (APFS is not).
 *
 * The script never writes to disk and never sends a request.
 *
 * Exit code: 0 when there is no error (warnings allowed) and a run did not
 * fail, 1 otherwise, 2 on bad usage or a repo it cannot read.
 */
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
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
/** The stand-in absolute vault root in bare-string file system errors */
const FAKE_ROOT = '/vault';

const errors = [];
const warnings = [];

/** The message of anything thrown, as the host reads it */
function messageOf(err) {
	return err instanceof Error ? err.message : String(err);
}

const USAGE = `usage: node check-mod.mjs <mod-folder> [--repo <brain-checkout>]
       node check-mod.mjs <mod-folder> --run <action-id> [--vault <fixture-folder>]
           [--input <text>] [--answers '<json array>'] [--target note:<path>|folder:<path>]

--repo     the Kokobrain checkout whose loader is used; default: the checkout this
           script lives in, else the current directory
--run      run one action body after onload, against an in-memory vault
--vault    folder whose files seed the in-memory vault (read only; default: empty)
--input    the text the action receives (default '')
--answers  JSON array, one answer per dialog in order: prompt a string or null,
           confirm true or false, pick an item id or null, alert anything;
           "STOP" presses Stop at that dialog; with no answer left a dialog gets Esc
--target   run.target: note:<path>, folder:<path>, or folder: for the vault root`;

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
				help: { type: 'boolean', short: 'h' },
			},
		});
	} catch (err) {
		usage(2, messageOf(err));
	}
	const { values, positionals } = parsed;
	if (values.help) usage(0);
	if (positionals.length !== 1) usage(2, 'pass exactly one mod folder');
	const runOnly = ['vault', 'input', 'answers', 'target'].filter((k) => values[k] !== undefined);
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
	return { folder: positionals[0], repo: values.repo, run: values.run, vault: values.vault, input: values.input ?? '', answers, target };
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
	const collectConsts = (node) => {
		if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Const)) {
			for (const d of node.declarations) {
				if (ts.isIdentifier(d.name) && d.initializer && (ts.isStringLiteral(d.initializer) || ts.isNoSubstitutionTemplateLiteral(d.initializer))) {
					constStrings.set(d.name.text, d.initializer.text);
				}
			}
		}
		ts.forEachChild(node, collectConsts);
	};
	collectConsts(file);
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
			if (src === '') problem = 'has an empty source, so it returns every note in the vault';
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

	/** Warnings about one action's `run` function */
	const checkActionBody = (fn, id) => {
		const runName = fn.parameters[1] && ts.isIdentifier(fn.parameters[1].name) ? fn.parameters[1].name.text : null;
		const nodes = descendants(fn);
		const calls = nodes.filter(ts.isCallExpression);

		// An action that logs or shows progress keeps its run view open when it ends done.
		const hasOutput = calls.some((c) => isRunCall(c, runName, 'log') || isRunCall(c, runName, 'progress'));
		if (hasOutput && ts.isBlock(fn.body)) {
			for (const call of calls.filter((c) => OPEN_CALLS.includes(calleeName(c)))) {
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
			const callee = call.expression;
			if (!ts.isPropertyAccessExpression(callee) || !VAULT_WRITES.includes(callee.name.text)) continue;
			if (!ts.isPropertyAccessExpression(callee.expression) || callee.expression.name.text !== 'vault') continue;
			const start = call.getStart(file);
			const before = awaits.filter((a) => a.end <= start).sort((a, b) => a.end - b.end).pop();
			if (!before) continue;
			if (checks.some((c) => c.getStart(file) >= before.end && c.getStart(file) < start)) continue;
			unchecked.push(`vault.${callee.name.text} on line ${lineOf(call)} (await on line ${lineOf(before)})`);
		}
		if (unchecked.length > 0) {
			warnings.push(`action "${id}" writes after an await with no signal.aborted check between, so a Stop during that await does not stop the write: ${unchecked.join(', ')} (03-runs.md#check-between-steps)`);
		}
	};

	/** Warns when a save or watch callback edits frontmatter without skipping the active note */
	const checkCallback = (fn, kind) => {
		if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return;
		const text = fn.getText(file);
		if (!text.includes('updateNoteFrontmatter') || /activeTab/.test(text)) return;
		warnings.push(`main.js:${lineOf(fn)}: a ${kind} callback calls updateNoteFrontmatter with no activeTabPath check: on the note the user is typing in, the rewrite moves the caret; skip the active note or stamp it after the tab changes (09-raw-app.md#updatenotefrontmatter)`);
	};

	/** Whether `node` reads `<x>.doc.toString()` or a variable holding it */
	const isDocText = (node) => {
		if (ts.isIdentifier(node)) return docVars.has(node.text);
		return ts.isCallExpression(node) && /\bdoc\.toString$/.test(node.expression.getText(file));
	};

	const visit = (node, action) => {
		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			const name = calleeName(node);
			if (ts.isPropertyAccessExpression(callee)) {
				if (name === 'addAction' && ts.isIdentifier(callee.expression)) {
					const spec = node.arguments[0];
					const props = spec && ts.isObjectLiteralExpression(spec) ? spec.properties : [];
					const idProp = props.find((p) => ts.isPropertyAssignment(p) && p.name.getText(file) === 'id');
					const id = idProp && ts.isStringLiteral(idProp.initializer) ? idProp.initializer.text : '?';
					const runProp = props.find((p) => p.name?.getText(file) === 'run');
					const runFn = !runProp ? null : ts.isMethodDeclaration(runProp) ? runProp : runProp.initializer;
					if (runFn && (ts.isArrowFunction(runFn) || ts.isFunctionExpression(runFn) || ts.isMethodDeclaration(runFn))) checkActionBody(runFn, id);
					const inner = { ctxName: callee.expression.text, id };
					node.arguments.forEach((arg) => visit(arg, inner));
					return;
				}
				if (name === 'pages' || name === 'pagePaths') checkKbRead(node, name);
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
			if (ts.isPropertyAccessExpression(base) && base.name.text === 'app' && ts.isIdentifier(base.expression)) {
				const member = node.name.text;
				if (!used.app.has(member)) used.app.set(member, lineOf(node));
			}
			if (node.name.text === 'labs' && ts.isIdentifier(base)) used.labs = true;
			if (action && node.name.text === 'ui' && ts.isIdentifier(base) && base.text === action.ctxName) {
				warnings.push(`main.js:${lineOf(node)}: ${action.ctxName}.ui inside action "${action.id}": use run.ui, which Stop closes (06-dialogs.md#which-set-to-use)`);
			}
		}
		if (ts.isIdentifier(node) && ['document', 'window'].includes(node.text)
			&& !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) used.globals.add(node.text);
		if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)) {
			const url = node.text.match(/^(?:https?|wss?):\/\/[^\s/'"`?#]+/)?.[0];
			if (url) urls.push({ url, line: lineOf(node) });
		}
		ts.forEachChild(node, (child) => visit(child, action));
	};
	visit(file, null);

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
	return {
		raw, browser, unknownApp, appWrites, listeners, unmodelled, blocked: false,
		touch(path) {
			const segments = path.split('.');
			if (segments[0] === 'app' || segments[0] === 'kb()') {
				if (this.blocked) {
					const member = `ctx.${segments.slice(0, 3).join('.')}`;
					unmodelled.set(member, (unmodelled.get(member) ?? 0) + 1);
					throw new Error(`not modelled by --run: ${member}; verify this part in the app`);
				}
				raw.add(segments.slice(0, 3).join('.'));
				if (segments[0] === 'app' && segments.length === 2 && !appMembers.has(segments[1].replace(/\(\)$/, ''))) unknownApp.add(segments[1]);
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
 * `''` or `0`, so mod code runs through it without a real app or DOM.
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
		has: () => true,
		apply: () => rawProxy(`${path}()`, recorder),
		construct: () => rawProxy(`new ${path}`, recorder),
	});
	return self;
}

/**
 * Wraps the global timers so the check knows which ones the mod left running
 * after unload. Callbacks still fire; a throw inside one becomes a warning.
 */
function trackTimers() {
	const real = { setTimeout, setInterval, clearTimeout, clearInterval };
	const active = new Map();
	const guarded = (fn, args) => {
		if (typeof fn !== 'function') return;
		try {
			const result = fn(...args);
			if (result && typeof result.catch === 'function') result.catch((err) => warnings.push(`a timer callback rejected: ${messageOf(err)}`));
		} catch (err) {
			warnings.push(`a timer callback threw: ${messageOf(err)}`);
		}
	};
	globalThis.setTimeout = (fn, ms, ...args) => {
		const handle = real.setTimeout(() => {
			active.delete(handle);
			guarded(fn, args);
		}, ms);
		active.set(handle, 'setTimeout');
		return handle;
	};
	globalThis.setInterval = (fn, ms, ...args) => {
		const handle = real.setInterval(() => guarded(fn, args), ms);
		active.set(handle, 'setInterval');
		return handle;
	};
	globalThis.clearTimeout = (handle) => {
		active.delete(handle);
		real.clearTimeout(handle);
	};
	globalThis.clearInterval = (handle) => {
		active.delete(handle);
		real.clearInterval(handle);
	};
	return { real, active };
}

/** Installs the browser globals and a `fetch` that records instead of sending */
function installBrowser(recorder, connectSrc, calls) {
	for (const name of BROWSER_GLOBALS) {
		try {
			Object.defineProperty(globalThis, name, { value: rawProxy(name, recorder), configurable: true, writable: true });
		} catch {
			// A non-configurable Node global stays as it is.
		}
	}
	globalThis.fetch = async (input) => {
		const url = typeof input === 'string' ? input : String(input?.url ?? input);
		calls.push(`fetch(${url})`);
		if (connectAllowed(url, connectSrc) === false) {
			warnings.push(`mod code fetched ${url}, which the app's CSP connect-src blocks (allowed: ${allowedHosts(connectSrc)})`);
		}
		throw new TypeError('check-mod sends no network requests');
	};
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
 * An in-memory vault seeded from `seedDir`, with the host's `ctx.vault`
 * checks and messages (mod-vault.service.ts, fs.service.ts). Nothing is
 * written to disk. `ops` lists every call; each change is marked when it
 * came after Stop.
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
			} else if (info.isFile()) files.set(childRel, readFileSync(childAbs, 'utf8'));
		}
	};
	if (seedDir) walk(seedDir, '');
	return { files, folders, seedFiles: new Map(files), seedFolders: new Set(folders), ops: [], stopped: false };
}

/** Builds `ctx.vault`, `ctx.workspace` and mod data over a memory vault */
function memoryVaultApi(mem, modId, logic, assertLive, record) {
	const invalid = (message) => new Error(`Mod "${modId}": ${message}`);
	const { files, folders } = mem;
	const exists = (path) => files.has(path) || folders.has(path);
	const check = (path) => {
		assertLive();
		logic.assertVaultPath(path);
	};
	const assertContent = (op, content) => {
		if (typeof content !== 'string') throw invalid(`vault.${op} needs string content`);
	};
	const change = (text) => {
		mem.ops.push({ text, change: true, afterStop: mem.stopped });
		record(text);
	};
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
			if (files.has(path)) return files.get(path);
			throw osError('read', path, folders.has(path) ? 'Is a directory (os error 21)' : ENOENT);
		},
		exists: async (path) => {
			check(path);
			note(`vault.exists(${path})`);
			return exists(path);
		},
		list: async (folder) => {
			assertLive();
			if (folder !== '') logic.assertVaultPath(folder);
			note(`vault.list(${folder})`);
			if (folder !== '' && !folders.has(folder)) throw osError('list', folder, files.has(folder) ? 'Not a directory (os error 20)' : ENOENT);
			const children = [...folders].map((p) => [p, true]).concat([...files.keys()].map((p) => [p, false]))
				.filter(([p]) => parentOf(p) === folder);
			return children
				.map(([p, isFolder]) => ({ name: p.split('/').pop(), path: p, isFolder }))
				.filter((e) => !e.name.startsWith('.'))
				.sort((a, b) => a.path.localeCompare(b.path));
		},
		create: async (path, content) => {
			check(path);
			assertContent('create', content);
			if (exists(path)) throw new Error(`"${path}" already exists; use write`);
			assertLive();
			makeParents(path);
			files.set(path, content);
			change(`vault.create(${path})`);
			return path;
		},
		write: async (path, content) => {
			check(path);
			assertContent('write', content);
			if (!exists(path)) throw new Error(`"${path}" does not exist; use create`);
			assertLive();
			if (folders.has(path)) throw osError('write', path, 'Is a directory (os error 21)');
			files.set(path, content);
			change(`vault.write(${path})`);
		},
		rename: async (path, newName) => {
			check(path);
			logic.assertVaultPath(newName);
			if (newName.includes('/')) throw invalid('vault.rename needs a single name');
			const parent = parentOf(path);
			const target = parent ? `${parent}/${newName}` : newName;
			if (target === path) return path;
			if (exists(target)) throw new Error(`"${newName}" already exists in this folder`);
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
			if (exists(target)) throw new Error(`"${name}" already exists in this folder`);
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
			if (!exists(path)) throw new Error(`"${path}" does not exist`);
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
			const parsed = logic.parseModData([...Buffer.from(files.get(dataPath), 'utf8')]);
			if (parsed.ok) {
				saveBlocked = false;
				return parsed.value;
			}
			const corruptPath = `${logic.MOD_DATA_DIR}/${modId}/data.corrupt-${Date.now()}.json`;
			moveTree(dataPath, corruptPath);
			saveBlocked = false;
			change(`loadData moved a corrupt data.json to ${corruptPath}`);
			throw Object.assign(new Error(`Mod "${modId}": data.json is not valid JSON; its content was kept in ${corruptPath}`), { name: 'ModDataCorruptError', corruptPath });
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
 * The fake `ctx`: every member of the real one, the host's argument checks
 * and messages, the unloaded guard. `state` holds what was registered;
 * `runtime` mirrors the host's per-mod state for the unload. With `mem`, the
 * vault, workspace and mod data work on that memory vault; without it they
 * record the call and return empty values.
 */
function createFakeContext(manifest, logic, recorder, iconPacks, calls, mem) {
	const id = manifest.id;
	const runtime = { controller: new AbortController(), disposers: [], labels: new WeakMap(), unloaded: false };
	const state = { actions: new Map(), buttons: new Map(), placements: [], subscriptions: [], toasts: [], logs: [], dialogs: [] };
	const assertLive = () => {
		if (runtime.unloaded) throw new Error(`Mod "${id}" is unloaded`);
	};
	const invalid = (message) => new Error(`Mod "${id}": ${message}`);
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
				state.dialogs.push({ set, kind: 'loading', title: label, answer: opts?.cancellable === true ? '(cancellable, not cancelled)' : '' });
				calls.push(`${set}.loading()`);
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
			return subscribe('onNoteSaved');
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
	const appProxy = rawProxy('app', recorder);
	const unknownCtx = new Set();
	const guarded = new Proxy(ctx, {
		get(target, key, receiver) {
			if (typeof key === 'string' && !(key in target)) unknownCtx.add(key);
			return Reflect.get(target, key, receiver);
		},
	});
	return { ctx: guarded, state, runtime, unknownCtx, invalid, createUi };
}

/**
 * Mirrors the host's unloadMod: abort, `onunload` (only after a good
 * onload), cleanups in reverse. Returns the label of each cleanup that ran.
 */
async function unload(mod, fake, dir, callOnunload, timers) {
	const { runtime } = fake;
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
	return line.replace(/[\x00-\x08\x0b-\x1f\x7f\u2028\u2029]/g, (c) => (c === '\r' ? '\\r' : `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`));
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
	for (const [path, text] of mem.files) {
		if (!mem.seedFiles.has(path)) {
			const added = text === '' ? [] : (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
			lines.push(`  + ${path} (new, ${added.length === 0 ? 'empty' : `${added.length} line${added.length === 1 ? '' : 's'}`})`);
			lines.push(...added.slice(0, 40).map((l) => `    + ${visibleLine(l)}`));
			if (added.length > 40) lines.push(`    ... ${added.length - 40} more lines`);
		} else if (mem.seedFiles.get(path) !== text) {
			lines.push(`  ~ ${path}`);
			lines.push(...lineDiff(mem.seedFiles.get(path), text));
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
	recorder.blocked = true;
	const startedAt = performance.now();
	// After Stop the host stops waiting; the code goes on, so its late writes get a grace period to show.
	const graceAfterStop = new Promise((done) => {
		controller.signal.addEventListener('abort', () => timers.real.setTimeout(() => done({ pendingAfterStop: true }), STOP_GRACE_MS));
	});
	const result = await Promise.race([settle((async () => entry.run(args.input, run))(), timers), graceAfterStop]);
	const elapsed = Math.round(performance.now() - startedAt);
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
	if (mem.answers.length > 0) warnings.push(`--answers has ${mem.answers.length} answer(s) left over: ${JSON.stringify([...mem.answers])}`);
	if (lines.length > 0) out.push(...lines.map((l, k) => `${k === 0 ? 'log         ' : '            '}${l}`));
	if (progressLog.length > 0) out.push(`progress    ${progressLog.join('; ')}`);
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
	for (const [member, count] of recorder.unmodelled) {
		out.push(`not modelled ${member} (touched ${count}x): the run threw there; verify this path in the app`);
	}
	const changes = describeChanges(mem);
	out.push(changes.length > 0 ? 'changes     (in memory only; nothing was written to disk)' : 'changes     none');
	const ops = mem.ops.filter((o) => o.change);
	if (ops.length > 0) out.push(...ops.map((o) => `  ${o.text}${o.afterStop ? '   (after Stop)' : ''}`));
	out.push(...changes);
	return { lines: out, failed: status === 'failed' || status === 'timeout' };
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
	const ts =createRequire(join(repo, 'package.json'))('typescript');
	const connectSrc = readConnectSrc(repo);
	const iconPacks = readIconPacks(repo);
	const iconIndex = await loadIconIndex(repo);
	const appMembers = readAppMembers(repo);
	const recorder = createRecorder(appMembers);
	const report = [`check-mod ${folderPath}`, `repo        ${repo}`];
	const calls = [];
	let runFailed = false;
	let mem = null;
	if (args.run !== undefined) {
		if (args.vault !== undefined && !existsSync(args.vault)) usage(2, `--vault ${args.vault} does not exist`);
		mem = createMemoryVault(args.vault ? resolve(args.vault) : null);
		report.push(`vault       ${args.vault ? `${resolve(args.vault)} (read only), ${mem.files.size} files` : 'empty'}, in memory`);
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
		installBrowser(recorder, connectSrc, calls);
		process.on('unhandledRejection', (err) => warnings.push(`unhandled rejection from mod code: ${messageOf(err)}`));
		process.on('uncaughtException', (err) => warnings.push(`uncaught error from mod code: ${messageOf(err)}`));

		let mod = null;
		try {
			mod = logic.evaluateModSource(source, id);
			report.push('main.js     evaluated by the app loader');
		} catch (err) {
			const location = err instanceof SyntaxError ? syntaxLocation(source, /^export\s+default\s+/m) : null;
			const hint = loaderHint(messageOf(err), source, location, separators);
			errors.push(`${dir}: ${messageOf(err)}${hint ? `\n    hint: ${hint}` : ''}`);
		}

		if (mod) {
			const fake = createFakeContext(manifest, logic, recorder, iconPacks, calls, mem);
			const startedAt = performance.now();
			const result = await settle((async () => mod.onload(fake.ctx))(), timers);
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
				}
			}

			const cleanups = await unload(mod, fake, dir, loaded, timers);
			report.push(`unload      ${cleanups.length} cleanup${cleanups.length === 1 ? '' : 's'} ran${loaded && typeof mod.onunload === 'function' ? ' after onunload' : ''}${cleanups.length > 0 ? ':' : ''}`);
			report.push(...cleanups.map((c) => `              ${c}`));
			for (const kind of timers.active.values()) {
				warnings.push(`a ${kind} from the mod is still pending after unload: clear it in a ctx.register cleanup (07-events-and-reactivity.md#timers)`);
			}
			for (const l of recorder.listeners) {
				if (l.signal?.aborted) continue;
				warnings.push(`a "${l.type}" listener on ${l.path} is still attached after unload: remove it in a ctx.register cleanup (07-events-and-reactivity.md#dom-listeners)`);
			}
			report.push(...runLines);
		}
		for (const handle of timers.active.keys()) timers.real.clearInterval(handle);
	}

	console.log(report.join('\n'));
	if (warnings.length > 0) console.log(`\nwarnings (${warnings.length}):\n${warnings.map((w) => `  - ${w}`).join('\n')}`);
	if (errors.length > 0) console.log(`\nerrors (${errors.length}):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
	const verdict = errors.length > 0 ? 'FAIL' : runFailed ? 'RUN FAILED' : 'PASS';
	console.log(`\n${verdict}: ${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
	return errors.length > 0 || runFailed ? 1 : 0;
}

process.exit(await main());
