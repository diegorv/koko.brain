import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isClassified, parsePolicy } from './policy-table';

/**
 * Every plugin command the frontend can send must have a row (or a
 * `plugin:<name>|*` row) in the remote `POLICY` table, or a browser session
 * would hit an unclassified command. The commands are read from the
 * installed `@tauri-apps/*` JS: for each name the app imports, the
 * `plugin:x|y` literals in that export's body and in the same-file functions
 * it calls. `getCurrentWindow()` / `getCurrentWebviewWindow()` return class
 * instances, so for those every command of the window and webview modules
 * counts. Literal `'plugin:x|y'` strings in app code count too.
 */

const ROOT = process.cwd();
const APP_DIRS = ['src/lib', 'src/routes', 'src/hooks.client.ts'];
const PLUGIN_RE = /['"`](plugin:[a-z-]+\|[a-z_]+)['"`]/g;
/** Modules whose exports hand out class instances with many methods. */
const CLASS_MODULES: Record<string, string[]> = {
	'@tauri-apps/api/window': ['window.js', 'webview.js'],
	'@tauri-apps/api/webviewWindow': ['window.js', 'webview.js', 'webviewWindow.js'],
};

function appFiles(path: string, out: string[] = []): string[] {
	const full = join(ROOT, path);
	if (/\.(ts|svelte)$/.test(path)) {
		out.push(full);
		return out;
	}
	for (const entry of readdirSync(full, { withFileTypes: true })) {
		const rel = join(path, entry.name);
		if (entry.isDirectory()) appFiles(rel, out);
		else if (/\.(ts|svelte)$/.test(entry.name)) out.push(join(ROOT, rel));
	}
	return out;
}

/** `@tauri-apps/x` -> the file its ESM entry resolves to. */
function moduleFile(specifier: string): string {
	const base = join(ROOT, 'node_modules', specifier);
	if (specifier.startsWith('@tauri-apps/api/')) {
		return join(ROOT, 'node_modules/@tauri-apps/api', `${specifier.slice('@tauri-apps/api/'.length)}.js`);
	}
	return join(base, 'dist-js/index.js');
}

/** The source of `function name(...) {...}` in `src`, by brace matching; null when absent. */
function functionBody(src: string, name: string): string | null {
	const m = new RegExp(String.raw`(?:^|\n)\s*(?:async\s+)?function\s+${name}\s*\(`).exec(src);
	if (!m) return null;
	const open = src.indexOf('{', m.index + m[0].length);
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		if (src[i] === '{') depth++;
		if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
	}
	return null;
}

/** Plugin commands reached from `name` in `src`, following same-file function calls. */
function commandsOf(src: string, name: string, seen = new Set<string>()): string[] | null {
	if (seen.has(name)) return [];
	seen.add(name);
	const body = functionBody(src, name);
	if (body === null) return null;
	const found = [...body.matchAll(PLUGIN_RE)].map((m) => m[1]);
	for (const call of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
		const nested = commandsOf(src, call[1], seen);
		if (nested) found.push(...nested);
	}
	return found;
}

function frontendPluginCommands(): Map<string, string> {
	const used = new Map<string, string>();
	for (const file of APP_DIRS.flatMap((d) => appFiles(d))) {
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(PLUGIN_RE)) used.set(m[1], file);
		for (const imp of text.matchAll(/import\s+(?!type\b)\{([^}]*)\}\s+from\s+'(@tauri-apps\/[^']+)'/g)) {
			const specifier = imp[2];
			const names = imp[1]
				.split(',')
				.map((n) => n.trim())
				.filter((n) => n && !n.startsWith('type '))
				.map((n) => n.split(/\s+as\s+/)[0].trim());
			const modFile = moduleFile(specifier);
			const src = readFileSync(modFile, 'utf8');
			for (const name of names) {
				const classFiles = CLASS_MODULES[specifier];
				const cmds = classFiles
					? classFiles.flatMap((f) =>
							[...readFileSync(join(ROOT, 'node_modules/@tauri-apps/api', f), 'utf8').matchAll(PLUGIN_RE)].map((x) => x[1]),
						)
					: (commandsOf(src, name) ?? [...src.matchAll(PLUGIN_RE)].map((x) => x[1]));
				for (const cmd of cmds) used.set(cmd, `${file} (${specifier}.${name})`);
			}
		}
	}
	return used;
}

describe('remote POLICY covers the plugin commands the frontend sends', () => {
	const policy = parsePolicy();
	const used = frontendPluginCommands();

	it('finds the plugin commands boot depends on', () => {
		for (const cmd of ['plugin:fs|read_text_file', 'plugin:fs|exists', 'plugin:fs|read_dir', 'plugin:event|listen']) {
			expect(used.has(cmd), cmd).toBe(true);
		}
	});

	it('classifies every one of them', () => {
		const missing = [...used.entries()].filter(([cmd]) => !isClassified(policy, cmd)).map(([cmd, from]) => `${cmd} <- ${from}`);
		expect(missing).toEqual([]);
	});

	it('does not treat an unknown plugin as classified', () => {
		expect(isClassified(policy, 'plugin:notification|notify')).toBe(false);
		expect(isClassified(policy, 'plugin:fs|truncate')).toBe(false);
	});
});
