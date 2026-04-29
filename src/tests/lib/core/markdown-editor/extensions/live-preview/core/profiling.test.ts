import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAppendLog = vi.fn();
const mockSettings = { livePreviewProfiling: false };

vi.mock('$lib/utils/log.service', () => ({
	appendLog: (...args: unknown[]) => mockAppendLog(...args),
}));

vi.mock('$lib/core/settings/settings.store.svelte', () => ({
	settingsStore: {
		get livePreviewProfiling() {
			return mockSettings.livePreviewProfiling;
		},
	},
}));

import {
	profileStart,
	profileEnd,
	profileWidget,
} from '$lib/core/markdown-editor/extensions/live-preview/core/profiling';

describe('live-preview profiling', () => {
	beforeEach(() => {
		mockAppendLog.mockReset();
		mockSettings.livePreviewProfiling = false;
	});

	describe('profileStart', () => {
		it('returns 0 when profiling is disabled (zero overhead)', () => {
			mockSettings.livePreviewProfiling = false;
			expect(profileStart()).toBe(0);
			expect(profileStart('foo')).toBe(0);
			expect(mockAppendLog).not.toHaveBeenCalled();
		});

		it('returns a numeric timestamp when profiling is enabled', () => {
			mockSettings.livePreviewProfiling = true;
			const t = profileStart();
			expect(typeof t).toBe('number');
			expect(t).toBeGreaterThan(0);
		});

		it('emits LP-TRACE enter line when label is provided AND profiling on', () => {
			mockSettings.livePreviewProfiling = true;
			profileStart('frontmatter');
			expect(mockAppendLog).toHaveBeenCalledWith('LP-TRACE', 'enter: frontmatter');
		});

		it('skips LP-TRACE enter when label is omitted (back-compat)', () => {
			mockSettings.livePreviewProfiling = true;
			profileStart();
			expect(mockAppendLog).not.toHaveBeenCalled();
		});

		it('skips LP-TRACE enter when profiling is disabled even with a label', () => {
			mockSettings.livePreviewProfiling = false;
			profileStart('frontmatter');
			expect(mockAppendLog).not.toHaveBeenCalled();
		});
	});

	describe('profileEnd', () => {
		it('is a no-op when start === 0 (matches profiling-disabled invariant)', () => {
			profileEnd('frontmatter', 0);
			expect(mockAppendLog).not.toHaveBeenCalled();
		});

		it('emits LP-PROFILE line when elapsed exceeds threshold', () => {
			mockSettings.livePreviewProfiling = true;
			const start = performance.now() - 5; // simulate 5 ms of work
			profileEnd('frontmatter', start);
			const profile = mockAppendLog.mock.calls.find((c) => c[0] === 'LP-PROFILE');
			expect(profile).toBeDefined();
			expect(profile![1]).toMatch(/frontmatter: \d+\.\dms/);
		});

		it('always emits LP-TRACE exit line whenever profileEnd runs', () => {
			mockSettings.livePreviewProfiling = true;
			const start = performance.now();
			profileEnd('frontmatter', start);
			expect(mockAppendLog).toHaveBeenCalledWith('LP-TRACE', 'exit: frontmatter');
		});

		it('still emits LP-TRACE exit even when LP-PROFILE is below threshold', () => {
			mockSettings.livePreviewProfiling = true;
			// elapsed will be near 0 — below 0.5 ms default threshold; LP-PROFILE
			// suppressed but exit trace MUST still fire so the bracket pair is symmetrical.
			const start = performance.now();
			profileEnd('frontmatter', start, 100);
			const profileCall = mockAppendLog.mock.calls.find((c) => c[0] === 'LP-PROFILE');
			const traceExitCall = mockAppendLog.mock.calls.find(
				(c) => c[0] === 'LP-TRACE' && c[1] === 'exit: frontmatter',
			);
			expect(profileCall).toBeUndefined();
			expect(traceExitCall).toBeDefined();
		});
	});

	describe('start/end pairing (freeze-investigation contract)', () => {
		it('produces enter→exit bracket when both label-bearing calls run normally', () => {
			mockSettings.livePreviewProfiling = true;
			const t = profileStart('callout');
			profileEnd('callout', t);
			const sequence = mockAppendLog.mock.calls.map((c) => `${c[0]}/${c[1]}`);
			const enterIdx = sequence.indexOf('LP-TRACE/enter: callout');
			const exitIdx = sequence.indexOf('LP-TRACE/exit: callout');
			expect(enterIdx).toBeGreaterThanOrEqual(0);
			expect(exitIdx).toBeGreaterThan(enterIdx);
		});

		it('an enter-only sequence (simulated freeze) leaves a missing exit', () => {
			// This simulates the freeze pattern: profileStart fires, then the
			// JS thread blocks before profileEnd. The user can grep the log
			// for "LP-TRACE enter:" without a matching "exit:" to localise.
			mockSettings.livePreviewProfiling = true;
			profileStart('table');
			// (profileEnd never called)
			const enters = mockAppendLog.mock.calls.filter(
				(c) => c[0] === 'LP-TRACE' && (c[1] as string).startsWith('enter:'),
			);
			const exits = mockAppendLog.mock.calls.filter(
				(c) => c[0] === 'LP-TRACE' && (c[1] as string).startsWith('exit:'),
			);
			expect(enters).toHaveLength(1);
			expect(exits).toHaveLength(0);
		});
	});

	describe('profileWidget (toDOM tracing for freeze investigation)', () => {
		it('returns the wrapped function result regardless of profiling state', () => {
			mockSettings.livePreviewProfiling = false;
			expect(profileWidget('w', () => 42)).toBe(42);

			mockSettings.livePreviewProfiling = true;
			expect(profileWidget('w', () => 'hello')).toBe('hello');
		});

		it('is silent when profiling is disabled (zero overhead)', () => {
			mockSettings.livePreviewProfiling = false;
			// Avoid `document` here — vitest's default env doesn't expose it.
			// In production the wrapped fn returns the toDOM-built HTMLElement;
			// the mocked one returns a plain object as a stand-in.
			const fakeNode = { tagName: 'DIV' };
			expect(profileWidget('frontmatter-widget', () => fakeNode)).toBe(fakeNode);
			expect(mockAppendLog).not.toHaveBeenCalled();
		});

		it('emits LP-WIDGET-TRACE enter + exit when profiling is enabled', () => {
			mockSettings.livePreviewProfiling = true;
			profileWidget('frontmatter-widget', () => 0);
			const enters = mockAppendLog.mock.calls.filter(
				(c) => c[0] === 'LP-WIDGET-TRACE' && (c[1] as string).startsWith('enter:'),
			);
			const exits = mockAppendLog.mock.calls.filter(
				(c) => c[0] === 'LP-WIDGET-TRACE' && (c[1] as string).startsWith('exit:'),
			);
			expect(enters).toHaveLength(1);
			expect(enters[0][1]).toBe('enter: frontmatter-widget');
			expect(exits).toHaveLength(1);
			expect(exits[0][1]).toBe('exit: frontmatter-widget');
		});

		it('emits LP-WIDGET-PROFILE timing line when work exceeds threshold', () => {
			mockSettings.livePreviewProfiling = true;
			// Simulate 5 ms of work via a busy-loop (real, not mocked).
			profileWidget('slow-widget', () => {
				const target = performance.now() + 5;
				while (performance.now() < target) {
					// busy-wait
				}
			});
			const profile = mockAppendLog.mock.calls.find((c) => c[0] === 'LP-WIDGET-PROFILE');
			expect(profile).toBeDefined();
			expect(profile![1]).toMatch(/slow-widget: \d+\.\dms/);
		});

		it('still emits exit trace when fn throws (try/finally guarantee)', () => {
			mockSettings.livePreviewProfiling = true;
			expect(() =>
				profileWidget('throwing-widget', () => {
					throw new Error('boom');
				}),
			).toThrow('boom');

			const exits = mockAppendLog.mock.calls.filter(
				(c) => c[0] === 'LP-WIDGET-TRACE' && c[1] === 'exit: throwing-widget',
			);
			expect(exits).toHaveLength(1);
		});

		it('an enter-only sequence localises a hung toDOM (simulated freeze)', () => {
			mockSettings.livePreviewProfiling = true;
			// We can't actually hang here, but we can verify the contract:
			// before fn returns, only `enter` is in the log; on a real freeze
			// the user would see the same partial state in the file.
			let traceMidFlight: { enters: number; exits: number } | null = null;
			profileWidget('mid-flight-widget', () => {
				traceMidFlight = {
					enters: mockAppendLog.mock.calls.filter(
						(c) => c[0] === 'LP-WIDGET-TRACE' && (c[1] as string).startsWith('enter:'),
					).length,
					exits: mockAppendLog.mock.calls.filter(
						(c) => c[0] === 'LP-WIDGET-TRACE' && (c[1] as string).startsWith('exit:'),
					).length,
				};
				return 0;
			});
			expect(traceMidFlight).toEqual({ enters: 1, exits: 0 });
		});
	});
});
