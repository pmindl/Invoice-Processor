import { describe, it, expect, vi } from 'vitest';
import { parseInvoice } from './gemini';

// Hoist mocks to ensure they are available before imports
const mocks = vi.hoisted(() => {
    return {
        generateContent: vi.fn(),
        getGenerativeModel: vi.fn(),
    };
});

// Mock the module
vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            getGenerativeModel = mocks.getGenerativeModel.mockReturnValue({
                generateContent: mocks.generateContent
            });
        }
    };
});

describe('parseInvoice', () => {
    it('should parse a valid invoice JSON response', async () => {
        // Mock successful AI response
        const mockInvoiceData = {
            is_invoice: true,
            invoice: { number: '12345' }
        };

        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify(mockInvoiceData)
            }
        });

        const result = await parseInvoice('some text content');

        expect(result).toEqual(mockInvoiceData);
        // Verify the mock was called
        expect(mocks.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash' });
    });

    it('should throw error if no JSON found', async () => {
        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => "I am an AI but I found no invoice data."
            }
        });

        await expect(parseInvoice('invalid content')).rejects.toThrow('No JSON found in AI response');
    });

    it('should throw error if JSON is malformed', async () => {
        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => '```json\n{"incomplete": "json"}\n```invalid'
                // This simulates a case where regex matches but JSON.parse fails (e.g. if the regex captures too much or content is bad)
                // However, our regex captures { ... } so it needs to match something that LOOKS like a block but is invalid JSON inside?
                // Actually, if the regex doesn't match, it throws "No JSON found".
                // If the regex matches but JSON is invalid, it throws "Failed to parse JSON".

                // Let's provide something that regex will catch as a block, but is invalid JSON.
                // e.g. { "key": value } (missing quotes on value)
            }
        });

        mocks.generateContent.mockResolvedValue({
             response: {
                text: () => 'Some text { "key": value } end text'
            }
        });

        await expect(parseInvoice('malformed content')).rejects.toThrow('Failed to parse JSON');
    });

    it('should handle markdown code blocks', async () => {
        const mockInvoiceData = { is_invoice: true, invoice: { number: '54321' } };
        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => `Here is the JSON:\n\`\`\`json\n${JSON.stringify(mockInvoiceData)}\n\`\`\``
            }
        });

        const result = await parseInvoice('markdown content');
        expect(result).toEqual(mockInvoiceData);
    });
});
