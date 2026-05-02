import React from 'react';
import {
    Box, Typography, Button, Flex,
    TextInput, Textarea, SingleSelect, SingleSelectOption, Switch,
} from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';

const EFFECT_OPTIONS = ['allow', 'deny'];

function PolicyForm({ formData, onChange, resources }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    return (
        <>
            <Box paddingBottom={4}><TextInput label="Key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Unique identifier" /></Box>
            <Box paddingBottom={4}><TextInput label="Name" value={formData.name || formData.displayName || ''} onChange={e => set({ name: e.target.value, displayName: e.target.value })} required /></Box>
            <Box paddingBottom={4}><Textarea label="Description" value={formData.description || ''} onChange={e => set({ description: e.target.value })} /></Box>
            <Box paddingBottom={4}><Switch label="Active" selected={formData.isActive !== false} onChange={() => set({ isActive: !formData.isActive })} /></Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Effect" value={formData.effect || 'allow'} onChange={v => set({ effect: v })}>
                    {EFFECT_OPTIONS.map(opt => <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Resource" value={formData.resource ? String(formData.resource) : ''} onChange={v => set({ resource: v || null })}>
                    <SingleSelectOption value="">None</SingleSelectOption>
                    {resources.map(r => <SingleSelectOption key={r.id} value={String(r.id)}>{r.key || r.displayName || `#${r.id}`}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <TextInput
                    label="Actions (comma-separated)"
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
