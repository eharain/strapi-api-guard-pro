import React from 'react';
import {
    Box,
    Typography,
    Flex,
    TextInput,
    Textarea,
    SingleSelect,
    SingleSelectOption,
    Switch,
    Divider,
} from '@strapi/design-system';

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const RESOURCE_TYPES = ['standard', 'extended', 'alias'];
const EFFECT_OPTIONS = ['allow', 'deny'];

const ensureLeadingSlash = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.startsWith('/') ? raw : `/${raw}`;
};

const deriveRouteName = (method, pathPattern) => {
    const cleanPath = ensureLeadingSlash(pathPattern).replace(/\//g, '.').replace(/[:{}]/g, '').replace(/\.+/g, '.');
    const normalizedPath = cleanPath.replace(/^\./, '') || 'root';
    return `${String(method || 'GET').toLowerCase()}.${normalizedPath}`;
};

const safeJsonStringify = (value, fallback = {}) => {
    try { return JSON.stringify(value ?? fallback, null, 2); } catch { return JSON.stringify(fallback, null, 2); }
};

const parseJsonOrKeep = (text, currentValue, fallback = {}) => {
    try { return JSON.parse(text || JSON.stringify(fallback)); } catch { return currentValue; }
};

function SectionLabel({ text }) {
    return (
        <Box paddingBottom={2} paddingTop={4}>
            <Typography variant="sigma" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {text}
            </Typography>
            <Divider />
        </Box>
    );
}

function ResourceForm({ formData, onChange, domains, resources, strapiTypes, editingRecord }) {
    const set = (patch) => onChange({ ...formData, ...patch });

    const handlePathChange = (rawValue) => {
        const path = ensureLeadingSlash(rawValue);
        const routeName = deriveRouteName(formData.method || 'GET', path);
        set({ pathPattern: path, 'route-name': routeName });
    };

    const handleMethodChange = (method) => {
        const routeName = deriveRouteName(method, formData.pathPattern || '');
        set({ method, 'route-name': routeName });
    };

    const handleJsonField = (field, text) => {
        set({ [field]: parseJsonOrKeep(text, formData[field], {}) });
    };

    const hasRecordedData = formData.recordedRequestRaw && Object.keys(formData.recordedRequestRaw).length > 0;

    return (
        <>
            {/* ── IDENTITY ── */}
            <SectionLabel text="Identity" />
            <Box paddingBottom={4}>
                <TextInput
                    label="Key"
                    name="key"
                    value={formData.key || ''}
                    onChange={e => set({ key: e.target.value })}
                    required
                    hint="Unique dot-separated identifier — letters, numbers, dots only. e.g. api.products.list"
                />
            </Box>
            <Box paddingBottom={4}>
                <TextInput
                    label="Display Name"
                    name="displayName"
                    value={formData.displayName || ''}
                    onChange={e => set({ displayName: e.target.value })}
                    required
                    hint="Human-readable label shown in the UI and policy selectors"
                />
            </Box>
            <Box paddingBottom={4}>
                <Textarea
                    label="Description"
                    name="description"
                    value={formData.description || ''}
                    onChange={e => set({ description: e.target.value })}
                />
            </Box>

            {/* ── TYPE & METHOD ── */}
            <SectionLabel text="Type & Method" />
            <Box paddingBottom={4}>
                <SingleSelect
                    label="Resource Type"
                    value={formData.type || 'standard'}
                    onChange={v => set({ type: v })}
                    hint="standard = direct endpoint · extended = adds rules to existing · alias = clean URL shortcut"
                >
                    {RESOURCE_TYPES.map(opt => (
                        <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                    ))}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect
                    label="HTTP Method"
                    value={formData.method || 'GET'}
                    onChange={handleMethodChange}
                    required
                >
                    {METHOD_OPTIONS.map(opt => (
                        <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                    ))}
                </SingleSelect>
            </Box>

            {/* ── ROUTING ── */}
            <SectionLabel text="Routing" />
            <Box paddingBottom={4}>
                <TextInput
                    label="Path Pattern"
                    value={formData.pathPattern || ''}
                    onChange={e => handlePathChange(e.target.value)}
                    required
                    hint="Must start with / — use :param for dynamic segments. e.g. /api/products/:id"
                />
            </Box>
            {formData.type === 'alias' && (
                <Box paddingBottom={4}>
                    <TextInput
                        label="Alias Path"
                        value={formData.aliasPath || ''}
                        onChange={e => set({ aliasPath: ensureLeadingSlash(e.target.value) })}
                        hint="Clean short URL clients call instead. e.g. /pos/products"
                    />
                </Box>
            )}
            <Box paddingBottom={4}>
                <TextInput
                    label="Route Name"
                    value={formData['route-name'] || ''}
                    onChange={e => set({ 'route-name': e.target.value })}
                    hint="Auto-derived from method + path. Override only if needed."
                />
            </Box>

            {/* ── STRAPI BINDING ── */}
            <SectionLabel text="Strapi Binding" />
            <Box paddingBottom={4}>
                <SingleSelect
                    label="Content Type"
                    value={formData.contentTypeUid || ''}
                    onChange={v => set({ contentTypeUid: v })}
                    hint="Link to the Strapi content type this resource targets"
                >
                    <SingleSelectOption value="">— None —</SingleSelectOption>
                    {strapiTypes.map(type => (
                        <SingleSelectOption key={type.uid} value={type.uid}>{type.displayName} ({type.uid})</SingleSelectOption>
                    ))}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <TextInput
                    label="Controller Action"
                    value={formData.controllerAction || ''}
                    onChange={e => set({ controllerAction: e.target.value })}
                    hint="e.g. api::product.product.find — auto-filled when created from Builder"
                />
            </Box>

            {/* ── SCOPE & VISIBILITY ── */}
            <SectionLabel text="Scope & Visibility" />
            <Box paddingBottom={4}>
                <SingleSelect
                    label="Domain"
                    value={formData.domain ? String(formData.domain) : ''}
                    onChange={v => set({ domain: v || null })}
                    hint="Restrict to a specific domain. Leave empty for global."
                >
                    <SingleSelectOption value="">— Global (no domain) —</SingleSelectOption>
                    {domains.map(d => (
                        <SingleSelectOption key={d.id} value={String(d.id)}>{d.key || d.name || d.displayName || `#${d.id}`}</SingleSelectOption>
                    ))}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect
                    label="Parent Resource"
                    value={formData.parentResource ? String(formData.parentResource) : ''}
                    onChange={v => set({ parentResource: v || null })}
                    hint="Optional — group this resource under a parent"
                >
                    <SingleSelectOption value="">— None —</SingleSelectOption>
                    {resources.filter(r => r.id !== editingRecord?.id).map(r => (
                        <SingleSelectOption key={r.id} value={String(r.id)}>{r.key || r.displayName || `#${r.id}`}</SingleSelectOption>
                    ))}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect
                    label="Default Effect"
                    value={formData.effect || 'allow'}
                    onChange={v => set({ effect: v })}
                    hint="allow = permit matched requests · deny = block by default"
                >
                    {EFFECT_OPTIONS.map(opt => (
                        <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                    ))}
                </SingleSelect>
            </Box>
            <Flex gap={6} paddingBottom={4}>
                <Switch
                    label="Public (no auth required)"
                    selected={formData.isPublic === true}
                    onChange={() => set({ isPublic: !formData.isPublic })}
                />
                <Switch
                    label="Active"
                    selected={formData.isActive !== false}
                    onChange={() => set({ isActive: !formData.isActive })}
                />
            </Flex>

            {/* ── REQUEST RULES ── */}
            <SectionLabel text="Request Rules" />
            <Box paddingBottom={2}>
                <Typography variant="pi" textColor="neutral500">
                    Applied before the controller runs. Keys: <code>filters</code>, <code>dynamicFilters</code>, <code>forceBody</code>, <code>stripBodyFields</code>, <code>allowedFields</code>, <code>forcePopulate</code>, <code>allowedPopulate</code>, <code>injectHeaders</code>
                </Typography>
            </Box>
            <Box paddingBottom={4}>
                <Textarea
                    label="requestRules (JSON)"
                    value={safeJsonStringify(formData.requestRules, {})}
                    onChange={e => handleJsonField('requestRules', e.target.value)}
                    hint='e.g. { "filters": { "isActive": true }, "stripBodyFields": ["internalNote"] }'
                />
            </Box>
            <Box paddingBottom={4}>
                <Textarea
                    label="requestMutation (JSON)"
                    value={safeJsonStringify(formData.requestMutation, {})}
                    onChange={e => handleJsonField('requestMutation', e.target.value)}
                    hint="Transform query params or body before forwarding to Strapi"
                />
            </Box>
            <Box paddingBottom={4}>
                <Textarea
                    label="matchCriteria (JSON)"
                    value={safeJsonStringify(formData.matchCriteria, {})}
                    onChange={e => handleJsonField('matchCriteria', e.target.value)}
                    hint="Extra matching conditions such as required headers or query params"
                />
            </Box>

            {/* ── RESPONSE RULES ── */}
            <SectionLabel text="Response Rules" />
            <Box paddingBottom={2}>
                <Typography variant="pi" textColor="neutral500">
                    Applied after the controller responds. Keys: <code>filterFields</code>, <code>stripFields</code>
                </Typography>
            </Box>
            <Box paddingBottom={4}>
                <Textarea
                    label="responseRules (JSON)"
                    value={safeJsonStringify(formData.responseRules, {})}
                    onChange={e => handleJsonField('responseRules', e.target.value)}
                    hint='e.g. { "filterFields": ["id", "name", "price"] }'
                />
            </Box>
            <Box paddingBottom={4}>
                <Textarea
                    label="responseMutation (JSON)"
                    value={safeJsonStringify(formData.responseMutation, {})}
                    onChange={e => handleJsonField('responseMutation', e.target.value)}
                    hint="Post-process response shape before returning to client"
                />
            </Box>

            {/* ── RECORDED DATA (read-only) ── */}
            {hasRecordedData && (
                <>
                    <SectionLabel text="Recorded Request Data (read-only)" />
                    <Box paddingBottom={2}>
                        <Typography variant="pi" textColor="neutral500">
                            Captured by the recorder. Use as a reference when writing request rules above.
                        </Typography>
                    </Box>
                    <Box paddingBottom={3}>
                        <Typography variant="pi" textColor="neutral600">Raw</Typography>
                        <Box
                            padding={3}
                            style={{
                                background: 'var(--strapi-colors-neutral100, #f4f4f8)',
                                borderRadius: 6, fontFamily: 'monospace', fontSize: 12,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto', marginTop: 4
                            }}
                        >
                            {safeJsonStringify(formData.recordedRequestRaw, {})}
                        </Box>
                    </Box>
                    <Box paddingBottom={4}>
                        <Typography variant="pi" textColor="neutral600">Parsed</Typography>
                        <Box
                            padding={3}
                            style={{
                                background: 'var(--strapi-colors-neutral100, #f4f4f8)',
                                borderRadius: 6, fontFamily: 'monospace', fontSize: 12,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto', marginTop: 4
                            }}
                        >
                            {safeJsonStringify(formData.recordedRequestParsed, {})}
                        </Box>
                    </Box>
                </>
            )}
        </>
    );
}

export default ResourceForm;
