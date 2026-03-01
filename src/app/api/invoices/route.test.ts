import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, PATCH } from './route';

// Mock dependencies
vi.mock('@/lib/db', () => ({
    db: {
        invoice: {
            findMany: vi.fn().mockResolvedValue([{ id: '1', status: 'PENDING' }]),
            update: vi.fn().mockResolvedValue({ id: '1', status: 'PROCESSED' }),
        }
    }
}));

describe('Invoices API Security', () => {
    const mockRequest = (method: string, authHeader: string | null, body?: any) => {
        const headers = new Headers();
        if (authHeader) headers.set('authorization', authHeader);

        return new Request(`http://localhost/api/invoices${method === 'GET' ? '?status=PENDING' : ''}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    };

    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, APP_API_KEY: 'test-secret-key' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('GET /api/invoices', () => {
        it('should return 401 if missing auth header', async () => {
            const req = mockRequest('GET', null);
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it('should return 401 if auth header is incorrect', async () => {
            const req = mockRequest('GET', 'Bearer wrong-key');
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it('should return 200 with correct auth header', async () => {
            const req = mockRequest('GET', 'Bearer test-secret-key');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual([{ id: '1', status: 'PENDING' }]);
        });

        it('should return 500 if APP_API_KEY is not set', async () => {
            delete process.env.APP_API_KEY;
            const req = mockRequest('GET', 'Bearer anything');
            const res = await GET(req);
            expect(res.status).toBe(500);
        });
    });

    describe('PATCH /api/invoices', () => {
        const body = { id: '1', status: 'PROCESSED' };

        it('should return 401 if missing auth header', async () => {
            const req = mockRequest('PATCH', null, body);
            const res = await PATCH(req);
            expect(res.status).toBe(401);
        });

        it('should return 401 if auth header is incorrect', async () => {
            const req = mockRequest('PATCH', 'Bearer wrong-key', body);
            const res = await PATCH(req);
            expect(res.status).toBe(401);
        });

        it('should return 200 with correct auth header', async () => {
            const req = mockRequest('PATCH', 'Bearer test-secret-key', body);
            const res = await PATCH(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({ id: '1', status: 'PROCESSED' });
        });

        it('should return 500 if APP_API_KEY is not set', async () => {
            delete process.env.APP_API_KEY;
            const req = mockRequest('PATCH', 'Bearer anything', body);
            const res = await PATCH(req);
            expect(res.status).toBe(500);
        });
    });
});
