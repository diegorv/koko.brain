import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Ratchet on raw `writeTextFile(` calls outside `core/filesystem`. A raw write
 * that changes a note's bytes must route through `applyNoteChange` (or
 * `notifyAfterSave`), or the indexes go stale. Whether a site writes a note
 * cannot be decided from source text, so every site is listed with the reason
 * it is allowed: a new site fails here until it is listed, and its reason is
 * the review point.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ['src/lib', 'src/routes'];
/** The owner of raw writes: not ratcheted. */
const OWNER_DIR = 'src/lib/core/filesystem/';
/** The `updateNoteFrontmatter` owner: exempt by rule. */
const EXEMPT = new Set(['src/lib/core/frontmatter/frontmatter-write.service.ts']);
const FILE_RE = /\.(ts|js|svelte)$/;
const WRITE_RE = /\bwriteTextFile\(/g;

/** One reason per raw write site, by file, in source order. */
const ALLOWED: Record<string, string[]> = {
	'src/lib/app/deep-link-actions.ts': [
		'deep-link daily-note append/prepend; notifyAfterSave follows',
		'deep-link capture note; notifyAfterSave follows',
	],
	'src/lib/core/editor/editor.service.ts': ['the editor save; notifyAfterSave follows'],
	'src/lib/core/settings/settings.service.ts': ['settings JSON in .kokobrain, not a note'],
	'src/lib/core/trash/trash.service.ts': ['trash manifest JSON, not a note'],
	'src/lib/features/auto-move/auto-move.service.ts': ['auto-move config JSON in .kokobrain, not a note'],
	'src/lib/features/deep-link/deep-link.service.ts': [
		'deep-link prepend to an existing note; notifyAfterSave follows',
		'deep-link append to an existing note; notifyAfterSave follows',
		'deep-link overwrite; notifyAfterSave follows',
		'deep-link silent create; notifyAfterSave follows',
	],
	'src/lib/features/file-history/file-history.service.ts': ['snapshot backup under .kokobrain, not a note'],
	'src/lib/features/file-icons/file-icons.service.ts': [
		'recent icons JSON in .kokobrain, not a note',
		'folder-note placeholder; applyNoteChange follows',
	],
	'src/lib/features/tasks/todoist.service.ts': ['sent-tasks JSON in .kokobrain, not a note'],
	'src/lib/features/type-definitions/type-definitions.service.ts': [
		'renameType rewrites _type in open tabs; applyNoteChange follows',
		'rewriteViewFile writes a .view with no open tab; markRecentSave and applyNoteChange follow (an open tab saves through the editor)',
	],
	'src/lib/plugins/templates/templates.service.ts': ['empty template scaffolding; the watcher indexes it'],
	'src/lib/utils/log.service.ts': ['session log file outside the vault'],
};

/** Lists every source file under `dir`. */
function walk(dir: string): string[] {
	return readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
		.filter((name) => FILE_RE.test(name))
		.map((name) => join(dir, name));
}

/** Counts raw `writeTextFile(` calls in a source text. */
function countWrites(text: string): number {
	return [...text.matchAll(WRITE_RE)].length;
}

/** Raw write counts by repo-relative file, owner dir and exempt files left out. */
function scan(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const file of SCAN_DIRS.flatMap(walk)) {
		const rel = relative(ROOT, join(ROOT, file));
		if (rel.startsWith(OWNER_DIR) || EXEMPT.has(rel)) continue;
		const n = countWrites(readFileSync(join(ROOT, rel), 'utf8'));
		if (n > 0) counts[rel] = n;
	}
	return counts;
}

describe('raw writeTextFile ratchet', () => {
	it('lists every raw write site outside core/filesystem with a reason', () => {
		const allowed = Object.fromEntries(Object.entries(ALLOWED).map(([file, reasons]) => [file, reasons.length]));
		expect(scan()).toEqual(allowed);
	});

	it('gives every site a reason', () => {
		for (const reasons of Object.values(ALLOWED)) {
			for (const reason of reasons) expect(reason.trim()).not.toBe('');
		}
	});

	it('the exempt owner has exactly its one write site, and the scanner sees the filesystem writes it skips', () => {
		const exempt = [...EXEMPT][0];
		expect(countWrites(readFileSync(join(ROOT, exempt), 'utf8'))).toBe(1);
		expect(countWrites(readFileSync(join(ROOT, OWNER_DIR, 'fs.service.ts'), 'utf8'))).toBeGreaterThan(0);
	});

	it('the counter catches a call and ignores the import', () => {
		expect(countWrites("import { writeTextFile } from '@tauri-apps/plugin-fs';")).toBe(0);
		expect(countWrites('await writeTextFile(path, content);')).toBe(1);
		expect(countWrites('await fs.writeTextFile(\n\tpath,\n\tcontent,\n);')).toBe(1);
	});
});
