import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById } from '@/lib/companies';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function secureCompare(a: string, b: string) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
    try {
        // Secure Auth Check
        const apiKey = process.env.APP_API_KEY;
        if (!apiKey) {
            console.error('Security Error: APP_API_KEY is not configured.');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${apiKey}`;

        if (!authHeader || !secureCompare(authHeader, expectedAuth)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const companyId = formData.get('company') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate File Size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Validate File Type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WebP' }, { status: 400 });
        }

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        // Sanitize Filename (Defense in Depth)
        // Replace any character that is NOT alphanumeric, dot, dash, or underscore with an underscore.
        // This prevents path traversal characters (/, ..) and other weirdness.
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

        const buffer = Buffer.from(await file.arrayBuffer());

        const fileId = await uploadFile(
            sanitizedFilename,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
