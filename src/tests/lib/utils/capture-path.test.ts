import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { buildCapturePath } from '#lib/plugins/quick-capture/note-composer.logic.js';

const DATE = dayjs('2026-10-31T09:15:00');

describe('buildCaptureFolder', () => {
	it('joins the vault, the base folder and the dated folder', () => {
		expect(buildCaptureFolder('/vault', '_notes', 'YYYY/MM-MMM', DATE)).toBe('/vault/_notes/2026/10-Oct');
	});

	it('leaves out an empty base folder and an empty folder format', () => {
		expect(buildCaptureFolder('/vault', '', 'YYYY', DATE)).toBe('/vault/2026');
		expect(buildCaptureFolder('/vault', '_notes', '', DATE)).toBe('/vault/_notes');
		expect(buildCaptureFolder('/vault', '', '', DATE)).toBe('/vault');
	});

	it('is the folder Cmd+N puts its note in', () => {
		const path = buildCapturePath('/vault', '_notes', 'YYYY/MM-MMM', '[n-]HH-mm', DATE);
		expect(path.slice(0, path.lastIndexOf('/'))).toBe(buildCaptureFolder('/vault', '_notes', 'YYYY/MM-MMM', DATE));
	});
});
