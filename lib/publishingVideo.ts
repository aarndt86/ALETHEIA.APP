// ============================================================
// ALTHEARA LEGACY PUBLISHER — VIDEO ASSET VALIDATION & METRICS
// ============================================================
// Native buffer inspection for MP4, WebM, and QuickTime media.
// Enforces 50MB max file size, duration boundary (<= 30.0 seconds),
// and magic-byte media container verification.
// Zero emojis, pure literary engineering.
// ============================================================

export const MAX_VIDEO_DURATION_SECONDS = 30.0;
export const MAX_VIDEO_TOLERANCE_SECONDS = 30.5; // Minor tolerance for fractional frame rounding
export const MIN_VIDEO_DURATION_SECONDS = 1.0;
export const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Megabytes

export type SupportedVideoFormat = 'mp4' | 'webm' | 'mov';

export interface DecodedVideoMeta {
  format: SupportedVideoFormat;
  mimeType: string;
  durationSeconds: number;
}

export type VideoValidationResult =
  | ({ valid: true } & DecodedVideoMeta)
  | { valid: false; error: string; statusCode: number };

/**
 * Detects container format from binary magic bytes.
 */
export function detectVideoFormat(buffer: Buffer): { format: SupportedVideoFormat; mimeType: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // 1. WebM container signature: 1A 45 DF A3 (EBML ID)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { format: 'webm', mimeType: 'video/webm' };
  }

  // 2. MP4 container: offset 4-8 has 'ftyp'
  const tag4 = buffer.toString('ascii', 4, 8);
  if (tag4 === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand === 'qt  ') {
      return { format: 'mov', mimeType: 'video/quicktime' };
    }
    return { format: 'mp4', mimeType: 'video/mp4' };
  }

  // 3. QuickTime standalone atom headers
  if (['moov', 'mdat', 'wide', 'skip'].includes(tag4)) {
    return { format: 'mov', mimeType: 'video/quicktime' };
  }

  return null;
}

/**
 * Parses movie header box (mvhd) in MP4 / MOV container to extract duration.
 * Returns duration in fractional seconds, or null if unparsed.
 */
export function parseMp4Duration(buffer: Buffer): number | null {
  try {
    let offset = 0;
    while (offset < buffer.length - 8) {
      const size = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      if (size === 0) break;
      const boxEnd = size === 1 ? offset + Number(buffer.readBigUInt64BE(offset + 8)) : offset + size;

      if (type === 'moov') {
        let subOffset = offset + 8;
        while (subOffset < boxEnd - 8) {
          const subSize = buffer.readUInt32BE(subOffset);
          const subType = buffer.toString('ascii', subOffset + 4, subOffset + 8);
          if (subType === 'mvhd') {
            const version = buffer.readUInt8(subOffset + 8);
            if (version === 0) {
              const timescale = buffer.readUInt32BE(subOffset + 20);
              const duration = buffer.readUInt32BE(subOffset + 24);
              return timescale > 0 ? duration / timescale : null;
            } else if (version === 1) {
              const timescale = buffer.readUInt32BE(subOffset + 28);
              const duration = Number(buffer.readBigUInt64BE(subOffset + 32));
              return timescale > 0 ? duration / timescale : null;
            }
          }
          if (subSize <= 0) break;
          subOffset += subSize;
        }
      }

      if (boxEnd <= offset) break;
      offset = boxEnd;
    }
  } catch {
    // Malformed atom hierarchy
  }
  return null;
}

/**
 * Validates file size, container format, and duration bounds for author showcase videos.
 */
export function validateVideoBuffer(buffer: Buffer, declaredDurationSec?: number): VideoValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: 'Uploaded video file is empty.',
      statusCode: 400
    };
  }

  if (buffer.length > MAX_VIDEO_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video file size (${sizeMb} MB) exceeds maximum allowable limit of 50 MB.`,
      statusCode: 413
    };
  }

  const detected = detectVideoFormat(buffer);
  if (!detected) {
    return {
      valid: false,
      error: 'Unsupported media format. Author showcase video must be a valid MP4, WebM, or QuickTime recording.',
      statusCode: 415
    };
  }

  // Attempt binary duration extraction (for MP4 / MOV)
  let resolvedDuration = parseMp4Duration(buffer);

  // If binary extraction did not yield a duration (e.g. streaming WebM), fall back to client declared duration
  if (resolvedDuration === null && typeof declaredDurationSec === 'number' && !isNaN(declaredDurationSec)) {
    resolvedDuration = declaredDurationSec;
  }

  if (resolvedDuration === null) {
    return {
      valid: false,
      error: 'Unable to determine video duration. Recording duration must be provided.',
      statusCode: 400
    };
  }

  if (resolvedDuration < MIN_VIDEO_DURATION_SECONDS) {
    return {
      valid: false,
      error: `Video duration (${resolvedDuration.toFixed(1)}s) is too short. Minimum duration is 1 second.`,
      statusCode: 400
    };
  }

  if (resolvedDuration > MAX_VIDEO_TOLERANCE_SECONDS) {
    return {
      valid: false,
      error: `Video duration (${resolvedDuration.toFixed(1)}s) exceeds the maximum limit of 30.0 seconds for bookstore showcases.`,
      statusCode: 400
    };
  }

  return {
    valid: true,
    format: detected.format,
    mimeType: detected.mimeType,
    durationSeconds: Math.round(resolvedDuration * 10) / 10
  };
}
