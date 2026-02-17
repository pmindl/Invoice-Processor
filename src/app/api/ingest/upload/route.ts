import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';
import crypto from 'crypto';

export async function POST(request: Request) {
    // Auth check for API usage (manual upload from UI might need proxy or key)
    // For simplicity, UI proxy or direct key if available.
    const authHeader = request.headers.get('authorization');

    const appApiKey = process.env.APP_API_KEY;
    if (!appApiKey) {
        console.error('APP_API_KEY is not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const expectedAuthHeader = `Bearer ${appApiKey}`;

    let isAuthenticated = false;
    if (authHeader && authHeader.length === expectedAuthHeader.length) {
        const authHeaderBuffer = Buffer.from(authHeader);
        const expectedAuthHeaderBuffer = Buffer.from(expectedAuthHeader);

        // timingSafeEqual throws if lengths differ, so we checked length above.
        if (crypto.timingSafeEqual(authHeaderBuffer, expectedAuthHeaderBuffer)) {
            isAuthenticated = true;
        }
    }

    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const companyId = formData.get('company') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Security: Validate file size (Max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Security: Validate MIME Type
        const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 });
        }

        // Security: Sanitize Filename
        // Allow alphanumeric, dot, dash, underscore only.
        const originalName = file.name;
        // Replace invalid chars with underscore
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const fileId = await uploadFile(
            sanitizedName,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        console.error('Upload error:', error);
        // Security: Do not leak error details to client
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
