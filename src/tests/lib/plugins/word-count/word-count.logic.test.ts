import { describe, it, expect } from 'vitest';
import { countWords, countCharacters, estimateReadingTime } from '$lib/plugins/word-count/word-count.logic';

describe('countWords', () => {
	it('returns 0 for an empty string', () => {
		expect(countWords('')).toBe(0);
	});

	it('returns 0 for whitespace-only string', () => {
		expect(countWords('   \t\n  ')).toBe(0);
	});

	it('counts a single word', () => {
		expect(countWords('hello')).toBe(1);
	});

	it('counts multiple words', () => {
		expect(countWords('hello world foo')).toBe(3);
	});

	it('handles extra whitespace between words', () => {
		expect(countWords('  hello   world  ')).toBe(2);
	});

	it('handles newlines as word separators', () => {
		expect(countWords('line one\nline two\nline three')).toBe(6);
	});

	it('handles tabs as word separators', () => {
		expect(countWords('word1\tword2\tword3')).toBe(3);
	});

	it('counts words in markdown content', () => {
		expect(countWords('# Heading\n\nSome **bold** text')).toBe(5);
	});

	it('excludes frontmatter from word count', () => {
		const content = '---\ntitle: My Note\ntags: [a, b]\ndate: 2024-01-15\n---\nHello world';
		// Should count only "Hello world" = 2 words, not the YAML keys/values
		expect(countWords(content)).toBe(2);
	});

	it('excludes frontmatter delimiters from word count', () => {
		const content = '---\nkey: value\n---\nOne two three';
		expect(countWords(content)).toBe(3);
	});

	it('handles content with only frontmatter (no body)', () => {
		const content = '---\ntitle: Test\n---\n';
		expect(countWords(content)).toBe(0);
	});

	it('treats unclosed frontmatter as regular content', () => {
		const content = '---\ntitle: Test\nHello world';
		// Missing closing ---, so regex doesn't match: entire content is counted
		expect(countWords(content)).toBe(5); // "---", "title:", "Test", "Hello", "world"
	});
});

describe('countCharacters', () => {
	it('returns 0 for an empty string', () => {
		expect(countCharacters('')).toBe(0);
	});

	it('counts characters including spaces', () => {
		expect(countCharacters('hello world')).toBe(11);
	});

	it('counts newlines as characters', () => {
		expect(countCharacters('a\nb')).toBe(3);
	});

	it('counts unicode characters', () => {
		expect(countCharacters('café')).toBe(4);
	});

	it('excludes frontmatter from character count', () => {
		const content = '---\ntags: [a]\n---\nHello';
		expect(countCharacters(content)).toBe(5);
	});

	it('excludes frontmatter delimiters from character count', () => {
		const content = '---\nkey: value\n---\nOne two three';
		expect(countCharacters(content)).toBe(13);
	});
});

describe('estimateReadingTime', () => {
	it('returns 1 min for 0 words', () => {
		expect(estimateReadingTime(0)).toBe(1);
	});

	it('returns 1 min for fewer than 200 words', () => {
		expect(estimateReadingTime(150)).toBe(1);
	});

	it('returns 1 min for exactly 200 words', () => {
		expect(estimateReadingTime(200)).toBe(1);
	});

	it('returns 2 min for 201 words', () => {
		expect(estimateReadingTime(201)).toBe(2);
	});

	it('returns 5 min for 1000 words', () => {
		expect(estimateReadingTime(1000)).toBe(5);
	});

	it('returns 1 min for negative word count', () => {
		expect(estimateReadingTime(-10)).toBe(1);
	});
});
