import React from 'react';
import {
    Box, Typography, Button, Flex,
    TextInput, Textarea, SingleSelect, SingleSelectOption, Switch,
} from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';

function GroupForm({ formData, onChange, domains, groups, editingRecord }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    return (
        <>
            <Box paddingBottom={4}><TextInput label="Key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Unique identifier" /></Box>
            <Box paddingBottom={4}><TextInput label="Name" value={formData.name || formData.displayName || ''} onChange={e => set({ name: e.target.value, displayName: e.target.value })} required /></Box>
            <Box paddingBottom={4}><Textarea label="Description" value={formData.description || ''} onChange={e => set({ description: e.target.value })} /></Box>
            <Box paddingBottom={4}><Switch label="Active" selected={formData.isActive !== false} onChange={() => set({ isActive: !formData.isActive })} /></Box>
            <Box paddingBottom={4}><Switch label="Is Bundle" selected={formData.isBundle === true} onChange={() => set({ isBundle: !formData.isBundle })} /></Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Domain" value={formData.domain ? String(formData.domain) : ''} onChange={v => set({ domain: v || null })}>
                    <SingleSelectOption value="">None</SingleSelectOption>
                    {domains.map(d => <SingleSelectOption key={d.id} value={String(d.id)}>{d.key || d.name || `#${d.id}`}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Parent Group" value={formData.parentGroup ? String(formData.parentGroup) : ''} onChange={v => set({ parentGroup: v || null })}>
                    <SingleSelectOption value="">None</SingleSelectOption>
                    {groups.filter(g => g.id !== editingRecord?.id).map(g => <SingleSelectOption key={g.id} value={String(g.id)}>{g.key || g.name || `#${g.id}`}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
        </>
    );
}

function Groups({ groups, domains, panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
    const [filters, setFilters] = React.useState({ search: '', domain: '' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const filtered = React.useMemo(() => groups.filter(r => {
        if (filters.search && !(r.key || r.name || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.domain && String(r.domain?.id) !== filters.domain) return false;
        return true;
    }), [groups, filters]);

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
                    <Typography variant="delta">{filtered.length} of {groups.length} records</Typography>
                    <Button onClick={onOpenNew}>+ New Group</Button>
                </Flex>
                <FilterBar filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} extraFilters={extraFilters} hasActiveFilters={Object.values(filters).some(Boolean)} onClear={() => setFilters({ search: '', domain: '' })} />
                {paged.length === 0 ? (
                    <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">{groups.length === 0 ? 'No groups yet.' : 'No records match your filters.'}</Typography>
                    </Box>
                ) : paged.map(row => <RecordCard key={row.id} row={row} onClick={() => onEdit(row)} onDelete={() => onDelete(row.id)} />)}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Group' : 'Create New Group'}</Typography>
                    <GroupForm formData={formData} onChange={onFormChange} domains={domains} groups={groups} editingRecord={editingRecord} />
                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>{editingRecord ? 'Update' : 'Create'}</Button>
                    </Flex>
                </Box>
            )}
        </Flex>
    );
}

export default Groups;
