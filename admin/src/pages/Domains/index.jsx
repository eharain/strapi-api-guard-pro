import React from 'react';
import {
    Box,
    Typography,
    Button,
    Flex,
    TextInput,
    Textarea,
    SingleSelect,
    SingleSelectOption,
    Switch,
} from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';

const MATCH_MODE_OPTIONS = ['header', 'query', 'both'];

function DomainForm({ formData, onChange }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    return (
        <>
            <Box paddingBottom={4}>
                <TextInput label="Key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Unique identifier (e.g., pos.products)" />
            </Box>
            <Box paddingBottom={4}>
                <TextInput label="Name" value={formData.name || formData.displayName || ''} onChange={e => set({ name: e.target.value, displayName: e.target.value })} required />
            </Box>
            <Box paddingBottom={4}>
                <Textarea label="Description" value={formData.description || ''} onChange={e => set({ description: e.target.value })} />
            </Box>
            <Box paddingBottom={4}>
                <Switch label="Active" selected={formData.isActive !== false} onChange={() => set({ isActive: !formData.isActive })} />
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Match Mode" value={formData.matchMode || 'header'} onChange={v => set({ matchMode: v })}>
                    {MATCH_MODE_OPTIONS.map(opt => <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>)}
                </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
                <TextInput label="Match Key" value={formData.matchKey || 'x-app-name'} onChange={e => set({ matchKey: e.target.value })} />
            </Box>
            <Box paddingBottom={4}>
                <SingleSelect label="Strapi Role Type" value={formData.strapiRoleType || 'authenticated'} onChange={v => set({ strapiRoleType: v })}>
                    <SingleSelectOption value="authenticated">Authenticated</SingleSelectOption>
                    <SingleSelectOption value="public">Public</SingleSelectOption>
                </SingleSelect>
            </Box>
        </>
    );
}

function Domains({ domains, panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
    const [filters, setFilters] = React.useState({ search: '' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const filtered = React.useMemo(() => domains.filter(r => {
        if (filters.search && !(r.key || r.name || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
    }), [domains, filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <Flex gap={0} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">{filtered.length} of {domains.length} records</Typography>
                    <Button onClick={onOpenNew}>+ New Domain</Button>
                </Flex>
                <FilterBar filters={filters} onFiltersChange={f => { setFilters(f); setPage(1); }} hasActiveFilters={Object.values(filters).some(Boolean)} onClear={() => setFilters({ search: '' })} />
                {paged.length === 0 ? (
                    <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">{domains.length === 0 ? 'No domains yet.' : 'No records match your filters.'}</Typography>
                    </Box>
                ) : paged.map(row => <RecordCard key={row.id} row={row} onClick={() => onEdit(row)} onDelete={() => onDelete(row.id)} />)}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Domain' : 'Create New Domain'}</Typography>
                    <DomainForm formData={formData} onChange={onFormChange} />
                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>{editingRecord ? 'Update' : 'Create'}</Button>
                    </Flex>
                </Box>
            )}
        </Flex>
    );
}

export default Domains;
