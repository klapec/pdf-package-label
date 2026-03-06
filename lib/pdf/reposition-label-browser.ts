import type { Corner } from '@/lib/pdf/constants';
import { detectLabelBoundsInBrowser } from '@/lib/pdf/detect-label-bounds-browser';
import { repositionLabelWithDetector } from '@/lib/pdf/reposition-label-core';

export async function repositionLabelInBrowser(
  pdfBytes: Uint8Array,
  corner: Corner,
) {
  console.info('[pdf/reposition][browser] repositionLabelInBrowser start', {
    bytes: pdfBytes.byteLength,
    corner,
  });

  try {
    const result = await repositionLabelWithDetector(
      pdfBytes,
      corner,
      detectLabelBoundsInBrowser,
    );
    console.info('[pdf/reposition][browser] repositionLabelInBrowser end', {
      outputBytes: result.bytes.byteLength,
      bounds: result.bounds,
    });
    return result;
  } catch (error) {
    console.error(
      '[pdf/reposition][browser] repositionLabelInBrowser failed',
      error,
    );
    throw error;
  }
}
