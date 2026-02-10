# Invoice Processor

A robust Next.js application for processing invoices using AI. This system ingests invoices from various sources (Email, Drive, Upload), extracts data using Google Gemini, stores it in a database, and exports it to accounting software.

## Features

- **Multi-channel Ingestion**: Process invoices from Gmail, Google Drive, or manual uploads.
- **AI Extraction**: Utilizes Google Gemini 2.0 Flash for accurate data extraction from PDFs and Images.
- **Data persistence**: Stores structured invoice data in a SQLite database via Prisma.
- **Accounting Integration**: Automated exports to SuperFaktura.
- **Dashboard**: User-friendly interface for monitoring and manual intervention.

## Prerequisites

- Node.js 18+
- npm
- Google Cloud Project with Gemini API enabled
- Gmail & Drive API credentials

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Invoice-Processor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file based on `.env.example` (if available) or ensure the following variables are set:
    - `DATABASE_URL="file:./dev.db"`
    - `GEMINI_API_KEY="..."`
    - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, etc.

4.  **Initialize Database:**
    ```bash
    npx prisma migrate dev
    ```

## Running the Application

- **Development:**
    ```bash
    npm run dev
    ```
    Access the dashboard at `http://localhost:3000`.

- **Production Build:**
    ```bash
    npm run build
    npm start
    ```

## Testing

This project uses Vitest and React Testing Library for unit and component testing.

- **Run all tests:**
    ```bash
    npm test
    ```

## Architecture

- **Frontend**: Next.js 16 App Router, React 19.
- **Backend**: Next.js API Routes.
- **Database**: SQLite (via Prisma).
- **AI**: Google Generative AI SDK.
