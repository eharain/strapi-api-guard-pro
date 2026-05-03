import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { FormInput, FormTextarea, FormSelect, FormSwitch } from '../../components/ui.jsx';

const EFFECT_OPTIONS = ['allow', 'deny'];

function PolicyForm({ formData, onChange, resources }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    return (
        <>
            <Box paddingBottom={3}><FormInput label="Key" id="pol_key" name="key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Unique identifier" /></Box>
            <Box paddingBottom={3}><FormInput label="Name" id="pol_name" name="name" value={formData.name || formData.displayName || ''} onChange={e => set({ name: e.target.value, displayName: e.target.value })} required /></Box>
            <Box paddingBottom={3}><FormTextarea label="Description" id="pol_desc" value={formData.description || ''} onChange={e => set({ description: e.target.value })} /></Box>
            <Box paddingBottom={3}><FormSwitch label="Active" name="pol_isActive" checked={formData.isActive !== false} onChange={v => set({ isActive: v })} /></Box>
            <Box paddingBottom={3}>
                <FormSelect label="Effect" id="pol_effect" value={formData.effect || 'allow'} onChange={v => set({ effect: v })}
                    options={EFFECT_OPTIONS.map(o => ({ value: o, label: o }))} />
            </Box>
            <Box paddingBottom={3}>
                <FormSelect label="Resource" id="pol_resource" value={formData.resource ? String(formData.resource) : ''} onChange={v => set({ resource: v || null })}
                    options={[{ value: '', label: 'None' }, ...resources.map(r => ({ value: String(r.id), label: r.key || r.displayName || `#${r.id}` }))]} />
            </Box>
            <Box paddingBottom={3}>
                <FormInput
                    label="Actions (comma-separated)"
                    id="pol_actions"
                    name="actions"
                    value={Array.isArray(formData.actions) ? formData.actions.join(', ') : 'read'}
                    onChange={e => set({ actions: e.target.value.split(',').map(s => s.trim()) })}
                    hint="e.g., read, write, delete"
                />
            </Box>
        </>
    );
}

function Policies({ policies, resources, panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
    const [filters, setFilters] = React.useState({ search: '', effect: '', resource: '' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const filtered = React.useMemo(() => policies.filter(r => {
        if (filters.search && !(r.key || r.name || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.effect && r.effect !== filters.effect) return false;
        if (filters.resource && String(r.resource?.id) !== filters.resource) return false;
        return true;
    }), [policies, filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const extraFilters = [
        { key: 'effect', label: 'Effect', options: EFFECT_OPTIONS.map(e => ({ value: e, label: e })) },
        { key: 'resource', label: 'Resource', options: resources.map(r => ({ value: String(r.id), label: r.key || r.displayName || `#${r.id}` })) },
    ];

    return (
        <Flex gap={0} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">{filtered.length} of {policies.length} records</Typography>
                    <Button onClick={onOpenNew}>+ New Policy</Button>
                </Flex>
                <FilterBar filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} extraFilters={extraFilters} hasActiveFilters={Object.values(filters).some(Boolean)} onClear={() => setFilters({ search: '', effect: '', resource: '' })} />
                {paged.length === 0 ? (
                    <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">{policies.length === 0 ? 'No policies yet.' : 'No records match your filters.'}</Typography>
                    </Box>
                ) : paged.map(row => <RecordCard key={row.id} row={row} onClick={() => onEdit(row)} onDelete={() => onDelete(row.id)} />)}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Policy' : 'Create New Policy'}</Typography>
                    <PolicyForm formData={formData} onChange={onFormChange} resources={resources} />
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
