import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import FilterBar from '../../components/Common/FilterBar.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { FormInput, FormTextarea, FormSwitch, tokens } from '../../components/ui.jsx';

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

function RoleChip({ role }) {
    return (
        <Flex
            alignItems="center"
            gap={1}
            style={{
                padding: '3px 10px',
                borderRadius: 12,
                background: role.isActive !== false ? `${tokens.primary}11` : '#f0f0f0',
                border: `1px solid ${role.isActive !== false ? `${tokens.primary}44` : '#ddd'}`,
                fontSize: 12,
                color: role.isActive !== false ? tokens.primary : '#999',
                fontWeight: 600,
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ fontFamily: tokens.monoFont }}>{role.key || role.name || `#${role.id}`}</span>
            {role.name && role.key && role.name !== role.key && (
                <span style={{ fontWeight: 400, color: '#888', marginLeft: 3 }}>Â· {role.name}</span>
            )}
            {role.isActive === false && (
                <span style={{ fontSize: 10, color: '#aaa', marginLeft: 3 }}>(inactive)</span>
            )}
        </Flex>
    );
}

function DomainCard({ row, roles, onEdit, onDelete }) {
    const [expanded, setExpanded] = React.useState(false);
    const domainRoles = roles.filter(r => {
        const rid = r.domain?.id ?? r.domain;
        return String(rid) === String(row.id);
    });

    return (
        <Box
            background="neutral0"
            style={{
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                marginBottom: 8,
                overflow: 'hidden',
            }}
        >
            {/* Header row */}
            <Flex
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                style={{ padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => setExpanded(v => !v)}
            >
                <Flex gap={3} alignItems="center" style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, color: '#aaa', flexShrink: 0 }}>{expanded ? 'â–¼' : 'â–¶'}</span>
                    <Box style={{ minWidth: 0 }}>
                        <Flex gap={2} alignItems="center" wrap="wrap">
                            <Typography variant="sigma" style={{ wordBreak: 'break-word' }}>
                                {row.key || row.name || `#${row.id}`}
                            </Typography>
                            {row.name && row.key && row.name !== row.key && (
                                <Typography variant="pi" textColor="neutral500">{row.name}</Typography>
                            )}
                            {row.isActive === false && (
                                <span style={{ fontSize: 10, background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 3, padding: '1px 5px', color: '#888' }}>inactive</span>
                            )}
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                                background: domainRoles.length > 0 ? `${tokens.primary}11` : '#f0f0f4',
                                color: domainRoles.length > 0 ? tokens.primary : '#aaa',
                                border: `1px solid ${domainRoles.length > 0 ? `${tokens.primary}33` : '#e0e0e8'}`,
                            }}>
                                {domainRoles.length} role{domainRoles.length !== 1 ? 's' : ''}
                            </span>
                        </Flex>
                        {row.description && (
                            <Typography variant="pi" textColor="neutral400" style={{ marginTop: 1 }}>
                                {row.description}
                            </Typography>
                        )}
                    </Box>
                </Flex>
                <Flex gap={2} onClick={e => e.stopPropagation()}>
                    <Button size="S" variant="secondary" onClick={() => onEdit(row)}>Edit</Button>
                    <Button size="S" variant="danger-light" onClick={() => onDelete(row.id)}>Delete</Button>
                </Flex>
            </Flex>

            {/* Expanded: roles list */}
            {expanded && (
                <Box style={{ borderTop: '1px solid #f0f0f4', background: tokens.surfaceBg, padding: '10px 14px 12px 36px' }}>
                    <Typography variant="pi" fontWeight="semiBold" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, marginBottom: 8, display: 'block' }}>
                        Roles in this domain
                    </Typography>
                    {domainRoles.length === 0 ? (
                        <Typography variant="pi" textColor="neutral400">No roles assigned to this domain yet.</Typography>
                    ) : (
                        <Flex gap={2} wrap="wrap">
                            {domainRoles.map(r => <RoleChip key={r.id} role={r} />)}
                        </Flex>
                    )}
                </Box>
            )}
        </Box>
    );
}

function Domains({ domains, roles = [], panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onSubmitForm, onCancelForm, actionLoading }) {
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
                ) : paged.map(row => (
                    <DomainCard
                        key={row.id}
                        row={row}
                        roles={roles}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
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
