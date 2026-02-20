import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/gdrive';
import { getCompanyById, getCompanies } from '@/lib/companies';
import { secureCompare, validateFile, sanitizeFilename } from '@/lib/security';

export async function POST(request: Request) {
    const apiKey = process.env.APP_API_KEY;
    if (!apiKey) {
        console.error('APP_API_KEY environment variable is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Auth check for API usage using secure comparison to prevent timing attacks
    const authHeader = request.headers.get('authorization') || '';
    const expectedAuth = `Bearer ${apiKey}`;

    if (!secureCompare(authHeader, expectedAuth)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const companyId = formData.get('company') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const validation = validateFile(file);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const company = getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const safeFilename = sanitizeFilename(file.name);

        const fileId = await uploadFile(
            safeFilename,
            file.type,
            buffer,
            company.gdriveFolderId
        );

        return NextResponse.json({ success: true, fileId });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
