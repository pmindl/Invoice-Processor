import { describe, it, expect } from 'vitest';
import { secureCompare, sanitizeFilename, validateFile, validateFileContent } from './security';

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
    it('should allow valid filenames', () => {
        expect(sanitizeFilename('invoice.pdf')).toBe('invoice.pdf');
    });

    it('should remove path traversal sequences', () => {
        expect(sanitizeFilename('../secret.txt')).toBe('secret.txt');
        expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
    });

    it('should remove dangerous characters', () => {
        expect(sanitizeFilename('file; rm -rf')).toBe('file__rm_-rf');
    });

    it('should handle empty filename', () => {
        expect(sanitizeFilename('')).toBe('unnamed_file');
    });
});

describe('validateFile', () => {
    it('should validate valid file', () => {
        const file = new File(['dummy content'], 'invoice.pdf', { type: 'application/pdf' });
        expect(validateFile(file).valid).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
        const content = new Array(11 * 1024 * 1024).fill('a').join('');
        const file = new File([content], 'large.pdf', { type: 'application/pdf' });
        expect(validateFile(file).valid).toBe(false);
        expect(validateFile(file).error).toContain('size exceeds');
    });

    it('should reject invalid file type', () => {
        const file = new File(['dummy'], 'virus.exe', { type: 'application/x-msdownload' });
        expect(validateFile(file).valid).toBe(false);
        expect(validateFile(file).error).toContain('Invalid file type');
    });
});

describe('validateFileContent', () => {
    it('should validate PDF file with correct magic bytes', async () => {
        const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x00]);
        const file = new File([content], 'test.pdf', { type: 'application/pdf' });
        const result = await validateFileContent(file);
        expect(result.valid).toBe(true);
    });

    it('should validate JPEG file with correct magic bytes', async () => {
        const content = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00]);
        const file = new File([content], 'test.jpg', { type: 'image/jpeg' });
        const result = await validateFileContent(file);
        expect(result.valid).toBe(true);
    });

    it('should validate PNG file with correct magic bytes', async () => {
        const content = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const file = new File([content], 'test.png', { type: 'image/png' });
        const result = await validateFileContent(file);
        expect(result.valid).toBe(true);
    });

    it('should validate WebP file with correct magic bytes', async () => {
        const content = new Uint8Array([
            0x52, 0x49, 0x46, 0x46, // RIFF
            0x00, 0x00, 0x00, 0x00, // Size (dummy)
            0x57, 0x45, 0x42, 0x50  // WEBP
        ]);
        const file = new File([content], 'test.webp', { type: 'image/webp' });
        const result = await validateFileContent(file);
        expect(result.valid).toBe(true);
    });

    it('should reject file with invalid magic bytes (spoofed extension)', async () => {
        // Text file content pretending to be PDF
        const content = new TextEncoder().encode('This is not a PDF');
        const file = new File([content], 'fake.pdf', { type: 'application/pdf' });
        const result = await validateFileContent(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not match');
    });

    it('should reject empty file', async () => {
        const file = new File([], 'empty.pdf', { type: 'application/pdf' });
        const result = await validateFileContent(file);
        expect(result.valid).toBe(false);
    });
});
