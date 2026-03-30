import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const EXCALIDRAW_PROD = resolve(
  "node_modules/@excalidraw/excalidraw/dist/prod",
);

/**
 * Serves Excalidraw's bundled font files locally so the app never
 * needs to reach an external CDN.
 *
 * Dev:   middleware serves /fonts/* from node_modules
 * Build: copies fonts/ into dist/ after bundling
 */
function excalidrawFonts(): Plugin {
  return {
    name: "excalidraw-fonts",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/fonts/")) {
          const filePath = join(EXCALIDRAW_PROD, req.url);
          if (existsSync(filePath)) {
            res.setHeader("Content-Type", "font/woff2");
            res.setHeader("Cache-Control", "public, max-age=31536000");
            res.end(readFileSync(filePath));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const src = resolve(EXCALIDRAW_PROD, "fonts");
      const dest = resolve("dist", "fonts");
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), excalidrawFonts()],
  server: {
    host: "127.0.0.1",
    strictPort: false,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  },
  preview: {
    host: "127.0.0.1",
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  },
});
