import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { FormInput, FormTextarea, FormSwitch } from '../../components/ui.jsx';

function DomainForm({ formData, onChange }) {
    const set = (patch) => onChange({ ...formData, ...patch });
    return (
        <>
            <Box paddingBottom={3}>
                <FormInput label="Key" id="dom_key" name="key" value={formData.key || ''} onChange={e => set({ key: e.target.value })} required hint="Stable identifier used in import/export (e.g. 'stock', 'crm')" />
            </Box>
            <Box paddingBottom={3}>
                <FormInput label="Name" id="dom_name" name="name" value={formData.name || ''} onChange={e => set({ name: e.target.value })} />
            </Box>
            <Box paddingBottom={3}>
                <FormTextarea label="Description" id="dom_desc" value={formData.description || ''} onChange={e => set({ description: e.target.value })} />
            </Box>
            <Box paddingBottom={3}>
                <FormSwitch label="Active" name="dom_isActive" checked={formData.isActive !== false} onChange={v => set({ isActive: v })} />
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
