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
 * Validates a file's content by checking magic bytes.
 * This is a stronger validation than checking the file extension or MIME type.
 * @param file - The file to validate
 * @returns Promise resolving to an object indicating validity and optional error message
 */
export async function validateFileContent(file: File): Promise<{ valid: boolean; error?: string }> {
    // Read the first 12 bytes to cover the longest signature we check
    const blob = file.slice(0, 12);
    let arrayBuffer: ArrayBuffer;

    if (blob.arrayBuffer) {
        arrayBuffer = await blob.arrayBuffer();
    } else {
        // Fallback using FileReader for environments where Blob.arrayBuffer is missing (e.g., JSDOM)
        arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blob);
        });
    }

    const arr = new Uint8Array(arrayBuffer);

    // Helper to check headers
    const checkHeader = (headers: number[], offset = 0) => {
        if (arr.length < headers.length + offset) return false;
        return headers.every((header, index) => arr[index + offset] === header);
    };

    // PDF: %PDF- (25 50 44 46 2D)
    if (checkHeader([0x25, 0x50, 0x44, 0x46, 0x2D])) return { valid: true };

    // JPEG: FF D8 FF
    if (checkHeader([0xFF, 0xD8, 0xFF])) return { valid: true };

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (checkHeader([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return { valid: true };

    // WebP: RIFF .... WEBP
    // RIFF (52 49 46 46) at offset 0
    // WEBP (57 45 42 50) at offset 8
    if (checkHeader([0x52, 0x49, 0x46, 0x46]) && checkHeader([0x57, 0x45, 0x42, 0x50], 8)) return { valid: true };

    return { valid: false, error: 'File content does not match allowed types (PDF, JPEG, PNG, WebP)' };
}
