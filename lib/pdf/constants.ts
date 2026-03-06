export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const QUADRANT_PADDING = 0;

export const CORNERS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export type Corner = (typeof CORNERS)[number];

export function mirrorCornerHorizontally(corner: Corner): Corner {
  switch (corner) {
    case 'top-left':
      return 'top-right';
    case 'top-right':
      return 'top-left';
    case 'bottom-left':
      return 'bottom-right';
    case 'bottom-right':
      return 'bottom-left';
  }
}
