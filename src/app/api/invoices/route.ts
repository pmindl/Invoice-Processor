import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureCompare } from '@/lib/security';

export async function GET(request: Request) {
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
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const company = searchParams.get('company');

        const where = {
            ...(status && { status }),
            ...(company && { company }),
        };

        const invoices = await db.invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
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
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
        }

        const updated = await db.invoice.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }
}
