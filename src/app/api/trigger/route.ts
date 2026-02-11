import { NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice-service';

// Proxy route to trigger protected actions from the dashboard without exposing keys to client
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const apiKey = process.env.APP_API_KEY || '';

    // NOTE: This route is unprotected from the client side if not careful.
    // Ideally, it should check a session or cookie if called from the browser.
    // For now, we assume it's protected by network or simple obscured logic as per original design.

    try {
        let result;
        if (action === 'process') {
            console.log("Triggering Process via Service...");
            result = await InvoiceService.processAllCompanies();
        } else if (action === 'export') {
            console.log("Triggering Export via Service...");
            result = await InvoiceService.exportPendingInvoices();
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true, result });
    } catch (err) {
        console.error('Trigger Error:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
