import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById, getCompanies } from '@/lib/companies';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
];

export async function POST(request: Request) {
    // Auth check for API usage (manual upload from UI might need proxy or key)
    // For simplicity, UI proxy or direct key if available.
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.APP_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'Server misconfiguration: Missing API Key' }, { status: 500 });
    }

    const expectedAuth = `Bearer ${apiKey}`;

    // Secure comparison
    let authenticated = false;
    if (authHeader) {
        const authBuffer = Buffer.from(authHeader);
        const expectedBuffer = Buffer.from(expectedAuth);

        if (authBuffer.length === expectedBuffer.length) {
            authenticated = crypto.timingSafeEqual(authBuffer, expectedBuffer);
        }
    }

    if (!authenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const companyId = formData.get('company') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 1. Validate File Size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // 2. Validate MIME Type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP' }, { status: 400 });
        }

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        // 3. Sanitize Filename
        const originalName = file.name || 'unknown';
        // Replace non-alphanumeric chars (except . - _) with _
        // This removes / and \ as well, preventing path traversal
        let safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

        // Collapse multiple dots to prevent potential weirdness, though not strictly traversal if / is gone
        safeName = safeName.replace(/\.+/g, '.');

        const buffer = Buffer.from(await file.arrayBuffer());

        const fileId = await uploadFile(
            safeName,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
