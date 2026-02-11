import { ParsedInvoice, CompanyConfig } from './types';
import { z } from 'zod';
import { SFClientSchema, SFDuplicateResponseSchema, SFExpenseResponseSchema } from './schemas';

interface SFClient {
    id: string;
    name: string;
    ico?: string;
}

const API_CONFIG = {
    get baseUrl() { return process.env.SF_BASE_URL || 'https://moje.superfaktura.cz'; },
    get auth() {
        return `SFAPI email=${process.env.SF_API_EMAIL}&apikey=${process.env.SF_API_KEY}&company_id=${process.env.SF_COMPANY_ID}`;
    }
};

async function fetchSF(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const headers = {
        'Authorization': API_CONFIG.auth,
        ...options.headers
    };

    const res = await fetch(url, { ...options, headers });
    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error(`Invalid JSON response from SF: ${text.substring(0, 100)}...`);
    }
}

export async function getClientByIco(ico: string): Promise<SFClient | null> {
    // Search client by ICO
    // Endpoint: /clients/index.json?search=base64(ico)
    try {
        const searchEncoded = Buffer.from(ico).toString('base64');
        const data = await fetchSF(`/clients/index.json?search=${searchEncoded}`);

        // API checks: Handle both {error:0, data:[]} and direct [] response
        let clients: any[] = [];
        if (Array.isArray(data)) {
            clients = data;
        } else if (data && data.error === 0 && Array.isArray(data.data)) {
            clients = data.data;
        } else if (data && Array.isArray(data.items)) {
             clients = data.items;
        }

        // Validate items with Zod implicitly by checking fields
        // Since we already have a runtime object, let's map it

        if (clients.length > 0) {
            // Find exact match
            const match = clients.find((c: any) => {
                const client = c.Client || c;
                // Optional Zod check per item if strictness needed
                // const parsed = SFClientSchema.safeParse(client);
                // if (!parsed.success) return false;
                return client.ico === ico;
            });

            if (match) {
                 const client = match.Client || match;
                 // Parse with Zod to be sure
                 const validClient = SFClientSchema.safeParse(client);
                 if (validClient.success) {
                    return {
                        id: validClient.data.id,
                        name: validClient.data.name,
                        ico: validClient.data.ico
                    };
                 }
            }
        }
        return null;
    } catch (error) {
        console.error('Error searching client:', error);
        return null;
    }
}

export async function createClient(supplier: { name: string; ico?: string; dic?: string; address?: string }): Promise<string> {
    // Create new client
    const payload = {
        Client: {
            name: supplier.name,
            ico: supplier.ico,
            dic: supplier.dic,
            address: supplier.address,
            country_id: 56 // Czech Republic default
        }
    };

    const res = await fetchSF('/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${JSON.stringify(payload)}`
    });

    // Zod Validation not strictly applicable here as response varies wildly
    // But we check structure
    if (res.error === 0) {
         if (res.data?.Client?.id) return String(res.data.Client.id);
         if (typeof res.data === 'number') return String(res.data);
    }

    throw new Error(res.message || 'Failed to create client');
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Try simple regex for DD.MM.YYYY
    const dmy = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }

    // Try YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    // Fallback: try Date parse
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0]; // Final fallback today
}

function normalizeCurrency(currency: string): string {
    if (!currency) return 'CZK';

    const c = currency.trim().toUpperCase();
    if (c === 'KČ' || c === 'KC') return 'CZK';
    if (c === 'EUR' || c === '€') return 'EUR';
    if (c === 'USD' || c === '$') return 'USD';

    // If already 3 chars, assume ISO code
    if (c.length === 3) return c;

    return 'CZK'; // Default fallback
}

export async function createExpense(
    invoice: ParsedInvoice,
    company: CompanyConfig,
    sourceFileName: string
): Promise<{ id: string; error?: string }> {
    try {
        // 1. Resolve Client (Supplier)
        let clientId = '';
        if (invoice.supplier.ico) {
            const existing = await getClientByIco(invoice.supplier.ico);
            if (existing) {
                clientId = existing.id;
            }
        }

        if (!clientId) {
            clientId = await createClient(invoice.supplier);
        }

        // 2. Prepare Payload
        const payload = {
            Expense: {
                name: invoice.supplier.name,
                variable: invoice.invoice.variable_symbol,
                amount: invoice.totals.total,
                currency: normalizeCurrency(invoice.invoice.currency),
                date: formatDate(invoice.invoice.date_issued),
                created: formatDate(invoice.invoice.date_issued),
                due: formatDate(invoice.invoice.date_due),
                client_id: clientId,
                comment: `Imported from Invoice Processor (File: ${sourceFileName})`,
                type: 'bill'
            },
            ExpenseItem: invoice.items.map(item => ({
                description: item.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax: item.vat_rate
            }))
        };

        // Fallback item
        if (payload.ExpenseItem.length === 0) {
            payload.ExpenseItem.push({
                description: 'Fakturace služby/zboží',
                quantity: 1,
                unit_price: invoice.totals.total,
                tax: 0
            });
        }

        const res = await fetchSF('/expenses/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${JSON.stringify(payload)}`
        });

        // Validate with Zod
        const parsed = SFExpenseResponseSchema.safeParse(res);

        if (!parsed.success) {
            console.error("SF Validation Error:", parsed.error);
             return { id: '', error: `Invalid API Response: ${parsed.error.message}` };
        }

        const data = parsed.data;

        if (data.error === 0 || !data.error) {
             // Handle different ID locations
             if (typeof data.data === 'object' && data.data !== null) {
                  const expenseData = data.data as any; // TS limitation with union types access
                  const newId = expenseData?.Expense?.id || expenseData?.expense_id;
                  if (newId) return { id: String(newId) };
             }
             if (typeof data.data === 'number' || typeof data.data === 'string') {
                 return { id: String(data.data) };
             }
        }

        // Error case
        const errorMsg = typeof data.error_message === 'object'
            ? JSON.stringify(data.error_message)
            : (data.error_message || data.message || 'Unknown SF Error');

        return { id: '', error: errorMsg };

    } catch (error) {
        return { id: '', error: (error as Error).message };
    }
}

function encodeSFSearch(term: string): string {
    return Buffer.from(term).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/\=/g, ',');
}

export async function checkDuplicate(variableSymbol: string): Promise<boolean> {
    try {
        // n8n Logic:
        // 1. Custom Base64 Encoding
        const encoded = encodeSFSearch(variableSymbol);

        // 2. Specific API Params
        // listinfo:0 -> metadata included? (actually n8n uses it, response showed items wrapped)
        // created:3 -> custom filter
        // date range: 2020-2030 -> wider range than default
        const endpoint = `/expenses/index.json/listinfo:0/created:3/created_since:01.01.2020/created_to:31.12.2030/search:${encoded}`;

        const data = await fetchSF(endpoint);

        // API Response Handling:
        // - Direct Array: [] (Classic search)
        // - Object with items: { itemCount: 1, items: [...] } (This specific filtered search)
        // - Object with data: { error: 0, data: [...] } (Standard response)

        let items: any[] = [];

        // Zod Parse Attempt
        const parsed = SFDuplicateResponseSchema.safeParse(data);

        if (parsed.success) {
             if (Array.isArray(parsed.data)) {
                 items = parsed.data;
             } else if ('items' in parsed.data) {
                 items = parsed.data.items;
             } else if ('data' in parsed.data && Array.isArray(parsed.data.data)) {
                 items = parsed.data.data;
             }
        } else {
             console.warn("SF Duplicate Response Schema Mismatch:", parsed.error);
             // Fallback to manual extraction if schema fails (e.g. unknown new format), but log warning
             // Or fail strictly? Let's fallback for now to be safe
             if (Array.isArray(data)) items = data;
             else if (data.items) items = data.items;
             else if (data.data) items = data.data;
        }

        // Double check results locally to be 100% sure
        const found = items.find((item: any) => {
            const exp = item.Expense || item;
            return String(exp.variable) === String(variableSymbol) ||
                String(exp.variable_symbol) === String(variableSymbol);
        });

        if (found) {
            console.log(`[SF] Duplicate found: ${found.Expense?.id || found.id}`);
            return true;
        }

        return false;
    } catch (e) {
        console.error('SF Duplicate Check Error:', e);
        // If unsure, throw error so processing stops and we don't create a duplicate
        throw new Error(`SF Duplicate Check Failed: ${(e as Error).message}`);
    }
}
