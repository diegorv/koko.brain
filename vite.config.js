// @ts-nocheck
import path from "path";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { formatBuildInfo, parseReleaseChannel } from "./src/lib/utils/build-info.js";

// ─── Build info ──────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

let gitHash = "unknown";
try { gitHash = execSync("git rev-parse --short HEAD").toString().trim(); } catch {}

// `commit count` is only consulted for nightly builds. We compute it unconditionally
// because it's cheap and keeps the build-info call signature uniform across channels.
let commitCount = "0";
try { commitCount = execSync("git rev-list --count HEAD").toString().trim(); } catch {}

const buildTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);

const channel = parseReleaseChannel(process.env.KOKO_RELEASE_CHANNEL);
const buildInfo = formatBuildInfo({ pkgVersion: pkg.version, gitHash, commitCount, buildTime, channel });

// ─── Environment ─────────────────────────────────────────────────────────────

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isPlaywright = !!process.env.PLAYWRIGHT;

// ─── Node.js shims ───────────────────────────────────────────────────────────
// Browser shims for Node.js built-in modules imported by
// @doist/todoist-sdk's multipart-upload.js.
// The upload code path is never called at runtime in the Tauri webview,
// but the imports must resolve for the ES module graph to load successfully.

const nodeShims = {
  "path":      path.resolve("./src/lib/utils/node-shims/path.js"),
  "fs":        path.resolve("./src/lib/utils/node-shims/fs.js"),
  "form-data": path.resolve("./src/lib/utils/node-shims/form-data.js"),
};

// ─── Playwright mocks ────────────────────────────────────────────────────────

const playwrightMocks = {
  "@tauri-apps/api/core":        path.resolve("./e2e/mocks/tauri-core.ts"),
  "@tauri-apps/plugin-fs":       path.resolve("./e2e/mocks/tauri-fs.ts"),
  "@tauri-apps/plugin-dialog":   path.resolve("./e2e/mocks/tauri-dialog.ts"),
  "@tauri-apps/api/event":       path.resolve("./e2e/mocks/tauri-event.ts"),
  "@tauri-apps/plugin-opener":   path.resolve("./e2e/mocks/tauri-opener.ts"),
  "@tauri-apps/plugin-http":     path.resolve("./e2e/mocks/tauri-http.ts"),
  "@tauri-apps/plugin-deep-link": path.resolve("./e2e/mocks/tauri-deep-link.ts"),
  "@tauri-apps/api/window":      path.resolve("./e2e/mocks/tauri-window.ts"),
  "@tauri-apps/api/webviewWindow": path.resolve("./e2e/mocks/tauri-webview-window.ts"),
};

// ─── Config ──────────────────────────────────────────────────────────────────

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit(), tailwindcss()],

  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
    __APP_CHANNEL__: JSON.stringify(channel),
  },

  optimizeDeps: {
    include: ["mermaid"],
    // In PLAYWRIGHT mode, exclude all Tauri packages so the dep optimizer
    // doesn't bundle a second copy of the mock layer (which would create a
    // duplicate virtual-fs.ts instance with its own store).
    exclude: isPlaywright
      ? [
          "@tauri-apps/api/core",
          "@tauri-apps/api/event",
          "@tauri-apps/api/window",
          "@tauri-apps/plugin-fs",
          "@tauri-apps/plugin-dialog",
          "@tauri-apps/plugin-opener",
          "@tauri-apps/plugin-http",
          "@tauri-apps/api/webviewWindow",
          "@tauri-apps/plugin-deep-link",
          "@tauri-apps/plugin-updater",
        ]
      : [],
  },

  resolve: {
    alias: {
      ...nodeShims,
      ...(isPlaywright ? playwrightMocks : {}),
    },
  },

  // Tauri-specific options
  clearScreen: false, // prevent Vite from obscuring Rust errors
  server: {
    port: isPlaywright ? 1421 : 1420,
    strictPort: true,
    host: host || false,
    fs: {
      allow: isPlaywright ? ["."] : undefined,
    },
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**", "**/src/tests/**", "**/tasks/**", "**/help/**", "**/docs/**"],
    },
  },
}));
