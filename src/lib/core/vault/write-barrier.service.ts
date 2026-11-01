import { debug } from '#lib/utils/debug.js';

/** A source of in-flight vault writes that a vault switch must wait for. */
interface WriteBarrier {
	/** Name used in debug logs. */
	name: string;
	/** Resolves once every write in flight, and every write queued meanwhile, has settled. */
	drain: () => Promise<void>;
}

/** Registered barriers, in registration order. */
const barriers: WriteBarrier[] = [];

/**
 * Registers a source of in-flight writes for `drainPendingWrites` to wait on.
 * Registered for the app's lifetime by `registerAppPorts`, not per vault:
 * `initializeVault` unregisters its vault-lifetime registrations before it
 * drains, so a barrier in that list would be gone exactly when it is needed.
 * @param name - name used in debug logs
 * @param drain - resolves once the source's writes have settled
 * @returns an unregister function
 */
export function registerWriteBarrier(name: string, drain: () => Promise<void>): () => void {
	const barrier = { name, drain };
	barriers.push(barrier);
	debug('VAULT', `Write barrier registered: ${name}`);
	return () => {
		const idx = barriers.indexOf(barrier);
		if (idx >= 0) barriers.splice(idx, 1);
	};
}

/**
 * Waits for every registered barrier, one after another. A rejection
 * propagates to the caller.
 */
export async function drainPendingWrites(): Promise<void> {
	for (const barrier of [...barriers]) {
		await barrier.drain();
	}
}
