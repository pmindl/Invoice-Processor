import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCompanies } from '@/lib/companies';
import { createExpense, checkDuplicate } from '@/lib/superfaktura';
import { secureCompare } from '@/lib/security';

export const maxDuration = 60;

export async function POST(request: Request) {
    const apiKey = process.env.APP_API_KEY;
    if (!apiKey) {
        console.error('APP_API_KEY environment variable is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const expectedAuth = `Bearer ${apiKey}`;

    if (!secureCompare(authHeader, expectedAuth)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Get pending invoices
        const pending = await db.invoice.findMany({
            where: { status: 'PENDING' },
            take: 50 // Batch size
        });

        const results = { exported: 0, skipped: 0, errors: 0 };

        for (const invoice of pending) {
            const company = getCompanies().find(c => c.id === invoice.company);
            if (!company) {
                await db.invoice.update({
                    where: { id: invoice.id },
                    data: { status: 'EXPORT_ERROR', errorMessage: 'Company config missing' }
                });
                results.errors++;
                continue;
            }

            // Check external duplicate (SuperFaktura)
            if (invoice.variableSymbol) {
                const isDup = await checkDuplicate(invoice.variableSymbol);
                if (isDup) {
                    await db.invoice.update({
                        where: { id: invoice.id },
                        data: { status: 'DUPLICATE', errorMessage: 'Exists in SuperFaktura' }
                    });
                    results.skipped++;
                    continue;
                }
            }

            // Parse raw JSON to reconstruct full object for payload
            const fullInvoiceData = JSON.parse(invoice.rawJson);

            // Create Expense
            const res = await createExpense(fullInvoiceData, company, invoice.sourceFileName);

            if (res.id) {
                await db.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: 'EXPORTED',
                        externalId: res.id,
                        exportedAt: new Date()
                    }
                });
                results.exported++;
            } else {
                await db.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: 'EXPORT_ERROR',
                        errorMessage: res.error || 'Unknown error'
                    }
                });
                results.errors++;
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('Export API error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
