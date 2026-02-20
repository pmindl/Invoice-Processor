import { describe, it, expect } from 'vitest';
import { secureCompare, sanitizeFilename, validateFile } from './security';

describe('secureCompare', () => {
    it('returns true for identical strings', () => {
        const token = 'secret-token-123';
        expect(secureCompare(token, token)).toBe(true);
    });

    it('returns false for different strings of same length', () => {
        const token = 'secret-token-123';
        const wrong = 'secret-token-abc';
        expect(secureCompare(token, wrong)).toBe(false);
    });

    it('returns false for strings of different lengths', () => {
        const token = 'secret-token-123';
        const wrong = 'secret-token-1234';
        expect(secureCompare(token, wrong)).toBe(false);
    });

    it('returns false for empty string vs non-empty', () => {
        expect(secureCompare('', 'a')).toBe(false);
    });

    it('returns true for two empty strings', () => {
        expect(secureCompare('', '')).toBe(true);
    });

    it('handles unicode characters correctly', () => {
        const token = 'secret-€-token';
        expect(secureCompare(token, token)).toBe(true);
        expect(secureCompare(token, 'secret-$-token')).toBe(false);
    });
});

describe('sanitizeFilename', () => {
    it('allows valid alphanumeric characters', () => {
        expect(sanitizeFilename('validName123.pdf')).toBe('validName123.pdf');
    });

    it('replaces special characters with underscore', () => {
        expect(sanitizeFilename('bad$name!.pdf')).toBe('bad_name_.pdf');
    });

    it('allows dots, dashes, and underscores', () => {
        expect(sanitizeFilename('my-file_name.v2.pdf')).toBe('my-file_name.v2.pdf');
    });

    it('removes path traversal sequences', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
    });
});

describe('validateFile', () => {
    // Helper to mock File
    const createFile = (size: number, type: string) => {
        return {
            size,
            type,
            name: 'test.pdf',
            lastModified: Date.now(),
            arrayBuffer: async () => new ArrayBuffer(0),
            stream: () => new ReadableStream(),
            text: async () => '',
            slice: () => new Blob()
        } as unknown as File;
    };

    it('validates a correct PDF file', () => {
        const file = createFile(1024, 'application/pdf');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('rejects a file larger than 10MB', () => {
        const file = createFile(10 * 1024 * 1024 + 1, 'application/pdf');
        expect(validateFile(file)).toEqual({ valid: false, error: 'File size exceeds limit (10MB)' });
    });

    it('rejects an invalid MIME type', () => {
        const file = createFile(1024, 'application/exe');
        expect(validateFile(file)).toEqual({ valid: false, error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WEBP' });
    });

    it('validates allowed image types', () => {
        expect(validateFile(createFile(1024, 'image/jpeg'))).toEqual({ valid: true });
        expect(validateFile(createFile(1024, 'image/png'))).toEqual({ valid: true });
        expect(validateFile(createFile(1024, 'image/webp'))).toEqual({ valid: true });
    });
});
