// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackChart } from '#lib/plugins/queryjs/queryjs-charts.js';
import { queryjsSessionStore } from '#lib/plugins/queryjs/queryjs-session.store.svelte.js';

function makeEl(text: string): HTMLElement {
	const el = document.createElement('div');
	el.textContent = text;
	return el;
}

/** A result element holding one tracked chart; returns the chart's destroy spy. */
function resultWithChart(): { el: HTMLElement; destroy: ReturnType<typeof vi.fn> } {
	const el = makeEl('');
	const canvas = document.createElement('canvas');
	el.appendChild(canvas);
	const destroy = vi.fn();
	trackChart(canvas, { destroy });
	return { el, destroy };
}

describe('queryjsSessionStore', () => {
	beforeEach(() => {
		queryjsSessionStore.reset();
		document.body.replaceChildren();
	});

	describe('result cache', () => {
		it('starts empty', () => {
			expect(queryjsSessionStore.resultCache.size).toBe(0);
		});

		it('hasResult returns false for missing entries', () => {
			expect(queryjsSessionStore.hasResult('/vault/note.md', 'missing')).toBe(false);
		});

		it('setResult + getResult roundtrip', () => {
			const el = makeEl('rendered');
			queryjsSessionStore.setResult('/vault/note.md', 'hash-1', el);
			expect(queryjsSessionStore.getResult('/vault/note.md', 'hash-1')).toBe(el);
			expect(queryjsSessionStore.hasResult('/vault/note.md', 'hash-1')).toBe(true);
		});

		it('stores the LIVE element reference (not a clone)', () => {
			// Critical for <canvas> / <video> state preservation.
			const el = makeEl('rendered');
			queryjsSessionStore.setResult('/vault/note.md', 'hash-1', el);
			const retrieved = queryjsSessionStore.getResult('/vault/note.md', 'hash-1');
			expect(retrieved).toBe(el); // identity equality, not deep equal
		});

		it('invalidate drops one entry without affecting others', () => {
			queryjsSessionStore.setResult('/vault/note.md', 'a', makeEl('A'));
			queryjsSessionStore.setResult('/vault/note.md', 'b', makeEl('B'));
			queryjsSessionStore.invalidate('/vault/note.md', 'a');
			expect(queryjsSessionStore.hasResult('/vault/note.md', 'a')).toBe(false);
			expect(queryjsSessionStore.hasResult('/vault/note.md', 'b')).toBe(true);
		});

		it('keys a result on the file as well as the script', () => {
			const a = makeEl('A');
			queryjsSessionStore.setResult('/vault/a.md', 'same script', a);
			expect(queryjsSessionStore.getResult('/vault/a.md', 'same script')).toBe(a);
			expect(queryjsSessionStore.hasResult('/vault/b.md', 'same script')).toBe(false);
			queryjsSessionStore.invalidate('/vault/b.md', 'same script');
			expect(queryjsSessionStore.hasResult('/vault/a.md', 'same script')).toBe(true);
		});

		it('invalidate of a missing key is a no-op (no throw)', () => {
			expect(() => queryjsSessionStore.invalidate('/vault/note.md', 'missing')).not.toThrow();
		});
	});

	describe('dropping a result destroys its charts', () => {
		it('invalidate destroys the charts of the dropped result only', () => {
			const dropped = resultWithChart();
			const kept = resultWithChart();
			queryjsSessionStore.setResult('/vault/a.md', 's', dropped.el);
			queryjsSessionStore.setResult('/vault/b.md', 's', kept.el);

			queryjsSessionStore.invalidate('/vault/a.md', 's');

			expect(dropped.destroy).toHaveBeenCalledTimes(1);
			expect(kept.destroy).not.toHaveBeenCalled();
			expect(queryjsSessionStore.hasResult('/vault/b.md', 's')).toBe(true);
		});

		it('clearResults and reset destroy the charts of every result', () => {
			const a = resultWithChart();
			const b = resultWithChart();
			queryjsSessionStore.setResult('/vault/a.md', 's', a.el);
			queryjsSessionStore.clearResults();
			queryjsSessionStore.setResult('/vault/b.md', 's', b.el);
			queryjsSessionStore.reset();

			expect(a.destroy).toHaveBeenCalledTimes(1);
			expect(b.destroy).toHaveBeenCalledTimes(1);
		});

		it('a result replaced by a new render of the same key has its charts destroyed', () => {
			const old = resultWithChart();
			queryjsSessionStore.setResult('/vault/a.md', 's', old.el);

			queryjsSessionStore.setResult('/vault/a.md', 's', makeEl('new'));

			expect(old.destroy).toHaveBeenCalledTimes(1);
		});

		it('a dropped result still on screen keeps its chart (its widget destroys it on removal)', () => {
			const shown = resultWithChart();
			document.body.appendChild(shown.el);
			queryjsSessionStore.setResult('/vault/a.md', 's', shown.el);

			queryjsSessionStore.clearResults();

			expect(shown.destroy).not.toHaveBeenCalled();
			expect(queryjsSessionStore.holdsResult(shown.el)).toBe(false);
		});

		it('holdsResult is true only for a cached element', () => {
			const el = makeEl('x');
			expect(queryjsSessionStore.holdsResult(el)).toBe(false);
			queryjsSessionStore.setResult('/vault/a.md', 's', el);
			expect(queryjsSessionStore.holdsResult(el)).toBe(true);
		});
	});

	describe('autoRunOnFirstOpen tracking', () => {
		it('starts empty', () => {
			expect(queryjsSessionStore.autoRunOnFirstOpen.size).toBe(0);
		});

		it('hasAutoRun is false until markAutoRun is called', () => {
			expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(false);
			queryjsSessionStore.markAutoRun('/vault/note.md');
			expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(true);
		});

		it('markAutoRun is idempotent', () => {
			queryjsSessionStore.markAutoRun('/vault/note.md');
			queryjsSessionStore.markAutoRun('/vault/note.md');
			expect(queryjsSessionStore.autoRunOnFirstOpen.size).toBe(1);
		});

		it('invalidatePath drops the marker (file is "fresh" again on next render)', () => {
			queryjsSessionStore.markAutoRun('/vault/note.md');
			queryjsSessionStore.invalidatePath('/vault/note.md');
			expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(false);
		});

		it('invalidatePath only affects the named file, not siblings', () => {
			queryjsSessionStore.markAutoRun('/vault/a.md');
			queryjsSessionStore.markAutoRun('/vault/b.md');
			queryjsSessionStore.invalidatePath('/vault/a.md');
			expect(queryjsSessionStore.hasAutoRun('/vault/a.md')).toBe(false);
			expect(queryjsSessionStore.hasAutoRun('/vault/b.md')).toBe(true);
		});
	});

	describe('reset', () => {
		it('wipes both result cache and autoRun tracking', () => {
			queryjsSessionStore.setResult('/vault/note.md', 'hash', makeEl('x'));
			queryjsSessionStore.markAutoRun('/vault/note.md');
			queryjsSessionStore.reset();
			expect(queryjsSessionStore.resultCache.size).toBe(0);
			expect(queryjsSessionStore.autoRunOnFirstOpen.size).toBe(0);
		});
	});

	describe('clearResults', () => {
		it('drops every cached result', () => {
			queryjsSessionStore.setResult('/vault/note.md', 'a', makeEl('A'));
			queryjsSessionStore.setResult('/vault/note.md', 'b', makeEl('B'));
			queryjsSessionStore.clearResults();
			expect(queryjsSessionStore.resultCache.size).toBe(0);
		});

		it('keeps autoRunOnFirstOpen markers intact (the on-save invariant)', () => {
			// Critical: notifyAfterSave calls clearResults so the next render
			// hits ▶ Run for the saved file in 'first-open' policy. If clearResults
			// also wiped autoRun markers, first-open would silently auto-run again.
			queryjsSessionStore.markAutoRun('/vault/a.md');
			queryjsSessionStore.markAutoRun('/vault/b.md');
			queryjsSessionStore.setResult('/vault/note.md', 'hash-1', makeEl('x'));
			queryjsSessionStore.clearResults();
			expect(queryjsSessionStore.hasAutoRun('/vault/a.md')).toBe(true);
			expect(queryjsSessionStore.hasAutoRun('/vault/b.md')).toBe(true);
		});
	});
});
