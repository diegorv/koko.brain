/** URLs `openUrl` was called with, in order, exposed on `window.__e2e.opener` so a spec can assert a link was opened. */
const openedUrls: string[] = [];

if (typeof window !== 'undefined') {
	(window as any).__e2e = (window as any).__e2e || {};
	(window as any).__e2e.opener = { urls: openedUrls };
}

export async function revealItemInDir(_path: string): Promise<void> {
	// no-op in E2E tests
}

export async function openPath(_path: string): Promise<void> {
	// no-op
}

export async function openUrl(url: string): Promise<void> {
	openedUrls.push(url);
}
