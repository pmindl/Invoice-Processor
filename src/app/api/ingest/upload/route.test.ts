import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/gdrive', () => ({
  uploadFile: vi.fn().mockResolvedValue('mock-file-id'),
}));

vi.mock('@/lib/companies', () => ({
  getCompanyById: vi.fn((id) => {
    if (id === 'test-company') {
      return {
        id: 'test-company',
        gdriveFolderId: 'mock-folder-id',
      };
    }
    return undefined;
  }),
}));

// Mock process.env
const ORIGINAL_ENV = process.env;

describe('POST /api/ingest/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, APP_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should upload a valid file successfully', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], 'invoice.pdf', { type: 'application/pdf' });
    formData.append('file', file);
    formData.append('company', 'test-company');

    const req = new Request('http://localhost/api/ingest/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-key',
      },
      body: formData,
    });

    req.formData = async () => formData;
    file.arrayBuffer = async () => new ArrayBuffer(10);

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, fileId: 'mock-file-id' });
  });

  it('should reject invalid authorization', async () => {
    const req = new Request('http://localhost/api/ingest/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong-key',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should reject file too large', async () => {
    const formData = new FormData();
    // Create a large file (11MB)
    const largeContent = new ArrayBuffer(11 * 1024 * 1024);
    const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
    formData.append('file', file);
    formData.append('company', 'test-company');

    const req = new Request('http://localhost/api/ingest/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-key',
      },
      body: formData,
    });
    req.formData = async () => formData;
    file.arrayBuffer = async () => largeContent;

    // Define property getter for size if it's not set correctly by File constructor in this env
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('should reject invalid mime type', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], 'malware.exe', { type: 'application/x-msdownload' });
    formData.append('file', file);
    formData.append('company', 'test-company');

    const req = new Request('http://localhost/api/ingest/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-key',
      },
      body: formData,
    });
    req.formData = async () => formData;
    file.arrayBuffer = async () => new ArrayBuffer(10);

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('should sanitize filename', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], '../../etc/passwd', { type: 'application/pdf' });
    formData.append('file', file);
    formData.append('company', 'test-company');

    const req = new Request('http://localhost/api/ingest/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-key',
      },
      body: formData,
    });
    req.formData = async () => formData;
    file.arrayBuffer = async () => new ArrayBuffer(10);

    const res = await POST(req);

    // It might fail with 400 if we check for sanitization failure,
    // OR succeed with 200 but sanitized name.
    // The current implementation uses the name directly, so it will pass with malicious name.
    // The test expects that `uploadFile` is called with sanitized name.

    expect(res.status).toBe(200);

    const { uploadFile } = await import('@/lib/gdrive');
    expect(uploadFile).toHaveBeenCalledWith(
        expect.not.stringContaining('..'),
        expect.any(String),
        expect.any(Buffer),
        expect.any(String)
    );
  });
});
