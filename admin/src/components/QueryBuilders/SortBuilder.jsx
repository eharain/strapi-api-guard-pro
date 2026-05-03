import React, { useState } from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { tokens, smallInputStyle, AddRowButton } from '../ui.jsx';

const SCALAR_TYPES = ['string', 'text', 'richtext', 'email', 'uid', 'enumeration',
    'integer', 'biginteger', 'float', 'decimal', 'boolean', 'date', 'datetime', 'time'];

/**
 * SortBuilder
 * Props:
 *   attributes:  Array<{ name, type, ... }> - root CT attributes
 *   value:       string[]  - e.g. ["name:asc", "price:desc"]  (requestRules.allowedSort)
 *   onChange:    (string[]) => void
 */
export function SortBuilder({ attributes = [], value = [], onChange }) {
    const sortable = attributes.filter(a => SCALAR_TYPES.includes(a.type));

    // Parse current value into rows: [{ field, order }]
    const [rows, setRows] = useState(() =>
        (Array.isArray(value) ? value : []).map(v => {
            const [field, order] = String(v).split(':');
            return { field: field || '', order: order === 'desc' ? 'desc' : 'asc' };
        })
    );

    const emit = (newRows) => {
        setRows(newRows);
        onChange(newRows.filter(r => r.field).map(r => `${r.field}:${r.order}`));
    };

    const addRow = () => {
        const firstUnused = sortable.find(a => !rows.some(r => r.field === a.name));
        emit([...rows, { field: firstUnused?.name || '', order: 'asc' }]);
    };

    const updateRow = (idx, patch) => {
        emit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const removeRow = (idx) => {
        emit(rows.filter((_, i) => i !== idx));
    };

    const moveUp = (idx) => {
        if (idx === 0) return;
        const next = [...rows];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        emit(next);
    };

    const moveDown = (idx) => {
        if (idx === rows.length - 1) return;
        const next = [...rows];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        emit(next);
    };

    return (
        <Box>
            {rows.map((row, idx) => (
                <Flex key={idx} gap={2} alignItems="center" style={{ marginBottom: 6 }}>
                    {/* Priority order buttons */}
                    <Flex gap={0} style={{ flexDirection: 'column' }}>
                        <button
                            type="button"
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            style={{ fontSize: 10, border: `1px solid ${tokens.border}`, background: '#fff', borderRadius: `${tokens.radius}px ${tokens.radius}px 0 0`, padding: '1px 5px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                        >▲</button>
                        <button
                            type="button"
                            onClick={() => moveDown(idx)}
                            disabled={idx === rows.length - 1}
                            style={{ fontSize: 10, border: `1px solid ${tokens.border}`, borderTop: 'none', background: '#fff', borderRadius: `0 0 ${tokens.radius}px ${tokens.radius}px`, padding: '1px 5px', cursor: idx === rows.length - 1 ? 'default' : 'pointer', opacity: idx === rows.length - 1 ? 0.3 : 1 }}
                        >▼</button>
                    </Flex>

                    <span style={{ fontSize: 11, color: '#888', minWidth: 14 }}>{idx + 1}.</span>

                    {/* Field selector */}
                    <Box style={{ flex: 1 }}>
                        <label htmlFor={`sort-field-${idx}`} style={{ fontSize: 10, display: 'block', marginBottom: 2, color: '#666', fontWeight: 600 }}>Field</label>
                        <select
                            id={`sort-field-${idx}`}
                            value={row.field}
                            onChange={e => updateRow(idx, { field: e.target.value })}
                            style={{ ...smallInputStyle, width: '100%' }}
                        >
                            <option value="">- pick field -</option>
                            {sortable.map(a => (
                                <option key={a.name} value={a.name}>{a.name}</option>
                            ))}
                        </select>
                    </Box>

                    {/* Order toggle */}
                    <Box>
                        <label style={{ fontSize: 10, display: 'block', marginBottom: 2, color: '#666', fontWeight: 600 }}>Order</label>
                        <Flex gap={0}>
                            <button
                                type="button"
                                onClick={() => updateRow(idx, { order: 'asc' })}
                                style={{
                                    fontSize: tokens.fontBase, padding: '4px 10px',
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: `${tokens.radius}px 0 0 ${tokens.radius}px`, cursor: 'pointer',
                                    background: row.order === 'asc' ? tokens.primary : '#fff',
                                    color: row.order === 'asc' ? '#fff' : '#555',
                                    fontWeight: row.order === 'asc' ? 700 : 400,
                                }}
                            >
                                ↑ asc
                            </button>
                            <button
                                type="button"
                                onClick={() => updateRow(idx, { order: 'desc' })}
                                style={{
                                    fontSize: tokens.fontBase, padding: '4px 10px',
                                    border: `1px solid ${tokens.border}`, borderLeft: 'none',
                                    borderRadius: `0 ${tokens.radius}px ${tokens.radius}px 0`, cursor: 'pointer',
                                    background: row.order === 'desc' ? tokens.primary : '#fff',
                                    color: row.order === 'desc' ? '#fff' : '#555',
                                    fontWeight: row.order === 'desc' ? 700 : 400,
                                }}
                            >
                                ↓ desc
                            </button>
                        </Flex>
                    </Box>

                    <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        style={{ fontSize: 16, color: tokens.danger, border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px', alignSelf: 'flex-end', marginBottom: 2 }}
                        title="Remove sort"
                    >
                        ×
                    </button>
                </Flex>
            ))}

            <AddRowButton onClick={addRow} disabled={sortable.length === 0}>+ Add Sort</AddRowButton>

            {rows.length > 0 && (
                <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral500">
                        Sort order:{' '}
                        <code style={{ fontSize: tokens.fontSm }}>
                            {rows.filter(r => r.field).map(r => `${r.field}:${r.order}`).join(', ') || '-'}
                        </code>
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
