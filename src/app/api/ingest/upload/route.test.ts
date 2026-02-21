import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';

vi.mock('@/lib/gdrive', () => ({
    uploadFile: vi.fn(),
}));

vi.mock('@/lib/companies', () => ({
    getCompanyById: vi.fn(),
}));

describe('POST /api/ingest/upload', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.APP_API_KEY = 'test-api-key';
    });

    const createRequest = (file: any, companyId: string, authHeader = 'Bearer test-api-key') => {
        const formData = {
            get: (key: string) => {
                if (key === 'file') return file;
                if (key === 'company') return companyId;
                return null;
            }
        };

        return {
            headers: {
                get: (name: string) => name === 'authorization' ? authHeader : null
            },
            formData: async () => formData
        } as unknown as Request;
    };

    const createMockFile = (name: string, type: string, size: number) => ({
        name,
        type,
        size,
        arrayBuffer: async () => new ArrayBuffer(size)
    });

    it('returns 401 if unauthorized', async () => {
        const req = createRequest(null, '123', 'Bearer wrong-key');
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 400 for invalid file type', async () => {
        const file = createMockFile('test.exe', 'application/x-exe', 1024);
        (getCompanyById as any).mockReturnValue({ id: '123', gdriveFolderId: 'folder123' });

        const req = createRequest(file, '123');
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Invalid file type');
    });

    it('returns 400 for oversized file', async () => {
        const file = createMockFile('large.pdf', 'application/pdf', 11 * 1024 * 1024);
        (getCompanyById as any).mockReturnValue({ id: '123', gdriveFolderId: 'folder123' });

        const req = createRequest(file, '123');
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('File size exceeds');
    });

    it('sanitizes filename and accepts valid file', async () => {
        const file = createMockFile('../../etc/passwd.pdf', 'application/pdf', 1024);
        (getCompanyById as any).mockReturnValue({ id: '123', gdriveFolderId: 'folder123' });
        (uploadFile as any).mockResolvedValue('new-file-id');

        const req = createRequest(file, '123');
        const res = await POST(req);

        expect(res.status).toBe(200);

        expect(uploadFile).toHaveBeenCalledWith(
            'passwd.pdf', // Sanitized name
            'application/pdf',
            expect.any(Buffer),
            'folder123'
        );
    });
});
