import { NextResponse } from 'next/server';
import { secureCompare } from '@/lib/security';

export async function GET(request: Request) {
    const apiKey = process.env.APP_API_KEY;
    if (!apiKey) {
        console.error('APP_API_KEY environment variable is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get('key');

    if (!secureCompare(authHeader, `Bearer ${apiKey}`) && !secureCompare(queryKey, apiKey)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        scheduler: 'active',
        time: new Date().toISOString()
    });
}
