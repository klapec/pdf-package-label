export type LabelBounds = {
  left: number;
  right: number;
  bottom: number;
  top: number;
  pageWidth: number;
  pageHeight: number;
};

type TextItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

let hasLoggedPdfJsWarning = false;

async function loadPdfJs() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (error) {
    if (!hasLoggedPdfJsWarning) {
      console.warn(
        "PDF.js is unavailable in this runtime; falling back to quadrant-only label repositioning.",
        error,
      );
      hasLoggedPdfJsWarning = true;
    }

    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function detectLabelBounds(pdfBytes: Uint8Array): Promise<LabelBounds | null> {
  const pdfJs = await loadPdfJs();

  if (!pdfJs) {
    return null;
  }

  const document = await pdfJs.getDocument({
    data: pdfBytes.slice(),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
  }).promise;

  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const items = content.items as TextItem[];
  const meaningfulItems = items.filter((item) => item.str.trim().length > 0);

  if (meaningfulItems.length === 0) {
    await document.destroy();
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

  const left = clamp(minX, 0, viewport.width);
  const right = clamp(maxX, 0, viewport.width);
  const bottom = clamp(minY, 0, viewport.height);
  const top = clamp(maxY, 0, viewport.height);

  await document.destroy();

  return {
    left,
    right,
    bottom,
    top,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
  };
}
