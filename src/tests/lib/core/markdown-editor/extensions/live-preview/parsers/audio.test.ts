import { describe, it, expect } from 'vitest';
import { findAudioBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/audio';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

describe('findAudioBlock', () => {
	it('detects single-line audio with src', () => {
		const lines = makeLines('<audio src="file.mp3" controls></audio>');
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp3');
		expect(result!.block.openFrom).toBe(0);
		expect(result!.endIdx).toBe(0);
	});

	it('detects self-closing audio tag', () => {
		const lines = makeLines('<audio src="file.mp3" controls />');
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp3');
		expect(result!.endIdx).toBe(0);
	});

	it('detects multi-line audio with source child', () => {
		const text = '<audio controls>\n  <source src="song.ogg" type="audio/ogg">\n</audio>';
		const lines = makeLines(text);
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('song.ogg');
		expect(result!.block.openFrom).toBe(0);
		expect(result!.block.closeFrom).toBe(lines[2].from);
		expect(result!.block.closeTo).toBe(lines[2].to);
		expect(result!.endIdx).toBe(2);
	});

	it('prefers src on audio tag over source child', () => {
		const text = '<audio src="main.mp3" controls>\n  <source src="fallback.ogg">\n</audio>';
		const lines = makeLines(text);
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('main.mp3');
	});

	it('returns null when no src is found', () => {
		const lines = makeLines('<audio controls></audio>');
		const result = findAudioBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null for non-audio tags', () => {
		const lines = makeLines('<video src="file.mp4" controls></video>');
		const result = findAudioBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null for plain text', () => {
		const lines = makeLines('regular text');
		const result = findAudioBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null when no closing tag', () => {
		const lines = makeLines('<audio src="file.mp3" controls>\n  still open');
		const result = findAudioBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('starts detection from specified index', () => {
		const lines = makeLines('some text\n<audio src="file.mp3" controls></audio>');
		const result = findAudioBlock(lines, 1);
		expect(result).not.toBeNull();
		expect(result!.block.openFrom).toBe(10);
		expect(result!.endIdx).toBe(1);
	});

	it('handles single quotes for src attribute', () => {
		const lines = makeLines("<audio src='file.mp3' controls></audio>");
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp3');
	});

	it('handles https URL in src', () => {
		const lines = makeLines('<audio src="https://example.com/audio.mp3" controls></audio>');
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('https://example.com/audio.mp3');
	});

	it('returns correct positions for multi-line block', () => {
		const text = '<audio controls>\n  <source src="file.mp3" type="audio/mpeg">\n</audio>';
		const lines = makeLines(text);
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.openFrom).toBe(0);
		expect(result!.block.openTo).toBe(16);
		expect(result!.block.closeFrom).toBe(lines[2].from);
		expect(result!.block.closeTo).toBe(lines[2].to);
	});

	it('handles case-insensitive tags', () => {
		const lines = makeLines('<AUDIO src="file.mp3" controls></AUDIO>');
		const result = findAudioBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.src).toBe('file.mp3');
	});

	it('returns null for multi-line audio without src anywhere', () => {
		const text = '<audio controls>\n  <source type="audio/mpeg">\n</audio>';
		const lines = makeLines(text);
		const result = findAudioBlock(lines, 0);
		expect(result).toBeNull();
	});
});
