// @ts-nocheck
import path from "path";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { formatBuildInfo, parseReleaseChannel } from "./src/lib/utils/build-info.js";

// ─── Build info ──────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

let gitHash = "unknown";
try { gitHash = execSync("git rev-parse --short HEAD").toString().trim(); } catch {}

// Commits since the stable tag named by package.json; only nightly builds read it.
let commitCount = "0";
try { commitCount = execSync(`git rev-list --count ${pkg.version}..HEAD`).toString().trim(); } catch {}

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
  plugins: [
    // Tauri doesn't have a Node.js server to do proper SSR
    // so we use adapter-static with a fallback to index.html to put the site in SPA mode
    // See: https://svelte.dev/docs/kit/single-page-apps
    // See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({
        fallback: "index.html",
      }),
      // Kit 3 polls _app/version.json hourly by default; 0 turns that timer
      // off. Kit 3 still checks it on window focus and visibility change (a
      // local asset read in the Tauri webview). Frontend and shell ship
      // together, so a mid-session "new version" signal has nothing to act on.
      version: { pollInterval: 0 },
    }),
    tailwindcss(),
  ],

  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
    __APP_CHANNEL__: JSON.stringify(channel),
  },

  // Pin the tsconfig instead of letting Vite and rolldown search for one. A
  // worktree under .claude/worktrees/ otherwise walks past its own tsconfig into
  // the main checkout's, whose `extends: "$app/tsconfig"` only resolves after that
  // checkout ran svelte-kit sync; `vite dev` then dies with "Tsconfig not found".
  // The top-level option covers transforms and files outside `include` (e2e/mocks).
  // Dep optimizers do not read it; only the SSR one hits the failing lookup, hence
  // its own entry.
  // https://github.com/rolldown/rolldown/issues/11086 (fixed in rolldown 1.2.16)
  tsconfig: "tsconfig.json",
  ssr: {
    optimizeDeps: { rolldownOptions: { tsconfig: path.resolve(import.meta.dirname, "tsconfig.json") } },
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
      ignored: ["**/src-tauri/**", "**/src/tests/**", "**/tasks/**", "**/help/**", "**/docs/**", "**/.claude/**"],
    },
  },
}));
