'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatsCards, ActionBar } from '@/components/Dashboard';
import { InvoiceTable } from '@/components/InvoiceTable';
import { UploadZone } from '@/components/UploadZone';

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ total: 0, exported: 0, pending: 0, errors: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();

      setInvoices(data);

      const newStats = {
        total: data.length,
        exported: data.filter((i: any) => i.status === 'EXPORTED').length,
        pending: data.filter((i: any) => i.status === 'PENDING').length,
        errors: data.filter((i: any) => i.status === 'EXPORT_ERROR').length
      };
      setStats(newStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const trigger = async (action: string) => {
    await fetch(`/api/trigger?action=${action}`, { method: 'POST' });
    await fetchData();
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Invoice Processor</h1>
        <div style={{ color: 'var(--text-secondary)' }}>
          {new Date().toLocaleDateString()}
        </div>
      </header>

      <StatsCards stats={stats} />

      <ActionBar
        onRefresh={fetchData}
        onProcess={() => trigger('process')}
        onExport={() => trigger('export')}
      />

      <UploadZone onUploadComplete={fetchData} />

      <div style={{ marginTop: '2rem' }}>
        {loading ? (
          <div className="p-8 text-center text-secondary">Loading invoices...</div>
        ) : (
          <InvoiceTable invoices={invoices} />
        )}
      </div>
    </div>
  );
}
