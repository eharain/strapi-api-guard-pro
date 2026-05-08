import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { FormInput, FormTextarea, FormSwitch } from '../../components/ui.jsx';

function RoleForm({ formData, onChange, domains }) {
    const set = (patch) => onChange({ ...formData, ...patch });

    // domains is now manyToMany — store as array of ids
    const selectedDomainIds = React.useMemo(() => {
        const raw = formData.domains || [];
        return raw.map(d => String(d.id ?? d));
    }, [formData.domains]);

    const toggleDomain = (id) => {
        const strId = String(id);
        const next = selectedDomainIds.includes(strId)
            ? selectedDomainIds.filter(d => d !== strId)
            : [...selectedDomainIds, strId];
        set({ domains: next.map(Number) });
    };

    return (
        <>
            <Box paddingBottom={3}><FormInput label="Key" id="rol_key" name="key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Unique identifier" /></Box>
            <Box paddingBottom={3}><FormInput label="Name" id="rol_name" name="name" value={formData.name || ''} onChange={e => set({ name: e.target.value })} /></Box>
            <Box paddingBottom={3}><FormTextarea label="Description" id="rol_desc" value={formData.description || ''} onChange={e => set({ description: e.target.value })} /></Box>
            <Box paddingBottom={3}><FormSwitch label="Active" name="rol_isActive" checked={formData.isActive !== false} onChange={v => set({ isActive: v })} /></Box>
            <Box paddingBottom={3}>
                <Typography variant="pi" fontWeight="semiBold" style={{ display: 'block', marginBottom: 6 }}>Domains</Typography>
                {domains.length === 0 ? (
                    <Typography variant="pi" textColor="neutral400">No domains yet.</Typography>
                ) : domains.map(d => {
                    const inputId = `rol-domain-${d.id}`;
                    return (
                        <Flex key={d.id} gap={2} alignItems="center" paddingBottom={1}>
                            <input
                                id={inputId}
                                type="checkbox"
                                checked={selectedDomainIds.includes(String(d.id))}
                                onChange={() => toggleDomain(d.id)}
                            />
                            <label htmlFor={inputId}>
                                <Typography variant="pi">{d.key || d.name || `#${d.id}`}</Typography>
                            </label>
                        </Flex>
                    );
                })}
            </Box>
        </>
    );
}

function Roles({ roles, domains, panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
    const [filters, setFilters] = React.useState({ search: '', domain: '' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const filtered = React.useMemo(() => roles.filter(r => {
        if (filters.search && !(r.key || r.name || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.domain && !(r.domains || []).some(d => String(d.id ?? d) === filters.domain)) return false;
        return true;
    }), [roles, filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const extraFilters = [
        { key: 'domain', label: 'Domain', options: domains.map(d => ({ value: String(d.id), label: d.key || d.name || `#${d.id}` })) },
    ];

    return (
        <Flex gap={0} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">{filtered.length} of {roles.length} records</Typography>
                    <Button onClick={onOpenNew}>+ New Role</Button>
                </Flex>
                <FilterBar filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} extraFilters={extraFilters} hasActiveFilters={Object.values(filters).some(Boolean)} onClear={() => setFilters({ search: '', domain: '' })} />
                {paged.length === 0 ? (
                    <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">{roles.length === 0 ? 'No roles yet.' : 'No records match your filters.'}</Typography>
                    </Box>
                ) : paged.map(row => (
                    <RecordCard
                        key={row.id}
                        row={{
                            ...row,
                            domain: Array.isArray(row.domains) && row.domains.length > 0
                                ? row.domains.map(d => d?.key || d?.name || `#${d?.id ?? d}`).join(', ')
                                : row.domain,
                        }}
                        onClick={() => onEdit(row)}
                        onDelete={() => onDelete(row.id)}
                        extraActions={(
                            <Button size="S" variant="secondary" onClick={(e) => { e.stopPropagation(); onEdit(row); }}>
                                Edit
                            </Button>
                        )}
                    />
                ))}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Role' : 'Create New Role'}</Typography>
                    <RoleForm formData={formData} onChange={onFormChange} domains={domains} />
                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>{editingRecord ? 'Update' : 'Create'}</Button>
                    </Flex>
                </Box>
            )}
        </Flex>
    );
}

export default Roles;
