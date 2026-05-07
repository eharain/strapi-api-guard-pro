import React, { useState, useRef } from 'react';
import {
  Box,
  Flex,
  Typography,
  Button,
  Alert,
  Divider,
} from '@strapi/design-system';

const API_BASE = '/api-guard-pro';
const EXPORT_URL = `${API_BASE}/data-transfer/export`;
const IMPORT_URL = `${API_BASE}/data-transfer/import`;

function JsonPreview({ value }) {
  if (!value) return null;
  return (
    <Box
      background="neutral100"
      style={{
        borderRadius: 6,
        border: '1px solid #ddd',
        padding: '12px 16px',
        maxHeight: 320,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {value}
    </Box>
  );
}

function SummaryTable({ results }) {
  if (!results) return null;
  const rows = Object.entries(results);
  return (
    <Box background="neutral0" style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {['Entity', 'Created', 'Updated', 'Errors'].map(h => (
              <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([entity, stat]) => (
            <tr key={entity} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 14px', fontSize: 13, textTransform: 'capitalize' }}>{entity}</td>
              <td style={{ padding: '6px 14px', fontSize: 13, color: '#28a745' }}>{stat.created}</td>
              <td style={{ padding: '6px 14px', fontSize: 13, color: '#007bff' }}>{stat.updated}</td>
              <td style={{ padding: '6px 14px', fontSize: 13, color: stat.errors?.length ? '#dc3545' : '#888' }}>
                {stat.errors?.length ? stat.errors.map((e, i) => (
                  <div key={i}>{typeof e === 'string' ? e : (e.error || JSON.stringify(e))}</div>
                )) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

export default function DataTransfer() {
  const [exportJson, setExportJson] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const [importJson, setImportJson] = useState('');
  const [cleanMode, setCleanMode] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const [message, setMessage] = useState({ text: '', variant: 'default' });
  const fileInputRef = useRef(null);

  const notify = (text, variant = 'default') => setMessage({ text, variant });

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    setExportJson('');
    setMessage({ text: '', variant: 'default' });
    try {
      const res = await fetch(EXPORT_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      setExportJson(JSON.stringify(json, null, 2));
      notify('Export successful', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'danger');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-guard-pro-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleFileLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target.result);
      setImportResults(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      notify('Paste or upload a JSON file first', 'default');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      notify('Invalid JSON — please check the pasted content', 'danger');
      return;
    }

    if (cleanMode) {
      const confirmed = window.confirm(
        '⚠️  Clean import will DELETE all existing API Guard Pro data before importing. This cannot be undone. Continue?'
      );
      if (!confirmed) return;
    }

    setImportLoading(true);
    setImportResults(null);
    setMessage({ text: '', variant: 'default' });
    try {
      const res = await fetch(IMPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: parsed, clean: cleanMode }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Server responded ${res.status}`);
      }
      const json = await res.json();
      setImportResults(json.results);
      notify('Import completed — see summary below', 'success');
    } catch (err) {
      notify(`Import failed: ${err.message}`, 'danger');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Box>
      {message.text && (
        <Box paddingBottom={4}>
          <Alert
            closeLabel="Dismiss"
            variant={message.variant === 'success' ? 'success' : message.variant === 'danger' ? 'danger' : 'default'}
            onClose={() => setMessage({ text: '', variant: 'default' })}
          >
            {message.text}
          </Alert>
        </Box>
      )}

      {/* ── Export Section ── */}
      <Box background="neutral0" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
          <Box>
            <Typography variant="beta">📤 Export</Typography>
            <Typography variant="pi" textColor="neutral500" style={{ display: 'block', marginTop: 2 }}>
              Downloads domains, roles, and resources grouped by content type/actions. Policies and grants are embedded per action.
            </Typography>
          </Box>
          <Flex gap={2}>
            <Button variant="secondary" onClick={handleExport} loading={exportLoading}>
              Generate Export
            </Button>
            {exportJson && (
              <Button variant="default" onClick={handleDownload}>
                ⬇ Download JSON
              </Button>
            )}
          </Flex>
        </Flex>

        {exportJson && (
          <>
            <Divider marginBottom={3} />
            <Typography variant="pi" textColor="neutral500" paddingBottom={2} style={{ display: 'block' }}>
              Preview — click Download JSON above to save the file
            </Typography>
            <JsonPreview value={exportJson} />
          </>
        )}
      </Box>

      {/* ── Import Section ── */}
      <Box background="neutral0" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '20px 24px' }}>
        <Box paddingBottom={3}>
          <Typography variant="beta">📥 Import</Typography>
          <Typography variant="pi" textColor="neutral500" style={{ display: 'block', marginTop: 2 }}>
            Select a previously exported JSON file. Choose <strong>Merge</strong> to upsert without touching existing data,
            or <strong>Clean</strong> to wipe existing domains/roles/resources and rebuild policies/grants from action mappings.
          </Typography>
        </Box>

        <Divider marginBottom={4} />

        {/* File picker */}
        <Box paddingBottom={4}>
          <Typography variant="pi" textColor="neutral600" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
            Step 1 — Select JSON file
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileLoad}
          />
          <Flex gap={3} alignItems="center">
            <Button variant="tertiary" onClick={() => fileInputRef.current?.click()}>
              📂 Choose File
            </Button>
            {importJson ? (
              <Typography variant="pi" textColor="success600">✔ File loaded ({(importJson.length / 1024).toFixed(1)} KB)</Typography>
            ) : (
              <Typography variant="pi" textColor="neutral400">No file selected</Typography>
            )}
          </Flex>
        </Box>

        {/* Mode toggle */}
        <Box paddingBottom={4}>
          <Typography variant="pi" textColor="neutral600" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
            Step 2 — Choose import mode
          </Typography>
          <Flex gap={4} alignItems="center">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="import-mode"
                checked={!cleanMode}
                onChange={() => setCleanMode(false)}
              />
              <Box>
                <Typography variant="pi" style={{ fontWeight: 600 }}>Merge</Typography>
                <Typography variant="pi" textColor="neutral500" style={{ display: 'block' }}>
                  Upserts by key — existing data is kept
                </Typography>
              </Box>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="import-mode"
                checked={cleanMode}
                onChange={() => setCleanMode(true)}
              />
              <Box>
                <Typography variant="pi" style={{ fontWeight: 600, color: '#d02b20' }}>Clean</Typography>
                <Typography variant="pi" textColor="danger600" style={{ display: 'block' }}>
                  Deletes ALL existing plugin data first
                </Typography>
              </Box>
            </label>
          </Flex>
        </Box>

        {/* Import button */}
        <Box paddingBottom={importResults ? 4 : 0}>
          <Typography variant="pi" textColor="neutral600" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
            Step 3 — Run import
          </Typography>
          <Button
            variant={cleanMode ? 'danger' : 'default'}
            onClick={handleImport}
            loading={importLoading}
            disabled={!importJson.trim()}
          >
            {cleanMode ? '⚠ Clean Import' : 'Import'}
          </Button>
        </Box>

        {importResults && (
          <>
            <Divider marginBottom={3} />
            <Typography variant="delta" paddingBottom={2} style={{ display: 'block' }}>
              Import Summary
            </Typography>
            <SummaryTable results={importResults} />
          </>
        )}
      </Box>
    </Box>
  );
}
