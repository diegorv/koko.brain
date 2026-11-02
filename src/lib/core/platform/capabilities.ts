/**
 * What the current runtime may do, set once at boot by the composition root
 * (`app/remote` installs the browser stand-in). `core/` cannot import
 * `app/` (ADR-0003), so boot code in every layer reads it here.
 */

/** True when the app runs in a plain browser connected to the Mac's host. */
let remoteBrowser = false;

/** Marks the runtime as the browser served by the Mac (called before the app mounts). */
export function setRemoteBrowser(value: boolean): void {
	remoteBrowser = value;
}

/**
 * Whether the app runs in the browser. Boot steps that would write to the
 * vault or the Mac (daily-note auto-open, templates folder, bookmark
 * migration, the debug log session) do not run there.
 */
export function isRemoteBrowser(): boolean {
	return remoteBrowser;
}
