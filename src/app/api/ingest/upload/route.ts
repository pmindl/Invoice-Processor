import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';
import crypto from 'crypto';

export async function POST(request: Request) {
    // Auth check for API usage
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.APP_API_KEY}`;

    // Constant-time comparison to prevent timing attacks
    let authorized = false;
    if (authHeader && authHeader.length === expectedAuth.length) {
        authorized = crypto.timingSafeEqual(
            Buffer.from(authHeader),
            Buffer.from(expectedAuth)
        );
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
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Security: Validate MIME Type
        const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP' }, { status: 400 });
        }

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Security: Sanitize filename
        // Allow only alphanumeric, dots, dashes, underscores
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

        const fileId = await uploadFile(
            sanitizedFilename,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        console.error('Upload error:', error);
        // Security: Generic error message to avoid leaking internals
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
