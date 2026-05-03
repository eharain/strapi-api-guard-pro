import React, { useState } from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { tokens, ghostButtonStyle, neutralButtonStyle, TypeBadge } from '../ui.jsx';

const SCALAR_TYPES = ['string', 'text', 'richtext', 'email', 'password', 'uid', 'enumeration',
    'integer', 'biginteger', 'float', 'decimal', 'boolean', 'date', 'datetime', 'time', 'json', 'blocks'];

const RELATION_TYPES = ['relation', 'component', 'dynamiczone', 'media'];

/**
 * FieldsPicker
 * Props:
 *   attributes:       Array<{ name, type, target?, relation?, ... }> - all attributes of the current content type
 *   value:            string[]  - selected field names
 *   onChange:         (string[]) => void
 *   includeRelations: boolean   - when true, show relation/component/media attrs in addition to scalars (default false)
 *   label:            string    - optional override for empty state label
 */
export function FieldsPicker({ attributes = [], value = [], onChange, includeRelations = false, label }) {
    const [search, setSearch] = useState('');

    const eligible = includeRelations
        ? attributes
        : attributes.filter(a => SCALAR_TYPES.includes(a.type));

    const filtered = eligible.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
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

    const emptyLabel = label || (includeRelations ? 'No fields available.' : 'No scalar fields available.');

    if (eligible.length === 0) {
        return (
            <Box padding={3} style={{ background: tokens.surfaceBg, borderRadius: 6 }}>
                    <Typography variant="pi" textColor="neutral400">
                        {emptyLabel} Select a content type first.
                    </Typography>
                </Box>
        );
    }

    // Group: scalars first, then relations/structural
    const scalarsInFiltered = filtered.filter(a => SCALAR_TYPES.includes(a.type));
    const relationsInFiltered = filtered.filter(a => RELATION_TYPES.includes(a.type));
    const otherInFiltered = filtered.filter(a => !SCALAR_TYPES.includes(a.type) && !RELATION_TYPES.includes(a.type));
    const groups = includeRelations
        ? [
            { label: 'Scalar Fields', items: scalarsInFiltered },
            { label: 'Relations & Components', items: [...relationsInFiltered, ...otherInFiltered] },
          ]
        : [{ label: null, items: filtered }];

    return (
        <Box>
            <Flex gap={2} paddingBottom={2} alignItems="center">
                <Box style={{ flex: 1 }}>
                    <label htmlFor="fp-search" style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 3, color: '#666' }}>
                        Search fields
                    </label>
                    <input
                        id="fp-search"
                        type="text"
                        placeholder="Filter..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, fontSize: tokens.fontBase }}
                    />
                </Box>
                <Flex gap={1} style={{ alignSelf: 'flex-end' }}>
                    <button type="button" onClick={selectAll} style={ghostButtonStyle}>All</button>
                    <button type="button" onClick={clearAll} style={neutralButtonStyle}>Clear</button>
                </Flex>
            </Flex>

            <Box style={{ border: `1px solid #e0e0e8`, borderRadius: 6, maxHeight: 260, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <Box padding={3}>
                        <Typography variant="pi" textColor="neutral400">No fields match.</Typography>
                    </Box>
                ) : (
                    groups.map(group => (
                        group.items.length === 0 ? null : (
                            <Box key={group.label || 'default'}>
                                {group.label && (
                                            <Box style={{ padding: '4px 10px', background: tokens.surfaceBg, borderBottom: '1px solid #e0e0e8' }}>
                                                <Typography variant="pi" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, fontWeight: 700 }}>
                                                    {group.label}
                                                </Typography>
                                            </Box>
                                        )}
                                {group.items.map((attr, i) => {
                                    const id = `fp-${attr.name}`;
                                    const checked = selected.has(attr.name);
                                    const isRelation = RELATION_TYPES.includes(attr.type);
                                    return (
                                        <Flex
                                            key={attr.name}
                                            alignItems="center"
                                            gap={2}
                                            style={{
                                                padding: '6px 10px',
                                                borderBottom: i < group.items.length - 1 ? '1px solid #f0f0f4' : 'none',
                                                background: checked ? `${tokens.primary}08` : 'transparent',
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
                                            <label htmlFor={id} style={{ flex: 1, cursor: 'pointer', fontSize: tokens.fontBase, fontFamily: tokens.monoFont, color: isRelation ? '#0070f3' : 'inherit' }}>
                                                {attr.name}
                                            </label>
                                            <TypeBadge type={attr.type} />
                                            {attr.target && (
                                                <span style={{ fontSize: 10, color: '#888', fontFamily: tokens.monoFont }}>{attr.target}</span>
                                            )}
                                            {attr.required && (
                                                <span style={{ fontSize: 10, color: '#c5221f', fontWeight: 700 }}>*</span>
                                            )}
                                        </Flex>
                                    );
                                })}
                            </Box>
                        )
                    ))
                )}
            </Box>

            {value.length > 0 && (
                <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral500">
                        {value.length} field{value.length !== 1 ? 's' : ''} selected:{' '}
                        <span style={{ fontFamily: tokens.monoFont, fontSize: 11 }}>{value.join(', ')}</span>
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
