import { degrees, PDFDocument } from "pdf-lib";

import {
  A4_HEIGHT,
  A4_WIDTH,
  type Corner,
  QUADRANT_PADDING,
} from "@/lib/pdf/constants";

type Placement = {
  x: number;
  y: number;
};

type Bounds = {
  left: number;
  right: number;
  bottom: number;
  top: number;
};

type BoundsDetector = (pdfBytes: Uint8Array) => Promise<Bounds | null>;

async function normalizeLandscapePageToPortrait(
  pdfBytes: Uint8Array,
): Promise<Uint8Array> {
  const inputDocument = await PDFDocument.load(pdfBytes.slice());
  const inputPage = inputDocument.getPage(0);
  const { width, height } = inputPage.getSize();

  if (width <= height) {
    return pdfBytes;
  }

  const portraitDocument = await PDFDocument.create();
  const portraitPage = portraitDocument.addPage([height, width]);
  const embeddedPage = await portraitDocument.embedPage(inputPage);

  portraitPage.drawPage(embeddedPage, {
    x: height,
    y: 0,
    width,
    height,
    rotate: degrees(90),
  });

  return await portraitDocument.save();
}

function getQuadrantPlacement(
  width: number,
  height: number,
  corner: Corner,
): Placement {
  const x = corner.endsWith("right")
    ? A4_WIDTH - QUADRANT_PADDING - width
    : QUADRANT_PADDING;
  const y = corner.startsWith("top")
    ? A4_HEIGHT - QUADRANT_PADDING - height
    : QUADRANT_PADDING;

  return { x, y };
}

function getSourceQuadrantBounds(
  pageWidth: number,
  pageHeight: number,
  detectedBounds: Bounds | null,
): Bounds {
  const halfWidth = pageWidth / 2;
  const halfHeight = pageHeight / 2;

  if (!detectedBounds) {
    return {
      left: 0,
      right: pageWidth,
      bottom: 0,
      top: pageHeight,
    };
  }

  const centerX = (detectedBounds.left + detectedBounds.right) / 2;
  const centerY = (detectedBounds.bottom + detectedBounds.top) / 2;
  const isRight = centerX >= halfWidth;
  const isTop = centerY >= halfHeight;

  return {
    left: isRight ? halfWidth : 0,
    right: isRight ? pageWidth : halfWidth,
    bottom: isTop ? halfHeight : 0,
    top: isTop ? pageHeight : halfHeight,
  };
}

export async function repositionLabelWithDetector(
  pdfBytes: Uint8Array,
  corner: Corner,
  detectBounds: BoundsDetector,
) {
  console.info("[pdf/reposition][core] Pipeline start", {
    inputBytes: pdfBytes.byteLength,
    corner,
  });

  const workingPdfBytes = await normalizeLandscapePageToPortrait(pdfBytes);
  console.info("[pdf/reposition][core] Orientation normalized", {
    inputBytes: pdfBytes.byteLength,
    normalizedBytes: workingPdfBytes.byteLength,
  });

  const sourceDocument = await PDFDocument.load(workingPdfBytes.slice());
  const sourcePage = sourceDocument.getPage(0);
  const sourceSize = sourcePage.getSize();
  const detectedBounds = await detectBounds(workingPdfBytes);
  const bounds = getSourceQuadrantBounds(
    sourceSize.width,
    sourceSize.height,
    detectedBounds,
  );
  console.info("[pdf/reposition][core] Source bounds selected", {
    pageWidth: sourceSize.width,
    pageHeight: sourceSize.height,
    detectedBounds,
    selectedBounds: bounds,
  });

  const embeddedDocument = await PDFDocument.load(workingPdfBytes.slice());
  const outputDocument = await PDFDocument.create();
  const outputPage = outputDocument.addPage([A4_WIDTH, A4_HEIGHT]);

  const embeddedPage = await outputDocument.embedPage(
    embeddedDocument.getPage(0),
    bounds,
  );

  const placement = getQuadrantPlacement(
    bounds.right - bounds.left,
    bounds.top - bounds.bottom,
    corner,
  );

  outputPage.drawPage(embeddedPage, {
    ...placement,
    width: bounds.right - bounds.left,
    height: bounds.top - bounds.bottom,
  });

  const outputBytes = await outputDocument.save();
  console.info("[pdf/reposition][core] Pipeline end", {
    outputBytes: outputBytes.byteLength,
    placement,
  });

  return {
    bytes: outputBytes,
    bounds,
  };
}
