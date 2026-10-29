import { describe, it, expect } from 'vitest';
import { detectMac, isMacContextClick, isOpenLinkModifier } from '#lib/utils/platform.js';

function mods(opts: { meta?: boolean; ctrl?: boolean }) {
	return { metaKey: opts.meta ?? false, ctrlKey: opts.ctrl ?? false };
}

describe('detectMac', () => {
	it('detects macOS from navigator.platform', () => {
		expect(detectMac({ platform: 'MacIntel', userAgent: '' })).toBe(true);
	});

	it('falls back to the user agent when platform is empty', () => {
		expect(detectMac({ platform: '', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe(true);
	});

	it('returns false on Windows and Linux', () => {
		expect(detectMac({ platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe(false);
		expect(detectMac({ platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })).toBe(false);
	});

	it('returns false without a navigator', () => {
		expect(detectMac(undefined)).toBe(false);
	});
});

describe('isOpenLinkModifier', () => {
	it('macOS: Cmd opens, Ctrl and plain do not', () => {
		expect(isOpenLinkModifier(mods({ meta: true }), true)).toBe(true);
		expect(isOpenLinkModifier(mods({ ctrl: true }), true)).toBe(false);
		expect(isOpenLinkModifier(mods({ meta: true, ctrl: true }), true)).toBe(false);
		expect(isOpenLinkModifier(mods({}), true)).toBe(false);
	});

	it('Windows/Linux: Ctrl opens, Meta and plain do not', () => {
		expect(isOpenLinkModifier(mods({ ctrl: true }), false)).toBe(true);
		expect(isOpenLinkModifier(mods({ meta: true }), false)).toBe(false);
		expect(isOpenLinkModifier(mods({}), false)).toBe(false);
	});
});

describe('isMacContextClick', () => {
	it('is true only for Ctrl on macOS', () => {
		expect(isMacContextClick(mods({ ctrl: true }), true)).toBe(true);
		expect(isMacContextClick(mods({ meta: true, ctrl: true }), true)).toBe(true);
		expect(isMacContextClick(mods({ meta: true }), true)).toBe(false);
		expect(isMacContextClick(mods({ ctrl: true }), false)).toBe(false);
		expect(isMacContextClick(mods({}), false)).toBe(false);
	});
});
