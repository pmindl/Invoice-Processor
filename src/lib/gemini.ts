import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedInvoice } from './types';
import { config } from './config';

/**
 * Parses an invoice file (text or image/PDF) using Google Gemini AI.
 * 
 * @param textOrImage - The input data. Can be a string (text) or a Buffer (file data).
 * @param mimeType - The MIME type of the input. Defaults to 'text/plain'.
 * @returns A promise resolving to the structured ParsedInvoice object.
 * @throws Error if the AI response does not contain valid JSON.
 */
export async function parseInvoice(textOrImage: string | Buffer, mimeType: string = 'text/plain'): Promise<ParsedInvoice> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
System: You are an accounting AI. Analyze this document and extract invoice data.

Known buyer companies:
- firma_a = ${config.companies.firmaA.name} (ICO: ${config.companies.firmaA.ico})
- firma_b = ${config.companies.firmaB.name} (ICO: ${config.companies.firmaB.ico})

Return ONLY valid JSON matching this schema:
{
  "is_invoice": boolean,
  "confidence": 0-100,
  "my_company_identifier": "firma_a" | "firma_b" | "unknown",
  "supplier": { "name", "ico", "dic", "address" },
  "buyer": { "name", "ico", "dic" },
  "invoice": { "number", "variable_symbol", "date_issued", "date_due", "currency" },
  "items": [{ "name", "quantity", "unit_price", "vat_rate" }],
  "totals": { "subtotal", "vat", "total" }
}
`;

    let result;
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        // For images/PDF, we send the binary data
        // Note: "application/pdf" support in Gemini 1.5/2.0 requires convert to base64
        const imagePart = {
            inlineData: {
                data: Buffer.isBuffer(textOrImage) ? textOrImage.toString('base64') : textOrImage,
                mimeType: mimeType
            },
        };
        result = await model.generateContent([prompt, imagePart]);
    } else {
        // Text input
        result = await model.generateContent([prompt, textOrImage as string]);
    }

    const response = result.response;
    const text = response.text();

    // Extract JSON from markdown code block if present
    // Improved regex to capture the outermost JSON object, handling potential markdown wrappers
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        console.error('Gemini Raw Response:', text);
        throw new Error('No JSON found in AI response');
    }

    try {
        return JSON.parse(jsonMatch[0]) as ParsedInvoice;
    } catch (error) {
        console.error('JSON Parse Error:', error);
        console.error('Gemini Raw Response:', text);
        throw new Error(`Failed to parse JSON from AI response: ${(error as Error).message}`);
    }
}
