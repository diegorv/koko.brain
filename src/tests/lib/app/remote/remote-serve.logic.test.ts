import { describe, expect, it } from 'vitest';
import { serveCommands, tailnetUrl } from '#lib/app/remote/remote-serve.logic.js';

describe('serveCommands', () => {
	it('publishes, unpublishes and lists the Serve handler on the host port', () => {
		expect(serveCommands(4747)).toEqual({
			publish: 'tailscale serve --bg --https=4747 http://127.0.0.1:4747',
			unpublish: 'tailscale serve --https=4747 off',
			status: 'tailscale serve status',
		});
	});
});

describe('tailnetUrl', () => {
	it('is the https URL on the tailnet name and port', () => {
		expect(tailnetUrl('mac.tail1234.ts.net', 4747)).toBe('https://mac.tail1234.ts.net:4747');
	});

	it('is null without a tailnet name', () => {
		expect(tailnetUrl('', 4747)).toBeNull();
	});
});
