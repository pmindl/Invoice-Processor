import { db } from '../db';
import { getCompanies } from '../companies';
import { listFiles, downloadFile } from '../gdrive';
import { parseInvoice } from '../gemini';
import { CompanyConfig } from '../types';
import { logEvent } from '../logger';
import { createExpense, checkDuplicate } from '../superfaktura';

export const InvoiceService = {
    async processCompany(company: CompanyConfig) {
        const results = { processed: 0, skipped: 0, errors: 0 };
        const errors: any[] = [];

        try {
            const files = await listFiles(company.gdriveFolderId);

            for (const file of files) {
                if (!file.id || !file.name) continue;

                // 1. Check if already processed
                const existing = await db.invoice.findFirst({
                    where: { sourceFileId: file.id }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                console.log(`Processing file: ${file.name} (${file.id})`);
                await logEvent(db, 'INFO', 'API', `Starting processing for ${file.name}`, { fileId: file.id });

                try {
                    // 2. Download
                    const { buffer, mimeType } = await downloadFile(file.id);

                    // 3. AI Parse
                    let textOrImage: string | Buffer = buffer;
                    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
                        textOrImage = buffer.toString('utf-8');
                    }

                    const parsed = await parseInvoice(textOrImage, mimeType);
                    await logEvent(db, 'INFO', 'Gemini', `Parsed ${file.name}`, { confidence: parsed.confidence });

                    // 5. Logic checks
                    let status = 'PENDING';
                    let errorMessage = '';

                    if (!parsed.is_invoice) {
                        status = 'SKIPPED';
                        errorMessage = 'Not recognized as invoice';
                        await logEvent(db, 'WARN', 'API', `Skipped ${file.name}: Not an invoice`, null);
                    } else if (parsed.confidence < 60) {
                        status = 'SKIPPED';
                        errorMessage = `Low confidence: ${parsed.confidence}%`;
                        await logEvent(db, 'WARN', 'API', `Skipped ${file.name}: Low confidence`, { confidence: parsed.confidence });
                    }

                    // 6. External Duplicate Check
                    if (status === 'PENDING' && parsed.invoice.variable_symbol) {
                        const dbDup = await db.invoice.findFirst({
                            where: {
                                supplierIco: parsed.supplier.ico,
                                invoiceNumber: parsed.invoice.number
                            }
                        });
                        if (dbDup) {
                            status = 'DUPLICATE';
                            errorMessage = 'Duplicate in local DB';
                            await logEvent(db, 'WARN', 'API', `Duplicate in DB: ${parsed.invoice.variable_symbol}`, null);
                        }
                    }

                    // 7. Save to DB
                    const newInvoice = await db.invoice.create({
                        data: {
                            status,
                            company: company.id,
                            supplierName: parsed.supplier.name || 'Unknown',
                            supplierIco: parsed.supplier.ico,
                            supplierDic: parsed.supplier.dic,
                            invoiceNumber: parsed.invoice.number || 'UNKNOWN',
                            variableSymbol: parsed.invoice.variable_symbol,
                            dateIssued: parsed.invoice.date_issued,
                            dateDue: parsed.invoice.date_due,
                            total: parsed.totals.total || 0,
                            currency: parsed.invoice.currency || 'CZK',
                            sourceType: 'GDRIVE',
                            sourceFileId: file.id,
                            sourceFileName: file.name,
                            rawJson: JSON.stringify(parsed),
                            errorMessage: errorMessage || null,
                            confidence: parsed.confidence || 0,
                        }
                    });

                    if (status === 'PENDING') {
                        await logEvent(db, 'INFO', 'API', `Invoice created and pending export: ${newInvoice.id}`, null, newInvoice.id);
                    }

                    results.processed++;

                } catch (err) {
                    console.error(`Error processing file ${file.id}:`, err);
                    await logEvent(db, 'ERROR', 'API', `Error processing ${file.name}`, { error: (err as Error).message });
                    errors.push({ fileId: file.id, error: (err as Error).message });

                    try {
                        await db.invoice.create({
                            data: {
                                status: 'EXPORT_ERROR',
                                company: company.id,
                                supplierName: 'ERROR',
                                invoiceNumber: `ERR-${Date.now()}`,
                                total: 0,
                                sourceType: 'GDRIVE',
                                sourceFileId: file.id,
                                sourceFileName: file.name,
                                rawJson: '{}',
                                errorMessage: (err as Error).message,
                            }
                        });
                    } catch (dbErr) {
                         console.error('Failed to log error to DB:', dbErr);
                    }
                    results.errors++;
                }
            }
        } catch (error) {
            console.error(`Error listing files for ${company.id}:`, error);
             errors.push({ companyId: company.id, error: (error as Error).message });
             results.errors++;
        }

        return { ...results, errors };
    },

    async processAllCompanies() {
        const companies = getCompanies();
        const summary: Record<string, any> = {};

        for (const company of companies) {
            if (company.gdriveFolderId) {
                summary[company.id] = await this.processCompany(company);
            }
        }
        return summary;
    },

    async exportPendingInvoices() {
         const results = { exported: 0, skipped: 0, errors: 0 };

         try {
            const pending = await db.invoice.findMany({
                where: { status: 'PENDING' },
                take: 50 // Batch size
            });

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

                try {
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

                    const fullInvoiceData = JSON.parse(invoice.rawJson);
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
                } catch (err) {
                     console.error(`Error exporting invoice ${invoice.id}:`, err);
                      await db.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            status: 'EXPORT_ERROR',
                            errorMessage: (err as Error).message
                        }
                    });
                    results.errors++;
                }

            }
        } catch (error) {
             console.error("Fatal error in export:", error);
             throw error;
        }

        return results;
    }
};
