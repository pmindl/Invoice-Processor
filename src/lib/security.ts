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
 * Validates file upload constraints.
 * Checks file size (max 10MB) and type (PDF, JPEG, PNG, WebP).
 * @param file - The file object to validate
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    // Note: this checks the client-provided MIME type.
    // For critical security, magic byte inspection is recommended.
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP' };
    }

    return { valid: true };
}

/**
 * Sanitizes a filename to prevent path traversal and remove unsafe characters.
 * Allows only alphanumeric characters, dots, dashes, and underscores.
 * @param filename - The original filename
 */
export function sanitizeFilename(filename: string): string {
    // Remove directory path components
    const name = filename.replace(/^.*[\\\/]/, '');

    // Replace any character that is not alphanumeric, dot, dash, or underscore
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
