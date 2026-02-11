import { z } from 'zod';

// --- SuperFaktura API Schemas ---

// Common error structure
// Sometimes SF returns { error: 1, message: "..." } or { error: 0, data: ... }
const SFBaseResponse = z.object({
    error: z.number().optional(),
    message: z.string().optional(),
    error_message: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
}).passthrough();

// Client search/create response
export const SFClientSchema = z.object({
    id: z.coerce.string(), // Sometimes number, sometimes string
    name: z.string(),
    ico: z.string().optional(),
    dic: z.string().optional(),
    address: z.string().optional(),
});

// Response from /clients/index.json
// Can be array of items, or { items: [...] }, or { data: [...] }
// We'll validate the item structure
export const SFClientItemSchema = z.object({
    Client: SFClientSchema
});

// Expense creation response
export const SFExpenseResponseSchema = SFBaseResponse.extend({
    data: z.union([
        // success structure
        z.object({
            Expense: z.object({ id: z.coerce.string() }).optional(),
            expense_id: z.coerce.string().optional(),
        }),
        // sometimes just an ID (rare but possible in old APIs?)
        z.coerce.string(),
        z.number(),
        z.null()
    ]).optional()
});

// Duplicate check response
// { items: [...] } or direct array
export const SFDuplicateItemSchema = z.object({
    id: z.coerce.string(),
    variable: z.coerce.string().optional(),
    variable_symbol: z.coerce.string().optional(),
    amount: z.coerce.number().optional(),
    created: z.string().optional(),
}).passthrough(); // Allow other fields

export const SFDuplicateResponseSchema = z.union([
    z.array(z.union([
        z.object({ Expense: SFDuplicateItemSchema }),
        SFDuplicateItemSchema
    ])),
    z.object({
        items: z.array(z.union([
            z.object({ Expense: SFDuplicateItemSchema }),
            SFDuplicateItemSchema
        ])),
    }),
    z.object({
        data: z.array(z.any())
    })
]);
