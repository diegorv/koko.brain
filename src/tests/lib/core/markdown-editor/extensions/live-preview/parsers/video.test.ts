import { describe, it, expect } from 'vitest';
import { findVideoBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/video';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

describe('findVideoBlock', () => {
	it('detects single-line video with src', () => {
		const lines = makeLines('<video src="file.mp4" controls></video>');
		const result = findVideoBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp4');
		expect(result!.block.openFrom).toBe(0);
		expect(result!.endIdx).toBe(0);
	});

	it('detects self-closing video tag', () => {
		const lines = makeLines('<video src="file.mp4" controls />');
		const result = findVideoBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp4');
	});

	it('detects multi-line video with source child', () => {
		const text = '<video controls>\n  <source src="clip.mp4" type="video/mp4">\n</video>';
		const lines = makeLines(text);
		const result = findVideoBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('clip.mp4');
		expect(result!.block.closeFrom).toBe(lines[2].from);
		expect(result!.endIdx).toBe(2);
	});

	it('prefers src on video tag over source child', () => {
		const text = '<video src="main.mp4" controls>\n  <source src="fallback.webm">\n</video>';
		const lines = makeLines(text);
		const result = findVideoBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('main.mp4');
	});

	it('returns null when no src is found', () => {
		const lines = makeLines('<video controls></video>');
		const result = findVideoBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null for non-video tags', () => {
		const lines = makeLines('<audio src="file.mp3" controls></audio>');
		const result = findVideoBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null for plain text', () => {
		const lines = makeLines('regular text');
		const result = findVideoBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null when no closing tag', () => {
		const lines = makeLines('<video src="file.mp4" controls>\n  still open');
		const result = findVideoBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('starts detection from specified index', () => {
		const lines = makeLines('some text\n<video src="file.mp4" controls></video>');
		const result = findVideoBlock(lines, 1);
		expect(result).not.toBeNull();
		expect(result!.block.openFrom).toBe(10);
	});

	it('handles https URL in src', () => {
		const lines = makeLines('<video src="https://example.com/video.mp4" controls></video>');
		const result = findVideoBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('https://example.com/video.mp4');
	});

	it('handles case-insensitive tags', () => {
		const lines = makeLines('<VIDEO src="file.mp4" controls></VIDEO>');
		const result = findVideoBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp4');
	});
});
