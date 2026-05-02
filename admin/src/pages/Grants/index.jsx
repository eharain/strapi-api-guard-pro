import React from 'react';
import {
    Box, Typography, Button, Flex,
    TextInput, SingleSelect, SingleSelectOption, Switch,
} from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';

function GrantForm({ formData, onChange, roles, policies }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    return (
        <>
            <Box paddingBottom={4}><TextInput label="Key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required /></Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Role" value={formData.role ? String(formData.role) : ''} onChange={v => set({ role: v || null })} required>
                    <SingleSelectOption value="">Select a role</SingleSelectOption>
                    {roles.map(r => <SingleSelectOption key={r.id} value={String(r.id)}>{r.key || r.name || `#${r.id}`}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Policy" value={formData.policy ? String(formData.policy) : ''} onChange={v => set({ policy: v || null })} required>
                    <SingleSelectOption value="">Select a policy</SingleSelectOption>
                    {policies.map(p => <SingleSelectOption key={p.id} value={String(p.id)}>{p.key || p.name || `#${p.id}`}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}><Switch label="Active" selected={formData.isActive !== false} onChange={() => set({ isActive: !formData.isActive })} /></Box>
        </>
    );
}

function Grants({ grants, roles, policies, panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
    const [filters, setFilters] = React.useState({ search: '', role: '', policy: '' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const filtered = React.useMemo(() => grants.filter(r => {
        if (filters.search && !(r.key || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.role && String(r.role?.id) !== filters.role) return false;
        if (filters.policy && String(r.policy?.id) !== filters.policy) return false;
        return true;
    }), [grants, filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const extraFilters = [
        { key: 'role', label: 'Role', options: roles.map(r => ({ value: String(r.id), label: r.key || r.name || `#${r.id}` })) },
        { key: 'policy', label: 'Policy', options: policies.map(p => ({ value: String(p.id), label: p.key || p.name || `#${p.id}` })) },
    ];

    return (
        <Flex gap={0} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">{filtered.length} of {grants.length} records</Typography>
                    <Button onClick={onOpenNew}>+ New Grant</Button>
                </Flex>
                <FilterBar filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} extraFilters={extraFilters} hasActiveFilters={Object.values(filters).some(Boolean)} onClear={() => setFilters({ search: '', role: '', policy: '' })} />
                {paged.length === 0 ? (
                    <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">{grants.length === 0 ? 'No grants yet.' : 'No records match your filters.'}</Typography>
                    </Box>
                ) : paged.map(row => <RecordCard key={row.id} row={row} onClick={() => onEdit(row)} onDelete={() => onDelete(row.id)} />)}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Grant' : 'Create New Grant'}</Typography>
                    <GrantForm formData={formData} onChange={onFormChange} roles={roles} policies={policies} />
                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>{editingRecord ? 'Update' : 'Create'}</Button>
                    </Flex>
                </Box>
            )}
        </Flex>
    );
}

export default Grants;
