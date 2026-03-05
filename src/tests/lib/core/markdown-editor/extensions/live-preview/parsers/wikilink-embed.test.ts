import { describe, it, expect } from 'vitest';
import {
	findWikilinkEmbedRanges,
	isImageEmbed,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';

describe('isImageEmbed', () => {
	it('returns true for common image extensions', () => {
		expect(isImageEmbed('photo.png')).toBe(true);
		expect(isImageEmbed('photo.jpg')).toBe(true);
		expect(isImageEmbed('photo.jpeg')).toBe(true);
		expect(isImageEmbed('photo.gif')).toBe(true);
		expect(isImageEmbed('photo.svg')).toBe(true);
		expect(isImageEmbed('photo.webp')).toBe(true);
		expect(isImageEmbed('photo.avif')).toBe(true);
	});

	it('is case-insensitive for extensions', () => {
		expect(isImageEmbed('photo.PNG')).toBe(true);
		expect(isImageEmbed('photo.Jpg')).toBe(true);
	});

	it('returns false for markdown files', () => {
		expect(isImageEmbed('note.md')).toBe(false);
		expect(isImageEmbed('note.markdown')).toBe(false);
	});

	it('returns false for files without extension', () => {
		expect(isImageEmbed('note')).toBe(false);
		expect(isImageEmbed('decorator')).toBe(false);
	});

	it('returns false for non-image extensions', () => {
		expect(isImageEmbed('file.pdf')).toBe(false);
		expect(isImageEmbed('file.txt')).toBe(false);
	});
});

describe('findWikilinkEmbedRanges', () => {
	it('detects basic note embed ![[note]]', () => {
		const ranges = findWikilinkEmbedRanges('![[decorator]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(0);
		expect(ranges[0].fullTo).toBe(14);
		expect(ranges[0].target).toBe('decorator');
		expect(ranges[0].heading).toBeNull();
		expect(ranges[0].blockId).toBeNull();
		expect(ranges[0].display).toBeNull();
		expect(ranges[0].type).toBe('note');
	});

	it('detects note embed with heading ![[note#Heading]]', () => {
		const ranges = findWikilinkEmbedRanges('![[decorator#Heading 2]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('decorator');
		expect(ranges[0].heading).toBe('Heading 2');
		expect(ranges[0].blockId).toBeNull();
		expect(ranges[0].type).toBe('note');
	});

	it('detects note embed with block reference ![[note#^blockid]]', () => {
		const ranges = findWikilinkEmbedRanges('![[filho#^5ki07f]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('filho');
		expect(ranges[0].heading).toBeNull();
		expect(ranges[0].blockId).toBe('5ki07f');
		expect(ranges[0].type).toBe('note');
	});

	it('detects image embed ![[image.png]]', () => {
		const ranges = findWikilinkEmbedRanges('![[photo.png]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('photo.png');
		expect(ranges[0].type).toBe('image');
		expect(ranges[0].display).toBeNull();
	});

	it('detects image embed with size ![[image.png|300]]', () => {
		const ranges = findWikilinkEmbedRanges('![[photo.png|300]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('photo.png');
		expect(ranges[0].type).toBe('image');
		expect(ranges[0].display).toBe('300');
	});

	it('detects image embed with path ![[folder/image.jpg]]', () => {
		const ranges = findWikilinkEmbedRanges('![[assets/photo.jpg]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('assets/photo.jpg');
		expect(ranges[0].type).toBe('image');
	});

	it('applies offset correctly', () => {
		const ranges = findWikilinkEmbedRanges('![[note]]', 100);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(100);
		expect(ranges[0].fullTo).toBe(109);
	});

	it('detects multiple embeds on one line', () => {
		const ranges = findWikilinkEmbedRanges('![[a]] text ![[b.png|200]]', 0);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].target).toBe('a');
		expect(ranges[0].type).toBe('note');
		expect(ranges[1].target).toBe('b.png');
		expect(ranges[1].type).toBe('image');
		expect(ranges[1].display).toBe('200');
	});

	it('returns empty array when no embeds present', () => {
		expect(findWikilinkEmbedRanges('no embeds here', 0)).toHaveLength(0);
	});

	it('does not match regular wikilinks (without !)', () => {
		expect(findWikilinkEmbedRanges('[[note]]', 0)).toHaveLength(0);
	});

	it('does not match standard images ![alt](url)', () => {
		expect(findWikilinkEmbedRanges('![alt](url.png)', 0)).toHaveLength(0);
	});

	it('handles note embed with display text ![[note|alias]]', () => {
		const ranges = findWikilinkEmbedRanges('![[note|custom name]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('note');
		expect(ranges[0].display).toBe('custom name');
		expect(ranges[0].type).toBe('note');
	});

	it('handles embed with heading and display text', () => {
		const ranges = findWikilinkEmbedRanges('![[note#Section|alias]]', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].target).toBe('note');
		expect(ranges[0].heading).toBe('Section');
		expect(ranges[0].display).toBe('alias');
	});

	it('correctly computes fullFrom and fullTo positions', () => {
		const text = 'before ![[embed]] after';
		const ranges = findWikilinkEmbedRanges(text, 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(7);
		expect(ranges[0].fullTo).toBe(17);
		expect(text.substring(ranges[0].fullFrom, ranges[0].fullTo)).toBe('![[embed]]');
	});
});
