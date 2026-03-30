import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Serve Excalidraw's fonts from our own origin instead of the esm.sh CDN.
// The Vite plugin in vite.config.ts handles making the files available.
window.EXCALIDRAW_ASSET_PATH = "/";

createRoot(document.getElementById("root")!).render(<App />);
