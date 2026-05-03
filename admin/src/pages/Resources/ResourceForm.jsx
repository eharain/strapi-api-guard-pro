import React, { useState, useMemo } from 'react';
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
import { FieldsPicker } from '../../components/QueryBuilders/FieldsPicker.jsx';
import { PopulateBuilder } from '../../components/QueryBuilders/PopulateBuilder.jsx';
import { FiltersBuilder } from '../../components/QueryBuilders/FiltersBuilder.jsx';
import { SortBuilder } from '../../components/QueryBuilders/SortBuilder.jsx';
import { PaginationEditor } from '../../components/QueryBuilders/PaginationEditor.jsx';

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const RESOURCE_TYPES = ['standard', 'extended', 'alias'];
const EFFECT_OPTIONS = ['allow', 'deny'];
const STATUS_OPTIONS = ['', 'published', 'draft'];

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

// Heuristic: replace path segments that look like IDs (UUIDs, long alphanumeric doc IDs, pure numbers)
const ID_PATTERN = /\/([a-z0-9]{8,}(?:-[a-z0-9]+)*|[0-9]+)(?=\/|$)/gi;
const convertUrlToRoutePattern = (url) => {
    // Strip query string
    const path = ensureLeadingSlash(url.split('?')[0].trim());
    return path.replace(ID_PATTERN, '/:id');
};

// ------ Section header ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
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

// ------ Collapsible section ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
function CollapsibleSection({ title, defaultOpen = true, children, badge }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Box paddingTop={4}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6,
                }}
            >
                <span style={{ fontSize: 10, color: '#4945ff', fontWeight: 700 }}>{open ? '---' : '---'}</span>
                <Typography variant="sigma" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    {title}
                </Typography>
                {badge && (
                    <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 10,
                        background: '#4945ff22', color: '#4945ff', fontWeight: 700, marginLeft: 4,
                    }}>
                        {badge}
                    </span>
                )}
            </button>
            <Divider />
            {open && <Box paddingTop={2}>{children}</Box>}
        </Box>
    );
}

// ------ Sub-section label (inside Request Rules) ------------------------------------------------------------------------------------------------------
function SubLabel({ text, hint }) {
    return (
        <Box paddingBottom={1} paddingTop={3}>
            <Flex alignItems="baseline" gap={2}>
                <Typography variant="pi" fontWeight="semiBold" textColor="neutral700">{text}</Typography>
                {hint && <Typography variant="pi" textColor="neutral400">{hint}</Typography>}
            </Flex>
        </Box>
    );
}

// ------ Main ResourceForm ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function ResourceForm({ formData, onChange, domains, resources, strapiTypes, editingRecord }) {
    const set = (patch) => onChange({ ...formData, ...patch });

    // Build allContentTypes map: uid --- { uid, displayName, attributes[] }
    const allContentTypes = useMemo(() => {
        const map = new Map();
        (strapiTypes || []).forEach(ct => map.set(ct.uid, ct));
        return map;
    }, [strapiTypes]);

    // Current content type attributes (full objects)
    const currentCt = formData.contentTypeUid ? allContentTypes.get(formData.contentTypeUid) : null;
    const currentAttributes = currentCt?.attributes || [];

    // requestRules sub-key helper
    const rr = formData.requestRules || {};
    const setRR = (key, val) => set({ requestRules: { ...rr, [key]: val } });

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

    const handleConvertUrl = () => {
        const converted = convertUrlToRoutePattern(formData.pathPattern || '');
        const routeName = deriveRouteName(formData.method || 'GET', converted);
        set({ pathPattern: converted, 'route-name': routeName });
    };

    const hasRecordedData = formData.recordedRequestRaw && Object.keys(formData.recordedRequestRaw).length > 0;
    const recordedParsedQueryRules = formData.recordedParsedQueryRules || {};
    const hasRecordedQueryParams = Object.keys(recordedParsedQueryRules).length > 0;

    // Count active requestRules keys for badge
    const rrKeys = Object.keys(rr).filter(k => {
        const v = rr[k];
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return !!v;
    });

    return (
        <>
            {/* ------ IDENTITY ------ */}
            <SectionLabel text="Identity" />
            <Flex gap={4} wrap="wrap" paddingBottom={2}>
                <Box style={{ flex: '1 1 220px' }}>
                    <Box paddingBottom={4}>
                        <TextInput
                            label="Key"
                            name="key"
                            value={formData.key || ''}
                            onChange={e => set({ key: e.target.value })}
                            required
                            hint="Unique dot-separated identifier. e.g. api.products.list"
                        />
                    </Box>
                    <Box paddingBottom={4}>
                        <TextInput
                            label="Display Name"
                            name="displayName"
                            value={formData.displayName || ''}
                            onChange={e => set({ displayName: e.target.value })}
                            required
                            hint="Human-readable label shown in the UI"
                        />
                    </Box>
                </Box>
                <Box style={{ flex: '1 1 220px' }}>
                    <Box paddingBottom={4}>
                        <Textarea
                            label="Description"
                            name="description"
                            value={formData.description || ''}
                            onChange={e => set({ description: e.target.value })}
                            style={{ minHeight: 90 }}
                        />
                    </Box>
                </Box>
            </Flex>

            {/* ------ TYPE & VISIBILITY ------ */}
            <SectionLabel text="Type & Visibility" />
            <Flex gap={4} wrap="wrap" paddingBottom={2}>
                <Box style={{ flex: '1 1 180px' }} paddingBottom={3}>
                    <SingleSelect
                        label="Resource Type"
                        value={formData.type || 'standard'}
                        onChange={v => set({ type: v })}
                        hint="standard -- extended -- alias"
                    >
                        {RESOURCE_TYPES.map(opt => (
                            <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                        ))}
                    </SingleSelect>
                </Box>
                <Box style={{ flex: '1 1 180px' }} paddingBottom={3}>
                    <SingleSelect
                        label="Default Effect"
                        value={formData.effect || 'allow'}
                        onChange={v => set({ effect: v })}
                        hint="allow = permit -- deny = block"
                    >
                        {EFFECT_OPTIONS.map(opt => (
                            <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                        ))}
                    </SingleSelect>
                </Box>
                <Box style={{ flex: '1 1 180px' }} paddingBottom={3}>
                    <SingleSelect
                        label="Domain"
                        value={formData.domain ? String(formData.domain) : ''}
                        onChange={v => set({ domain: v || null })}
                        hint="Leave empty for global"
                    >
                        <SingleSelectOption value="">--- Global ---</SingleSelectOption>
                        {domains.map(d => (
                            <SingleSelectOption key={d.id} value={String(d.id)}>
                                {d.key || d.name || d.displayName || `#${d.id}`}
                            </SingleSelectOption>
                        ))}
                    </SingleSelect>
                </Box>
                <Box style={{ flex: '1 1 180px' }} paddingBottom={3}>
                    <SingleSelect
                        label="Parent Resource"
                        value={formData.parentResource ? String(formData.parentResource) : ''}
                        onChange={v => set({ parentResource: v || null })}
                        hint="Optional grouping"
                    >
                        <SingleSelectOption value="">--- None ---</SingleSelectOption>
                        {resources.filter(r => r.id !== editingRecord?.id).map(r => (
                            <SingleSelectOption key={r.id} value={String(r.id)}>
                                {r.key || r.displayName || `#${r.id}`}
                            </SingleSelectOption>
                        ))}
                    </SingleSelect>
                </Box>
            </Flex>
            <Flex gap={6} paddingBottom={3}>
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

            {/* ------ STRAPI BINDING (collapsible) ------ */}
            <CollapsibleSection
                title="Strapi Binding"
                defaultOpen={!editingRecord || !formData.contentTypeUid}
                badge={formData.contentTypeUid ? currentCt?.displayName || formData.contentTypeUid : null}
            >
                <Flex gap={4} wrap="wrap" paddingBottom={2}>
                    <Box style={{ flex: '1 1 260px' }} paddingBottom={3}>
                        <SingleSelect
                            label="Content Type"
                            value={formData.contentTypeUid || ''}
                            onChange={v => set({ contentTypeUid: v })}
                            hint="The Strapi content type this resource targets"
                        >
                            <SingleSelectOption value="">--- None ---</SingleSelectOption>
                            {strapiTypes.map(type => (
                                <SingleSelectOption key={type.uid} value={type.uid}>
                                    {type.displayName} ({type.uid})
                                </SingleSelectOption>
                            ))}
                        </SingleSelect>
                    </Box>
                    <Box style={{ flex: '1 1 260px' }} paddingBottom={3}>
                        <TextInput
                            label="Controller Action"
                            value={formData.controllerAction || ''}
                            onChange={e => set({ controllerAction: e.target.value })}
                            hint="e.g. api::product.product.find"
                        />
                    </Box>
                </Flex>
            </CollapsibleSection>

            {/* ------ ROUTING ------ */}
            <SectionLabel text="Routing" />
            <Flex gap={4} wrap="wrap" paddingBottom={2}>
                <Box style={{ flex: '0 0 140px' }} paddingBottom={3}>
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
                <Box style={{ flex: '1 1 300px' }} paddingBottom={3}>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 4, fontWeight: 600, color: '#32324d' }}>
                        Path Pattern <span style={{ color: '#c5221f' }}>*</span>
                    </label>
                    <Flex gap={2} alignItems="center">
                        <input
                            type="text"
                            value={formData.pathPattern || ''}
                            onChange={e => handlePathChange(e.target.value)}
                            placeholder="/api/products/:id"
                            style={{
                                flex: 1, padding: '8px 12px', border: '1px solid #ddd',
                                borderRadius: 4, fontSize: 13, fontFamily: 'monospace',
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleConvertUrl}
                            title="Replace ID segments (UUIDs, numeric IDs) with :id"
                            style={{
                                fontSize: 11, padding: '7px 10px', borderRadius: 4,
                                border: '1px solid #4945ff', background: '#4945ff11',
                                color: '#4945ff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >
                            --- Convert URL
                        </button>
                    </Flex>
                    <Typography variant="pi" textColor="neutral400" style={{ fontSize: 11, marginTop: 3 }}>
                        Use :param for dynamic segments. Paste a real URL and click Convert.
                    </Typography>
                </Box>
            </Flex>

            <Flex gap={4} wrap="wrap" paddingBottom={2}>
                <Box style={{ flex: '1 1 260px' }} paddingBottom={3}>
                    <TextInput
                        label="Route Name"
                        value={formData['route-name'] || ''}
                        onChange={e => set({ 'route-name': e.target.value })}
                        hint="Auto-derived from method + path. Override only if needed."
                    />
                </Box>
                {formData.type === 'alias' && (
                    <Box style={{ flex: '1 1 260px' }} paddingBottom={3}>
                        <TextInput
                            label="Alias Path"
                            value={formData.aliasPath || ''}
                            onChange={e => set({ aliasPath: ensureLeadingSlash(e.target.value) })}
                            hint="Clean short URL clients call instead. e.g. /pos/products"
                        />
                    </Box>
                )}
            </Flex>

            {/* ------ REQUEST RULES ------ */}
            <CollapsibleSection
                title="Request Rules"
                defaultOpen
                badge={rrKeys.length > 0 ? `${rrKeys.length} active` : null}
            >
                <Box paddingBottom={2}>
                    <Typography variant="pi" textColor="neutral500">
                        Applied before the controller runs. Use the editors below --- data is stored as a single <code>requestRules</code> JSON object.
                    </Typography>
                </Box>

                {/* Fields */}
                <SubLabel
                    text="Fields"
                    hint="--- restrict which fields are returned in the response"
                />
                <Box paddingBottom={4}>
                    <FieldsPicker
                        attributes={currentAttributes}
                        value={rr.allowedFields || []}
                        onChange={v => setRR('allowedFields', v.length > 0 ? v : undefined)}
                    />
                </Box>

                {/* Populate */}
                <SubLabel
                    text="Populate"
                    hint="--- include related data (relations, components, media)"
                />
                <Box paddingBottom={4}>
                    <PopulateBuilder
                        attributes={currentAttributes}
                        allTypes={allContentTypes}
                        value={rr.allowedPopulate}
                        onChange={v => setRR('allowedPopulate', v && Object.keys(v).length > 0 ? v : undefined)}
                    />
                </Box>

                {/* Filters */}
                <SubLabel
                    text="Filters"
                    hint="--- server-enforced query filters; use :param or $auth.id for runtime values"
                />
                <Box paddingBottom={4}>
                    <FiltersBuilder
                        attributes={currentAttributes}
                        allTypes={allContentTypes}
                        value={rr.filters}
                        onChange={v => setRR('filters', v && Object.keys(v).length > 0 ? v : undefined)}
                    />
                </Box>

                {/* Sort */}
                <SubLabel
                    text="Sort"
                    hint="--- default sort order applied to the query"
                />
                <Box paddingBottom={4}>
                    <SortBuilder
                        attributes={currentAttributes}
                        value={rr.allowedSort || []}
                        onChange={v => setRR('allowedSort', v.length > 0 ? v : undefined)}
                    />
                </Box>

                {/* Pagination */}
                <SubLabel
                    text="Pagination"
                    hint="--- default pagination settings"
                />
                <Box paddingBottom={4}>
                    <PaginationEditor
                        value={rr.defaultPagination || {}}
                        onChange={v => setRR('defaultPagination', Object.keys(v).length > 0 ? v : undefined)}
                    />
                </Box>

                {/* Status */}
                <SubLabel
                    text="Status"
                    hint="--- Draft & Publish filter (published | draft)"
                />
                <Box paddingBottom={4} style={{ maxWidth: 240 }}>
                    <SingleSelect
                        label="Default Status"
                        value={rr.allowedStatus || ''}
                        onChange={v => setRR('allowedStatus', v || undefined)}
                        hint="Leave empty to not restrict by status"
                    >
                        <SingleSelectOption value="">--- Any status ---</SingleSelectOption>
                        <SingleSelectOption value="published">published</SingleSelectOption>
                        <SingleSelectOption value="draft">draft</SingleSelectOption>
                    </SingleSelect>
                </Box>

                {/* Locale */}
                <SubLabel
                    text="Locale"
                    hint="--- i18n locale restriction"
                />
                <Box paddingBottom={4} style={{ maxWidth: 240 }}>
                    <TextInput
                        label="Allowed Locale"
                        value={rr.allowedLocale || ''}
                        onChange={e => setRR('allowedLocale', e.target.value || undefined)}
                        hint="e.g. en, fr --- leave empty to allow all"
                    />
                </Box>

                {/* Advanced JSON overrides */}
                <CollapsibleSection title="Advanced (JSON)" defaultOpen={false}>
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
                    <Box paddingBottom={2}>
                        <Typography variant="pi" textColor="neutral400" style={{ fontSize: 11 }}>
                            Other requestRules keys not covered above (forceBody, stripBodyFields, forcePopulate, injectHeaders, dynamicFilters) --- edit via raw JSON:
                        </Typography>
                    </Box>
                    <Box paddingBottom={4}>
                        <Textarea
                            label="requestRules (raw JSON override)"
                            value={safeJsonStringify(rr, {})}
                            onChange={e => handleJsonField('requestRules', e.target.value)}
                            hint="Full requestRules object --- visual editors above write into this"
                        />
                    </Box>
                </CollapsibleSection>
            </CollapsibleSection>

            {/* ------ RESPONSE RULES ------ */}
            <CollapsibleSection title="Response Rules" defaultOpen={false}>
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
            </CollapsibleSection>

            {/* ------ RECORDED QUERY PARAMETERS ------ */}
            {hasRecordedQueryParams && (
                <CollapsibleSection title="Recorded Query Parameters" defaultOpen>
                    <Box paddingBottom={2}>
                        <Typography variant="pi" textColor="neutral500">
                            Strapi REST query params parsed from the recorded URL --- pre-filled into Request Rules above.
                        </Typography>
                    </Box>
                    {[
                        { key: 'filters', label: 'filters --- requestRules.filters', fallback: {} },
                        { key: 'allowedFields', label: 'fields --- requestRules.allowedFields', fallback: [] },
                        { key: 'allowedPopulate', label: 'populate --- requestRules.allowedPopulate', fallback: [] },
                        { key: 'allowedSort', label: 'sort --- requestRules.allowedSort', fallback: [] },
                        { key: 'defaultPagination', label: 'pagination --- requestRules.defaultPagination', fallback: {} },
                    ].filter(({ key }) => recordedParsedQueryRules[key]).map(({ key, label, fallback }) => (
                        <Box key={key} paddingBottom={3}>
                            <Typography variant="pi" textColor="neutral600" style={{ display: 'block', marginBottom: 4 }}>
                                <code>{label}</code>
                            </Typography>
                            <Box padding={2} style={{ background: 'var(--strapi-colors-neutral100, #f4f4f8)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {safeJsonStringify(recordedParsedQueryRules[key], fallback)}
                            </Box>
                        </Box>
                    ))}
                    {recordedParsedQueryRules.allowedLocale && (
                        <Box paddingBottom={3}>
                            <Typography variant="pi" textColor="neutral600" style={{ display: 'block', marginBottom: 4 }}>
                                <code>locale --- requestRules.allowedLocale</code>
                            </Typography>
                            <Box padding={2} style={{ background: 'var(--strapi-colors-neutral100, #f4f4f8)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12 }}>
                                {String(recordedParsedQueryRules.allowedLocale)}
                            </Box>
                        </Box>
                    )}
                    {recordedParsedQueryRules.allowedStatus && (
                        <Box paddingBottom={3}>
                            <Typography variant="pi" textColor="neutral600" style={{ display: 'block', marginBottom: 4 }}>
                                <code>status --- requestRules.allowedStatus</code>
                            </Typography>
                            <Box padding={2} style={{ background: 'var(--strapi-colors-neutral100, #f4f4f8)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12 }}>
                                {String(recordedParsedQueryRules.allowedStatus)}
                            </Box>
                        </Box>
                    )}
                </CollapsibleSection>
            )}

            {/* ------ RECORDED DATA (read-only) ------ */}
            {hasRecordedData && (
                <CollapsibleSection title="Recorded Request Data (read-only)" defaultOpen={false}>
                    <Box paddingBottom={2}>
                        <Typography variant="pi" textColor="neutral500">
                            Captured by the recorder. Use as a reference when writing request rules above.
                        </Typography>
                    </Box>
                    <Box paddingBottom={3}>
                        <Typography variant="pi" textColor="neutral600">Raw</Typography>
                        <Box padding={3} style={{ background: 'var(--strapi-colors-neutral100, #f4f4f8)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                            {safeJsonStringify(formData.recordedRequestRaw, {})}
                        </Box>
                    </Box>
                    <Box paddingBottom={4}>
                        <Typography variant="pi" textColor="neutral600">Parsed</Typography>
                        <Box padding={3} style={{ background: 'var(--strapi-colors-neutral100, #f4f4f8)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                            {safeJsonStringify(formData.recordedRequestParsed, {})}
                        </Box>
                    </Box>
                </CollapsibleSection>
            )}
        </>
    );
}

export default ResourceForm;
