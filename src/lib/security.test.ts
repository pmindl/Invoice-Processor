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
    it('returns clean filename unchanged', () => {
        expect(sanitizeFilename('file.pdf')).toBe('file.pdf');
        expect(sanitizeFilename('image-123.jpg')).toBe('image-123.jpg');
    });

    it('replaces unsafe characters with underscores', () => {
        expect(sanitizeFilename('file with spaces.pdf')).toBe('file_with_spaces.pdf');
        expect(sanitizeFilename('image(1).png')).toBe('image_1_.png');
    });

    it('removes path components', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
        expect(sanitizeFilename('/var/www/file.html')).toBe('file.html');
        expect(sanitizeFilename('C:\\Windows\\System32\\calc.exe')).toBe('calc.exe');
    });

    it('handles mixed unsafe characters and paths', () => {
        expect(sanitizeFilename('../my folder/file@v1.pdf')).toBe('file_v1.pdf');
    });
});

describe('validateFile', () => {
    // Mock File object since we are in JSDOM environment
    const createMockFile = (size: number, type: string) => {
        return {
            size,
            type,
            name: 'test.pdf',
            slice: () => new Blob(),
            stream: () => new ReadableStream(),
            text: async () => '',
            arrayBuffer: async () => new ArrayBuffer(0),
        } as unknown as File;
    };

    it('accepts valid PDF file', () => {
        const file = createMockFile(1024, 'application/pdf');
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('accepts valid Image file', () => {
        const file = createMockFile(1024, 'image/png');
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('rejects oversized file', () => {
        const file = createMockFile(11 * 1024 * 1024, 'application/pdf'); // 11MB
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('size exceeds');
    });

    it('rejects invalid mime type', () => {
        const file = createMockFile(1024, 'application/x-exe');
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });
});
