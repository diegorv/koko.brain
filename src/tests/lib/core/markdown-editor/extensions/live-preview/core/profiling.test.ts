import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
	configureProfiling,
	editorLog,
	profileStart,
	profileEnd,
	reportError,
} from '#lib/core/markdown-editor/extensions/live-preview/core/profiling.js';

/** The log the profiling port writes to, and the toggle it reads. */
const portLog = vi.fn();
let enabled = false;

describe('live-preview profiling', () => {
	let restore: () => void;

	beforeEach(() => {
		portLog.mockReset();
		enabled = false;
		restore = configureProfiling({ isEnabled: () => enabled, log: portLog });
	});

	afterEach(() => restore());

	describe('configureProfiling', () => {
		it('when disabled, profileStart returns 0 and calls neither performance.now nor log', () => {
			const now = vi.spyOn(performance, 'now');
			expect(profileStart('frontmatter')).toBe(0);
			expect(profileStart()).toBe(0);
			expect(now).not.toHaveBeenCalled();
			expect(portLog).not.toHaveBeenCalled();
			now.mockRestore();
		});

		it('reads the toggle on every call, so flipping it needs no reconfigure', () => {
			expect(profileStart()).toBe(0);
			enabled = true;
			expect(profileStart()).toBeGreaterThan(0);
		});

		it('the restore function brings back the disabled default', () => {
			enabled = true;
			restore();
			expect(profileStart('x')).toBe(0);
			editorLog('TAG', 'msg');
			expect(portLog).not.toHaveBeenCalled();
		});

		it('a stale restore does not undo a newer configuration', () => {
			const newer = vi.fn();
			const restoreNewer = configureProfiling({ isEnabled: () => true, log: newer });
			restore();
			editorLog('TAG', 'msg');
			expect(newer).toHaveBeenCalledWith('TAG', 'msg');
			restoreNewer();
		});
	});

	describe('editorLog / reportError', () => {
		it('editorLog writes through the port whether or not profiling is on', () => {
			editorLog('META-BIND', 'refused');
			expect(portLog).toHaveBeenCalledWith('META-BIND', 'refused');
		});

		it('reportError writes the message and the cause to the console and the port', () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			const err = new Error('boom');
			reportError('LIVE-PREVIEW', 'Failed to open URL:', err);
			expect(consoleError).toHaveBeenCalledWith('[LIVE-PREVIEW]', 'Failed to open URL:', err);
			expect(portLog).toHaveBeenCalledWith('LIVE-PREVIEW', 'Failed to open URL: boom');
			consoleError.mockRestore();
		});
	});

	describe('profileStart', () => {
		it('returns 0 when profiling is disabled (zero overhead)', () => {
			enabled = false;
			expect(profileStart()).toBe(0);
			expect(profileStart('foo')).toBe(0);
			expect(portLog).not.toHaveBeenCalled();
		});

		it('returns a numeric timestamp when profiling is enabled', () => {
			enabled = true;
			const t = profileStart();
			expect(typeof t).toBe('number');
			expect(t).toBeGreaterThan(0);
		});

		it('emits LP-TRACE enter line when label is provided AND profiling on', () => {
			enabled = true;
			profileStart('frontmatter');
			expect(portLog).toHaveBeenCalledWith('LP-TRACE', 'enter: frontmatter');
		});

		it('skips LP-TRACE enter when label is omitted (back-compat)', () => {
			enabled = true;
			profileStart();
			expect(portLog).not.toHaveBeenCalled();
		});

		it('skips LP-TRACE enter when profiling is disabled even with a label', () => {
			enabled = false;
			profileStart('frontmatter');
			expect(portLog).not.toHaveBeenCalled();
		});
	});

	describe('profileEnd', () => {
		it('is a no-op when start === 0 (matches profiling-disabled invariant)', () => {
			profileEnd('frontmatter', 0);
			expect(portLog).not.toHaveBeenCalled();
		});

		it('emits LP-PROFILE line when elapsed exceeds threshold', () => {
			enabled = true;
			const start = performance.now() - 5; // simulate 5 ms of work
			profileEnd('frontmatter', start);
			const profile = portLog.mock.calls.find((c) => c[0] === 'LP-PROFILE');
			expect(profile).toBeDefined();
			expect(profile![1]).toMatch(/frontmatter: \d+\.\dms/);
		});

		it('always emits LP-TRACE exit line whenever profileEnd runs', () => {
			enabled = true;
			const start = performance.now();
			profileEnd('frontmatter', start);
			expect(portLog).toHaveBeenCalledWith('LP-TRACE', 'exit: frontmatter');
		});

		it('still emits LP-TRACE exit even when LP-PROFILE is below threshold', () => {
			enabled = true;
			// elapsed will be near 0 — below 0.5 ms default threshold; LP-PROFILE
			// suppressed but exit trace MUST still fire so the bracket pair is symmetrical.
			const start = performance.now();
			profileEnd('frontmatter', start, 100);
			const profileCall = portLog.mock.calls.find((c) => c[0] === 'LP-PROFILE');
			const traceExitCall = portLog.mock.calls.find(
				(c) => c[0] === 'LP-TRACE' && c[1] === 'exit: frontmatter',
			);
			expect(profileCall).toBeUndefined();
			expect(traceExitCall).toBeDefined();
		});
	});

	describe('start/end pairing (freeze-investigation contract)', () => {
		it('produces enter→exit bracket when both label-bearing calls run normally', () => {
			enabled = true;
			const t = profileStart('callout');
			profileEnd('callout', t);
			const sequence = portLog.mock.calls.map((c) => `${c[0]}/${c[1]}`);
			const enterIdx = sequence.indexOf('LP-TRACE/enter: callout');
			const exitIdx = sequence.indexOf('LP-TRACE/exit: callout');
			expect(enterIdx).toBeGreaterThanOrEqual(0);
			expect(exitIdx).toBeGreaterThan(enterIdx);
		});

		it('an enter-only sequence (simulated freeze) leaves a missing exit', () => {
			// This simulates the freeze pattern: profileStart fires, then the
			// JS thread blocks before profileEnd. The user can grep the log
			// for "LP-TRACE enter:" without a matching "exit:" to localise.
			enabled = true;
			profileStart('table');
			// (profileEnd never called)
			const enters = portLog.mock.calls.filter(
				(c) => c[0] === 'LP-TRACE' && (c[1] as string).startsWith('enter:'),
			);
			const exits = portLog.mock.calls.filter(
				(c) => c[0] === 'LP-TRACE' && (c[1] as string).startsWith('exit:'),
			);
			expect(enters).toHaveLength(1);
			expect(exits).toHaveLength(0);
		});
	});
});
