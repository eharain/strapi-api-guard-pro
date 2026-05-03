/**
 * Shared UI primitives for the strapi-api-guard-pro admin.
 *
 * All form inputs, labels, section titles, collapsibles, and editor helpers
 * live here so every page and query-builder component shares one look-and-feel
 * that stays aligned with the Strapi Design System conventions.
 *
 * Import what you need:
 *   import { FormInput, FormSelect, SectionLabel, ... } from '../../components/ui';
 */
import React, { useState } from 'react';
import {
    Box,
    Flex,
    Typography,
    Divider,
} from '@strapi/design-system';

// ---------------------------------------------------------------------------
// Design tokens — one place to tweak spacing, colours, radii
// ---------------------------------------------------------------------------
export const tokens = {
    /** Primary brand colour (Strapi indigo) */
    primary: '#4945ff',
    /** Danger / remove colour */
    danger: '#c5221f',
    /** Neutral border */
    border: '#ddd',
    /** Subtle background (surface-level tint) */
    surfaceBg: '#f4f4f8',
    /** Subtle primary tint for chip / add-button backgrounds */
    primaryTint: '#4945ff11',
    /** Radius for most controls */
    radius: 4,
    /** Font sizes */
    fontSm: 11,
    fontBase: 13,
    /** Monospace stack */
    monoFont: 'monospace',
};

// ---------------------------------------------------------------------------
// Input base styles — applied to <input>, <select>, <textarea>
// ---------------------------------------------------------------------------
export const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${tokens.border}`,
    borderRadius: tokens.radius,
    fontSize: tokens.fontBase,
    fontFamily: 'inherit',
    color: '#32324d',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
    appearance: 'auto',
};

export const monoInputStyle = { ...inputStyle, fontFamily: tokens.monoFont };

export const labelStyle = {
    fontSize: 12,
    display: 'block',
    marginBottom: 4,
    fontWeight: 600,
    color: '#32324d',
};

export const hintStyle = {
    fontSize: tokens.fontSm,
    color: '#8e8ea9',
    marginTop: 3,
    display: 'block',
};

// ---------------------------------------------------------------------------
// FormField — wrapper that renders a label and an optional hint
// ---------------------------------------------------------------------------
export function FormField({ label, hint, required, children, htmlFor }) {
    const star = required ? <span style={{ color: tokens.danger }}> *</span> : null;
    return (
        <Box>
            {label && (
                <label htmlFor={htmlFor} style={labelStyle}>
                    {label}{star}
                </label>
            )}
            {children}
            {hint && <span style={hintStyle}>{hint}</span>}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// FormInput — single-line text input
// ---------------------------------------------------------------------------
export function FormInput({ label, hint, required, value, onChange, placeholder, monospace, name, id, type = 'text', ...rest }) {
    const inputId = id || name;
    return (
        <FormField label={label} hint={hint} required={required} htmlFor={inputId}>
            <input
                id={inputId}
                name={name}
                type={type}
                value={value ?? ''}
                onChange={onChange}
                placeholder={placeholder || ''}
                style={monospace ? monoInputStyle : inputStyle}
                {...rest}
            />
        </FormField>
    );
}

// ---------------------------------------------------------------------------
// FormTextarea — multi-line text area
// ---------------------------------------------------------------------------
export function FormTextarea({ label, hint, required, value, onChange, placeholder, minHeight, id }) {
    return (
        <FormField label={label} hint={hint} required={required} htmlFor={id}>
            <textarea
                id={id}
                value={value ?? ''}
                onChange={onChange}
                placeholder={placeholder || ''}
                style={{ ...inputStyle, minHeight: minHeight || 88, resize: 'vertical', lineHeight: 1.5 }}
            />
        </FormField>
    );
}

// ---------------------------------------------------------------------------
// FormSelect — <select> with label + hint
// ---------------------------------------------------------------------------
export function FormSelect({ label, hint, required, value, onChange, children, id }) {
    return (
        <FormField label={label} hint={hint} required={required} htmlFor={id}>
            <select
                id={id}
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
            >
                {children}
            </select>
        </FormField>
    );
}

// ---------------------------------------------------------------------------
// SmallInput — compact single-line input for inline use (sort, pagination, etc.)
// ---------------------------------------------------------------------------
export const smallInputStyle = {
    padding: '5px 8px',
    border: `1px solid ${tokens.border}`,
    borderRadius: tokens.radius,
    fontSize: tokens.fontBase,
    fontFamily: 'inherit',
    color: '#32324d',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
};

export function SmallInput({ id, type = 'text', value, onChange, placeholder, width, style, ...rest }) {
    return (
        <input
            id={id}
            type={type}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder || ''}
            style={{ ...smallInputStyle, width: width || 90, ...style }}
            {...rest}
        />
    );
}

export function SmallSelect({ id, value, onChange, children, style }) {
    return (
        <select
            id={id}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            style={{ ...smallInputStyle, cursor: 'pointer', ...style }}
        >
            {children}
        </select>
    );
}

// ---------------------------------------------------------------------------
// FieldLabel — compact label for inline controls
// ---------------------------------------------------------------------------
export function FieldLabel({ htmlFor, children }) {
    return (
        <label htmlFor={htmlFor} style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 2, color: '#666', fontWeight: 600 }}>
            {children}
        </label>
    );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

/** Primary ghost button (branded outline) */
export const ghostButtonStyle = {
    fontSize: tokens.fontSm,
    padding: '5px 10px',
    borderRadius: tokens.radius,
    border: `1px solid ${tokens.primary}`,
    background: tokens.primaryTint,
    color: tokens.primary,
    cursor: 'pointer',
};

/** Danger / remove button */
export const removeButtonStyle = {
    padding: '5px 10px',
    border: `1px solid #e0e0e8`,
    borderRadius: tokens.radius,
    background: '#fff',
    color: tokens.danger,
    cursor: 'pointer',
    fontSize: tokens.fontSm,
};

/** Secondary neutral button */
export const neutralButtonStyle = {
    fontSize: tokens.fontSm,
    padding: '4px 8px',
    borderRadius: tokens.radius,
    border: `1px solid ${tokens.border}`,
    background: '#fff',
    color: '#666',
    cursor: 'pointer',
};

/** Toggle button (active / inactive states) */
export function ToggleButton({ active, onClick, children, style }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                fontSize: tokens.fontBase,
                padding: '4px 12px',
                border: `1px solid ${tokens.border}`,
                cursor: 'pointer',
                background: active ? tokens.primary : '#fff',
                color: active ? '#fff' : '#555',
                fontWeight: active ? 700 : 400,
                ...style,
            }}
        >
            {children}
        </button>
    );
}

/** Full-width dashed add-row button */
export function AddRowButton({ onClick, disabled, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                fontSize: tokens.fontBase,
                padding: '6px 14px',
                borderRadius: tokens.radius,
                border: `1px dashed ${tokens.primary}`,
                background: tokens.primaryTint,
                color: tokens.primary,
                cursor: disabled ? 'not-allowed' : 'pointer',
                width: '100%',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            {children}
        </button>
    );
}

// ---------------------------------------------------------------------------
// SectionLabel — uppercase section heading with divider
// ---------------------------------------------------------------------------
export function SectionLabel({ text, hint }) {
    return (
        <Box paddingBottom={2} paddingTop={4}>
            <Flex alignItems="baseline" gap={2}>
                <Typography variant="sigma" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    {text}
                </Typography>
                {hint && <Typography variant="pi" textColor="neutral400">{hint}</Typography>}
            </Flex>
            <Divider />
        </Box>
    );
}

// ---------------------------------------------------------------------------
// SubLabel — smaller secondary heading above a control group
// ---------------------------------------------------------------------------
export function SubLabel({ text, hint }) {
    return (
        <Box paddingBottom={1} paddingTop={3}>
            <Flex alignItems="baseline" gap={2}>
                <Typography variant="pi" fontWeight="semiBold" textColor="neutral700">{text}</Typography>
                {hint && <Typography variant="pi" textColor="neutral400">{hint}</Typography>}
            </Flex>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Collapsible — expandable section
// ---------------------------------------------------------------------------
export function Collapsible({ title, defaultOpen = false, children, badge }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Box paddingTop={3}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}
            >
                <span style={{ fontSize: 10, color: tokens.primary, fontWeight: 700 }}>{open ? 'v' : '>'}</span>
                <Typography variant="sigma" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
                {badge && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: tokens.primaryTint, color: tokens.primary, fontWeight: 700, marginLeft: 4 }}>
                        {badge}
                    </span>
                )}
            </button>
            <Divider />
            {open && <Box paddingTop={2}>{children}</Box>}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// TabBar — horizontal pill-less tab navigation
// ---------------------------------------------------------------------------
const tabStyle = (active) => ({
    padding: '8px 18px',
    border: 'none',
    cursor: 'pointer',
    fontSize: tokens.fontBase,
    fontWeight: active ? 700 : 400,
    borderBottom: active ? `2px solid ${tokens.primary}` : '2px solid transparent',
    color: active ? tokens.primary : '#666',
    background: 'none',
    borderRadius: 0,
});

export function TabBar({ tabs, active, onChange }) {
    return (
        <Flex style={{ borderBottom: '1px solid #e0e0e8', marginBottom: 16 }}>
            {tabs.map(t => (
                <button key={t.key} type="button" style={tabStyle(active === t.key)} onClick={() => onChange(t.key)}>
                    {t.label}
                    {t.badge ? (
                        <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${tokens.primary}22`, color: tokens.primary, fontWeight: 700 }}>
                            {t.badge}
                        </span>
                    ) : null}
                </button>
            ))}
        </Flex>
    );
}

// ---------------------------------------------------------------------------
// TagListEditor — a list of string tags entered via keyboard
// ---------------------------------------------------------------------------
export function TagListEditor({ value = [], onChange, placeholder = 'Enter value and press Enter' }) {
    const [input, setInput] = useState('');
    const items = Array.isArray(value) ? value : [];

    const commit = () => {
        const trimmed = input.trim();
        if (trimmed && !items.includes(trimmed)) onChange([...items, trimmed]);
        setInput('');
    };

    return (
        <Box>
            <Flex gap={1} wrap="wrap" paddingBottom={1}>
                {items.map(item => (
                    <span key={item} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 12,
                        background: tokens.primaryTint, border: `1px solid ${tokens.primary}44`,
                        fontSize: 12, fontFamily: tokens.monoFont,
                    }}>
                        {item}
                        <button
                            type="button"
                            onClick={() => onChange(items.filter(i => i !== item))}
                            style={{ border: 'none', background: 'none', color: tokens.danger, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
                        >x</button>
                    </span>
                ))}
            </Flex>
            <Flex gap={2}>
                <input
                    type="text"
                    value={input}
                    placeholder={placeholder}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
                    style={{ ...inputStyle, fontFamily: tokens.monoFont }}
                />
                <button type="button" onClick={commit} style={ghostButtonStyle}>Add</button>
            </Flex>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// KeyValueEditor — editable key→value rows
// ---------------------------------------------------------------------------
export function KeyValueEditor({ value = {}, onChange, keyPlaceholder = 'key', valuePlaceholder = 'value', hint }) {
    const entries = Object.entries(value || {});

    const update = (idx, k, v) => {
        const next = {};
        entries.forEach(([ek, ev], i) => { next[i === idx ? k : ek] = i === idx ? v : ev; });
        onChange(Object.keys(next).length > 0 ? next : undefined);
    };

    const add = () => onChange({ ...(value || {}), '': '' });

    const remove = (idx) => {
        const next = {};
        entries.forEach(([k, v], i) => { if (i !== idx) next[k] = v; });
        onChange(Object.keys(next).length > 0 ? next : undefined);
    };

    return (
        <Box>
            {entries.map(([k, v], idx) => (
                <Flex key={idx} gap={2} paddingBottom={2} alignItems="center">
                    <input
                        type="text"
                        placeholder={keyPlaceholder}
                        value={k}
                        onChange={e => update(idx, e.target.value, v)}
                        style={{ ...inputStyle, fontFamily: tokens.monoFont, flex: 1 }}
                    />
                    <input
                        type="text"
                        placeholder={valuePlaceholder}
                        value={String(v || '')}
                        onChange={e => update(idx, k, e.target.value)}
                        style={{ ...inputStyle, fontFamily: tokens.monoFont, flex: 2 }}
                    />
                    <button type="button" onClick={() => remove(idx)} style={removeButtonStyle}>x</button>
                </Flex>
            ))}
            <button type="button" onClick={add} style={ghostButtonStyle}>+ Add row</button>
            {hint && <Box paddingTop={1}><Typography variant="pi" textColor="neutral400" style={{ fontSize: tokens.fontSm }}>{hint}</Typography></Box>}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// TypeBadge — coloured attribute-type pill (reused by FieldsPicker, PopulateBuilder, etc.)
// ---------------------------------------------------------------------------
export const TYPE_COLORS = {
    string: '#4945ff', text: '#4945ff', richtext: '#4945ff', email: '#0c75af', password: '#c5221f',
    uid: '#945af2', enumeration: '#bf5af2', integer: '#2ecc71', biginteger: '#2ecc71',
    float: '#27ae60', decimal: '#27ae60', boolean: '#f39c12', date: '#e67e22', datetime: '#e67e22',
    time: '#e67e22', json: '#95a5a6', blocks: '#7f8c8d',
    relation: '#0070f3', component: '#7928ca', dynamiczone: '#ff4ecd', media: '#f5a623',
};

export function TypeBadge({ type }) {
    const color = TYPE_COLORS[type] || '#888';
    return (
        <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
            background: `${color}22`, color, border: `1px solid ${color}66`,
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
        }}>
            {type}
        </span>
    );
}

// ---------------------------------------------------------------------------
// CodeBlock — monospaced read-only preview box
// ---------------------------------------------------------------------------
export function CodeBlock({ children, maxHeight }) {
    return (
        <Box padding={2} style={{
            background: tokens.surfaceBg, borderRadius: 6,
            fontFamily: tokens.monoFont, fontSize: 11,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            maxHeight: maxHeight || undefined, overflowY: maxHeight ? 'auto' : undefined,
            marginTop: 4,
        }}>
            {children}
        </Box>
    );
}
