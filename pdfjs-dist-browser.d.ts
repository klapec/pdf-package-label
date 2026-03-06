declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(source: {
    data: Uint8Array;
    disableWorker?: boolean;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    useSystemFonts?: boolean;
  }): {
    promise: Promise<{
      getPage(pageNumber: number): Promise<{
        getViewport(options: { scale: number }): {
          width: number;
          height: number;
        };
        getTextContent(): Promise<{ items: unknown[] }>;
        streamTextContent(params?: {
          includeMarkedContent?: boolean;
          disableNormalization?: boolean;
        }): ReadableStream<{
          items: unknown[];
          styles?: Record<string, unknown>;
          lang?: string | null;
        }>;
      }>;
      destroy(): Promise<void>;
    }>;
  };
}
