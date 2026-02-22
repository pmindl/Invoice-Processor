import { describe, it, expect } from 'vitest';
import { secureCompare, validateFile, sanitizeFilename } from './security';

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

describe('validateFile', () => {
    it('returns valid for correct PDF', () => {
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('returns valid for correct JPEG', () => {
        const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
        const result = validateFile(file);
        expect(result.valid).toBe(true);
    });

    it('returns error for invalid type', () => {
        const file = new File(['dummy content'], 'test.exe', { type: 'application/x-msdownload' });
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('returns error for file too large', () => {
        // Mock size property manually since creating a 11MB buffer is inefficient
        const file = {
            size: 11 * 1024 * 1024,
            type: 'application/pdf'
        } as File;

        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('File size exceeds');
    });
});

describe('sanitizeFilename', () => {
    it('removes path traversal sequences', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
        expect(sanitizeFilename('..\\windows\\system32')).toBe('system32');
    });

    it('removes special characters', () => {
        expect(sanitizeFilename('file$name!.pdf')).toBe('file_name_.pdf');
        expect(sanitizeFilename('my file(1).pdf')).toBe('my_file_1_.pdf');
    });

    it('allows valid filenames', () => {
        expect(sanitizeFilename('valid-file_name.123.pdf')).toBe('valid-file_name.123.pdf');
    });

    it('handles complex paths', () => {
        expect(sanitizeFilename('folder/subfolder/file.name.pdf')).toBe('file.name.pdf');
    });

    it('replaces spaces with underscores', () => {
        expect(sanitizeFilename('invoice 2023.pdf')).toBe('invoice_2023.pdf');
    });
});
