# Code Review Report

## Executive Summary

The codebase implements an invoice processing pipeline using Next.js, Prisma, and Gemini AI. While the core functionality of parsing invoices and exporting to SuperFaktura is present, the system currently relies heavily on manual scripts for execution and lacks robustness in error handling, testing, and configuration management. Several hardcoded values and potential security/stability risks need addressing before production deployment.

## 1. Critical Issues (Bugs, Security, Data Integrity)

### 1.1. Unsafe Duplicate Detection
*   **File:** `src/lib/superfaktura.ts`
*   **Issue:** The `checkDuplicate` function catches errors but returns `false` (indicating no duplicate) in the catch block.
*   **Risk:** If the SuperFaktura API is down, rate-limited, or returns a 500 error, the system will assume the invoice is new and may create a duplicate.
*   **Recommendation:** The function should re-throw the error or return `null`/`undefined` to indicate an "unknown" state, prompting the caller to retry or fail safely.

### 1.2. Internal API Authentication & Proxying
*   **File:** `src/app/api/trigger/route.ts`
*   **Issue:** The endpoint acts as a proxy to other internal API routes (`/api/process`, `/api/export`) using `fetch`. It uses inconsistent headers (`x-api-key` vs `Authorization: Bearer`) and exposes the internal API key to itself via `process.env`.
*   **Risk:** Calling internal APIs via HTTP in a serverless environment (Next.js) can lead to timeouts or connection issues (loopback). It also adds unnecessary network overhead.
*   **Recommendation:** Refactor the logic from the API routes into shared service functions (e.g., in `src/lib/services/`) and call these functions directly from `trigger/route.ts` and the other API endpoints.

## 2. Major Issues (Architecture, Maintainability)

### 2.1. Hardcoded Configuration & Secrets
*   **File:** `src/lib/gemini.ts`
*   **Issue:** The prompt contains hardcoded company names ("Lumegro s.r.o.", "Lumenica Derm & Med, s.r.o.") and ICOs.
*   **Recommendation:** Move these to a configuration file or environment variables to allow for easier updates and multi-tenant support.
*   **File:** `scripts/run-batch-test.ts`
*   **Issue:** The Google Drive folder ID `1T7Ew6PoJn8EcFb-9kiR2NaVAp_SRMU6R` is hardcoded.
*   **Recommendation:** Use `process.env.GDRIVE_FOLDER_ID`.

### 2.2. Robustness of AI Parsing
*   **File:** `src/lib/gemini.ts`
*   **Issue:**
    1. `JSON.parse` is used on AI output without a `try-catch` block (outside the regex match check). If the AI returns valid JSON structure but invalid values (e.g., unexpected nulls), it might throw.
    2. The regex `match(/\{[\s\S]*\}/)` is greedy and might capture surrounding markdown if the model is chatty.
*   **Recommendation:** Use a more robust JSON extraction library or stricter regex. Wrap parsing in a try-catch block that logs the raw response for debugging.

### 2.3. Type Safety
*   **File:** `src/lib/superfaktura.ts`
*   **Issue:** Extensive use of `any` type for API responses (`fetchSF` returns `Promise<any>`).
*   **Risk:** Changes in the SuperFaktura API structure could break the application without compile-time warnings.
*   **Recommendation:** Define proper Zod schemas or TypeScript interfaces for the expected API responses and validate them at runtime.

### 2.4. Business Logic in Scripts
*   **File:** `scripts/run-batch-test.ts`
*   **Issue:** This script contains critical business logic (iterating files, DB upsert logic, duplicate checking flow, status updates).
*   **Risk:** This logic is duplicated or missing from the actual API endpoints, leading to inconsistent behavior between "testing" and "production".
*   **Recommendation:** Extract the processing logic into a `InvoiceProcessor` service class/function in `src/lib/` that can be called by both the script and the API.

## 3. Minor Issues (Style, Cleanup)

*   **File:** `src/app/page.tsx`
    *   **Issue:** Uses `any` type for invoices in `data.filter`.
    *   **Issue:** No error UI handling (just `console.error`).
*   **File:** `src/lib/superfaktura.ts`
    *   **Issue:** `normalizeCurrency` has hardcoded currency symbols.
    *   **Issue:** `createClient` hardcodes `country_id: 56` (Czech Republic).
*   **File:** `src/app/api/invoices/route.ts`
    *   **Issue:** `PATCH` endpoint allows setting any status string without validation.

## 4. Testing & Quality Assurance

*   **Current State:**
    *   `src/lib/gemini.test.ts` exists but only tests a mocked happy path.
    *   Testing relies heavily on manual execution of scripts (`scripts/run-batch-test.ts`).
*   **Recommendations:**
    1.  **Unit Tests:** Expand `gemini.test.ts` to test edge cases (invalid JSON, empty response, API errors).
    2.  **Integration Tests:** Create integration tests that use a local database (e.g., SQLite in-memory) to test the `createExpense` and `checkDuplicate` logic without hitting the real SuperFaktura API (use `msw` or similar to mock HTTP requests).
    3.  **End-to-End:** Refactor `run-batch-test.ts` into a proper Vitest test suite that runs against a test environment.

## 5. Security Note

*   **File:** `scripts/auth-server.ts`
    *   **Issue:** This script modifies `.env` directly. While convenient for local dev, this is bad practice in CI/CD or shared environments.
    *   **Recommendation:** Instruct users to set the variable manually or use a `.env.local` file that is gitignored (if not already).

## Action Plan

1.  **Refactor**: Move business logic from `scripts/run-batch-test.ts` to `src/lib/processor.ts`.
2.  **Config**: Externalize hardcoded IDs and prompts to `.env`.
3.  **Safety**: Improve `checkDuplicate` error handling.
4.  **Testing**: Write proper unit tests for the new `processor.ts`.
