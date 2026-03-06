import type { LabelBounds } from "@/lib/pdf/detect-label-bounds";

type TextItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

type PdfJsModule = typeof import("pdfjs-dist/build/pdf.mjs");

let hasLoggedPdfJsWarning = false;
let pdfJsPromise: Promise<PdfJsModule | null> | null = null;

async function loadPdfJsInBrowser(): Promise<PdfJsModule | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      try {
        const pdfJs = await import("pdfjs-dist/build/pdf.mjs");
        pdfJs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        return pdfJs;
      } catch (error) {
        if (!hasLoggedPdfJsWarning) {
          console.warn(
            "Browser PDF.js could not be initialized; falling back to quadrant-only label repositioning.",
            error,
          );
          hasLoggedPdfJsWarning = true;
        }

        return null;
      }
    })();
  }

  return pdfJsPromise;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function detectLabelBoundsInBrowser(
  pdfBytes: Uint8Array,
): Promise<LabelBounds | null> {
  const pdfJs = await loadPdfJsInBrowser();

  if (!pdfJs) {
    return null;
  }

  const loadingTask = pdfJs.getDocument({
    data: pdfBytes.slice(),
    useWorkerFetch: true,
    isEvalSupported: false,
    disableFontFace: false,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  try {
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items = content.items as TextItem[];
    const meaningfulItems = items.filter((item) => item.str.trim().length > 0);

    if (meaningfulItems.length === 0) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const item of meaningfulItems) {
      const [a, b, c, d, e, f] = item.transform;
      const fontHeight = Math.hypot(b, d) || item.height || 0;
      const glyphWidth = Math.max(item.width, Math.hypot(a, c));
      const x = e;
      const y = f;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + glyphWidth);
      minY = Math.min(minY, y - fontHeight);
      maxY = Math.max(maxY, y);
    }

    return {
      left: clamp(minX, 0, viewport.width),
      right: clamp(maxX, 0, viewport.width),
      bottom: clamp(minY, 0, viewport.height),
      top: clamp(maxY, 0, viewport.height),
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    };
  } finally {
    await document.destroy();
  }
}
