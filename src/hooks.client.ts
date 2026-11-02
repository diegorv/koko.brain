import { isTauri } from '@tauri-apps/api/core';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';

// At module evaluation: SvelteKit imports this file statically from its
// generated app.js, and route modules load later by dynamic import, so the
// bridge exists before any of them runs. Under PLAYWRIGHT `@tauri-apps/api/core`
// is the e2e mock, whose `isTauri()` answers true, so E2E never gets it.
installTauriBridgeStandIn({ hasTauriRuntime: isTauri() });
