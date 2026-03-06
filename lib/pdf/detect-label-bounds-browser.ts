import type { LabelBounds } from "@/lib/pdf/detect-label-bounds";

type TextItem = {
  str: string;
  width: number;
  height: number;
  transform: number[];
};

type TextContentChunk = {
  items?: unknown[];
};

type PdfJsModule = typeof import("pdfjs-dist/build/pdf.mjs");
type PromiseWithResolversResult<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

let hasLoggedPdfJsWarning = false;
let pdfJsPromise: Promise<PdfJsModule | null> | null = null;
let hasLoggedBrowserEnvironment = false;

function getBrowserCapabilityReport() {
  if (typeof window === "undefined") {
    return null;
  }

  const promiseValue = Promise as PromiseConstructor & {
    withResolvers?: unknown;
    try?: unknown;
  };
  const mapProto = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: unknown;
  };
  const urlCtor = URL as typeof URL & {
    parse?: unknown;
  };

  return {
    userAgent: window.navigator.userAgent,
    hasPromiseWithResolvers: typeof promiseValue.withResolvers === "function",
    hasPromiseTry: typeof promiseValue.try === "function",
    hasMapGetOrInsertComputed:
      typeof mapProto.getOrInsertComputed === "function",
    hasURLParse: typeof urlCtor.parse === "function",
  };
}

function logBrowserEnvironmentOnce() {
  if (hasLoggedBrowserEnvironment || typeof window === "undefined") {
    return;
  }

  hasLoggedBrowserEnvironment = true;
  console.info(
    "[pdf/reposition][browser] Environment",
    getBrowserCapabilityReport(),
  );
}

function ensurePromiseWithResolversPolyfill() {
  const promiseWithResolvers = (
    Promise as PromiseConstructor & {
      withResolvers?: <T>() => PromiseWithResolversResult<T>;
    }
  ).withResolvers;

  if (typeof promiseWithResolvers === "function") {
    return;
  }

  console.info(
    "[pdf/reposition][browser] Applying Promise.withResolvers polyfill",
  );

  (
    Promise as PromiseConstructor & {
      withResolvers: <T>() => PromiseWithResolversResult<T>;
    }
  ).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((innerResolve, innerReject) => {
      resolve = innerResolve;
      reject = innerReject;
    });

    return { promise, resolve, reject };
  };
}

async function loadPdfJsInBrowser(): Promise<PdfJsModule | null> {
  if (typeof window === "undefined") {
    return null;
  }

  logBrowserEnvironmentOnce();

  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      try {
        ensurePromiseWithResolversPolyfill();

        console.info("[pdf/reposition][browser] Loading pdfjs-dist module");

        const pdfJs = await import("pdfjs-dist/build/pdf.mjs");
        pdfJs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const maybeVersion = (pdfJs as { version?: string }).version;
        console.info("[pdf/reposition][browser] PDF.js loaded", {
          version: maybeVersion ?? "unknown",
          workerSrc: pdfJs.GlobalWorkerOptions.workerSrc,
          workerMode: "disabled",
        });
        return pdfJs;
      } catch (error) {
        if (!hasLoggedPdfJsWarning) {
          console.error("[pdf/reposition][browser] PDF.js init failed", {
            error,
            capabilities: getBrowserCapabilityReport(),
          });
          console.warn(
            "Browser PDF.js could not be initialized; falling back to quadrant-only label repositioning.",
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

async function readTextItemsFromStream(page: {
  streamTextContent?: (params?: {
    disableNormalization?: boolean;
    includeMarkedContent?: boolean;
  }) => ReadableStream<TextContentChunk>;
  getTextContent: () => Promise<{ items: unknown[] }>;
}) {
  if (typeof page.streamTextContent !== "function") {
    console.warn(
      "[pdf/reposition][browser] streamTextContent is unavailable, falling back to getTextContent",
    );
    const textContent = await page.getTextContent();
    return {
      items: textContent.items as TextItem[],
      chunkCount: 1,
      method: "getTextContent",
    } as const;
  }

  const readableStream = page.streamTextContent({
    disableNormalization: false,
    includeMarkedContent: false,
  });
  const reader = readableStream.getReader();
  const items: TextItem[] = [];
  let chunkCount = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      chunkCount += 1;
      if (value?.items?.length) {
        items.push(...(value.items as TextItem[]));
      }
    }

    return {
      items,
      chunkCount,
      method: "streamTextContent",
    } as const;
  } finally {
    reader.releaseLock();
  }
}

export async function detectLabelBoundsInBrowser(
  pdfBytes: Uint8Array,
): Promise<LabelBounds | null> {
  const startTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  console.info("[pdf/reposition][browser] detectLabelBounds start", {
    bytes: pdfBytes.byteLength,
  });

  const pdfJs = await loadPdfJsInBrowser();

  if (!pdfJs) {
    console.warn(
      "[pdf/reposition][browser] detectLabelBounds skipped because PDF.js is unavailable",
    );
    return null;
  }

  let document: Awaited<
    ReturnType<(typeof pdfJs)["getDocument"]>["promise"]
  > | null = null;

  try {
    const loadingTask = pdfJs.getDocument({
      data: pdfBytes.slice(),
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: false,
      useSystemFonts: true,
    });

    document = await loadingTask.promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const textReadResult = await readTextItemsFromStream(page);
    const items = textReadResult.items;
    const meaningfulItems = items.filter((item) => item.str.trim().length > 0);

    console.info("[pdf/reposition][browser] Text extraction stats", {
      method: textReadResult.method,
      chunkCount: textReadResult.chunkCount,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
      itemCount: items.length,
      meaningfulItemCount: meaningfulItems.length,
    });

    if (meaningfulItems.length === 0) {
      console.warn("[pdf/reposition][browser] No meaningful text items found");
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

    const bounds: LabelBounds = {
      left: clamp(minX, 0, viewport.width),
      right: clamp(maxX, 0, viewport.width),
      bottom: clamp(minY, 0, viewport.height),
      top: clamp(maxY, 0, viewport.height),
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    };

    console.info("[pdf/reposition][browser] Bounds detected", bounds);
    return bounds;
  } catch (error) {
    console.error("[pdf/reposition][browser] detectLabelBounds failed", {
      error,
      capabilities: getBrowserCapabilityReport(),
    });
    throw error;
  } finally {
    if (document) {
      try {
        await document.destroy();
      } catch (destroyError) {
        console.warn(
          "[pdf/reposition][browser] Failed to destroy PDF.js document",
          destroyError,
        );
      }
    }

    const elapsed =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
      startTime;
    console.info("[pdf/reposition][browser] detectLabelBounds end", {
      elapsedMs: Math.round(elapsed),
    });
  }
}
