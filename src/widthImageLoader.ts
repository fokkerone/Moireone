// Loading and conversion pipeline for image-referenced line width.
//
// Turns a user-supplied reference image File into the normalized
// luminance data used by the width-modulation math in lineWidths.ts.
// The reference image is never drawn/composited onto the canvas itself —
// it is only ever used as a brightness data source.

/** Perceptual luminance weighting, normalized to [0, 1]. */
export function rgbaToLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Given a source image size and a maximum allowed dimension, returns the
 * target size scaled down proportionally so neither dimension exceeds the
 * cap. Never upscales — sizes already within the cap are returned unchanged.
 */
export function computeDownscaledSize(
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (sourceWidth <= maxDimension && sourceHeight <= maxDimension) {
    return { width: sourceWidth, height: sourceHeight };
  }

  const scale = maxDimension / Math.max(sourceWidth, sourceHeight);
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
  };
}

const MAX_REFERENCE_IMAGE_DIMENSION = 1024;

/**
 * Loads a user-supplied reference image File, downscales it (bounded to
 * MAX_REFERENCE_IMAGE_DIMENSION on the larger side), and converts its pixels
 * to normalized [0, 1] luminance values.
 *
 * Rejects (throws) if the file is not an image. Callers should only replace
 * any existing widthImageData once this promise resolves successfully — the
 * caller keeps the previous value while this is in flight or if it rejects.
 */
export async function loadReferenceImage(
  file: File
): Promise<{ width: number; height: number; luminance: Float32Array }> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Not an image file: ${file.type || 'unknown type'}`);
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = computeDownscaledSize(
      bitmap.width,
      bitmap.height,
      MAX_REFERENCE_IMAGE_DIMENSION
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context for reference image processing');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    const luminance = new Float32Array(width * height);
    for (let i = 0; i < luminance.length; i++) {
      const offset = i * 4;
      luminance[i] = rgbaToLuminance(data[offset], data[offset + 1], data[offset + 2]);
    }

    return { width, height, luminance };
  } finally {
    bitmap.close();
  }
}
