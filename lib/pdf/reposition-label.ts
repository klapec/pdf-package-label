import type { Corner } from '@/lib/pdf/constants';
import { detectLabelBounds } from '@/lib/pdf/detect-label-bounds';
import { repositionLabelWithDetector } from '@/lib/pdf/reposition-label-core';

export async function repositionLabel(pdfBytes: Uint8Array, corner: Corner) {
  return repositionLabelWithDetector(pdfBytes, corner, detectLabelBounds);
}
