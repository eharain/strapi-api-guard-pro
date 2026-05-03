import React, { useState } from 'react';
import { Box, Typography, Flex, TextInput } from '@strapi/design-system';

const SCALAR_TYPES = ['string', 'text', 'richtext', 'email', 'password', 'uid', 'enumeration',
    'integer', 'biginteger', 'float', 'decimal', 'boolean', 'date', 'datetime', 'time', 'json', 'blocks'];

const TYPE_COLORS = {
    string: '#4945ff', text: '#4945ff', richtext: '#4945ff', email: '#0c75af', password: '#c5221f',
    uid: '#945af2', enumeration: '#bf5af2', integer: '#2ecc71', biginteger: '#2ecc71',
    float: '#27ae60', decimal: '#27ae60', boolean: '#f39c12', date: '#e67e22', datetime: '#e67e22',
    time: '#e67e22', json: '#95a5a6', blocks: '#7f8c8d',
};

function TypeBadge({ type }) {
    const color = TYPE_COLORS[type] || '#888';
    return (
        <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
            background: color + '22', color, border: `1px solid ${color}66`,
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
        }}>
            {type}
        </span>
    );
}

/**
 * FieldsPicker
 * Props:
 *   attributes: Array<{ name, type, ... }>  - all attributes of the current content type
 *   value: string[]                          - selected field names (requestRules.allowedFields)
 *   onChange: (string[]) => void
 */
export function FieldsPicker({ attributes = [], value = [], onChange }) {
    const [search, setSearch] = useState('');

    const scalars = attributes.filter(a => SCALAR_TYPES.includes(a.type));
    const filtered = scalars.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    const selected = new Set(value);

    const toggle = (name) => {
        if (selected.has(name)) {
            onChange(value.filter(f => f !== name));
        } else {
            onChange([...value, name]);
        }
    };

    const selectAll = () => onChange(filtered.map(a => a.name));
    const clearAll = () => onChange([]);

    if (scalars.length === 0) {
        return (
            <Box padding={3} style={{ background: '#f4f4f8', borderRadius: 6 }}>
                <Typography variant="pi" textColor="neutral400">
                    No scalar fields available. Select a content type first.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Flex gap={2} paddingBottom={2} alignItems="center">
                <Box style={{ flex: 1 }}>
                    <label htmlFor="fp-search" style={{ fontSize: 11, display: 'block', marginBottom: 3, color: '#666' }}>
                        Search fields
                    </label>
                    <input
                        id="fp-search"
                        type="text"
                        placeholder="Filter..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                    />
                </Box>
                <Flex gap={1} style={{ alignSelf: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={selectAll}
                        style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #4945ff', background: '#4945ff11', color: '#4945ff', cursor: 'pointer' }}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', color: '#666', cursor: 'pointer' }}
                    >
                        Clear
                    </button>
                </Flex>
            </Flex>

            <Box style={{ border: '1px solid #e0e0e8', borderRadius: 6, maxHeight: 240, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <Box padding={3}>
                        <Typography variant="pi" textColor="neutral400">No fields match.</Typography>
                    </Box>
                ) : (
                    filtered.map((attr, i) => {
                        const id = `fp-${attr.name}`;
                        const checked = selected.has(attr.name);
                        return (
                            <Flex
                                key={attr.name}
                                alignItems="center"
                                gap={2}
                                style={{
                                    padding: '6px 10px',
                                    borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f4' : 'none',
                                    background: checked ? '#4945ff08' : 'transparent',
                                    cursor: 'pointer',
                                }}
                                onClick={() => toggle(attr.name)}
                            >
                                <input
                                    id={id}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(attr.name)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ cursor: 'pointer', flexShrink: 0 }}
                                />
                                <label htmlFor={id} style={{ flex: 1, cursor: 'pointer', fontSize: 13, fontFamily: 'monospace' }}>
                                    {attr.name}
                                </label>
                                <TypeBadge type={attr.type} />
                                {attr.required && (
                                    <span style={{ fontSize: 10, color: '#c5221f', fontWeight: 700 }}>*</span>
                                )}
                            </Flex>
                        );
                    })
                )}
            </Box>

            {value.length > 0 && (
                <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral500">
                        {value.length} field{value.length !== 1 ? 's' : ''} selected:{' '}
                        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{value.join(', ')}</span>
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
