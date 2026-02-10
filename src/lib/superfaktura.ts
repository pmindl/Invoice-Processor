import { ParsedInvoice, CompanyConfig } from './types';

interface SFResponse {
    error: number;
    message: string;
    data?: any;
}

export async function createExpense(
    invoice: ParsedInvoice,
    company: CompanyConfig,
    sourceFileName: string
): Promise<{ id: string; error?: string }> {
    try {
        const url = 'https://moja.superfaktura.sk/expenses/add';

        // Auth header: "SFAPI email=...&apikey=...&company_id=..."
        const authHeader = `SFAPI email=${process.env.SF_API_EMAIL}&apikey=${process.env.SF_API_KEY}&company_id=${process.env.SF_COMPANY_ID}`;

        // Payload transformation
        const payload = {
            Expense: {
                name: invoice.supplier.name,
                variable: invoice.invoice.variable_symbol,
                amount: invoice.totals.total,
                currency: invoice.invoice.currency,
                date: invoice.invoice.date_issued, // delivery date
                created: invoice.invoice.date_issued, // issue date
                due: invoice.invoice.date_due,
                client_id: company.sfClientId,
                comment: `Imported from Invoice Processor (File: ${sourceFileName})`,
                type: 'bill' // Default type
            },
            ExpenseItem: invoice.items.map(item => ({
                description: item.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax: item.vat_rate
            }))
        };

        // If no items extracted, create a fallback item
        if (payload.ExpenseItem.length === 0) {
            payload.ExpenseItem.push({
                description: 'Fakturace služby/zboží',
                quantity: 1,
                unit_price: invoice.totals.total,
                tax: 0
            });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${JSON.stringify(payload)}`
        });

        const data = await response.json() as SFResponse;

        if (data.error === 0) {
            // Success - usually returns ID in data
            // API might return data: { expense_id: 123 } or just int
            const newId = typeof data.data === 'object' ? data.data.expense_id : data.data;
            return { id: String(newId) };
        } else {
            return { id: '', error: data.message };
        }

    } catch (error) {
        return { id: '', error: (error as Error).message };
    }
}

export async function checkDuplicate(variableSymbol: string): Promise<boolean> {
    // Check if expense exists with this VS
    // GET /expenses/index.json/variable:12345
    try {
        const authHeader = `SFAPI email=${process.env.SF_API_EMAIL}&apikey=${process.env.SF_API_KEY}&company_id=${process.env.SF_COMPANY_ID}`;
        const url = `https://moja.superfaktura.sk/expenses/index.json/variable:${variableSymbol}`;

        const response = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });

        const data = await response.json();
        if (data.error === 0 && Array.isArray(data.data) && data.data.length > 0) {
            return true;
        }
        return false;
    } catch (e) {
        console.error('SF Duplicate Check Error:', e);
        return false; // Fail open (don't block if API fails)
    }
}
