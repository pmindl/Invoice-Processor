<instruction>You are an expert software engineer. You are working on a WIP branch. Please run `git status` and `git diff` to understand the changes and the current state of the code. Analyze the workspace context and complete the mission brief.</instruction>
<workspace_context>
<active_errors>
File: tsconfig.json Line 1: File 'c:/Users/Petr sub/.gemini/antigravity/Invoice-Processor/scripts/debug-pdf.ts' not found.
  The file is in the program because:
    Matched by include pattern '**/*.ts' in 'c:/Users/Petr sub/.gemini/antigravity/Invoice-Processor/tsconfig.json'
File: test-processing.ts Line 1: Module '"../src/app/api/process/route"' has no exported member 'processInvoice'.
File: test-processing.ts Line 50: Property 'invoice_number' does not exist on type '{ number: string; variable_symbol: string; date_issued: string; date_due: string; currency: string; }'.
File: test-processing.ts Line 66: Property 'invoice_number' does not exist on type '{ number: string; variable_symbol: string; date_issued: string; date_due: string; currency: string; }'.
File: test-processing.ts Line 68: Type 'Date | null' is not assignable to type 'string | null | undefined'.
  Type 'Date' is not assignable to type 'string'.
File: test-processing.ts Line 69: Type 'Date | null' is not assignable to type 'string | null | undefined'.
  Type 'Date' is not assignable to type 'string'.
File: test-processing.ts Line 95: Argument of type '{ name: string; sf_api_email: string; sf_api_key: string; sf_company_id: string; }' is not assignable to parameter of type 'CompanyConfig'.
  Type '{ name: string; sf_api_email: string; sf_api_key: string; sf_company_id: string; }' is missing the following properties from type 'CompanyConfig': id, ico, gdriveFolderId, sfClientId, emailPatterns
File: run-batch-test.ts Line 43: 'res' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
</active_errors>
<artifacts>
--- CURRENT TASK CHECKLIST ---
# Task: Integrate Parse-based Packeta Invoice Processing

- [x] Analyze existing codebase and n8n workflow <!-- id: 0 -->
    - [x] Explore project structure and key files <!-- id: 1 -->
    - [x] Understand current invoice processing logic (AI-based) <!-- id: 2 -->
    - [x] Analyze n8n workflow logic for Packeta invoices <!-- id: 3 -->
- [x] Design integration plan <!-- id: 4 -->
    - [x] Create implementation plan artifact <!-- id: 5 -->
- [x] Implement non-AI extraction logic <!-- id: 6 -->
    - [x] Create utility for HTML/Text extraction (mimicking n8n logic) <!-- id: 7 -->
    - [x] Implement specific parsers for Packeta <!-- id: 8 -->
- [x] Integrate into processing flow <!-- id: 9 -->
    - [x] Modify main processing logic to route Packeta invoices to new parser <!-- id: 10 -->
    - [x] Ensure data structure matches existing output <!-- id: 11 -->
- [/] Verify implementation <!-- id: 12 -->
    - [x] Test with Packeta invoice examples (if available or mocked) <!-- id: 13 -->
    - [x] Test with metadata from GDrive (real files) <!-- id: 14 -->
- [x] Final Code Review <!-- id: 15 -->
- [x] Commit changes to GitHub <!-- id: 16 -->

--- IMPLEMENTATION PLAN ---
# Integrate Non-AI Packeta Invoice Processing

## Goal Description
Integrate a deterministic, non-AI based invoice parser for "Packeta" (Zásilkovna) invoices. This logic is derived from a provided n8n workflow and relies on `pdf-parse` and regular expressions to extract data, reducing reliance on the Gemini AI model for this specific invoice type.

## User Review Required
> [!IMPORTANT]
> **Detection Logic**: The system will identify Packeta invoices by extracting the text from the PDF and checking for the presence of specific keywords (e.g., "Zásilkovna", "Packeta") and structure (e.g., "Variabilní symbol"). This ensures detection is robust and independent of filenames.

## Proposed Changes

### Lib
#### [NEW] [packeta.ts](file:///c:/Users/Petr%20sub/.gemini/antigravity/Invoice-Processor/src/lib/parsers/packeta.ts)
- Implement `parsePacketaInvoice(buffer: Buffer): Promise<ParsedInvoice>`.
- Use `pdf-parse` to extract text from the PDF buffer.
- Implement the exact regex logic from the n8n workflow:
    - **Header details**: Dates, Invoice Number, Variable Symbol.
    - **Bank details**: IBAN, SWIFT, Account Number (with specific logic for Zásilkovna's account).
    - **Line Items**: Isolate the items section and iterate to extract name, quantity, price, and VAT.
    - **Totals**: Calculate total and correction logic.
- Return a `ParsedInvoice` object compatible with `src/lib/types.ts`.

### API
#### [MODIFY] [route.ts](file:///c:/Users/Petr%20sub/.gemini/antigravity/Invoice-Processor/src/app/api/process/route.ts)
- Import `parsePacketaInvoice`.
- Inside the processing loop, detecting if the invoice is from Packeta.
- If it is Packeta, use `parsePacketaInvoice` instead of `gemini.parseInvoice`.
- Fallback to Gemini for all other invoices.

## Verification Plan

### Automated Tests
- Create a new script `scripts/test-packeta.ts` that:
    1.  Accepts a file path to a PDF as an argument.
    2.  Runs `parsePacketaInvoice` on that file.
    3.  Outputs the parsed JSON structure for inspection.

### Manual Verification
1.  **Setup**: Place a sample Packeta invoice PDF in a local directory (e.g., `test_data/packeta_invoice.pdf`).
2.  **Run Script**: Execute `npx tsx scripts/test-packeta.ts test_data/packeta_invoice.pdf`.
3.  **Verify**: Check the console output to ensure:
    - Variable Symbol is correct.
    - Total amount matches.
    - Items are correctly listed with prices.
    - Bank account is the correct Zásilkovna account.
</artifacts>
</workspace_context>
<mission_brief>[Describe your task here...]</mission_brief>