import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 * It hashes the inputs first to ensure the buffers passed to timingSafeEqual
 * are always the same length, regardless of the input string lengths.
 */
export function secureCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    const aHash = crypto.createHash('sha256').update(a).digest();
    const bHash = crypto.createHash('sha256').update(b).digest();

    return crypto.timingSafeEqual(aHash, bHash);
}
