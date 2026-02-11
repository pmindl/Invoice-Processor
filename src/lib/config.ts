// Centralized configuration file for the application
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    app: {
        baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
        apiKey: process.env.APP_API_KEY || '',
    },
    google: {
        // Fallback folder ID for simple test scripts
        // But in production, folders are per-company from process.env.COMPANIES
        defaultDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    },
    superfaktura: {
        baseUrl: process.env.SF_BASE_URL || 'https://moje.superfaktura.cz',
        apiEmail: process.env.SF_API_EMAIL || '',
        apiKey: process.env.SF_API_KEY || '',
        companyId: process.env.SF_COMPANY_ID || '',
    },
    companies: {
        // Pre-defined known company metadata for Gemini prompt
        // These are distinct from the dynamic list of folders to process
        firmaA: {
            name: 'Lumegro s.r.o.',
            ico: '08827877',
        },
        firmaB: {
            name: 'Lumenica Derm & Med, s.r.o.',
            ico: '17904544',
        },
    },
};
