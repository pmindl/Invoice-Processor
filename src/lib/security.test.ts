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
