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
 * Sanitizes a filename to prevent path traversal and remove dangerous characters.
 * @param filename - The original filename
 * @returns The sanitized filename
 */
export function sanitizeFilename(filename: string): string {
    // Remove directory traversal sequences
    let name = filename.replace(/^.*[\\\/]/, '');

    // Remove non-alphanumeric characters except safe ones (dots, dashes, underscores)
    name = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // Prevent hidden files (starting with dot)
    if (name.startsWith('.')) {
        name = '_' + name.substring(1);
    }

    // Ensure filename is not empty
    if (!name) {
        name = 'unnamed_file';
    }

    return name;
}

/**
 * Validates a file for size and MIME type.
 * @param file - The file to validate
 * @returns Object indicating validity and optional error message
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only PDF and images are allowed.' };
    }

    return { valid: true };
}
