declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(source: {
    data: Uint8Array;
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
      }>;
      destroy(): Promise<void>;
    }>;
  };
}
