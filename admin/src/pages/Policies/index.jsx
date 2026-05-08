import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { FormInput, FormTextarea, FormSelect, FormSwitch, tokens } from '../../components/ui.jsx';
import { FieldsPicker } from '../../components/QueryBuilders/FieldsPicker.jsx';
import { FiltersBuilder } from '../../components/QueryBuilders/FiltersBuilder.jsx';
import { SortBuilder } from '../../components/QueryBuilders/SortBuilder.jsx';
import { PopulateBuilder } from '../../components/QueryBuilders/PopulateBuilder.jsx';
import { PaginationEditor } from '../../components/QueryBuilders/PaginationEditor.jsx';

function safeParseJson(text, fallback) {
    if (typeof text !== 'string') return fallback;
    const trimmed = text.trim();
    if (!trimmed) return {};
    try { return JSON.parse(trimmed); } catch { return fallback; }
}

function jsonToText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return ''; }
}

export function SubSection({ title, hint, children }) {
    const [open, setOpen] = React.useState(false);
    return (
        <Box style={{ border: `1px solid ${tokens.border}`, borderRadius: 6, marginBottom: 8 }}>
            <Flex
                alignItems="center"
                justifyContent="space-between"
                style={{ padding: '6px 10px', cursor: 'pointer', background: tokens.surfaceBg, borderRadius: open ? '6px 6px 0 0' : 6 }}
                onClick={() => setOpen(v => !v)}
            >
                <Box>
                    <Typography variant="pi" fontWeight="semiBold">{title}</Typography>
                    {hint && !open && (
                        <Typography variant="pi" textColor="neutral400" style={{ marginLeft: 6 }}>{hint}</Typography>
                    )}
                </Box>
                <span style={{ fontSize: 11, color: '#888' }}>{open ? '▲' : '▼'}</span>
            </Flex>
            {open && (
                <Box style={{ padding: '10px 10px 8px' }}>
                    {children}
                </Box>
            )}
        </Box>
    );
}

export function PolicyForm({ formData, onChange, resources, roles, attributes, allTypes }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    const grantIds = Array.isArray(formData.grants)
        ? formData.grants.map(g => String(typeof g === 'object' ? g.id : g))
        : [];

    const toggleGrant = (roleId) => {
        const id = String(roleId);
        const next = grantIds.includes(id) ? grantIds.filter(g => g !== id) : [...grantIds, id];
        set({ grants: next });
    };

    // query sub-fields
    const query = (formData.query && typeof formData.query === 'object') ? formData.query : {};
    const setQuery = (patch) => set({ query: { ...query, ...patch } });

    return (
        <>
            <Box paddingBottom={3}><FormInput label="Key" id="pol_key" name="key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Short policy key (e.g. 'branchOwn')" /></Box>
            <Box paddingBottom={3}><FormInput label="UID" id="pol_uid" name="uid" value={formData.uid || ''} onChange={e => set({ uid: e.target.value })} hint="Auto-built as <contentTypeUid>.<actionName>.<key> if blank" /></Box>
            <Box paddingBottom={3}>
                <FormSelect label="Resource" id="pol_resource" value={formData.resource ? String(typeof formData.resource === 'object' ? formData.resource.id : formData.resource) : ''}
                    onChange={v => {
                        const res = resources.find(r => String(r.id) === v);
                        set({
                            resource: v || null,
                            contentTypeUid: res?.contentTypeUid || formData.contentTypeUid,
                        });
                    }}
                    options={[{ value: '', label: 'None' }, ...resources.map(r => ({ value: String(r.id), label: r.contentTypeUid || r.displayName || `#${r.id}` }))]} />
            </Box>
            <Box paddingBottom={3}><FormInput label="Content Type UID" id="pol_ctuid" name="contentTypeUid" value={formData.contentTypeUid || ''} onChange={e => set({ contentTypeUid: e.target.value })} required hint="e.g. api::product.product" /></Box>
            <Box paddingBottom={3}><FormInput label="Action Name" id="pol_action" name="actionName" value={formData.actionName || ''} onChange={e => set({ actionName: e.target.value })} required hint="e.g. product.find" /></Box>
            <Box paddingBottom={3}><FormTextarea label="Description" id="pol_desc" value={formData.description || ''} onChange={e => set({ description: e.target.value })} /></Box>
            <Box paddingBottom={3}><FormSwitch label="Active" name="pol_isActive" checked={formData.isActive !== false} onChange={v => set({ isActive: v })} /></Box>

            {/* ── Query (read-side shaping) ── */}
            <Box paddingBottom={3}>
                <Typography variant="pi" fontWeight="bold" paddingBottom={2} style={{ display: 'block' }}>
                    Query — Read-side Shaping
                </Typography>
                <SubSection title="Fields" hint="Restrict which scalar fields are returned">
                    <FieldsPicker
                        attributes={attributes}
                        value={Array.isArray(query.fields) ? query.fields : []}
                        onChange={fields => setQuery({ fields: fields.length > 0 ? fields : undefined })}
                    />
                </SubSection>
                <SubSection title="Filters" hint="Row-level read filters ($and/$or conditions)">
                    <FiltersBuilder
                        attributes={attributes}
                        allTypes={allTypes}
                        value={query.filters || {}}
                        onChange={filters => setQuery({ filters: filters && Object.keys(filters).length > 0 ? filters : undefined })}
                    />
                </SubSection>
                <SubSection title="Sort" hint="Default sort order">
                    <SortBuilder
                        attributes={attributes}
                        value={Array.isArray(query.sort) ? query.sort : (query.sort ? [query.sort] : [])}
                        onChange={sort => setQuery({ sort: sort.length > 0 ? sort : undefined })}
                    />
                </SubSection>
                <SubSection title="Populate" hint="Relations and components to include">
                    <PopulateBuilder
                        attributes={attributes}
                        allTypes={allTypes}
                        value={query.populate || {}}
                        onChange={populate => setQuery({ populate: populate && Object.keys(populate).length > 0 ? populate : undefined })}
                    />
                </SubSection>
                <SubSection title="Pagination" hint="Default page / offset limits">
                    <PaginationEditor
                        value={query.pagination || {}}
                        onChange={pagination => setQuery({ pagination: pagination && Object.keys(pagination).length > 0 ? pagination : undefined })}
                    />
                </SubSection>
            </Box>

            {/* ── Filters (write-side row scoping) ── */}
            <Box paddingBottom={3}>
                <Typography variant="pi" fontWeight="bold" paddingBottom={2} style={{ display: 'block' }}>
                    Filters — Write-side Row Scoping
                </Typography>
                <FiltersBuilder
                    attributes={attributes}
                    allTypes={allTypes}
                    value={formData.filters || {}}
                    onChange={filters => set({ filters: filters && Object.keys(filters).length > 0 ? filters : undefined })}
                />
            </Box>

            {/* ── Body (write-side overrides) ── */}
            <Box paddingBottom={3}>
                <FormTextarea label="Body (JSON)" id="pol_body" value={jsonToText(formData.body)}
                    onChange={e => set({ body: safeParseJson(e.target.value, formData.body) })}
                    hint="Write-side body overrides / forced values" />
            </Box>

            {/* ── Grants (Roles) ── */}
            <Box paddingBottom={3}>
                <Typography variant="pi" fontWeight="bold">Grants (Roles)</Typography>
                <Box paddingTop={2} style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                    {roles.length === 0 ? (
                        <Typography variant="pi" textColor="neutral500">No roles available</Typography>
                    ) : roles.map(r => {
                        const id = String(r.id);
                        const checked = grantIds.includes(id);
                        return (
                            <Flex key={id} alignItems="center" gap={2} paddingBottom={1}>
                                <input type="checkbox" id={`grant_${id}`} checked={checked} onChange={() => toggleGrant(id)} />
                                <label htmlFor={`grant_${id}`} style={{ fontSize: 13 }}>
                                    {r.key || r.name || `#${r.id}`}
                                    {r.domain?.key ? <span style={{ color: '#888', marginLeft: 6 }}>({r.domain.key})</span> : null}
                                </label>
                            </Flex>
                        );
                    })}
                </Box>
            </Box>
        </>
    );
}

function Policies({ policies, resources, roles = [], strapiTypes = [], panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
    const [filters, setFilters] = React.useState({ search: '', resource: '', actionName: '' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    // Derive attributes and allTypes from strapiTypes + selected contentTypeUid
    const allTypes = React.useMemo(() => {
        const map = new Map();
        strapiTypes.forEach(ct => map.set(ct.uid, ct));
        return map;
    }, [strapiTypes]);

    const attributes = React.useMemo(() => {
        const uid = formData?.contentTypeUid;
        if (!uid) return [];
        return allTypes.get(uid)?.attributes || [];
    }, [formData?.contentTypeUid, allTypes]);

    const filtered = React.useMemo(() => {
        const list = policies.filter(r => {
            const hay = `${r.uid || ''} ${r.key || ''} ${r.contentTypeUid || ''} ${r.actionName || ''}`.toLowerCase();
            if (filters.search && !hay.includes(filters.search.toLowerCase())) return false;
            if (filters.resource && String(r.resource?.id) !== filters.resource) return false;
            if (filters.actionName && r.actionName !== filters.actionName) return false;
            return true;
        });

        // Pre-sort by contentTypeUid so grouping across pages is contiguous
        return list.sort((a, b) => {
            const ctA = a.resource?.contentTypeUid || a.resource?.displayName || a.contentTypeUid || 'Unassigned Content Type';
            const ctB = b.resource?.contentTypeUid || b.resource?.displayName || b.contentTypeUid || 'Unassigned Content Type';
            if (ctA === 'Unassigned Content Type' && ctB !== 'Unassigned Content Type') return 1;
            if (ctB === 'Unassigned Content Type' && ctA !== 'Unassigned Content Type') return -1;
            return ctA.localeCompare(ctB);
        });
    }, [policies, filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const actionOptions = React.useMemo(() => {
        const set = new Set();
        policies.forEach(p => { if (p.actionName) set.add(p.actionName); });
        return Array.from(set).sort().map(a => ({ value: a, label: a }));
    }, [policies]);

    const extraFilters = [
        { key: 'resource', label: 'Resource', options: resources.map(r => ({ value: String(r.id), label: r.contentTypeUid || r.displayName || `#${r.id}` })) },
        { key: 'actionName', label: 'Action', options: actionOptions },
    ];

    return (
        <Flex gap={0} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">{filtered.length} of {policies.length} records</Typography>
                    <Button onClick={onOpenNew}>+ New Policy</Button>
                </Flex>
                <FilterBar filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} extraFilters={extraFilters} hasActiveFilters={Object.values(filters).some(Boolean)} onClear={() => setFilters({ search: '', resource: '', actionName: '' })} />
                {paged.length === 0 ? (
                    <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">{policies.length === 0 ? 'No policies yet.' : 'No records match your filters.'}</Typography>
                    </Box>
                ) : (
                    Object.entries(paged.reduce((acc, row) => {
                        const ct = row.resource?.contentTypeUid || row.resource?.displayName || row.contentTypeUid || 'Unassigned Content Type';
                        if (!acc[ct]) acc[ct] = [];
                        acc[ct].push(row);
                        return acc;
                    }, {})).map(([ct, group]) => (
                        <Box key={ct} paddingBottom={4}>
                            <Typography variant="delta" textColor="primary600" style={{ display: 'block', marginBottom: 12 }}>
                                {ct}
                            </Typography>
                            {group.map(row => (
                                <RecordCard key={row.id} row={row} onClick={() => onEdit(row)} onDelete={() => onDelete(row.id)} />
                            ))}
                        </Box>
                    ))
                )}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Policy' : 'Create New Policy'}</Typography>
                    <PolicyForm formData={formData} onChange={onFormChange} resources={resources} roles={roles} attributes={attributes} allTypes={allTypes} />
                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>{editingRecord ? 'Update' : 'Create'}</Button>
                    </Flex>
                </Box>
            )}
        </Flex>
    );
}

export default Policies;
