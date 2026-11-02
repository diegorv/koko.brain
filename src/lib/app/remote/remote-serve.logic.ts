/** The Tailscale CLI commands that publish, unpublish and list the host on the tailnet. */
export interface ServeCommands {
	/** Publishes `127.0.0.1:<port>` as `https://<tailnet name>:<port>`; `--bg` keeps it until turned off. */
	publish: string;
	/** Removes that handler (`off` after the original flags). */
	unpublish: string;
	/** Lists every Serve handler, t3code's included. */
	status: string;
}

/**
 * The Serve commands for the host on `port`. The Serve HTTPS port and the
 * loopback port are the same number, so one setting names both
 * (https://tailscale.com/docs/reference/tailscale-cli/serve).
 */
export function serveCommands(port: number): ServeCommands {
	return {
		publish: `tailscale serve --bg --https=${port} http://127.0.0.1:${port}`,
		unpublish: `tailscale serve --https=${port} off`,
		status: 'tailscale serve status',
	};
}

/** The URL to open on the iPad or iPhone, `null` without a tailnet name. */
export function tailnetUrl(tailnetHost: string, port: number): string | null {
	return tailnetHost ? `https://${tailnetHost}:${port}` : null;
}
