import { NextResponse } from 'next/server';
import { secureCompare } from '@/lib/security';

export async function GET(request: Request) {
    if (!process.env.APP_API_KEY) {
        console.error('CRITICAL: APP_API_KEY is not defined in the environment.');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get('key');

    const isValidHeader = authHeader ? secureCompare(authHeader, `Bearer ${process.env.APP_API_KEY}`) : false;
    const isValidQuery = queryKey ? secureCompare(queryKey, process.env.APP_API_KEY) : false;

    if (!isValidHeader && !isValidQuery) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        scheduler: 'active',
        time: new Date().toISOString()
    });
}
