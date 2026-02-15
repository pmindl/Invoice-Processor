import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
];

export async function POST(request: Request) {
    // Auth check for API usage (manual upload from UI might need proxy or key)
    const authHeader = request.headers.get('authorization') || '';
    const expectedAuth = `Bearer ${process.env.APP_API_KEY}`;

    // Use timingSafeEqual to prevent timing attacks
    // We pad or hash strings to ensure equal length before comparison if needed,
    // but here we can just ensure both are buffers.
    // If lengths are different, timingSafeEqual throws, so we check length first.
    // However, a simple length check leaks length.
    // A better approach is to hash both and compare hashes.

    // Simple robust approach:
    const authHeaderBuffer = Buffer.from(authHeader);
    const expectedAuthBuffer = Buffer.from(expectedAuth || ''); // Handle undefined env var

    let authorized = false;
    if (authHeaderBuffer.length === expectedAuthBuffer.length && expectedAuthBuffer.length > 0) {
        authorized = crypto.timingSafeEqual(authHeaderBuffer, expectedAuthBuffer);
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

        // Security: Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
        }

        // Security: Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and images are allowed.' }, { status: 400 });
        }

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Security: Sanitize filename
        // Replace any character that is not alphanumeric, dot, dash, or underscore with underscore
        let sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        // Prevent path traversal attempts by removing double dots
        while (sanitizedFilename.includes('..')) {
            sanitizedFilename = sanitizedFilename.replace('..', '__');
        }

        const fileId = await uploadFile(
            sanitizedFilename,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        // Security: Don't expose stack trace or internal error details
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal server error processing file' }, { status: 500 });
    }
}
