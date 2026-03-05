let openResponse: string | null = null;
let askResponse = true;

export async function open(_opts?: unknown): Promise<string | null> {
	return openResponse;
}

export async function ask(_message: string, _opts?: unknown): Promise<boolean> {
	return askResponse;
}

// Expose control API on window for Playwright
const dialogAPI = {
	setOpenResponse(value: string | null) {
		openResponse = value;
	},
	setAskResponse(value: boolean) {
		askResponse = value;
	},
};

// Guard for SSR
if (typeof window !== 'undefined') {
	(window as any).__e2e = (window as any).__e2e || {};
	(window as any).__e2e.dialog = dialogAPI;
}
