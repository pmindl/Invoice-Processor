import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/gdrive', () => ({
    uploadFile: vi.fn().mockResolvedValue('mock-file-id'),
}));

vi.mock('@/lib/companies', () => ({
    getCompanyById: vi.fn((id) => {
        if (id === 'test-company') {
            return { id: 'test-company', gdriveFolderId: 'folder-123' };
        }
        return undefined;
    }),
    getCompanies: vi.fn(),
}));

describe('POST /api/ingest/upload', () => {
    const validApiKey = 'test-api-key';

    beforeEach(() => {
        process.env.APP_API_KEY = validApiKey;
        vi.clearAllMocks();
    });

    it('should return 401 if unauthorized', async () => {
        const req = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should return 401 if invalid api key', async () => {
        const req = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer wrong-key' }
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should upload file if valid request', async () => {
        const formData = new FormData();
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

        // JSDOM File usually works, but sometimes lacks arrayBuffer in older versions or setups.
        // We'll see if it works.
        Object.defineProperty(file, 'arrayBuffer', {
            value: async () => new ArrayBuffer(8),
        });

        formData.append('file', file);
        formData.append('company', 'test-company');

        const req = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${validApiKey}` },
        });

        // Mock formData() on the request instance
        req.formData = async () => formData;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data).toEqual({ success: true, fileId: 'mock-file-id' });
    });

    it('should reject invalid file type', async () => {
        const formData = new FormData();
        const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });

        Object.defineProperty(file, 'arrayBuffer', {
            value: async () => new ArrayBuffer(8),
        });

        formData.append('file', file);
        formData.append('company', 'test-company');

        const req = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${validApiKey}` },
        });

        req.formData = async () => formData;

        const res = await POST(req);
        expect(res.status).toBe(400);
        // This test is expected to FAIL initially (or pass with 200, which is bad) until we implement validation
    });
});
