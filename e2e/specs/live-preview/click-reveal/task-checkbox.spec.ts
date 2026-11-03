// Click behavior around the task list checkbox widget (TaskCheckboxWidget, `input.cm-lp-task-checkbox` in place of `[ ]`).
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n- [ ] task item\n\nAfter line.\n\nEnd line.\n';
const CHECKBOX = 'input.cm-lp-task-checkbox';
const ITEM_LINE = '- [ ] task item';
const AFTER_LINE = 'After line.';

test.describe('Live Preview - click reveal - task checkbox', () => {
	// Owner decision: today's behavior is the contract (the checkbox acts on mousedown via preventDefault, no stopPropagation needed).
	test('clicking the checkbox toggles it, keeps it rendered and leaves the cursor in place', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const checkbox = page.locator(CHECKBOX).first();

		const click = await clickAtOffset(page, checkbox, { from: 'center' });
		expect(click.hit).toContain('cm-lp-task-checkbox');

		await expect(page.locator(CHECKBOX)).toBeChecked();
		await expect.poll(() => isRevealed(page, '[x] task item')).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});

	test('clicking the task text reveals the task source and moves the cursor to its line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line').filter({ hasText: 'task item' }).first();

		const click = await clickAtOffset(page, line, { from: 'left', dx: 60 });
		expect(click.hitLine).toContain('task item');

		await expect.poll(() => activeLineText(page)).toBe(ITEM_LINE);
		await expect.poll(() => isRevealed(page, '[ ] task item')).toBe(true);
	});

	test('clicking the line after the task moves the cursor there and keeps the checkbox rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line').filter({ hasText: AFTER_LINE }).first();

		const click = await clickAtOffset(page, line, { from: 'left', dx: 20 });
		expect(click.hitLine).toContain(AFTER_LINE);

		await expect.poll(() => activeLineText(page)).toBe(AFTER_LINE);
		await expect(page.locator(CHECKBOX)).toHaveCount(1);
		await expect.poll(() => isRevealed(page, '[ ] task item')).toBe(false);
	});
});
