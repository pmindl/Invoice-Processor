import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest, NextResponse } from 'next/server';

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

// Helper to create request with form data
const createRequest = (file: File | null, companyId: string | null, apiKey: string | null) => {
  const req = new NextRequest('http://localhost:3000/api/ingest/upload', {
    method: 'POST',
    headers: apiKey ? { 'authorization': `Bearer ${apiKey}` } : {},
  });

  // Mock formData() method directly to avoid JSDOM/Node FormData incompatibility
  req.formData = vi.fn().mockResolvedValue({
    get: (key: string) => {
      if (key === 'file') return file;
      if (key === 'company') return companyId;
      return null;
    }
  });

  return req;
};

describe('POST /api/ingest/upload', () => {
  const validApiKey = 'test-api-key';

  beforeEach(() => {
    process.env.APP_API_KEY = validApiKey;
    vi.clearAllMocks();
  });

  it('should return 401 if API key is missing', async () => {
    const req = createRequest(null, null, null);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 401 if API key is invalid', async () => {
    const req = createRequest(null, null, 'invalid-key');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 if no file provided', async () => {
    const req = createRequest(null, 'valid-company', validApiKey);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No file provided');
  });

  it('should return 400 if file type is invalid', async () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const req = createRequest(file, 'valid-company', validApiKey);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('should return 400 if file is too large', async () => {
    const file = new File(['content'], 'large.pdf', { type: 'application/pdf' });
    // Since we mock formData directly, we can just define size property on the file object
    // without worrying about serialization resetting it.
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const req = createRequest(file, 'valid-company', validApiKey);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('File too large (max 10MB)');
  });

  it('should sanitize filename if it contains invalid characters', async () => {
    const file = new File(['content'], '../../malicious/file.pdf', { type: 'application/pdf' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const req = createRequest(file, 'valid-company', validApiKey);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const { uploadFile } = await import('@/lib/gdrive');
    const calledName = vi.mocked(uploadFile).mock.calls[0][0];

    // Expect sanitized name: ......malicious_file.pdf or similar (underscores)
    // Original: ../../malicious/file.pdf
    // Sanitized: .._.._malicious_file.pdf
    expect(calledName).not.toContain('/');
    expect(calledName).not.toContain('\\');
    expect(calledName).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('should return success for valid file', async () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    const req = createRequest(file, 'valid-company', validApiKey);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.fileId).toBe('mock-file-id');
  });
});
