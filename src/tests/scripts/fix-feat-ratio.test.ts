import { describe, expect, it } from 'vitest';

import { aggregate, areaOf, formatTable, parseGitLog, parseSubject } from '../../../scripts/fix-feat-ratio.mjs';

describe('parseSubject', () => {
	it('parses a scoped breaking fix', () => {
		expect(parseSubject('fix(calendar)!: drop the legacy queue')).toEqual({
			type: 'fix',
			scope: 'calendar',
			breaking: true,
		});
	});

	it('parses an unscoped feat', () => {
		expect(parseSubject('feat: files navigator')).toEqual({ type: 'feat', scope: null, breaking: false });
	});

	it('returns null for a non-conventional subject', () => {
		expect(parseSubject('Merge branch main')).toBeNull();
		expect(parseSubject('fixed the toast')).toBeNull();
		expect(parseSubject('')).toBeNull();
	});
});

describe('areaOf', () => {
	it('maps src/lib layers', () => {
		expect(areaOf('src/lib/core/vault/vault.service.ts')).toBe('core/vault');
		expect(areaOf('src/lib/features/event-calendar/event-calendar.service.ts')).toBe('features/event-calendar');
		expect(areaOf('src/lib/plugins/kanban/Kanban.svelte')).toBe('plugins/kanban');
		expect(areaOf('src/lib/utils/path.ts')).toBe('utils');
		expect(areaOf('src/lib/utils.ts')).toBe('utils');
		expect(areaOf('src/lib/components/ui/button/button.svelte')).toBe('components');
		expect(areaOf('src/lib/types/note.types.ts')).toBe('types');
		expect(areaOf('src/routes/(app)/+page.svelte')).toBe('routes');
	});

	it('splits live-preview out of markdown-editor', () => {
		expect(areaOf('src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts')).toBe('core/live-preview');
		expect(areaOf('src/lib/core/markdown-editor/extensions/callout/callout.ts')).toBe('core/markdown-editor');
	});

	it('maps src/tests/lib to the source area', () => {
		expect(areaOf('src/tests/lib/features/tags/tags.logic.test.ts')).toBe('features/tags');
		expect(areaOf('src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/math.test.ts')).toBe(
			'core/live-preview',
		);
		expect(areaOf('src/tests/lib/utils/path.test.ts')).toBe('utils');
	});

	it('maps src-tauri/src and src-tauri/tests to rust modules', () => {
		expect(areaOf('src-tauri/src/vault/index.rs')).toBe('rust/vault');
		expect(areaOf('src-tauri/src/lib.rs')).toBe('rust/lib');
		expect(areaOf('src-tauri/tests/vault_index_test.rs')).toBe('rust/vault');
		expect(areaOf('src-tauri/tests/commands/files_test.rs')).toBe('rust/commands');
		expect(areaOf('src-tauri/tests/error_monitoring_test.rs')).toBe('rust/error_monitoring');
	});

	it('maps Rust tests whose stem does not name their module', () => {
		expect(areaOf('src-tauri/tests/fts_repo_test.rs')).toBe('rust/db');
		expect(areaOf('src-tauri/tests/history_test.rs')).toBe('rust/commands');
		expect(areaOf('src-tauri/tests/ipc_contracts_test.rs')).toBe('contracts');
		expect(areaOf('src-tauri/tests/core_tauri_free_test.rs')).toBeNull();
	});

	it('returns null for non-product paths', () => {
		expect(areaOf('help/index.md')).toBeNull();
		expect(areaOf('docs/COMMITS.md')).toBeNull();
		expect(areaOf('src/tests/lib/architecture/layer-rules.test.ts')).toBeNull();
		expect(areaOf('src-tauri/Cargo.toml')).toBeNull();
		expect(areaOf('')).toBeNull();
	});
});

describe('aggregate', () => {
	const commits = [
		{
			date: '2026-10-02T10:00:00+02:00',
			subject: 'fix(calendar): keep the overlay',
			files: [
				'src/lib/features/event-calendar/event-calendar.service.ts',
				'src/lib/features/event-calendar/EventCalendar.svelte',
				'src/lib/core/vault/vault.service.ts',
				'help/calendar.md',
			],
		},
		{ date: '2026-10-05T10:00:00Z', subject: 'feat: tags view', files: ['src/lib/features/tags/Tags.svelte'] },
		{ date: '2026-09-30T10:00:00Z', subject: 'fix: docs typo', files: ['docs/COMMITS.md'] },
		{ date: '2026-09-30T11:00:00Z', subject: 'chore: bump', files: ['package.json'] },
		{ date: '2026-09-30T12:00:00Z', subject: 'no convention', files: ['src/lib/utils/path.ts'] },
	];

	it('counts a two-area commit once in each area and once in TOTAL', () => {
		const result = aggregate(commits);
		expect(result.areas['features/event-calendar'].total).toEqual({ fix: 1, feat: 0 });
		expect(result.areas['core/vault'].total).toEqual({ fix: 1, feat: 0 });
		expect(result.total.total).toEqual({ fix: 2, feat: 1 });
	});

	it('buckets by month and sends non-product commits to (no product code)', () => {
		const result = aggregate(commits);
		expect(result.months).toEqual(['2026-09', '2026-10']);
		expect(result.areas['(no product code)'].byMonth['2026-09']).toEqual({ fix: 1, feat: 0 });
		expect(result.areas['(no product code)'].byMonth['2026-10']).toBeUndefined();
		expect(result.total.byMonth['2026-10']).toEqual({ fix: 1, feat: 1 });
		expect(result.areas['utils']).toBeUndefined();
	});

	it('returns empty totals for no commits', () => {
		expect(aggregate([])).toEqual({ months: [], areas: {}, total: { byMonth: {}, total: { fix: 0, feat: 0 } } });
	});
});

describe('parseGitLog', () => {
	it('splits records and keeps the file list', () => {
		const raw =
			'\x1e2026-10-02T10:00:00+02:00\x1ffix: a\n\nsrc/lib/utils/path.ts\nhelp/x.md\n' +
			'\x1e2026-10-03T10:00:00+02:00\x1ffeat: b\n';
		expect(parseGitLog(raw)).toEqual([
			{ date: '2026-10-02T10:00:00+02:00', subject: 'fix: a', files: ['src/lib/utils/path.ts', 'help/x.md'] },
			{ date: '2026-10-03T10:00:00+02:00', subject: 'feat: b', files: [] },
		]);
	});

	it('returns no records for empty output', () => {
		expect(parseGitLog('')).toEqual([]);
	});
});

describe('formatTable', () => {
	it('prints the TOTAL row with total and ratio, and limits areas with top', () => {
		const result = aggregate([
			{ date: '2026-10-01T00:00:00Z', subject: 'fix: a', files: ['src/lib/utils/a.ts'] },
			{ date: '2026-10-01T00:00:00Z', subject: 'fix: b', files: ['src/lib/utils/a.ts'] },
			{ date: '2026-10-01T00:00:00Z', subject: 'feat: c', files: ['src/lib/types/a.ts'] },
		]);
		const table = formatTable(result, 1);
		expect(table).toMatch(/^TOTAL\s+2:1\s+2:1\s+2\.00$/m);
		expect(table).toMatch(/^utils\s+2:0\s+2:0\s+-$/m);
		expect(table).not.toMatch(/^types/m);
	});
});
