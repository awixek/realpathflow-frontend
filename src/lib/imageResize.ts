const MAX_DIMENSION = 512
const JPEG_QUALITY = 0.82

/**
 * Center-crops the given image file to a square and downsizes it to
 * MAX_DIMENSION x MAX_DIMENSION, returning a JPEG blob. Keeps uploaded
 * avatars small (tens of KB instead of multi-MB phone-camera originals) -
 * see the storage-budget math from the Phase D planning discussion.
 */
export async function resizeImageToAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = MAX_DIMENSION
    canvas.height = MAX_DIMENSION
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not supported in this browser.')

    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, MAX_DIMENSION, MAX_DIMENSION)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) throw new Error('Could not process that image.')
    return blob
  } finally {
    bitmap.close()
  }
}
