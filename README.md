# ExcaliPDF

A local-first PDF annotation tool built on [Excalidraw](https://excalidraw.com). Load a PDF, draw on it, and your annotations persist automatically.

## Features

- **PDF annotation** — load any PDF and draw, sketch, or write on top of it
- **Excalidraw canvas** — full access to Excalidraw's drawing tools, shapes, and export options
- **Multi-tab workspace** — work on multiple documents side by side
- **Drag and drop** — drop PDFs or `.excalidraw` files to open them instantly
- **Local persistence** — annotations are saved to your browser's localStorage per PDF
- **No network requests** — everything runs locally, fonts included. Nothing leaves your machine.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) and drop a PDF.

## Scripts

| Command          | Description                              |
|------------------|------------------------------------------|
| `npm run dev`    | Start the dev server (localhost only)     |
| `npm run build`  | Type-check and bundle for production      |
| `npm run preview`| Preview the production build locally      |
| `npm run serve`  | Build + preview in one step               |
| `npm run lint`   | Run ESLint                                |

## Local Deployment

ExcaliPDF is designed for local use. The dev and preview servers bind to `127.0.0.1` and are never exposed to the network.

To deploy the production build behind your own web server (Nginx, Caddy, etc.), serve the `dist/` directory as static files:

```bash
npm run build
# then point your server at the dist/ directory
```

The `dist/` folder is fully self-contained — HTML, JS, CSS, and all fonts.

## Security

- **Content Security Policy** — restricts scripts, styles, fonts, and connections to same-origin only. No inline scripts. No external requests.
- **Localhost-only binding** — dev and preview servers listen on `127.0.0.1`, not `0.0.0.0`
- **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`
- **File size limits** — uploads are capped at 100 MB to prevent browser memory exhaustion
- **Input validation** — `.excalidraw` files are validated for structure before loading
- **No telemetry, no analytics, no external calls**

## Project Structure

```
src/
  main.tsx        — entry point, configures Excalidraw asset path
  App.tsx         — main component: tabs, file loading, Excalidraw integration
  App.css         — layout and component styles
  index.css       — global reset
  pdf-utils.ts    — PDF-to-image rendering via pdf.js
  types.ts        — shared TypeScript interfaces
  env.d.ts        — global type declarations
vite.config.ts    — Vite config with font plugin and security headers
index.html        — shell with CSP meta tag
```

## Tech Stack

- [React 19](https://react.dev)
- [Excalidraw](https://github.com/excalidraw/excalidraw)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Vite](https://vite.dev)
- TypeScript (strict mode)
