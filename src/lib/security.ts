import { timingSafeEqual } from 'crypto';

/**
 * Securely compares two strings to prevent timing attacks.
 * Uses crypto.timingSafeEqual for constant-time comparison.
 * @param a - The first string to compare (e.g., received token)
 * @param b - The second string to compare (e.g., expected token)
 * @returns true if strings are identical, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return timingSafeEqual(bufferA, bufferB);
}

/**
 * Sanitizes a filename to allow only alphanumeric characters, dots, dashes, and underscores.
 * All other characters are replaced with underscores.
 * @param filename - The original filename
 * @returns The sanitized filename
 */
export function sanitizeFilename(filename: string): string {
    // Replace any character that is NOT alphanumeric, dot, dash, or underscore with underscore
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a file for size and MIME type.
 * Max size: 10MB
 * Allowed types: PDF, JPEG, PNG, WEBP
 * @param file - The file to validate
 * @returns An object with `valid` boolean and optional `error` message
 */
export function validateFile(file: File): ValidationResult {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File size exceeds limit (10MB)' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WEBP' };
    }

    return { valid: true };
}
