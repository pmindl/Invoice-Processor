import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';
import { validateFile } from '@/lib/security';

// Mock dependencies
vi.mock('@/lib/gdrive', () => ({
    uploadFile: vi.fn().mockResolvedValue('mock-file-id'),
}));

vi.mock('@/lib/companies', () => ({
    getCompanyById: vi.fn(),
    getCompanies: vi.fn(),
}));

// Mock security, but keep secureCompare real (or mock if needed, but it's pure logic)
// We mock validateFile to test route response on validation failure easily
vi.mock('@/lib/security', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/security')>();
    return {
        ...actual,
        validateFile: vi.fn().mockReturnValue({ valid: true }),
    };
});

// Mock process.env
const originalEnv = process.env;

describe('POST /api/ingest/upload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, APP_API_KEY: 'test-api-key' };
    });

    // Helper to create request with mocked formData
    const createRequest = (file: File | null, companyId: string | null, authKey = 'test-api-key') => {
        const req = new Request('http://localhost/api/ingest/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authKey}`,
            },
        });

        // Mock formData() method directly on the request instance
        req.formData = vi.fn().mockResolvedValue({
            get: (key: string) => {
                if (key === 'file') return file;
                if (key === 'company') return companyId;
                return null;
            }
        });

        return req;
    };

    it('returns 401 if unauthorized', async () => {
        const req = createRequest(null, null, 'wrong-key');
        const response = await POST(req);
        expect(response.status).toBe(401);
    });

    it('returns 400 if file is missing', async () => {
        const req = createRequest(null, 'comp-1');
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('No file provided');
    });

    it('returns 400 if validation fails', async () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

        // Mock validation failure
        vi.mocked(validateFile).mockReturnValue({ valid: false, error: 'Custom Validation Error' });

        const req = createRequest(file, 'comp-1');
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Custom Validation Error');
    });

    it('sanitizes filename and uploads valid file', async () => {
        const filename = 'unsafe/..\\name.pdf';
        const file = new File(['valid content'], filename, { type: 'application/pdf' });
        // Mock arrayBuffer to ensure consistent buffer creation
        const buffer = new Uint8Array([1, 2, 3]).buffer;
        file.arrayBuffer = async () => buffer;

        // Mock validation success
        vi.mocked(validateFile).mockReturnValue({ valid: true });

        // Mock company found
        vi.mocked(getCompanyById).mockReturnValue({ gdriveFolderId: 'folder-123' } as any);

        const req = createRequest(file, 'comp-1');
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.fileId).toBe('mock-file-id');

        // Verify uploadFile called with sanitized name
        expect(uploadFile).toHaveBeenCalledWith(
            'name.pdf',
            'application/pdf',
            expect.any(Buffer),
            'folder-123'
        );
    });
});
