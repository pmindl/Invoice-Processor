import { NextResponse } from 'next/server';
import { checkEmails } from '@/lib/gmail';
import { secureCompare } from '@/lib/security';

export const dynamic = 'force-dynamic'; // Ensure this route is never cached

export async function GET(request: Request) {
    const apiKey = process.env.APP_API_KEY;
    if (!apiKey) {
        console.error('APP_API_KEY environment variable is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Simple API key check for cron usage using secure comparison
    const authHeader = request.headers.get('authorization') || '';
    const expectedAuth = `Bearer ${apiKey}`;

    if (!secureCompare(authHeader, expectedAuth)) {
        // Also check query param for easier manual testing
        const { searchParams } = new URL(request.url);
        const queryKey = searchParams.get('key') || '';
        if (!secureCompare(queryKey, apiKey)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const results = await checkEmails();
        return NextResponse.json({ success: true, processed: results.length, details: results });
    } catch (error) {
        console.error('Email ingestion error:', error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
