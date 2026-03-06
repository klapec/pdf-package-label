import type { Corner } from "@/lib/pdf/constants";
import { detectLabelBoundsInBrowser } from "@/lib/pdf/detect-label-bounds-browser";
import { repositionLabelWithDetector } from "@/lib/pdf/reposition-label-core";

export async function repositionLabelInBrowser(
  pdfBytes: Uint8Array,
  corner: Corner,
) {
  return repositionLabelWithDetector(
    pdfBytes,
    corner,
    detectLabelBoundsInBrowser,
  );
}
