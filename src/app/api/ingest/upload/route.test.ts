import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/gdrive', () => ({
    uploadFile: vi.fn().mockResolvedValue('mock-file-id'),
}));

vi.mock('@/lib/companies', () => ({
    getCompanyById: vi.fn((id) => {
        if (id === 'valid-company') {
            return { gdriveFolderId: 'mock-folder-id' };
        }
        return undefined;
    }),
}));

describe('POST /api/ingest/upload', () => {
    const validApiKey = 'test-api-key';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.APP_API_KEY = validApiKey;
    });

    it('should return 401 if authorization header is missing', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
        });
        // Mock formData to avoid parsing errors even though auth check is first
        request.formData = vi.fn().mockResolvedValue(new FormData());

        const response = await POST(request);
        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if authorization header is invalid', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer wrong-key',
            },
        });
        request.formData = vi.fn().mockResolvedValue(new FormData());

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it('should return 400 if no file is provided', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${validApiKey}`,
            },
        });
        const formData = new FormData();
        formData.append('company', 'valid-company');
        request.formData = vi.fn().mockResolvedValue(formData);

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('No file provided');
    });

    it('should return 400 if company is invalid', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${validApiKey}`,
            },
        });

        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        // Mock arrayBuffer
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', 'invalid-company');

        request.formData = vi.fn().mockResolvedValue(formData);

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid company');
    });

    it('should return 400 if file type is not allowed (security check)', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${validApiKey}`,
            },
        });

        const file = new File(['alert(1)'], 'malicious.js', { type: 'application/javascript' });
        // Mock arrayBuffer
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', 'valid-company');

        request.formData = vi.fn().mockResolvedValue(formData);

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Invalid file type');
    });

    it('should return 400 if file is too large (security check)', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${validApiKey}`,
            },
        });

        // Mock a large file by overriding size property if possible,
        // or just rely on our validation logic checking .size
        const file = new File([''], 'large.pdf', { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB
        // Mock arrayBuffer
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', 'valid-company');

        request.formData = vi.fn().mockResolvedValue(formData);

        const response = await POST(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('File too large');
    });

    it('should succeed for valid upload', async () => {
        const request = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${validApiKey}`,
            },
        });

        const file = new File(['valid content'], 'test.pdf', { type: 'application/pdf' });
        // Mock arrayBuffer
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', 'valid-company');

        request.formData = vi.fn().mockResolvedValue(formData);

        const response = await POST(request);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.fileId).toBe('mock-file-id');
    });
});
