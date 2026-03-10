import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * @param a First string (e.g., provided key)
 * @param b Second string (e.g., stored environment key)
 * @returns true if strings are exactly equal, false otherwise.
 */
export function secureCompare(a: string | null | undefined, b: string | null | undefined): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    // Convert to buffers.
    // If lengths differ, we still need to do a comparison to avoid length timing attacks,
    // though Node's timingSafeEqual throws if lengths differ.
    // We pad or hash if necessary, but simpler is comparing buffers of equal length.

    // To prevent length leak, we hash both strings first with SHA-256.
    // Hash output length is always 32 bytes.
    const aHash = crypto.createHash('sha256').update(a).digest();
    const bHash = crypto.createHash('sha256').update(b).digest();

    return crypto.timingSafeEqual(aHash, bHash);
}
