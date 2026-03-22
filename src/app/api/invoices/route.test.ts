import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from './route';

vi.mock('@/lib/db', () => ({
  db: {
    invoice: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: '1', status: 'UPDATED' }),
    },
  },
}));

describe('Invoices API Route Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, APP_API_KEY: 'test-secret-key' };
  });

  describe('GET /api/invoices', () => {
    it('returns 500 if APP_API_KEY is missing', async () => {
      delete process.env.APP_API_KEY;
      const request = new Request('http://localhost/api/invoices');
      const response = await GET(request);
      expect(response.status).toBe(500);
    });

    it('returns 401 if missing auth header', async () => {
      const request = new Request('http://localhost/api/invoices');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns 401 if invalid auth header', async () => {
      const request = new Request('http://localhost/api/invoices', {
        headers: { authorization: 'Bearer wrong-key' },
      });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns 200 if valid auth header', async () => {
      const request = new Request('http://localhost/api/invoices', {
        headers: { authorization: 'Bearer test-secret-key' },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('returns 200 if valid x-api-key header', async () => {
      const request = new Request('http://localhost/api/invoices', {
        headers: { 'x-api-key': 'test-secret-key' },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/invoices', () => {
    it('returns 500 if APP_API_KEY is missing', async () => {
      delete process.env.APP_API_KEY;
      const request = new Request('http://localhost/api/invoices', { method: 'PATCH' });
      const response = await PATCH(request);
      expect(response.status).toBe(500);
    });

    it('returns 401 if missing auth header', async () => {
      const request = new Request('http://localhost/api/invoices', { method: 'PATCH' });
      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('returns 401 if invalid auth header', async () => {
      const request = new Request('http://localhost/api/invoices', {
        method: 'PATCH',
        headers: { authorization: 'Bearer wrong-key' },
      });
      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('returns 200 if valid auth header with valid body', async () => {
      const request = new Request('http://localhost/api/invoices', {
        method: 'PATCH',
        headers: {
            authorization: 'Bearer test-secret-key',
            'content-type': 'application/json'
        },
        body: JSON.stringify({ id: '1', status: 'PAID' })
      });
      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });
  });
});
