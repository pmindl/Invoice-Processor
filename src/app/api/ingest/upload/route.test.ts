import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/gdrive', () => ({
    uploadFile: vi.fn().mockResolvedValue('mock-file-id')
}));

vi.mock('@/lib/companies', () => ({
    getCompanyById: vi.fn((id) => {
        if (id === '1') return { gdriveFolderId: 'folder-123' };
        return undefined;
    }),
    getCompanies: vi.fn()
}));

describe('Upload API', () => {
    beforeEach(() => {
        process.env.APP_API_KEY = 'test-api-key';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should upload valid file', async () => {
        const formData = new FormData();
        const file = new File(['dummy content'], 'invoice.pdf', { type: 'application/pdf' });

        // JSDOM File might not have arrayBuffer, let's patch it if needed or assume it works
        if (!file.arrayBuffer) {
            file.arrayBuffer = async () => new ArrayBuffer(0);
        }

        formData.append('file', file);
        formData.append('company', '1');

        const req = {
            headers: new Headers({ 'Authorization': 'Bearer test-api-key' }),
            formData: async () => formData
        } as unknown as Request;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.fileId).toBe('mock-file-id');
    });

    it('should reject invalid file size', async () => {
        const formData = new FormData();
        // Create a large string
        const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
        const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
        formData.append('file', file);
        formData.append('company', '1');

        const req = {
            headers: new Headers({ 'Authorization': 'Bearer test-api-key' }),
            formData: async () => formData
        } as unknown as Request;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain('size exceeds');
    });

    it('should reject invalid file type', async () => {
        const formData = new FormData();
        const file = new File(['content'], 'virus.exe', { type: 'application/x-msdownload' });
        formData.append('file', file);
        formData.append('company', '1');

        const req = {
            headers: new Headers({ 'Authorization': 'Bearer test-api-key' }),
            formData: async () => formData
        } as unknown as Request;

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should sanitize filename', async () => {
        const { uploadFile } = await import('@/lib/gdrive');

        const formData = new FormData();
        const file = new File(['content'], '../hack.pdf', { type: 'application/pdf' });
        if (!file.arrayBuffer) {
            file.arrayBuffer = async () => new ArrayBuffer(0);
        }
        formData.append('file', file);
        formData.append('company', '1');

        const req = {
            headers: new Headers({ 'Authorization': 'Bearer test-api-key' }),
            formData: async () => formData
        } as unknown as Request;

        const res = await POST(req);
        if (res.status !== 200) {
            console.log('Error response:', await res.json());
        }

        expect(uploadFile).toHaveBeenCalledWith(
            'hack.pdf', // Sanitized name
            'application/pdf',
            expect.any(Buffer),
            'folder-123'
        );
    });

    it('should reject missing auth', async () => {
        const req = {
            headers: new Headers(),
        } as unknown as Request;

        const res = await POST(req);
        expect(res.status).toBe(401);
    });
});
