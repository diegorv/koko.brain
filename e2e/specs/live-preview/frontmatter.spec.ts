import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `---
title: Test Document
tags:
  - javascript
  - testing
author: John Doe
---

# Content After Frontmatter

Plain text here.

`;

test.describe('Live Preview - Frontmatter', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('frontmatter renders as widget', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-frontmatter')).toBeVisible();
	});

	test('frontmatter header shows Properties label', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-frontmatter-label')).toContainText('Properties');
	});

	test('frontmatter count badge shows correct number', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-frontmatter-count')).toContainText('3');
	});

	test('frontmatter displays property keys', async ({ lpPage: page }) => {
		const keys = page.locator('.cm-lp-frontmatter-key');
		const count = await keys.count();
		expect(count).toBe(3);
	});

	test('frontmatter displays property values', async ({ lpPage: page }) => {
		const values = page.locator('.cm-lp-frontmatter-value');
		await expect(values.first()).toBeVisible();
	});

	test('tags render as pills', async ({ lpPage: page }) => {
		const tags = page.locator('.cm-lp-frontmatter-tag');
		const count = await tags.count();
		expect(count).toBe(2);
		await expect(tags.first()).toContainText('javascript');
	});
});
