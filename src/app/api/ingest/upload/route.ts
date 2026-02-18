import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';
import crypto from 'crypto';

export async function POST(request: Request) {
    // Auth check for API usage (manual upload from UI might need proxy or key)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.APP_API_KEY}`;

    // Constant-time comparison to prevent timing attacks
    const providedAuthBuffer = Buffer.from(authHeader || '');
    const expectedAuthBuffer = Buffer.from(expectedAuth);

    let authorized = false;
    if (providedAuthBuffer.length === expectedAuthBuffer.length) {
        authorized = crypto.timingSafeEqual(providedAuthBuffer, expectedAuthBuffer);
    }

    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const companyId = formData.get('company') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Security: Validate File Size (Max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
             return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Security: Validate MIME Type
        const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WEBP' }, { status: 400 });
        }

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        // Security: Sanitize Filename
        // Allow only alphanumeric, dots, dashes, underscores to prevent path traversal
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        const buffer = Buffer.from(await file.arrayBuffer());

        const fileId = await uploadFile(
            sanitizedFileName,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
