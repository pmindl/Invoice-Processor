import dotenv from 'dotenv';
dotenv.config();

import { InvoiceService } from '../src/lib/services/invoice-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`>>> Starting Batch Processing Test via Service`);

    try {
        console.log('--- Step 1: Processing Companies (GDrive -> Gemini -> DB) ---');
        const processingSummary = await InvoiceService.processAllCompanies();
        console.log('Processing Summary:', JSON.stringify(processingSummary, null, 2));

        console.log('\n--- Step 2: Exporting Pending Invoices (DB -> SuperFaktura) ---');
        const exportSummary = await InvoiceService.exportPendingInvoices();
        console.log('Export Summary:', JSON.stringify(exportSummary, null, 2));

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
