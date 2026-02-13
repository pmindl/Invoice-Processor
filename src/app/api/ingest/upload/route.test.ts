import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/gdrive', () => ({
    uploadFile: vi.fn().mockResolvedValue('mock-file-id'),
}));

vi.mock('@/lib/companies', () => ({
    getCompanyById: vi.fn((id) => {
        if (id === 'valid-company') {
            return { id: 'valid-company', gdriveFolderId: 'folder-id' };
        }
        return undefined;
    }),
}));

// Helper to create mock request
function createMockRequest(headers: Record<string, string>, formData: Record<string, any>) {
    return {
        headers: {
            get: (key: string) => headers[key.toLowerCase()] || null,
        },
        formData: async () => ({
            get: (key: string) => formData[key] || null,
        }),
    } as unknown as Request;
}

describe('POST /api/ingest/upload', () => {
    const API_KEY = 'test-api-key';

    beforeEach(() => {
        vi.stubEnv('APP_API_KEY', API_KEY);
        vi.clearAllMocks();
    });

    it('should return 401 if unauthorized', async () => {
        const req = createMockRequest({ authorization: 'Bearer wrong-key' }, {});
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should return 400 if no file provided', async () => {
        const req = createMockRequest({ authorization: `Bearer ${API_KEY}` }, {
            company: 'valid-company'
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('No file provided');
    });

    it('should return 400 if file is too large (>10MB)', async () => {
        const largeFile = {
            size: 11 * 1024 * 1024, // 11MB
            type: 'application/pdf',
            name: 'large.pdf',
            arrayBuffer: async () => new ArrayBuffer(0) // content doesn't matter for size check logic
        };

        const req = createMockRequest({ authorization: `Bearer ${API_KEY}` }, {
            file: largeFile,
            company: 'valid-company'
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/File too large/);
    });

    it('should return 400 if file type is invalid', async () => {
        const invalidFile = {
            size: 1024,
            type: 'text/plain',
            name: 'test.txt',
            arrayBuffer: async () => new ArrayBuffer(0)
        };

        const req = createMockRequest({ authorization: `Bearer ${API_KEY}` }, {
            file: invalidFile,
            company: 'valid-company'
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid file type/);
    });

    it('should sanitize filename and upload successfully', async () => {
        const maliciousFile = {
            size: 1024,
            type: 'application/pdf',
            name: '../../etc/passwd.pdf',
            arrayBuffer: async () => new ArrayBuffer(0)
        };

        const req = createMockRequest({ authorization: `Bearer ${API_KEY}` }, {
            file: maliciousFile,
            company: 'valid-company'
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const { uploadFile } = await import('@/lib/gdrive');

        // Expect sanitized filename
        // Regex used: /[^a-zA-Z0-9.\-_]/g -> _
        // ../../etc/passwd.pdf -> .._.._etc_passwd.pdf

        expect(uploadFile).toHaveBeenCalledWith(
            expect.stringContaining('.._.._etc_passwd.pdf'),
            'application/pdf',
            expect.anything(),
            'folder-id'
        );

        // Ensure no slashes
        expect(uploadFile).toHaveBeenCalledWith(
            expect.not.stringContaining('/'),
            'application/pdf',
            expect.anything(),
            'folder-id'
        );
    });
});
