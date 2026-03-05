/** No-op mock for @tauri-apps/plugin-http in E2E tests */
export async function fetch(_url: string, _options?: RequestInit): Promise<Response> {
	return new Response(JSON.stringify({}), {
		status: 200,
		statusText: 'OK',
		headers: { 'Content-Type': 'application/json' },
	});
}
