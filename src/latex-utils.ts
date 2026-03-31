import katex from "katex";
import html2canvas from "html2canvas";

export interface LatexImageResult {
  dataURL: string;
  width: number;
  height: number;
}

/**
 * Renders a LaTeX string to a PNG data URL.
 *
 * Renders KaTeX HTML into a hidden DOM element (where fonts load normally),
 * then captures it to canvas via html2canvas (no foreignObject, no tainted canvas).
 */
export async function renderLatexToImage(
  tex: string,
  displayMode = true,
  scale = 3,
): Promise<LatexImageResult> {
  const html = katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
  });

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;padding:8px;display:inline-block;background:transparent;";
  container.innerHTML = html;
  document.body.appendChild(container);

  await document.fonts.ready;

  try {
    const canvas = await html2canvas(container, {
      scale,
      backgroundColor: null,
      logging: false,
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("LaTeX rendered to empty content");
    }

    return {
      dataURL: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    document.body.removeChild(container);
  }
}
