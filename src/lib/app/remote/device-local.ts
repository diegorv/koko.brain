import { dialogButtons } from './remote-dialog.logic';
import { remoteDialogStore } from './remote-dialog.store.svelte';

/**
 * Plugin calls the browser answers itself instead of sending them to the Mac:
 * they act on the device in front of the user (its dialogs, browser tabs,
 * window and clipboard), and on the Mac they would act on the wrong machine.
 */

const LOCAL_PLUGINS = ['plugin:dialog', 'plugin:opener', 'plugin:clipboard-manager', 'plugin:window'];

const OPENABLE_URL = /^(https?|mailto|tel):/i;

const unavailable =(cmd: string) => Promise.reject(new Error(`This action is not available in the browser (${cmd})`));

const optionalString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/**
 * The browser's answer to `cmd`, or `undefined` when the call goes to the Mac.
 * Message dialogs become in-app dialogs; file pickers resolve as cancelled
 * (no Mac paths to pick); http(s), mailto and tel URLs open in a new tab;
 * window calls are no-ops; the clipboard is `navigator.clipboard`. Other
 * calls of those plugins (other URLs, opening or revealing a Mac path,
 * clipboard images) reject.
 */
export function answerLocally(cmd: string, args: unknown): Promise<unknown> | undefined {
	const plugin = cmd.split('|')[0];
	if (!LOCAL_PLUGINS.includes(plugin)) return undefined;
	const a = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
	switch (cmd) {
		case 'plugin:dialog|message':
			return remoteDialogStore.open({
				title: optionalString(a.title),
				message: String(a.message ?? ''),
				kind: optionalString(a.kind),
				buttons: dialogButtons(a.buttons),
			});
		case 'plugin:dialog|open':
		case 'plugin:dialog|save':
			return Promise.resolve(null);
		case 'plugin:opener|open_url':
			// A relative URL would open a page of this loopback app, and other
			// schemes have no meaning in the browser.
			if (!OPENABLE_URL.test(String(a.url))) return unavailable(cmd);
			window.open(String(a.url), '_blank', 'noopener,noreferrer');
			return Promise.resolve(null);
		case 'plugin:clipboard-manager|read_text':
			return Promise.resolve().then(() => navigator.clipboard.readText());
		case 'plugin:clipboard-manager|write_text':
			return Promise.resolve()
				.then(() => navigator.clipboard.writeText(String(a.text ?? '')))
				.then(() => null);
	}
	if (plugin === 'plugin:window') return Promise.resolve(null);
	return unavailable(cmd);
}
