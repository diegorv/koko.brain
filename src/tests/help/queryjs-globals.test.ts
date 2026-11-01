import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import ts from 'typescript';

/**
 * Type-checks a probe script against `help/examples/queryjs-globals.d.ts`
 * with the real compiler. The globals file sits outside the tsconfig
 * `include`, so `pnpm check` never reads it; this is what pins the types a
 * script author's editor sees for `kb` / `dv`.
 */

const GLOBALS = join(process.cwd(), 'help/examples/queryjs-globals.d.ts');
const PROBE = join(process.cwd(), 'help/examples/__probe__.ts');

/** Diagnostics (code + message) of `body` compiled as a script next to the globals file. */
function diagnose(body: string): string[] {
	const source = `/// <reference path="./queryjs-globals.d.ts" />\n${body}\n`;
	const options: ts.CompilerOptions = {
		strict: true,
		noEmit: true,
		target: ts.ScriptTarget.ES2022,
		lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
		types: [],
	};
	const host = ts.createCompilerHost(options);
	const readFile = host.readFile.bind(host);
	const getSourceFile = host.getSourceFile.bind(host);
	host.readFile = (f) => (f === PROBE ? source : readFile(f));
	host.fileExists = (f) => f === PROBE || ts.sys.fileExists(f);
	host.getSourceFile = (f, lang, ...rest) =>
		f === PROBE ? ts.createSourceFile(f, source, lang) : getSourceFile(f, lang, ...rest);
	const program = ts.createProgram([PROBE, GLOBALS], options, host);
	return ts
		.getPreEmitDiagnostics(program)
		.map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}

describe('queryjs-globals.d.ts', () => {
	it('types the DataArray property shorthand, through chain methods', () => {
		expect(
			diagnose(`
				const links: unknown[] = kb.pages('#x').file.link.array();
				const statuses = kb.pages().where((p) => p.archived === true).status;
				const deep = dv.pages().where(() => true).sort((p) => p.file.mtime).file.path;
				const grouped = kb.pages().groupBy((p) => p.file.folder).first()?.rows.file.name;
				const n: number = kb.pagePaths().length + kb.version;
				kb.ui.table(['a'], kb.pages().map((p) => [p.file.name]));
				dv.table(['a'], kb.pages().map((p) => [p.file.link]));
				kb.list(kb.pages().groupBy((p) => p.file.folder).first()!.rows.file.link);
				const days = kb.getDaysInRange('2026-01-01', '2026-01-03').map((d) => d.toISODate());
				const wrapped = kb.array([1, 2]).value;
				void [links, statuses, deep, grouped, n, days, wrapped];
			`),
		).toEqual([]);
	});

	it('keeps kb typed: unknown kb members and wrong page fields are errors', () => {
		const diagnostics = diagnose(`
			kb.nope();
			const s: string = kb.pages().first()!.file.size;
			void s;
		`);
		expect(diagnostics).toHaveLength(2);
		expect(diagnostics[0]).toMatch(/^TS2339: Property 'nope' does not exist/);
		expect(diagnostics[1]).toMatch(/^TS2322:/);
	});
});
