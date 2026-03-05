import { describe, it, expect, vi } from 'vitest';
import { processTemplate, evaluateExpression } from '$lib/utils/template';

// Mock today() to return a fixed date but use real dayjs formatting
vi.mock('$lib/utils/date', async () => {
	const actual = await vi.importActual('$lib/utils/date');
	return {
		...actual,
	};
});

describe('evaluateExpression', () => {
	it('evaluates tp.file.title', () => {
		expect(evaluateExpression('tp.file.title', '09-02-2026')).toBe('09-02-2026');
	});

	it('evaluates tp.date.now with zero offset', () => {
		const result = evaluateExpression(
			'tp.date.now("YYYY-MM-DD", 0, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toBe('2026-02-09');
	});

	it('evaluates tp.date.now with positive offset', () => {
		const result = evaluateExpression(
			'tp.date.now("DD-MM-YYYY", 1, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toBe('10-02-2026');
	});

	it('evaluates tp.date.now with negative offset', () => {
		const result = evaluateExpression(
			'tp.date.now("DD-MM-YYYY", -1, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toBe('08-02-2026');
	});

	it('evaluates string concatenation', () => {
		const result = evaluateExpression(
			'"_notes/" + tp.date.now("YYYY/MM-MMM/", 0, tp.file.title, "DD-MM-YYYY") + "_journal-day-" + tp.date.now("DD-MM-YYYY", 0, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toBe('_notes/2026/02-Feb/_journal-day-09-02-2026');
	});

	it('evaluates string concatenation with negative offset', () => {
		const result = evaluateExpression(
			'"_notes/" + tp.date.now("YYYY/MM-MMM/", -1, tp.file.title, "DD-MM-YYYY") + "_journal-day-" + tp.date.now("DD-MM-YYYY", -1, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toBe('_notes/2026/02-Feb/_journal-day-08-02-2026');
	});

	it('evaluates week number format', () => {
		const result = evaluateExpression(
			'tp.date.now("WW", 0, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toMatch(/^\d{2}$/);
	});

	it('evaluates quarter format', () => {
		const result = evaluateExpression(
			'tp.date.now("Q", 0, tp.file.title, "DD-MM-YYYY")',
			'09-02-2026',
		);
		expect(result).toBe('1');
	});

	it('evaluates custom variables', () => {
		const result = evaluateExpression('yesterdayPath', '09-02-2026', {
			yesterdayPath: '_notes/2026/02-Feb/_journal-day-08-02-2026',
		});
		expect(result).toBe('_notes/2026/02-Feb/_journal-day-08-02-2026');
	});

	it('evaluates custom variables in concatenation', () => {
		const result = evaluateExpression('"[[" + yesterdayPath + "|Yesterday]]"', '09-02-2026', {
			yesterdayPath: '_notes/08-02-2026',
		});
		expect(result).toBe('[[_notes/08-02-2026|Yesterday]]');
	});

	it('custom variables take precedence over tp.file.title', () => {
		const result = evaluateExpression('tp.file.title', 'original', {
			'tp.file.title': 'overridden',
		});
		expect(result).toBe('overridden');
	});
});

describe('processTemplate', () => {
	it('replaces simple tp.file.title expression', () => {
		const template = 'Title: <% tp.file.title %>';
		expect(processTemplate(template, '09-02-2026')).toBe('Title: 09-02-2026');
	});

	it('replaces tp.date.now expression', () => {
		const template =
			'created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss", 0, tp.file.title, "DD-MM-YYYY") %>';
		const result = processTemplate(template, '09-02-2026');
		expect(result).toMatch(/^created: 2026-02-09T\d{2}:\d{2}:\d{2}$/);
	});

	it('replaces multiple expressions in the same line', () => {
		const template =
			'<% tp.date.now("YYYY", 0, tp.file.title, "DD-MM-YYYY") %> - <% tp.file.title %>';
		expect(processTemplate(template, '09-02-2026')).toBe('2026 - 09-02-2026');
	});

	it('replaces concatenated expression', () => {
		const template =
			'[[<% "_notes/" + tp.date.now("YYYY/", 0, tp.file.title, "DD-MM-YYYY") + tp.date.now("YYYY", 0, tp.file.title, "DD-MM-YYYY") %>|Year]]';
		expect(processTemplate(template, '09-02-2026')).toBe('[[_notes/2026/2026|Year]]');
	});

	it('handles template with no expressions', () => {
		const template = '# Hello World\nNo expressions here.';
		expect(processTemplate(template, '09-02-2026')).toBe(template);
	});

	it('processes the full frontmatter block', () => {
		const template = `---
created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss", 0, tp.file.title, "DD-MM-YYYY") %>
year: <% tp.date.now("YYYY", 0, tp.file.title, "DD-MM-YYYY") %>
tags:
  - type/journal/daily
---`;
		const result = processTemplate(template, '09-02-2026');
		expect(result).toContain('year: 2026');
		expect(result).toContain('created: 2026-02-09T');
		expect(result).toContain('- type/journal/daily');
	});

	it('processes template with custom variables', () => {
		const template = `---
created: <% tp.date.now("YYYY-MM-DD", 0, tp.file.title, "DD-MM-YYYY") %>
---
# <% tp.file.title %>
Yesterday: [[<% yesterdayPath %>]]`;
		const result = processTemplate(template, '09-02-2026', {
			yesterdayPath: '_notes/08-02-2026',
		});
		expect(result).toContain('created: 2026-02-09');
		expect(result).toContain('# 09-02-2026');
		expect(result).toContain('Yesterday: [[_notes/08-02-2026]]');
	});

	it('returns empty string for empty template', () => {
		expect(processTemplate('', '09-02-2026')).toBe('');
	});

	it('tp.date.now without reference uses current datetime', () => {
		const template = 'created: <% tp.date.now("YYYY-MM-DDTHH:mm:ss") %>';
		const result = processTemplate(template, '09-02-2026');
		expect(result).toMatch(/^created: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
	});

	it('tp.date.now without reference applies offset', () => {
		const noOffset = processTemplate('<% tp.date.now("YYYY-MM-DD") %>', 'ignored');
		const withOffset = processTemplate('<% tp.date.now("YYYY-MM-DD", 1) %>', 'ignored');
		expect(noOffset).not.toBe(withOffset);
	});
});
