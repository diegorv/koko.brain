import { describe, it, expect } from 'vitest';
import {
	findMediaBlock,
	type MediaTag,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/media';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

interface MediaFixture {
	tag: MediaTag;
	/** src on the opening tag */
	file: string;
	/** src on a `<source>` child */
	child: string;
	/** `type` attribute of the `<source>` child */
	mime: string;
	/** src used when both the tag and a child carry one */
	main: string;
	/** src on the child that must lose to `main` */
	fallback: string;
	/** absolute src */
	url: string;
	/** a complete block of the OTHER media tag */
	otherTagBlock: string;
}

const FIXTURES: MediaFixture[] = [
	{
		tag: 'audio',
		file: 'file.mp3',
		child: 'song.ogg',
		mime: 'audio/ogg',
		main: 'main.mp3',
		fallback: 'fallback.ogg',
		url: 'https://example.com/audio.mp3',
		otherTagBlock: '<video src="file.mp4" controls></video>',
	},
	{
		tag: 'video',
		file: 'file.mp4',
		child: 'clip.mp4',
		mime: 'video/mp4',
		main: 'main.mp4',
		fallback: 'fallback.webm',
		url: 'https://example.com/video.mp4',
		otherTagBlock: '<audio src="file.mp3" controls></audio>',
	},
];

describe.each(FIXTURES)('findMediaBlock - $tag', (f) => {
	it('detects a single-line block with src', () => {
		const lines = makeLines(`<${f.tag} src="${f.file}" controls></${f.tag}>`);
		const result = findMediaBlock(lines, 0, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe(f.file);
		expect(result!.block.openFrom).toBe(0);
		expect(result!.endIdx).toBe(0);
	});

	it('detects a self-closing tag', () => {
		const lines = makeLines(`<${f.tag} src="${f.file}" controls />`);
		const result = findMediaBlock(lines, 0, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe(f.file);
		expect(result!.endIdx).toBe(0);
	});

	it('detects a multi-line block with a source child', () => {
		const lines = makeLines(
			`<${f.tag} controls>\n  <source src="${f.child}" type="${f.mime}">\n</${f.tag}>`,
		);
		const result = findMediaBlock(lines, 0, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe(f.child);
		expect(result!.block.openFrom).toBe(0);
		expect(result!.block.closeFrom).toBe(lines[2].from);
		expect(result!.block.closeTo).toBe(lines[2].to);
		expect(result!.endIdx).toBe(2);
	});

	it('prefers src on the media tag over the source child', () => {
		const lines = makeLines(
			`<${f.tag} src="${f.main}" controls>\n  <source src="${f.fallback}">\n</${f.tag}>`,
		);
		const result = findMediaBlock(lines, 0, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe(f.main);
	});

	it('returns null when no src is found', () => {
		const lines = makeLines(`<${f.tag} controls></${f.tag}>`);
		expect(findMediaBlock(lines, 0, f.tag)).toBeNull();
	});

	it('returns null for the other media tag', () => {
		const lines = makeLines(f.otherTagBlock);
		expect(findMediaBlock(lines, 0, f.tag)).toBeNull();
	});

	it('returns null for plain text', () => {
		expect(findMediaBlock(makeLines('regular text'), 0, f.tag)).toBeNull();
	});

	it('returns null when no closing tag', () => {
		const lines = makeLines(`<${f.tag} src="${f.file}" controls>\n  still open`);
		expect(findMediaBlock(lines, 0, f.tag)).toBeNull();
	});

	it('starts detection from the specified index', () => {
		const lines = makeLines(`some text\n<${f.tag} src="${f.file}" controls></${f.tag}>`);
		const result = findMediaBlock(lines, 1, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.openFrom).toBe(10);
		expect(result!.endIdx).toBe(1);
	});

	it('handles https URL in src', () => {
		const lines = makeLines(`<${f.tag} src="${f.url}" controls></${f.tag}>`);
		const result = findMediaBlock(lines, 0, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe(f.url);
	});

	it('handles case-insensitive tags', () => {
		const upper = f.tag.toUpperCase();
		const lines = makeLines(`<${upper} src="${f.file}" controls></${upper}>`);
		const result = findMediaBlock(lines, 0, f.tag);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe(f.file);
	});
});

/** Cases the audio parser covered and the video one never did — kept as-is. */
describe('findMediaBlock - audio-only cases', () => {
	it('handles single quotes for src attribute', () => {
		const lines = makeLines("<audio src='file.mp3' controls></audio>");
		const result = findMediaBlock(lines, 0, 'audio');
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp3');
	});

	it('returns correct positions for multi-line block', () => {
		const text = '<audio controls>\n  <source src="file.mp3" type="audio/mpeg">\n</audio>';
		const lines = makeLines(text);
		const result = findMediaBlock(lines, 0, 'audio');
		expect(result).not.toBeNull();
		expect(result!.block.openFrom).toBe(0);
		expect(result!.block.openTo).toBe(16);
		expect(result!.block.closeFrom).toBe(lines[2].from);
		expect(result!.block.closeTo).toBe(lines[2].to);
	});

	it('returns null for multi-line audio without src anywhere', () => {
		const text = '<audio controls>\n  <source type="audio/mpeg">\n</audio>';
		const lines = makeLines(text);
		expect(findMediaBlock(lines, 0, 'audio')).toBeNull();
	});
});
