import type { RemoteStatus } from './remote-transport';

/** Connection to the Mac, as the browser last saw it */
let status = $state<RemoteStatus>('connecting');

/** The vault the desktop has open, from the welcome; `null` when none */
let vaultRoot = $state<string | null>(null);

/** State of the browser's session with the Mac (only used in the browser). */
export const remoteConnectionStore = {
	/** `connecting` until the welcome, `disconnected` once the socket is gone. */
	get status() { return status; },
	/** Vault root from the welcome, `null` when the desktop has none open. */
	get vaultRoot() { return vaultRoot; },
	/** Connected, but the desktop has no vault open. */
	get hasNoVault() { return status === 'connected' && vaultRoot === null; },

	/** Records a status change. */
	setStatus(next: RemoteStatus) {
		status = next;
	},

	/** Records the welcome's vault root. */
	setVaultRoot(root: string | null) {
		vaultRoot = root;
	},

	/** Back to the initial state. */
	reset() {
		status = 'connecting';
		vaultRoot = null;
	},
};
