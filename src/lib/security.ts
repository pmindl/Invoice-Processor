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


export function isAuthenticated(request: Request): boolean {
    const apiKey = process.env.APP_API_KEY;
    if (!apiKey) {
        console.error('CRITICAL: APP_API_KEY is not defined in the environment.');
        return false;
    }

    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    const url = new URL(request.url);
    const queryKey = url.searchParams.get('key');

    return (authHeader && secureCompare(authHeader, `Bearer ${apiKey}`)) ||
           (apiKeyHeader && secureCompare(apiKeyHeader, apiKey)) ||
           (queryKey && secureCompare(queryKey, apiKey)) || false;
}
