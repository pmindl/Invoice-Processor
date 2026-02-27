'use client';

import { useState } from 'react';

export function UploadZone({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [apiKey, setApiKey] = useState('');

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);
        setMessage('');

        if (!apiKey) {
            setMessage('Error: API Key is required');
            setUploading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);
        // Remove apiKey from formData if it was included by the form (it isn't currently an input inside form, but good practice)

        try {
            // Direct call to the secure endpoint with client-provided key
            const res = await fetch('/api/ingest/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.status === 401) {
                setMessage('Error: Invalid API Key');
            } else if (data.success) {
                setMessage('Upload successful!');
                onUploadComplete();
                // Reset file input but keep API key for convenience? Or clear both?
                // Let's clear file input only.
                const form = e.target as HTMLFormElement;
                const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                setMessage('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            setMessage('Upload failed: ' + (err as Error).message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Manual Upload</h3>
            <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    type="password"
                    placeholder="Enter App API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="btn"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                    required
                />
                <input type="file" name="file" required className="btn" />
                <select name="company" className="btn" style={{ background: 'var(--bg-surface)' }}>
                    <option value="firma_a">Lumegro (Firma A)</option>
                    <option value="firma_b">Lumenica (Firma B)</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload'}
                </button>
            </form>
            {message && <div style={{ marginTop: '1rem', color: message.includes('Error') ? 'var(--error)' : 'var(--success)' }}>{message}</div>}
        </div>
    );
}
