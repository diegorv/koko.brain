import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAppendLog = vi.fn();

// appendLog is a side-effect logging service (Tauri file writes) — legitimately
// mocked. settingsStore is a real store per CLAUDE.md; profiling reads its
// livePreviewProfiling flag, which we drive via the real updateLivePreviewProfiling.
vi.mock('$lib/utils/log.service', () => ({
	appendLog: (...args: unknown[]) => mockAppendLog(...args),
}));

import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import {
	profileStart,
	profileEnd,
} from '$lib/core/markdown-editor/extensions/live-preview/core/profiling';

describe('live-preview profiling', () => {
	beforeEach(() => {
		mockAppendLog.mockReset();
		settingsStore.updateLivePreviewProfiling(false);
	});

	describe('profileStart', () => {
		it('returns 0 when profiling is disabled (zero overhead)', () => {
			settingsStore.updateLivePreviewProfiling(false);
			expect(profileStart()).toBe(0);
			expect(profileStart('foo')).toBe(0);
			expect(mockAppendLog).not.toHaveBeenCalled();
		});

		it('returns a numeric timestamp when profiling is enabled', () => {
			settingsStore.updateLivePreviewProfiling(true);
			const t = profileStart();
			expect(typeof t).toBe('number');
			expect(t).toBeGreaterThan(0);
		});

		it('emits LP-TRACE enter line when label is provided AND profiling on', () => {
			settingsStore.updateLivePreviewProfiling(true);
			profileStart('frontmatter');
			expect(mockAppendLog).toHaveBeenCalledWith('LP-TRACE', 'enter: frontmatter');
		});

		it('skips LP-TRACE enter when label is omitted (back-compat)', () => {
			settingsStore.updateLivePreviewProfiling(true);
			profileStart();
			expect(mockAppendLog).not.toHaveBeenCalled();
		});

		it('skips LP-TRACE enter when profiling is disabled even with a label', () => {
			settingsStore.updateLivePreviewProfiling(false);
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
			settingsStore.updateLivePreviewProfiling(true);
			const start = performance.now() - 5; // simulate 5 ms of work
			profileEnd('frontmatter', start);
			const profile = mockAppendLog.mock.calls.find((c) => c[0] === 'LP-PROFILE');
			expect(profile).toBeDefined();
			expect(profile![1]).toMatch(/frontmatter: \d+\.\dms/);
		});

		it('always emits LP-TRACE exit line whenever profileEnd runs', () => {
			settingsStore.updateLivePreviewProfiling(true);
			const start = performance.now();
			profileEnd('frontmatter', start);
			expect(mockAppendLog).toHaveBeenCalledWith('LP-TRACE', 'exit: frontmatter');
		});

		it('still emits LP-TRACE exit even when LP-PROFILE is below threshold', () => {
			settingsStore.updateLivePreviewProfiling(true);
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
			settingsStore.updateLivePreviewProfiling(true);
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
			settingsStore.updateLivePreviewProfiling(true);
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
});
