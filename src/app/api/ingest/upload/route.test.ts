import { expect, test, vi, describe, beforeEach } from 'vitest';
import { POST } from './route';

// Mock gdrive upload
vi.mock('@/lib/gdrive', () => ({
  uploadFile: vi.fn().mockResolvedValue('mock-file-id'),
}));

// Mock companies config
vi.mock('@/lib/companies', () => ({
  getCompanyById: vi.fn((id) => {
    if (id === 'test-company') {
      return { id: 'test-company', gdriveFolderId: 'folder-id' };
    }
    return undefined;
  }),
}));

describe('POST /api/ingest/upload', () => {
  const apiKey = 'test-api-key';
  process.env.APP_API_KEY = apiKey;

  // Helper to create requests with mocked FormData
  const createRequest = (file: File, company: string, authHeader: string | null = `Bearer ${apiKey}`) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company', company);

    // Mock request.formData() because JSDOM Request implementation might handle it differently
    const req = new Request('http://localhost/api/ingest/upload', {
      method: 'POST',
      headers: authHeader ? { 'authorization': authHeader } : {},
    });

    // Override formData method
    req.formData = async () => formData;

    return req;
  };

  test('should upload valid PDF file', async () => {
    // Note: in JSDOM environment, File might need arrayBuffer mock if not implemented
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    // Mock arrayBuffer since it's used in the route
    file.arrayBuffer = async () => new ArrayBuffer(8);

    const req = createRequest(file, 'test-company');
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.fileId).toBe('mock-file-id');
  });

  test('should reject unauthorized request', async () => {
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const req = createRequest(file, 'test-company', 'Bearer wrong-key');
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  test('should reject invalid company', async () => {
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const req = createRequest(file, 'invalid-company');
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  // These tests are expected to FAIL initially or pass if logic is missing (depending on expectation)
  // For now I'm adding them to demonstrate what we WANT to happen.

  test('should reject invalid file type (exe)', async () => {
    const file = new File(['evil content'], 'malware.exe', { type: 'application/x-msdownload' });
    file.arrayBuffer = async () => new ArrayBuffer(8);

    const req = createRequest(file, 'test-company');
    const res = await POST(req);

    // Expectation: Should fail with 400
    // Current reality: Will probably pass (200)
    if (res.status === 200) {
        console.log('VULNERABILITY CONFIRMED: Allowed .exe file upload');
    }
    expect(res.status).toBe(400);
  });

  test('should sanitize filename', async () => {
    const file = new File(['content'], '../../etc/passwd.pdf', { type: 'application/pdf' });
    file.arrayBuffer = async () => new ArrayBuffer(8);

    const req = createRequest(file, 'test-company');
    const res = await POST(req);

    // Expectation: Should pass but filename used should be sanitized
    // Current reality: It passes with original filename
    expect(res.status).toBe(200);

    const { uploadFile } = await import('@/lib/gdrive');
    const calls = (uploadFile as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    // We expect the filename (first arg) to NOT contain path traversal
    expect(lastCall[0]).not.toContain('..');
    expect(lastCall[0]).not.toContain('/');
  });

  test('should reject large files (>10MB)', async () => {
     // Mock a large file size check
     // Since we can't easily create a 10MB buffer in test without memory issues,
     // we rely on the validation logic checking file.size or buffer.length

     const file = new File(['a'.repeat(1024)], 'large.pdf', { type: 'application/pdf' });
     // Mock a large buffer length property without allocating it
     const largeBuffer = { length: 11 * 1024 * 1024 } as unknown as Buffer;

     // We need to spy on Buffer.from or just mock arrayBuffer to return something that results in large buffer
     // But in the code: const buffer = Buffer.from(await file.arrayBuffer());

     // Let's create a proxy for the file to return a large buffer length?
     // Or we can just trust that we will implement the check on `file.size` before reading buffer.

     Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
     file.arrayBuffer = async () => new ArrayBuffer(10); // Small buffer but size property says large

     const req = createRequest(file, 'test-company');
     const res = await POST(req);

     expect(res.status).toBe(400);
  });
});
