// ============================================================
// ALTHEARA LEGACY PUBLISHER — IMAGE ASSET VALIDATION & DECODING
// ============================================================
// Zero external binary dependencies. Native buffer header decoding.
// Enforces 10MB max, dimension bounds (400x560 to 6000x8400),
// and strict magic-byte validation for JPEG, PNG, and WebP.
// Protects against malformed images and decompression bombs.
// Zero emojis, pure literary engineering.
// ============================================================

export const MIN_IMAGE_WIDTH = 400;
export const MIN_IMAGE_HEIGHT = 560;
export const MAX_IMAGE_WIDTH = 6000;
export const MAX_IMAGE_HEIGHT = 8400;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';
export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface DecodedImageMeta {
  format: SupportedImageFormat;
  mimeType: SupportedMimeType;
  width: number;
  height: number;
}

export type ImageValidationResult =
  | ({ valid: true } & DecodedImageMeta)
  | { valid: false; error: string; statusCode: number };

/**
 * Decodes width, height, and format from raw image buffer headers.
 * Throws an Error if format is unrecognized or buffer is corrupted.
 */
export function decodeImageHeaders(buffer: Buffer): DecodedImageMeta {
  if (!buffer || buffer.length < 16) {
    throw new Error('Image buffer is too short to contain valid headers.');
  }

  // 1. PNG: 8-byte magic header 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return {
      format: 'png',
      mimeType: 'image/png',
      width,
      height
    };
  }

  // 2. JPEG: SOI marker FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      while (offset < buffer.length && buffer[offset] === 0xff) {
        offset++;
      }
      if (offset >= buffer.length) break;

      const marker = buffer[offset];
      offset++;

      // Standalone markers without payload
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }
      // Start of Scan (SOS) - end of frame headers
      if (marker === 0xda) {
        break;
      }

      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);

      // Start of Frame (SOF) markers containing dimensions
      // SOF0 (baseline), SOF1 (extended sequential), SOF2 (progressive), SOF3 (lossless), etc.
      const sofMarkers = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf];
      if (sofMarkers.includes(marker)) {
        if (offset + 7 <= buffer.length) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          return {
            format: 'jpeg',
            mimeType: 'image/jpeg',
            width,
            height
          };
        }
      }

      offset += length;
    }
    throw new Error('Valid JPEG SOI marker found, but Start of Frame dimensions were unreadable.');
  }

  // 3. WebP: RIFF ... WEBP container
  if (
    buffer.length >= 16 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunkType = buffer.toString('ascii', 12, 16);

    // Simple Lossy VP8
    if (chunkType === 'VP8 ' && buffer.length >= 30) {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return {
        format: 'webp',
        mimeType: 'image/webp',
        width,
        height
      };
    }

    // Lossless VP8L
    if (chunkType === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return {
        format: 'webp',
        mimeType: 'image/webp',
        width,
        height
      };
    }

    // Extended VP8X
    if (chunkType === 'VP8X' && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return {
        format: 'webp',
        mimeType: 'image/webp',
        width,
        height
      };
    }

    throw new Error(`Unrecognized WebP subformat chunk: ${chunkType}`);
  }

  throw new Error('Unsupported image format. File must be a valid JPEG, PNG, or WebP image.');
}

/**
 * Validates file size, format headers, and dimension bounds.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: 'Uploaded image file is empty.',
      statusCode: 400
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowable limit of 10 MB.`,
      statusCode: 413
    };
  }

  let meta: DecodedImageMeta;
  try {
    meta = decodeImageHeaders(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Malformed image data.';
    const isUnsupported = message.includes('Unsupported image format');
    return {
      valid: false,
      error: message,
      statusCode: isUnsupported ? 415 : 400
    };
  }

  if (meta.width < MIN_IMAGE_WIDTH || meta.height < MIN_IMAGE_HEIGHT) {
    return {
      valid: false,
      error: `Image dimensions (${meta.width} x ${meta.height} px) are too small. Minimum required dimensions are ${MIN_IMAGE_WIDTH} x ${MIN_IMAGE_HEIGHT} px for bookstore presentation.`,
      statusCode: 400
    };
  }

  if (meta.width > MAX_IMAGE_WIDTH || meta.height > MAX_IMAGE_HEIGHT) {
    return {
      valid: false,
      error: `Image dimensions (${meta.width} x ${meta.height} px) exceed maximum allowable bounds of ${MAX_IMAGE_WIDTH} x ${MAX_IMAGE_HEIGHT} px.`,
      statusCode: 400
    };
  }

  return {
    valid: true,
    ...meta
  };
}
