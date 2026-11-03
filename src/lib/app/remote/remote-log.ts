/**
 * The browser's log lines on their way to the Mac's session log: each line
 * is a `log` notification on the session (`rpc.rs`), which the host writes
 * as `BROWSER:<tag>`. Lines raised while the session is not connected
 * (page load before the welcome, a reconnect) wait in a bounded buffer and
 * are sent, in order, once it is.
 */

/** Lines held while not connected; past this the oldest are dropped. */
export const MAX_BUFFERED_LOG_LINES = 200;

/** Sends one notification; returns whether it was sent (`RemoteTransport.notify`). */
export type Notify = (method: string, params: unknown) => boolean;

/** A forwarder of browser log lines. */
export interface RemoteLog {
	/** Sends `(tag, message)` now, or buffers it while not connected. */
	push(tag: string, message: string): void;
	/** Sends the buffered lines; call when the session is welcomed. */
	flush(): void;
}

/** Creates the forwarder over `notify`. */
export function createRemoteLog(notify: Notify): RemoteLog {
	let buffer: { tag: string; message: string }[] = [];
	let dropped = 0;

	const flush = () => {
		if (dropped > 0) {
			if (!notify('log', { tag: 'REMOTE-LOG', message: `dropped ${dropped} lines raised while not connected` })) return;
			dropped = 0;
		}
		while (buffer.length > 0 && notify('log', buffer[0])) buffer.shift();
	};

	const push = (tag: string, message: string) => {
		if (buffer.length === 0 && dropped === 0 && notify('log', { tag, message })) return;
		if (buffer.length >= MAX_BUFFERED_LOG_LINES) {
			buffer.shift();
			dropped++;
		}
		buffer.push({ tag, message });
	};

	return { push, flush };
}

/**
 * The text of an uncaught error or a rejection reason. Only V8 starts
 * `stack` with `Name: message`; JavaScriptCore (Safari) gives the frames
 * alone, so the name and message lead the line unless the stack has them.
 */
function describe(reason: unknown): string {
	if (!(reason instanceof Error)) return String(reason);
	const head = `${reason.name}: ${reason.message}`;
	if (!reason.stack) return head;
	return reason.stack.startsWith(head) ? reason.stack : `${head}\n${reason.stack}`;
}

/**
 * Forwards the page's uncaught errors (`UNCAUGHT`), unhandled rejections
 * (`UNHANDLED-REJECTION`) and CSP violations (`CSP`, with the violated
 * directive and the blocked URI) to `push`. Returns the function that
 * removes the listeners.
 */
export function installBrowserErrorForwarding(target: Window, push: RemoteLog['push']): () => void {
	const onError = (event: Event) => {
		const e = event as ErrorEvent;
		const where = e.filename ? ` (${e.filename}:${e.lineno}:${e.colno})` : '';
		push('UNCAUGHT', e.error ? `${describe(e.error)}${where}` : `${e.message}${where}`);
	};
	const onRejection = (event: Event) => {
		push('UNHANDLED-REJECTION', describe((event as PromiseRejectionEvent).reason));
	};
	const onViolation = (event: Event) => {
		const e = event as SecurityPolicyViolationEvent;
		const where = e.sourceFile ? ` at ${e.sourceFile}:${e.lineNumber}` : '';
		push('CSP', `${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI || '(inline)'}${where}`);
	};
	target.addEventListener('error', onError);
	target.addEventListener('unhandledrejection', onRejection);
	target.addEventListener('securitypolicyviolation', onViolation);
	return () => {
		target.removeEventListener('error', onError);
		target.removeEventListener('unhandledrejection', onRejection);
		target.removeEventListener('securitypolicyviolation', onViolation);
	};
}
