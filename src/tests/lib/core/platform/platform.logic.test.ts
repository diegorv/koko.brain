import { describe, it, expect } from 'vitest';
import { detectPlatform, isMobilePlatform } from '$lib/core/platform/platform.logic';

const IPHONE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPAD_LEGACY_UA =
	'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPADOS_DESKTOP_CLASS_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const MACOS_UA = IPADOS_DESKTOP_CLASS_UA;
const ANDROID_UA =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const WINDOWS_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

describe('detectPlatform', () => {
	it('classifies an iPhone user agent as ios', () => {
		expect(detectPlatform(IPHONE_UA, 5)).toBe('ios');
	});

	it('classifies a legacy iPad user agent as ios', () => {
		expect(detectPlatform(IPAD_LEGACY_UA, 5)).toBe('ios');
	});

	it('classifies the iPadOS desktop-class user agent as ios via touch points', () => {
		expect(detectPlatform(IPADOS_DESKTOP_CLASS_UA, 5)).toBe('ios');
	});

	it('keeps a Mac (same user agent, no touch points) on desktop', () => {
		expect(detectPlatform(MACOS_UA, 0)).toBe('desktop');
	});

	it('does not treat a single touch point on a Mac as an iPad', () => {
		expect(detectPlatform(MACOS_UA, 1)).toBe('desktop');
	});

	it('classifies Android as android', () => {
		expect(detectPlatform(ANDROID_UA, 5)).toBe('android');
	});

	it('classifies Windows as desktop even with a touch screen', () => {
		expect(detectPlatform(WINDOWS_UA, 10)).toBe('desktop');
	});

	it('falls back to desktop for an empty user agent', () => {
		expect(detectPlatform('', 0)).toBe('desktop');
	});
});

describe('isMobilePlatform', () => {
	it('is true for ios and android', () => {
		expect(isMobilePlatform('ios')).toBe(true);
		expect(isMobilePlatform('android')).toBe(true);
	});

	it('is false for desktop', () => {
		expect(isMobilePlatform('desktop')).toBe(false);
	});
});
