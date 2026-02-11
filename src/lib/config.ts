// Centralized configuration file for the application
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    app: {
        baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
        apiKey: process.env.APP_API_KEY || '',
    },
    google: {
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '', // Replace hardcoded ID '1T7Ew6PoJn8EcFb-9kiR2NaVAp_SRMU6R'
    },
    superfaktura: {
        baseUrl: process.env.SF_BASE_URL || 'https://moje.superfaktura.cz',
        apiEmail: process.env.SF_API_EMAIL || '',
        apiKey: process.env.SF_API_KEY || '',
        companyId: process.env.SF_COMPANY_ID || '',
    },
    companies: {
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
