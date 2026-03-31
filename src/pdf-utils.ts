import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface PdfPage {
  dataURL: string;
  width: number;
  height: number;
}

export async function renderPdf(
  source: File | ArrayBuffer,
  scale = 2,
  maxPages = 200,
): Promise<{ pages: PdfPage[] }> {
  const arrayBuffer =
    source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPage[] = [];
  const pageCount = Math.min(pdf.numPages, maxPages);

  for (let i = 0; i < pageCount; i++) {
    const page = await pdf.getPage(i + 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d")!;
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    pages.push({
      dataURL: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
    });
  }

  return { pages };
}
