/** Port the loopback server runs on, `null` while stopped */
let runningPort = $state<number | null>(null);

/** Last start error shown in Settings, `null` when there is none */
let lastError = $state<string | null>(null);

/** State of the browser access (loopback) server as the app last applied it. */
export const remoteServerStore = {
	/** Port the server runs on, `null` while stopped. */
	get runningPort() { return runningPort; },
	/** Last start error, `null` when the last apply succeeded. */
	get error() { return lastError; },
	/** URL to open in the browser while the server runs, else `null`. */
	get url() { return runningPort === null ? null : `http://127.0.0.1:${runningPort}`; },

	/** Records a running server and clears any error. */
	setRunning(port: number) {
		runningPort = port;
		lastError = null;
	},

	/** Records a stopped server and clears any error. */
	setStopped() {
		runningPort = null;
		lastError = null;
	},

	/** Records a failed start: the server is not running. */
	setError(message: string) {
		runningPort = null;
		lastError = message;
	},

	/** Back to stopped with no error. */
	reset() {
		runningPort = null;
		lastError = null;
	},
};
