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

/**
 * Validates file content against declared MIME type using magic bytes.
 * @param buffer - The file buffer
 * @param mimeType - The declared MIME type
 * @returns Object indicating validity and optional error message
 */
export function validateFileContent(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
    if (!buffer || buffer.length === 0) {
        return { valid: false, error: 'File is empty' };
    }

    // Magic numbers for allowed types
    const signatures: Record<string, number[]> = {
        'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF
    };

    const signature = signatures[mimeType];

    // If type is not in our signature list but was allowed by validateFile,
    // it's a configuration error (we should have signatures for all allowed types).
    if (!signature) {
        return { valid: false, error: 'Unsupported file type for content validation' };
    }

    if (buffer.length < signature.length) {
        return { valid: false, error: 'File is too small to be valid' };
    }

    for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
            return { valid: false, error: 'File content does not match declared type' };
        }
    }

    // Additional check for WebP: "WEBP" at offset 8
    if (mimeType === 'image/webp') {
        const webpSignature = [0x57, 0x45, 0x42, 0x50]; // WEBP
        if (buffer.length < 12) {
             return { valid: false, error: 'File is too small to be valid WebP' };
        }
        for (let i = 0; i < webpSignature.length; i++) {
            if (buffer[8 + i] !== webpSignature[i]) {
                return { valid: false, error: 'Invalid WebP file structure' };
            }
        }
    }

    return { valid: true };
}
