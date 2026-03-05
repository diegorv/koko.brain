import { TodoistApi } from '@doist/todoist-api-typescript';
import { createTauriFetchAdapter } from './tauri-fetch-adapter';

/**
 * Creates a TodoistApi client configured with Tauri's HTTP plugin.
 * Uses a custom fetch adapter to bypass CORS restrictions in the Tauri webview.
 */
export function createTodoistClient(token: string): TodoistApi {
	return new TodoistApi(token, {
		customFetch: createTauriFetchAdapter(),
	});
}
