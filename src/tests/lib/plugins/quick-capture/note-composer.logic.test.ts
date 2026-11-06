import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { parse as yamlParse } from 'yaml';
import { extractRawFrontmatter } from '#lib/core/frontmatter/properties.logic.js';
import {
	buildCapturePath,
	getCaptureTitle,
	buildCaptureVariables,
	processCaptureTemplate,
} from '#lib/plugins/quick-capture/note-composer.logic.js';
import type { PeriodicNotesSettings } from '#lib/core/settings/settings.types.js';

dayjs.extend(advancedFormat);
dayjs.extend(quarterOfYear);

// Fixed date with known milliseconds
const fixedDate = dayjs('2026-02-11T14:30:45.123');

describe('buildCapturePath', () => {
	it('builds full path with base folder, date folder, and filename', () => {
		const result = buildCapturePath(
			'/vault', '_notes', 'YYYY/MM-MMM',
			'[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/2026/02-Feb/capture-note-2026-02-11_14-30-45-123.md');
	});

	it('builds path without base folder', () => {
		const result = buildCapturePath(
			'/vault', '', 'YYYY/MM-MMM',
			'[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			fixedDate,
		);
		expect(result).toBe('/vault/2026/02-Feb/capture-note-2026-02-11_14-30-45-123.md');
	});

	it('builds path without folder format', () => {
		const result = buildCapturePath(
			'/vault', '_notes', '',
			'[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/capture-note-2026-02-11_14-30-45-123.md');
	});

	it('builds path with all empty optional params', () => {
		const result = buildCapturePath('/vault', '', '', 'YYYY-MM-DD', fixedDate);
		expect(result).toBe('/vault/2026-02-11.md');
	});
});

describe('getCaptureTitle', () => {
	it('returns the formatted filename', () => {
		const title = getCaptureTitle('[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS', fixedDate);
		expect(title).toBe('capture-note-2026-02-11_14-30-45-123');
	});

	it('returns ISO string for empty format', () => {
		const title = getCaptureTitle('', fixedDate);
		// dayjs.format('') returns ISO 8601 format
		expect(title).toContain('2026-02-11');
	});
});

describe('buildCaptureVariables', () => {
	const settings: PeriodicNotesSettings = {
		folder: '_notes',
		daily: {
			format: 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY',
			template: '',
		},
		weekly: { format: 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY' },
		monthly: { format: 'YYYY/MM-MMM/MM-MMM' },
		quarterly: { format: 'YYYY/[_journal-quarter-]YYYY[-Q]Q' },
		yearly: { format: 'YYYY/YYYY' },
	};

	it('includes created timestamp', () => {
		const vars = buildCaptureVariables(fixedDate, settings);
		expect(vars.created).toBe('2026-02-11T14:30:45');
	});

	it('includes year, month, monthName', () => {
		const vars = buildCaptureVariables(fixedDate, settings);
		expect(vars.year).toBe('2026');
		expect(vars.month).toBe('02');
		expect(vars.monthName).toBe('February');
	});

	it('includes dailyNotePath as wikilink path', () => {
		const vars = buildCaptureVariables(fixedDate, settings);
		expect(vars.dailyNotePath).toBe('_notes/2026/02-Feb/_journal-day-11-02-2026');
	});

	it('includes dailyNoteDisplay as formatted date', () => {
		const vars = buildCaptureVariables(fixedDate, settings);
		expect(vars.dailyNoteDisplay).toBe('11-02-2026');
	});

	it('seeds capture-provenance defaults so templates resolve placeholders', () => {
		const vars = buildCaptureVariables(fixedDate, settings);
		expect(vars.title).toBe('');
		expect(vars.kind).toBe('note');
		expect(vars.sourceApp).toBe('');
		expect(vars.sourceTitle).toBe('');
		expect(vars.sourceUrl).toBe('');
		expect(vars.url).toBe('');
		expect(vars.content).toBe('');
		// capturedAt mirrors created for a manually composed note
		expect(vars.capturedAt).toBe('2026-02-11T14:30:45');
	});

	it('uses the supplied title and kind when provided', () => {
		const vars = buildCaptureVariables(fixedDate, settings, 'My Note', 'link');
		expect(vars.title).toBe('My Note');
		expect(vars.kind).toBe('link');
	});
});

describe('processCaptureTemplate', () => {
	const vars = {
		title: 'Clean Code: A Handbook',
		sourceTitle: 'How to X: a guide',
		sourceApp: 'com.google.Chrome',
		sourceUrl: 'https://example.com/a?b=c#d',
		url: '',
		created: '2026-02-11T14:30:45',
		kind: 'link',
	};

	it('quotes a capture text variable that is the whole value of a frontmatter key', () => {
		const out = processCaptureTemplate('---\nsource_title: <% sourceTitle %>\ntitle: <%title%>\n---\n', 'file', vars);
		expect(out).toBe('---\nsource_title: "How to X: a guide"\ntitle: "Clean Code: A Handbook"\n---\n');
		expect(yamlParse(extractRawFrontmatter(out)!)).toEqual({
			source_title: 'How to X: a guide',
			title: 'Clean Code: A Handbook',
		});
	});

	it('keeps a value that reads back as itself plain', () => {
		const out = processCaptureTemplate(
			'---\nsource_app: <% sourceApp %>\nsource: <% sourceUrl %>\n---\n',
			'file',
			vars,
		);
		expect(out).toBe('---\nsource_app: com.google.Chrome\nsource: https://example.com/a?b=c#d\n---\n');
	});

	it('quotes a capture text variable that is a whole list item', () => {
		const out = processCaptureTemplate('---\nrefs:\n  - <% sourceTitle %>\n---\n', 'file', vars);
		expect(yamlParse(extractRawFrontmatter(out)!)).toEqual({ refs: ['How to X: a guide'] });
	});

	it('quotes a whole-value placeholder followed by a YAML comment', () => {
		const out = processCaptureTemplate('---\ntitle: <% title %> # page title\n---\n', 'file', vars);
		expect(out).toBe('---\ntitle: "Clean Code: A Handbook" # page title\n---\n');
		expect(yamlParse(extractRawFrontmatter(out)!)).toEqual({ title: 'Clean Code: A Handbook' });
	});

	it('quotes a whole-value placeholder under a key that holds #', () => {
		const out = processCaptureTemplate('---\nc#: <% title %>\n---\n', 'file', vars);
		expect(yamlParse(extractRawFrontmatter(out)!)).toEqual({ 'c#': 'Clean Code: A Handbook' });
	});

	it('leaves a commented-out key line raw', () => {
		const out = processCaptureTemplate('---\n# title: <% title %>\n---\n', 'file', vars);
		expect(out).toBe('---\n# title: Clean Code: A Handbook\n---\n');
	});

	it('writes an empty capture text variable as an empty string', () => {
		const out = processCaptureTemplate('---\nurl: <% url %>\n---\n', 'file', vars);
		expect(out).toBe('---\nurl: ""\n---\n');
	});

	it('leaves the other variables raw so dates keep their type', () => {
		const out = processCaptureTemplate('---\ncreated: <% created %>\nkind: <% kind %>\n---\n', 'file', vars);
		expect(out).toBe('---\ncreated: 2026-02-11T14:30:45\nkind: link\n---\n');
	});

	it('leaves a placeholder the template quoted or mixed with other text raw', () => {
		const out = processCaptureTemplate(
			'---\na: "<% sourceTitle %>"\nb: Read <% sourceApp %>\n---\n',
			'file',
			vars,
		);
		expect(out).toBe('---\na: "How to X: a guide"\nb: Read com.google.Chrome\n---\n');
	});

	it('inserts the same variables unquoted in the body', () => {
		const out = processCaptureTemplate(
			'---\nsource_title: <% sourceTitle %>\n---\n\n<% sourceTitle %>\n- <% title %>\nkey: <% title %>\n',
			'file',
			vars,
		);
		expect(out).toBe(
			'---\nsource_title: "How to X: a guide"\n---\n\nHow to X: a guide\n- Clean Code: A Handbook\nkey: Clean Code: A Handbook\n',
		);
	});

	it('processes a template without frontmatter like processTemplate', () => {
		const out = processCaptureTemplate('title: <% title %>\n<% tp.file.title %>', 'file', vars);
		expect(out).toBe('title: Clean Code: A Handbook\nfile');
	});

	it('never evaluates a placeholder that came in through a value', () => {
		const out = processCaptureTemplate('---\nt: <% sourceTitle %>\n---\n<% sourceTitle %>', 'file', {
			sourceTitle: 'Use <% tp.file.title %>',
		});
		expect(out).toBe('---\nt: Use <% tp.file.title %>\n---\nUse <% tp.file.title %>');
	});
});
