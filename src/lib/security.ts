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
 * Sanitizes a filename to prevent path traversal and other issues.
 * Only allows alphanumeric characters, dots, dashes, and underscores.
 * @param filename - The filename to sanitize
 * @returns The sanitized filename
 */
export function sanitizeFilename(filename: string): string {
    // Remove any path components
    const name = filename.replace(/^.*[\\\/]/, '');

    // Allow only safe characters: a-z, A-Z, 0-9, ., -, _
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/**
 * Validates a file for size and MIME type.
 * @param file - The file to validate
 * @returns An object indicating validity and an optional error message
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Allowed types: PDF, JPEG, PNG, WEBP' };
    }

    return { valid: true };
}
