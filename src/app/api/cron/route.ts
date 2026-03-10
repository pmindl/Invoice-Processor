import { NextResponse } from 'next/server';
import { secureCompare } from '@/lib/security';

export async function GET(request: Request) {
    if (!process.env.APP_API_KEY) {
        console.error('CRITICAL: APP_API_KEY is not set in environment.');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const providedToken = authHeader?.replace('Bearer ', '');
    const { searchParams } = new URL(request.url);
    const providedQueryKey = searchParams.get('key');

    const isValidToken = secureCompare(providedToken, process.env.APP_API_KEY);
    const isValidQuery = secureCompare(providedQueryKey, process.env.APP_API_KEY);

    if (!isValidToken && !isValidQuery) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        scheduler: 'active',
        time: new Date().toISOString()
    });
}
