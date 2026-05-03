import React, { useState } from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';

const OPERATORS = [
    { value: '$eq', label: '= equals' },
    { value: '$ne', label: '- not equals' },
    { value: '$lt', label: '< less than' },
    { value: '$lte', label: '- less or equal' },
    { value: '$gt', label: '> greater than' },
    { value: '$gte', label: '- greater or equal' },
    { value: '$contains', label: '- contains' },
    { value: '$notContains', label: '- not contains' },
    { value: '$startsWith', label: '- starts with' },
    { value: '$endsWith', label: '- ends with' },
    { value: '$in', label: '- in list' },
    { value: '$notIn', label: '- not in list' },
    { value: '$null', label: '- is null' },
    { value: '$notNull', label: '- is not null' },
    { value: '$between', label: '- between' },
];

const RELATION_TYPES = ['relation', 'component'];
const NO_VALUE_OPS = ['$null', '$notNull'];

// -- Deep-set a value in a nested object by dotted path -----------------------
function deepSet(obj, pathParts, operator, value) {
    if (pathParts.length === 1) {
        return { ...obj, [pathParts[0]]: { ...obj?.[pathParts[0]], [operator]: value } };
    }
    const [head, ...rest] = pathParts;
    return { ...obj, [head]: deepSet(obj?.[head] || {}, rest, operator, value) };
}

function deepDelete(obj, pathParts, operator) {
    if (pathParts.length === 1) {
        const entry = { ...(obj?.[pathParts[0]] || {}) };
        delete entry[operator];
        if (Object.keys(entry).length === 0) {
            const next = { ...obj };
            delete next[pathParts[0]];
            return next;
        }
        return { ...obj, [pathParts[0]]: entry };
    }
    const [head, ...rest] = pathParts;
    const child = deepDelete(obj?.[head] || {}, rest, operator);
    if (Object.keys(child).length === 0) {
        const next = { ...obj };
        delete next[head];
        return next;
    }
    return { ...obj, [head]: child };
}

// -- Flatten a Strapi filter object to rows: [{ path[], operator, value }] ----
function flattenFilters(obj, pathSoFar = []) {
    const rows = [];
    if (!obj || typeof obj !== 'object') return rows;
    Object.entries(obj).forEach(([key, val]) => {
        if (key.startsWith('$') && typeof val !== 'object') {
            rows.push({ path: pathSoFar, operator: key, value: val });
        } else if (key.startsWith('$') && key === '$null' || key === '$notNull') {
            rows.push({ path: pathSoFar, operator: key, value: val });
        } else if (key.startsWith('$') && typeof val === 'object') {
            // e.g. $in: [...]
            rows.push({ path: pathSoFar, operator: key, value: val });
        } else if (typeof val === 'object' && !Array.isArray(val)) {
            // nested: could be { $eq: x } or { nestedField: { $eq: x } }
            const hasOps = Object.keys(val).some(k => k.startsWith('$'));
            if (hasOps) {
                rows.push(...flattenFilters(val, [...pathSoFar, key]));
            } else {
                rows.push(...flattenFilters(val, [...pathSoFar, key]));
            }
        } else {
            rows.push({ path: pathSoFar, operator: '$eq', value: val });
        }
    });
    return rows;
}

// -- FieldPathSelector --------------------------------------------------------
function FieldPathSelector({ attributes, allTypes, selectedPath, onSelect }) {
    const [path, setPath] = useState(selectedPath || []);
    const [segments, setSegments] = useState(() => {
        // Build segments list: [{attrs}] per level
        return [attributes];
    });

    const selectSegment = (levelIdx, attrName, attr) => {
        const newPath = [...path.slice(0, levelIdx), attrName];
        const newSegments = segments.slice(0, levelIdx + 1);

        if (RELATION_TYPES.includes(attr.type)) {
            const targetUid = attr.target || attr.component;
            const targetCt = targetUid ? allTypes.get(targetUid) : null;
            if (targetCt) {
                newSegments.push(targetCt.attributes);
            }
        }

        setPath(newPath);
        setSegments(newSegments);
        onSelect(newPath, attr);
    };

    return (
        <Box style={{ border: '1px solid #e0e0e8', borderRadius: 6, overflow: 'hidden' }}>
            <Flex style={{ overflowX: 'auto' }}>
                {segments.map((segAttrs, levelIdx) => (
                    <Box
                        key={levelIdx}
                        style={{
                            minWidth: 160, borderRight: levelIdx < segments.length - 1 ? '1px solid #e0e0e8' : 'none',
                            maxHeight: 200, overflowY: 'auto', flexShrink: 0,
                        }}
                    >
                        {levelIdx > 0 && (
                            <Box style={{ padding: '3px 8px', background: '#f4f4f8', borderBottom: '1px solid #e0e0e8' }}>
                                <Typography variant="pi" textColor="neutral400" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                                    - {path[levelIdx - 1]}
                                </Typography>
                            </Box>
                        )}
                        {segAttrs.filter(a => a.name !== 'id').map(attr => {
                            const isSelected = path[levelIdx] === attr.name;
                            const isRelation = RELATION_TYPES.includes(attr.type);
                            return (
                                <div
                                    key={attr.name}
                                    onClick={() => selectSegment(levelIdx, attr.name, attr)}
                                    style={{
                                        padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                                        fontFamily: 'monospace',
                                        background: isSelected ? '#4945ff' : 'transparent',
                                        color: isSelected ? '#fff' : '#333',
                                        borderBottom: '1px solid #f0f0f4',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    <span style={{ flex: 1 }}>{attr.name}</span>
                                    {isRelation && <span style={{ fontSize: 9, opacity: 0.7 }}>-</span>}
                                </div>
                            );
                        })}
                    </Box>
                ))}
            </Flex>
        </Box>
    );
}

// -- Single filter row --------------------------------------------------------
function FilterRow({ row, idx, attributes, allTypes, onUpdate, onRemove }) {
    const [editingPath, setEditingPath] = useState(false);
    const noVal = NO_VALUE_OPS.includes(row.operator);

    const parameterized = typeof row.value === 'string' && (
        row.value.startsWith(':') || row.value.startsWith('$auth') || row.value.startsWith('$user')
    );

    const pathLabel = row.path.length > 0 ? row.path.join(' - ') : '- pick field -';

    return (
        <Box style={{ border: '1px solid #e0e0e8', borderRadius: 6, padding: 10, marginBottom: 8, background: '#fafafa' }}>
            <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box style={{ flex: 1, minWidth: 0 }}>
                    {/* Field path breadcrumb */}
                    <Flex gap={2} alignItems="center" paddingBottom={1} wrap="wrap">
                        <Typography variant="pi" textColor="neutral500" style={{ flexShrink: 0 }}>Field:</Typography>
                        <button
                            type="button"
                            onClick={() => setEditingPath(v => !v)}
                            style={{
                                fontSize: 12, fontFamily: 'monospace', padding: '2px 8px',
                                borderRadius: 4, border: '1px solid #4945ff',
                                background: editingPath ? '#4945ff' : '#fff',
                                color: editingPath ? '#fff' : '#4945ff', cursor: 'pointer',
                            }}
                        >
                            {pathLabel}
                        </button>
                    </Flex>

                    {editingPath && (
                        <Box paddingBottom={2}>
                            <FieldPathSelector
                                attributes={attributes}
                                allTypes={allTypes}
                                selectedPath={row.path}
                                onSelect={(newPath) => {
                                    onUpdate({ ...row, path: newPath });
                                    setEditingPath(false);
                                }}
                            />
                        </Box>
                    )}

                    <Flex gap={2} alignItems="center" wrap="wrap">
                        {/* Operator */}
                        <Box>
                            <label htmlFor={`op-${idx}`} style={{ fontSize: 10, display: 'block', marginBottom: 2, color: '#888' }}>Operator</label>
                            <select
                                id={`op-${idx}`}
                                value={row.operator}
                                onChange={e => onUpdate({ ...row, operator: e.target.value, value: NO_VALUE_OPS.includes(e.target.value) ? true : row.value })}
                                style={{ padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
                            >
                                {OPERATORS.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>
                        </Box>

                        {/* Value */}
                        {!noVal && (
                            <Box style={{ flex: 1, minWidth: 120 }}>
                                <Flex gap={1} alignItems="center" style={{ marginBottom: 2 }}>
                                    <label htmlFor={`val-${idx}`} style={{ fontSize: 10, color: '#888' }}>Value</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (parameterized) {
                                                onUpdate({ ...row, value: '' });
                                            } else {
                                                onUpdate({ ...row, value: ':param' });
                                            }
                                        }}
                                        title={parameterized ? 'Switch to static value' : 'Switch to runtime parameter (:param or $auth.id)'}
                                        style={{
                                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                                            border: `1px solid ${parameterized ? '#945af2' : '#ddd'}`,
                                            background: parameterized ? '#945af222' : '#fff',
                                            color: parameterized ? '#945af2' : '#888', cursor: 'pointer',
                                        }}
                                    >
                                        {parameterized ? '- param' : '- static'}
                                    </button>
                                </Flex>
                                <input
                                    id={`val-${idx}`}
                                    type="text"
                                    value={
                                        Array.isArray(row.value) ? row.value.join(', ') : String(row.value ?? '')
                                    }
                                    placeholder={
                                        parameterized
                                            ? ':paramName or $auth.id'
                                            : row.operator === '$in' ? 'val1, val2, val3' : 'value'
                                    }
                                    onChange={e => {
                                        const raw = e.target.value;
                                        let parsed = raw;
                                        if (row.operator === '$in' || row.operator === '$notIn' || row.operator === '$between') {
                                            parsed = raw.split(',').map(s => s.trim()).filter(Boolean);
                                        }
                                        onUpdate({ ...row, value: parsed });
                                    }}
                                    style={{
                                        width: '100%', padding: '4px 8px', borderRadius: 4, fontSize: 12,
                                        border: `1px solid ${parameterized ? '#945af2' : '#ddd'}`,
                                        background: parameterized ? '#945af208' : '#fff',
                                        fontFamily: parameterized ? 'monospace' : 'inherit',
                                    }}
                                />
                                {parameterized && (
                                    <Typography variant="pi" textColor="neutral400" style={{ fontSize: 10, marginTop: 2 }}>
                                        Runtime resolved - use <code>:paramName</code> for path/query params, <code>$auth.id</code> for auth context
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Flex>
                </Box>

                <button
                    type="button"
                    onClick={onRemove}
                    style={{ fontSize: 16, color: '#c5221f', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}
                    title="Remove filter"
                >
                    -
                </button>
            </Flex>
        </Box>
    );
}

// -- Main FiltersBuilder ------------------------------------------------------
/**
 * FiltersBuilder
 * Props:
 *   attributes:  Array<{ name, type, target, ... }> - root CT attributes
 *   allTypes:    Map<uid, { uid, displayName, attributes[] }>
 *   value:       Object - requestRules.filters (Strapi filter shape)
 *   onChange:    (newFilters: Object) => void
 */
export function FiltersBuilder({ attributes = [], allTypes = new Map(), value, onChange }) {
    const [rows, setRows] = useState(() => flattenFilters(value || {}));

    const rebuildAndEmit = (newRows) => {
        setRows(newRows);
        // Rebuild filter object from rows
        let result = {};
        newRows.forEach(row => {
            if (row.path.length === 0) return;
            result = deepSet(result, row.path, row.operator, row.value);
        });
        onChange(result);
    };

    const addRow = () => {
        const newRows = [...rows, { path: [], operator: '$eq', value: '' }];
        rebuildAndEmit(newRows);
    };

    const updateRow = (idx, updated) => {
        const newRows = rows.map((r, i) => (i === idx ? updated : r));
        rebuildAndEmit(newRows);
    };

    const removeRow = (idx) => {
        const newRows = rows.filter((_, i) => i !== idx);
        rebuildAndEmit(newRows);
    };

    if (attributes.length === 0) {
        return (
            <Box padding={3} style={{ background: '#f4f4f8', borderRadius: 6 }}>
                <Typography variant="pi" textColor="neutral400">
                    Select a content type to build filters.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {rows.map((row, idx) => (
                <FilterRow
                    key={idx}
                    row={row}
                    idx={idx}
                    attributes={attributes}
                    allTypes={allTypes}
                    onUpdate={updated => updateRow(idx, updated)}
                    onRemove={() => removeRow(idx)}
                />
            ))}

            <button
                type="button"
                onClick={addRow}
                style={{
                    fontSize: 12, padding: '6px 14px', borderRadius: 6,
                    border: '1px dashed #4945ff', background: '#4945ff08',
                    color: '#4945ff', cursor: 'pointer', width: '100%',
                }}
            >
                + Add Filter
            </button>

            {rows.length > 0 && (
                <Box paddingTop={2} style={{ background: '#f4f4f8', borderRadius: 6, padding: 8, marginTop: 6 }}>
                    <Typography variant="pi" textColor="neutral500" style={{ fontSize: 10 }}>
                        Preview:{'  '}
                        <code style={{ fontSize: 10, wordBreak: 'break-all' }}>
                            {JSON.stringify(value || {}, null, 0)}
                        </code>
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
