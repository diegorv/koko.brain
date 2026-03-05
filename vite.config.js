// @ts-nocheck
import path from "path";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

// ─── Build info ──────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

let gitHash = "unknown";
try { gitHash = execSync("git rev-parse --short HEAD").toString().trim(); } catch {}

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const buildTime = [
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
].join("");

const buildInfo = `${pkg.version} (${gitHash}) (${buildTime})`;

// ─── Environment ─────────────────────────────────────────────────────────────

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isPlaywright = !!process.env.PLAYWRIGHT;

// ─── Node.js shims ───────────────────────────────────────────────────────────
// Browser shims for Node.js built-in modules imported by
// @doist/todoist-api-typescript's multipart-upload.js.
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
};

// ─── Config ──────────────────────────────────────────────────────────────────

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit(), tailwindcss()],

  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },

  optimizeDeps: {
    include: ["mermaid"],
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
      ignored: ["**/src-tauri/**", "**/src/tests/**", "**/tasks/**"],
    },
  },
}));
