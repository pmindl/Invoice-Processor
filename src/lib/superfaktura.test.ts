import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExpense } from './superfaktura';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('createExpense', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    it('should use invoice number as fallback for variable symbol', async () => {
        // Mock getClientByIco response (found client)
        fetchMock.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify({
                error: 0,
                data: [{ Client: { id: '999', ico: '12345678', name: 'Test Supplier' } }]
            })),
            ok: true
        });

        // Mock createExpense response
        fetchMock.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify({ error: 0, data: { Expense: { id: '123' } } })),
            ok: true
        });

        const mockInvoice = {
            supplier: { name: 'Test Supplier', ico: '12345678' },
            invoice: { number: 'INV-123', variable_symbol: '', date_issued: '2023-01-01', date_due: '2023-01-15', currency: 'CZK' },
            items: [{ name: 'Item 1', quantity: 1, unit_price: 100, vat_rate: 21 }],
            totals: { total: 121 }
        } as any;

        const result = await createExpense(mockInvoice, {} as any, 'test.pdf');

        if (result.error) {
            console.error('Test failed with error:', result.error);
        }

        expect(result.id).toBe('123');

        // Verify fetch call payload for expense creation
        // The second call to fetch should be /expenses/add
        expect(fetchMock).toHaveBeenCalledTimes(2);

        const expenseCall = fetchMock.mock.calls[1];
        expect(expenseCall[0]).toContain('/expenses/add');
        expect(expenseCall[1].body).toContain('"variable":"INV-123"');
    });

    it('should use variable symbol if present', async () => {
        // Mock getClientByIco response (found client)
        fetchMock.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify({
                error: 0,
                data: [{ Client: { id: '999', ico: '12345678', name: 'Test Supplier' } }]
            })),
            ok: true
        });

        // Mock createExpense response
        fetchMock.mockResolvedValueOnce({
            text: () => Promise.resolve(JSON.stringify({ error: 0, data: { Expense: { id: '456' } } })),
            ok: true
        });

        const mockInvoice = {
            supplier: { name: 'Test Supplier', ico: '12345678' },
            invoice: { number: 'INV-123', variable_symbol: 'VS-999', date_issued: '2023-01-01', date_due: '2023-01-15', currency: 'CZK' },
            items: [{ name: 'Item 1', quantity: 1, unit_price: 100, vat_rate: 21 }],
            totals: { total: 121 }
        } as any;

        const result = await createExpense(mockInvoice, {} as any, 'test.pdf');

        expect(result.id).toBe('456');

        // Verify fetch call payload
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const expenseCall = fetchMock.mock.calls[1];
        expect(expenseCall[1].body).toContain('"variable":"VS-999"');
    });
});
