import React, { useState, useMemo, useRef } from 'react';
import { Box, Flex, Switch, Typography } from '@strapi/design-system';
import {
    FormInput, FormTextarea, FormSelect, FormField,
    TabBar, SectionLabel, SubLabel, Collapsible,
    TagListEditor, KeyValueEditor,
    ghostButtonStyle, removeButtonStyle,
    tokens, inputStyle, monoInputStyle,
    TypeBadge, CodeBlock,
} from '../../components/ui.jsx';
import { FieldsPicker } from '../../components/QueryBuilders/FieldsPicker.jsx';
import { PopulateBuilder } from '../../components/QueryBuilders/PopulateBuilder.jsx';
import { FiltersBuilder } from '../../components/QueryBuilders/FiltersBuilder.jsx';
import { SortBuilder } from '../../components/QueryBuilders/SortBuilder.jsx';
import { PaginationEditor } from '../../components/QueryBuilders/PaginationEditor.jsx';

// --- Constants ---
const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const RESOURCE_TYPES = ['standard', 'extended', 'alias'];
const EFFECT_OPTIONS = ['allow', 'deny'];
const DYNAMIC_FILTER_OPERATORS = ['$eq', '$ne', '$contains', '$notContains', '$startsWith', '$endsWith', '$in', '$notIn', '$gt', '$gte', '$lt', '$lte', '$null', '$notNull'];

// --- Pure helpers ---
const safeJsonStringify = (value, fallback = {}) => {
    try { return JSON.stringify(value ?? fallback, null, 2); } catch { return JSON.stringify(fallback, null, 2); }
};

const parseJsonOrKeep = (text, currentValue, fallback = {}) => {
    try { return JSON.parse(text || JSON.stringify(fallback)); } catch { return currentValue; }
};

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

const deriveKey = (contentTypeUid, method, pathPattern) => {
    const uidPart = contentTypeUid ? contentTypeUid.replace(/^api::/, '').split('.')[0] : null;
    const methodPart = String(method || 'GET').toLowerCase();
    const segments = String(pathPattern || '').split('/').filter(Boolean);
    const lastMeaningful = segments.filter(s => !s.startsWith(':')).pop() || 'root';
    if (uidPart) return `${uidPart}.${methodPart}.${lastMeaningful}`;
    return `${methodPart}.${lastMeaningful}`;
};

const ID_PATTERN = /\/([a-z0-9]{8,}(?:-[a-z0-9]+)*|[0-9]+)(?=\/|$)/gi;
const convertUrlToRoutePattern = (url) => {
    const path = ensureLeadingSlash(url.split('?')[0].trim());
    return path.replace(ID_PATTERN, '/:id');
};

// --- DynamicFiltersEditor ---
function DynamicFiltersEditor({ value = [], onChange }) {
    const rows = Array.isArray(value) ? value : [];
    const update = (idx, patch) => {
        const next = rows.map((r, i) => i === idx ? { ...r, ...patch } : r);
        onChange(next.length > 0 ? next : undefined);
    };
    const add = () => onChange([...rows, { path: '', operator: '$eq', value: '' }]);
    const remove = (idx) => {
        const next = rows.filter((_, i) => i !== idx);
        onChange(next.length > 0 ? next : undefined);
    };
    return (
        <Box>
            {rows.map((row, idx) => (
                <Flex key={idx} gap={2} paddingBottom={2} alignItems="center" wrap="wrap">
                    <input type="text" placeholder="field.path e.g. owner.id" value={row.path || ''}
                        onChange={e => update(idx, { path: e.target.value })}
                        style={{ ...monoInputStyle, flex: '2 1 160px' }} />
                    <select value={row.operator || '$eq'} onChange={e => update(idx, { operator: e.target.value })}
                        style={{ ...inputStyle, flex: '1 1 100px' }}>
                        {DYNAMIC_FILTER_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input type="text" placeholder="value or $auth.id / :param" value={row.value || ''}
                        onChange={e => update(idx, { value: e.target.value })}
                        style={{ ...monoInputStyle, flex: '2 1 160px' }} />
                    <button type="button" onClick={() => remove(idx)} style={removeButtonStyle}>x</button>
                </Flex>
            ))}
            <button type="button" onClick={add} style={ghostButtonStyle}>+ Add dynamic filter</button>
            <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral400">
                    Use $auth.id for the authenticated user ID, :param for a URL parameter.
                </Typography>
            </Box>
        </Box>
    );
}

// --- PathPatternInput ---
function PathPatternInput({ value, onChange, onConvert }) {
    return (
        <FormField label="Path Pattern" required hint="Use :param for dynamic segments. Paste a real URL and click Convert to normalize IDs.">
            <Flex gap={2} alignItems="center">
                <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
                    placeholder="/api/products/:id"
                    style={{ ...monoInputStyle, flex: 1 }} />
                <button type="button" onClick={onConvert} title="Replace ID segments with :id"
                    style={{ ...ghostButtonStyle, whiteSpace: 'nowrap', flexShrink: 0, padding: '7px 10px' }}>
                    Convert URL
                </button>
            </Flex>
        </FormField>
    );
}

// --- Main ResourceForm ---
function ResourceForm({ formData, onChange, domains, resources, strapiTypes, editingRecord }) {
    const [activeTab, setActiveTab] = useState('resource');
    const prevAutoKey = useRef('');

    const set = (patch) => onChange({ ...formData, ...patch });

    const allContentTypes = useMemo(() => {
        const map = new Map();
        (strapiTypes || []).forEach(ct => map.set(ct.uid, ct));
        return map;
    }, [strapiTypes]);

    const currentCt = formData.contentTypeUid ? allContentTypes.get(formData.contentTypeUid) : null;
    const currentAttributes = currentCt?.attributes || [];

    const selectedDomain = domains.find(d => String(d.id) === String(formData.domain));
    const canonicalUrl = selectedDomain?.key && formData.key
        ? `/${selectedDomain.key}/<roleKey>/${formData.key}`
        : null;

    const rr = formData.requestRules || {};
    const respR = formData.responseRules || {};

    const setRR = (key, val) => {
        const next = { ...rr };
        if (val === undefined || val === null) { delete next[key]; } else { next[key] = val; }
        set({ requestRules: next });
    };
    const setRespR = (key, val) => {
        const next = { ...respR };
        if (val === undefined || val === null) { delete next[key]; } else { next[key] = val; }
        set({ responseRules: next });
    };

    const autoUpdateKey = (patch) => {
        const merged = { ...formData, ...patch };
        const auto = deriveKey(merged.contentTypeUid, merged.method, merged.pathPattern);
        const currentKey = formData.key || '';
        const shouldUpdate = !currentKey || currentKey === prevAutoKey.current;
        if (shouldUpdate) {
            prevAutoKey.current = auto;
            onChange({ ...merged, key: auto });
        } else {
            onChange(merged);
        }
    };

    const handlePathChange = (rawValue) => {
        const path = ensureLeadingSlash(rawValue);
        const routeName = deriveRouteName(formData.method || 'GET', path);
        autoUpdateKey({ pathPattern: path, 'route-name': routeName });
    };

    const handleMethodChange = (method) => {
        const routeName = deriveRouteName(method, formData.pathPattern || '');
        autoUpdateKey({ method, 'route-name': routeName });
    };

    const handleContentTypeChange = (uid) => {
        autoUpdateKey({ contentTypeUid: uid });
    };

    const handleConvertUrl = () => {
        const converted = convertUrlToRoutePattern(formData.pathPattern || '');
        const routeName = deriveRouteName(formData.method || 'GET', converted);
        autoUpdateKey({ pathPattern: converted, 'route-name': routeName });
    };

    const rrActiveCount = Object.keys(rr).filter(k => {
        const v = rr[k];
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return !!v;
    }).length;

    const respActiveCount = Object.keys(respR).filter(k => {
        const v = respR[k];
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return !!v;
    }).length;

    const rulesTotal = rrActiveCount + respActiveCount;

    const hasRecordedData = formData.recordedRequestRaw && Object.keys(formData.recordedRequestRaw).length > 0;
    const recordedParsedQueryRules = formData.recordedParsedQueryRules || {};
    const hasRecordedQueryParams = Object.keys(recordedParsedQueryRules).length > 0;

    const tabs = [
        { key: 'resource', label: 'Resource' },
        { key: 'rules', label: 'Rules', badge: rulesTotal > 0 ? rulesTotal : null },
        { key: 'advanced', label: 'Advanced' },
    ];

    return (
        <React.Fragment>
            <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {activeTab === 'resource' && (
                <Box>
                    <SectionLabel text="Routing" hint="the method + path define this resource's identity" />
                    <Flex gap={3} wrap="wrap" paddingBottom={3} alignItems="flex-start">
                        <Box style={{ flex: '0 0 130px' }}>
                            <FormSelect label="HTTP Method" required value={formData.method || 'GET'} onChange={handleMethodChange}>
                                {METHOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </FormSelect>
                        </Box>
                        <Box style={{ flex: '1 1 320px' }}>
                            <PathPatternInput value={formData.pathPattern} onChange={handlePathChange} onConvert={handleConvertUrl} />
                        </Box>
                        <Box style={{ flex: '1 1 200px' }}>
                            <FormInput label="Route Name" value={formData['route-name'] || ''} onChange={e => set({ 'route-name': e.target.value })} hint="Auto-derived. Override only if needed." />
                        </Box>
                        {formData.type === 'alias' && (
                            <Box style={{ flex: '1 1 220px' }}>
                                <FormInput label="Alias Path" value={formData.aliasPath || ''} onChange={e => set({ aliasPath: ensureLeadingSlash(e.target.value) })} hint="Short client-facing URL. e.g. /pos/products" monospace />
                            </Box>
                        )}
                    </Flex>

                    {canonicalUrl && (
                        <Box paddingBottom={3}>
                            <Typography variant="pi" textColor="neutral500" style={{ display: 'block', marginBottom: 4 }}>
                                Canonical URL <Typography variant="pi" textColor="neutral400">(replace &lt;roleKey&gt; with the app role key)</Typography>
                            </Typography>
                            <CodeBlock>{`${String(formData.method || 'GET')} ${canonicalUrl}`}</CodeBlock>
                        </Box>
                    )}

                    <SectionLabel text="Strapi Binding" hint="content type and controller action this route maps to" />
                    <Flex gap={4} wrap="wrap" paddingBottom={3}>
                        <Box style={{ flex: '1 1 280px' }}>
                            <FormSelect label="Content Type" hint="The Strapi content type this resource targets" value={formData.contentTypeUid || ''} onChange={handleContentTypeChange}>
                                <option value="">None</option>
                                {strapiTypes.map(type => (
                                    <option key={type.uid} value={type.uid}>{type.displayName} ({type.uid})</option>
                                ))}
                            </FormSelect>
                        </Box>
                        <Box style={{ flex: '1 1 280px' }}>
                            <FormInput label="Controller Action" value={formData.controllerAction || ''} onChange={e => set({ controllerAction: e.target.value })} hint="e.g. api::product.product.find" monospace />
                        </Box>
                    </Flex>

                    <SectionLabel text="Identity" hint="auto-derived from routing and binding; edit as needed" />
                    <Flex gap={4} wrap="wrap" paddingBottom={3}>
                        <Box style={{ flex: '1 1 220px' }}>
                            <Box paddingBottom={4}>
                                <FormInput label="Key" name="key" required value={formData.key || ''} onChange={e => { prevAutoKey.current = ''; set({ key: e.target.value }); }} hint="Unique dot-separated identifier. Auto-derived from binding + method." monospace />
                            </Box>
                            <FormInput label="Display Name" required value={formData.displayName || ''} onChange={e => set({ displayName: e.target.value })} hint="Human-readable label shown in the UI" />
                        </Box>
                        <Box style={{ flex: '1 1 220px' }}>
                            <FormTextarea label="Description" value={formData.description || ''} onChange={e => set({ description: e.target.value })} minHeight={100} />
                        </Box>
                    </Flex>

                    <SectionLabel text="Access and Scope" />
                    <Flex gap={4} wrap="wrap" paddingBottom={3}>
                        <Box style={{ flex: '1 1 150px' }}>
                            <FormSelect label="Resource Type" hint="standard · extended · alias" value={formData.type || 'standard'} onChange={v => set({ type: v })}>
                                {RESOURCE_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </FormSelect>
                        </Box>
                        <Box style={{ flex: '1 1 150px' }}>
                            <FormSelect label="Default Effect" hint="allow = permit, deny = block" value={formData.effect || 'allow'} onChange={v => set({ effect: v })}>
                                {EFFECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </FormSelect>
                        </Box>
                        <Box style={{ flex: '1 1 180px' }}>
                            <FormSelect label="Domain" hint="Leave empty for global" value={formData.domain ? String(formData.domain) : ''} onChange={v => set({ domain: v || null })}>
                                <option value="">Global</option>
                                {domains.map(d => <option key={d.id} value={String(d.id)}>{d.key || d.name || d.displayName || `#${d.id}`}</option>)}
                            </FormSelect>
                        </Box>
                        <Box style={{ flex: '1 1 180px' }}>
                            <FormSelect label="Parent Resource" hint="Optional grouping" value={formData.parentResource ? String(formData.parentResource) : ''} onChange={v => set({ parentResource: v || null })}>
                                <option value="">None</option>
                                {resources.filter(r => r.id !== editingRecord?.id).map(r => <option key={r.id} value={String(r.id)}>{r.key || r.displayName || `#${r.id}`}</option>)}
                            </FormSelect>
                        </Box>
                    </Flex>
                    
                    <Flex gap={6} paddingBottom={3}>
                        Basic Access Control:
                        <Switch label="Public (no auth required)" selected={formData.isPublic === true} onChange={() => set({ isPublic: !formData.isPublic })} />
                        <Switch label="Active" selected={formData.isActive !== false} onChange={() => set({ isActive: !formData.isActive })} />
                        <Switch label="Block legacy path" selected={formData.blockLegacyPath === true} onChange={() => set({ blockLegacyPath: !formData.blockLegacyPath })} />
                    </Flex>
                </Box>
            )}

            {activeTab === 'rules' && (
                <Box>
                    <SectionLabel text="Query Filters" hint="enforced server-side before the controller runs" />

                    <SubLabel text="Static Filters" hint="always applied" />
                    <Box paddingBottom={4}>
                        <FiltersBuilder attributes={currentAttributes} allTypes={allContentTypes} value={rr.filters} onChange={v => setRR('filters', v && Object.keys(v).length > 0 ? v : undefined)} />
                    </Box>

                    <SubLabel text="Dynamic Filters" hint="runtime values: $auth.id binds to the logged-in user, :param to a URL segment" />
                    <Box paddingBottom={4}>
                        <DynamicFiltersEditor value={rr.dynamicFilters} onChange={v => setRR('dynamicFilters', v)} />
                    </Box>

                    <SectionLabel text="Query Field Control" hint="controls what the client can request via ?fields and ?populate" />

                    <SubLabel text="Allowed Fields" hint="whitelist of fields the client may request via ?fields" />
                    <Box paddingBottom={4}>
                        <FieldsPicker attributes={currentAttributes} includeRelations value={rr.allowedFields || []} onChange={v => setRR('allowedFields', v.length > 0 ? v : undefined)} />
                    </Box>

                    <SubLabel text="Allowed Populate" hint="whitelist of relations/components the client may populate via ?populate" />
                    <Box paddingBottom={4}>
                        <PopulateBuilder attributes={currentAttributes} allTypes={allContentTypes} value={rr.allowedPopulate} onChange={v => setRR('allowedPopulate', v && Object.keys(v).length > 0 ? v : undefined)} />
                    </Box>

                    <SubLabel text="Block Query Params" hint="strip these query params from the request before forwarding" />
                    <Box paddingBottom={4}>
                        <TagListEditor value={rr.blockParams || []} onChange={v => setRR('blockParams', v && v.length > 0 ? v : undefined)} placeholder="param name e.g. debug, _token" />
                    </Box>

                    {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                        <React.Fragment>
                            <SectionLabel text="Body Field Control" hint="applies to POST / PUT / PATCH — controls which fields clients may send in the body" />

                            <SubLabel text="Allowed Body Fields" hint="whitelist — only these fields are kept; everything else is stripped from the body" />
                            <Box paddingBottom={4}>
                                <FieldsPicker attributes={currentAttributes} includeRelations value={rr.allowedBodyFields || []} onChange={v => setRR('allowedBodyFields', v.length > 0 ? v : undefined)} />
                            </Box>

                            <SubLabel text="Strip Body Fields" hint="always remove these fields from the body, regardless of the whitelist" />
                            <Box paddingBottom={4}>
                                <FieldsPicker attributes={currentAttributes} includeRelations value={rr.stripBodyFields || []} onChange={v => setRR('stripBodyFields', v && v.length > 0 ? v : undefined)} label="No fields available for stripping." />
                            </Box>
                        </React.Fragment>
                    )}

                    <SectionLabel text="Body Augmentation" hint="server-side injection / removal applied before the controller runs" />

                    <SubLabel text="Force Body Fields" hint="inject or override body fields; supports $auth.id, $today, $now tokens" />
                    <Box paddingBottom={4}>
                        <KeyValueEditor value={rr.forceBodyFields || {}} onChange={v => setRR('forceBodyFields', v)} keyPlaceholder="field name e.g. createdBy" valuePlaceholder="value or $auth.id" hint="Values are resolved at request time. Use $auth.id to inject the current user ID." />
                    </Box>

                    <SectionLabel text="Query Control" hint="sorting, pagination, locale, and publication state" />

                    <SubLabel text="Allowed Sort" hint="restrict which fields and directions clients may sort by" />
                    <Box paddingBottom={4}>
                        <SortBuilder attributes={currentAttributes} value={rr.allowedSort || []} onChange={v => setRR('allowedSort', v.length > 0 ? v : undefined)} />
                    </Box>

                    <SubLabel text="Default Pagination" hint="applied when the client sends no pagination params" />
                    <Box paddingBottom={4}>
                        <PaginationEditor value={rr.defaultPagination || {}} onChange={v => setRR('defaultPagination', Object.keys(v).length > 0 ? v : undefined)} />
                    </Box>

                    <Flex gap={4} wrap="wrap" paddingBottom={4}>
                        <Box style={{ flex: '1 1 200px', maxWidth: 260 }}>
                            <FormSelect label="Publication Status" hint="Restrict to published or draft; empty = no restriction" value={rr.allowedStatus || ''} onChange={v => setRR('allowedStatus', v || undefined)}>
                                <option value="">Any status</option>
                                <option value="published">published</option>
                                <option value="draft">draft</option>
                            </FormSelect>
                        </Box>
                        <Box style={{ flex: '1 1 200px', maxWidth: 260 }}>
                            <FormInput label="Allowed Locale" value={rr.allowedLocale || ''} onChange={e => setRR('allowedLocale', e.target.value || undefined)} hint="e.g. en, fr - leave empty to allow all locales" />
                        </Box>
                    </Flex>
                </Box>
            )}

            {activeTab === 'advanced' && (
                <Box>
                    <SectionLabel text="Response Field Control" hint="applied to the response after the controller runs; shapes what the client receives" />

                    <SubLabel text="Allowed Response Fields" hint="whitelist — only these fields are returned to the client; includes relations" />
                    <Box paddingBottom={4}>
                        <FieldsPicker attributes={currentAttributes} includeRelations value={respR.allowedFields || []} onChange={v => setRespR('allowedFields', v.length > 0 ? v : undefined)} label="No fields available." />
                    </Box>

                    <SubLabel text="Strip Response Fields" hint="always remove these fields from the response before returning to the client" />
                    <Box paddingBottom={4}>
                        <FieldsPicker attributes={currentAttributes} includeRelations value={respR.stripFields || []} onChange={v => setRespR('stripFields', v.length > 0 ? v : undefined)} label="No fields available for stripping." />
                    </Box>

                    <SectionLabel text="Header Control" hint="inject or strip HTTP headers on the forwarded request" />

                    <SubLabel text="Force Headers" hint="inject these headers into the request sent to Strapi" />
                    <Box paddingBottom={4}>
                        <KeyValueEditor value={rr.forceHeaders || {}} onChange={v => setRR('forceHeaders', v)} keyPlaceholder="header name e.g. x-tenant-id" valuePlaceholder="value or $auth.id" />
                    </Box>

                    <SubLabel text="Strip Headers" hint="remove these headers before forwarding the request" />
                    <Box paddingBottom={4}>
                        <TagListEditor value={rr.stripHeaders || []} onChange={v => setRR('stripHeaders', v && v.length > 0 ? v : undefined)} placeholder="header name e.g. authorization" />
                    </Box>

                    <SectionLabel text="Match Criteria" hint="extra conditions required for this resource to match a request" />
                    <Box paddingBottom={4}>
                        <FormTextarea label="matchCriteria (JSON)" value={safeJsonStringify(formData.matchCriteria, {})} onChange={e => set({ matchCriteria: parseJsonOrKeep(e.target.value, formData.matchCriteria, {}) })} hint='e.g. { "requiredHeaders": ["x-app-name"], "requiredQuery": ["version"] }' />
                    </Box>

                    <Collapsible title="Raw JSON - requestRules" defaultOpen={false} badge={rrActiveCount > 0 ? `${rrActiveCount} active` : null}>
                        <Box paddingBottom={4}>
                            <FormTextarea label="requestRules (raw)" value={safeJsonStringify(rr, {})} onChange={e => set({ requestRules: parseJsonOrKeep(e.target.value, rr, {}) })} hint="Full requestRules object — visual editors on the Rules tab write into this." minHeight={140} />
                        </Box>
                    </Collapsible>

                    <Collapsible title="Raw JSON - responseRules" defaultOpen={false} badge={respActiveCount > 0 ? `${respActiveCount} active` : null}>
                        <Box paddingBottom={4}>
                            <FormTextarea label="responseRules (raw)" value={safeJsonStringify(respR, {})} onChange={e => set({ responseRules: parseJsonOrKeep(e.target.value, respR, {}) })} hint="Full responseRules object — visual editors on the Rules tab write into this." minHeight={140} />
                        </Box>
                    </Collapsible>

                    {(hasRecordedQueryParams || hasRecordedData) && (
                        <Collapsible title="Recorded Request Reference" defaultOpen={hasRecordedQueryParams}>
                            <Box paddingBottom={2}>
                                <Typography variant="pi" textColor="neutral500">
                                    Captured by the recorder. Pre-filled values are already applied to the Rules tab.
                                </Typography>
                            </Box>
                            {hasRecordedQueryParams && (
                                <Box>
                                    {[
                                        { key: 'filters', label: 'filters', fallback: {} },
                                        { key: 'allowedFields', label: 'fields', fallback: [] },
                                        { key: 'allowedPopulate', label: 'populate', fallback: [] },
                                        { key: 'allowedSort', label: 'sort', fallback: [] },
                                        { key: 'defaultPagination', label: 'pagination', fallback: {} },
                                    ].filter(({ key }) => recordedParsedQueryRules[key]).map(({ key, label, fallback }) => (
                                        <Box key={key} paddingBottom={2}>
                                            <Typography variant="pi" textColor="neutral600" style={{ display: 'block', marginBottom: 3 }}><code>{label}</code></Typography>
                                            <CodeBlock>{safeJsonStringify(recordedParsedQueryRules[key], fallback)}</CodeBlock>
                                        </Box>
                                    ))}
                                    {recordedParsedQueryRules.allowedLocale && (
                                        <Box paddingBottom={2}>
                                            <Typography variant="pi" textColor="neutral600" style={{ display: 'block', marginBottom: 3 }}><code>locale</code></Typography>
                                            <CodeBlock>{String(recordedParsedQueryRules.allowedLocale)}</CodeBlock>
                                        </Box>
                                    )}
                                    {recordedParsedQueryRules.allowedStatus && (
                                        <Box paddingBottom={2}>
                                            <Typography variant="pi" textColor="neutral600" style={{ display: 'block', marginBottom: 3 }}><code>status</code></Typography>
                                            <CodeBlock>{String(recordedParsedQueryRules.allowedStatus)}</CodeBlock>
                                        </Box>
                                    )}
                                </Box>
                            )}
                            {hasRecordedData && (
                                <Box>
                                    <Box paddingBottom={2} paddingTop={2}>
                                        <Typography variant="pi" textColor="neutral600">Raw recorded request</Typography>
                                        <CodeBlock maxHeight={160}>{safeJsonStringify(formData.recordedRequestRaw, {})}</CodeBlock>
                                    </Box>
                                    <Box paddingBottom={3}>
                                        <Typography variant="pi" textColor="neutral600">Parsed</Typography>
                                        <CodeBlock maxHeight={160}>{safeJsonStringify(formData.recordedRequestParsed, {})}</CodeBlock>
                                    </Box>
                                </Box>
                            )}
                        </Collapsible>
                    )}
                </Box>
            )}
        </React.Fragment>
    );
}

export default ResourceForm;
