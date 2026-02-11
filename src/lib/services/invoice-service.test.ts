import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvoiceService } from './invoice-service';
import { db } from '../db';
import { ParsedInvoice } from '../types';

// Mock dependencies
vi.mock('../gdrive', () => ({
    listFiles: vi.fn(),
    downloadFile: vi.fn()
}));

vi.mock('../gemini', () => ({
    parseInvoice: vi.fn()
}));

vi.mock('../superfaktura', () => ({
    checkDuplicate: vi.fn(),
    createExpense: vi.fn()
}));

vi.mock('../logger', () => ({
    logEvent: vi.fn()
}));

// Mock DB
vi.mock('../db', () => ({
    db: {
        invoice: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn()
        }
    }
}));

import { listFiles, downloadFile } from '../gdrive';
import { parseInvoice } from '../gemini';
import { checkDuplicate, createExpense } from '../superfaktura';

describe('InvoiceService', () => {
    const mockCompany = {
        id: 'test_company',
        name: 'Test Company',
        ico: '12345678',
        gdriveFolderId: 'folder_123',
        sfClientId: 'client_123',
        emailPatterns: ['test']
    };

    const mockFile = { id: 'file_123', name: 'invoice.pdf' };

    const mockParsedInvoice: ParsedInvoice = {
        is_invoice: true,
        confidence: 90,
        my_company_identifier: 'test_company',
        supplier: { name: 'Supplier', ico: '87654321', dic: 'CZ87654321' },
        buyer: { name: 'Buyer', ico: '12345678', dic: 'CZ12345678' },
        invoice: { number: 'INV-001', variable_symbol: '2023001', date_issued: '2023-01-01', date_due: '2023-01-14', currency: 'CZK' },
        items: [],
        totals: { subtotal: 100, vat: 21, total: 121 }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processCompany', () => {
        it('should process a new file successfully', async () => {
            // Setup Mocks
            (listFiles as any).mockResolvedValue([mockFile]);
            (db.invoice.findFirst as any).mockResolvedValue(null); // Not processed yet
            (downloadFile as any).mockResolvedValue({ buffer: Buffer.from('pdf'), mimeType: 'application/pdf' });
            (parseInvoice as any).mockResolvedValue(mockParsedInvoice);
            (db.invoice.create as any).mockResolvedValue({ id: 'inv_db_1', status: 'PENDING' });

            const result = await InvoiceService.processCompany(mockCompany);

            expect(listFiles).toHaveBeenCalledWith(mockCompany.gdriveFolderId);
            expect(downloadFile).toHaveBeenCalledWith(mockFile.id);
            expect(parseInvoice).toHaveBeenCalled();
            expect(db.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: 'PENDING',
                    invoiceNumber: 'INV-001',
                    variableSymbol: '2023001'
                })
            }));
            expect(result.processed).toBe(1);
        });

        it('should skip already processed files', async () => {
            (listFiles as any).mockResolvedValue([mockFile]);
            (db.invoice.findFirst as any).mockResolvedValue({ id: 'existing_1' }); // Already exists

            const result = await InvoiceService.processCompany(mockCompany);

            expect(downloadFile).not.toHaveBeenCalled();
            expect(result.skipped).toBe(1);
        });

        it('should handle duplicates found in local DB during processing', async () => {
            (listFiles as any).mockResolvedValue([mockFile]);
            (db.invoice.findFirst as any)
                .mockResolvedValueOnce(null) // Not processed file
                .mockResolvedValueOnce({ id: 'dup_1' }); // Found duplicate by ICO+Number

            (downloadFile as any).mockResolvedValue({ buffer: Buffer.from('pdf'), mimeType: 'application/pdf' });
            (parseInvoice as any).mockResolvedValue(mockParsedInvoice);
            (db.invoice.create as any).mockResolvedValue({ id: 'inv_db_2', status: 'DUPLICATE' });

            const result = await InvoiceService.processCompany(mockCompany);

            expect(db.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: 'DUPLICATE',
                    errorMessage: 'Duplicate in local DB'
                })
            }));
        });
    });

    describe('exportPendingInvoices', () => {
        it('should export pending invoices successfully', async () => {
            const mockPendingInvoice = {
                id: 'inv_1',
                company: 'test_company', // Must match ID in getCompanies() mock if we mocked it, but we only mocked the module import?
                // Actually InvoiceService imports getCompanies from '../companies'.
                // We didn't mock '../companies' above.
                // BUT config loads companies from env.
                // Let's assume getCompanies() works or mock it if needed.
                // Since we didn't mock it, it will try to run real logic.
                // But getCompanies depends on process.env.
                // For simplicity, let's mock getCompanies too or ensure env is set.
                variableSymbol: '2023001',
                rawJson: JSON.stringify(mockParsedInvoice),
                sourceFileName: 'invoice.pdf'
            };

            // We need to mock getCompanies to return our test company
            vi.mock('../companies', () => ({
                getCompanies: () => [{
                    id: 'test_company',
                    gdriveFolderId: 'folder_123',
                    // other fields...
                }]
            }));

            (db.invoice.findMany as any).mockResolvedValue([mockPendingInvoice]);
            (checkDuplicate as any).mockResolvedValue(false);
            (createExpense as any).mockResolvedValue({ id: 'sf_123' });

            const result = await InvoiceService.exportPendingInvoices();

            expect(checkDuplicate).toHaveBeenCalledWith('2023001');
            expect(createExpense).toHaveBeenCalled();
            expect(db.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'inv_1' },
                data: expect.objectContaining({
                    status: 'EXPORTED',
                    externalId: 'sf_123'
                })
            }));
            expect(result.exported).toBe(1);
        });

        it('should handle SF duplicates during export', async () => {
             const mockPendingInvoice = {
                id: 'inv_2',
                company: 'test_company',
                variableSymbol: '2023002',
                rawJson: JSON.stringify(mockParsedInvoice)
            };

            (db.invoice.findMany as any).mockResolvedValue([mockPendingInvoice]);
            (checkDuplicate as any).mockResolvedValue(true); // Is duplicate

            const result = await InvoiceService.exportPendingInvoices();

            expect(createExpense).not.toHaveBeenCalled();
            expect(db.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'inv_2' },
                data: expect.objectContaining({
                    status: 'DUPLICATE'
                })
            }));
            expect(result.skipped).toBe(1);
        });
    });
});
