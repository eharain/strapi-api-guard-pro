import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import FilterBar from '../../components/Common/FilterBar.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { FormInput, FormTextarea, FormSwitch, tokens } from '../../components/ui.jsx';

function DomainForm({ formData, onChange, roles = [] }) {
    const set = (patch) => onChange({ ...formData, ...patch });

    const selectedRoleIds = React.useMemo(() => {
        const raw = formData.roles || [];
        return raw.map(r => String(r.id ?? r));
    }, [formData.roles]);

    const toggleRole = (id) => {
        const strId = String(id);
        const next = selectedRoleIds.includes(strId)
            ? selectedRoleIds.filter(r => r !== strId)
            : [...selectedRoleIds, strId];
        set({ roles: next.map(Number) });
    };

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
            <Box paddingBottom={3}>
                <Typography variant="pi" fontWeight="semiBold" style={{ display: 'block', marginBottom: 6 }}>Roles</Typography>
                {roles.length === 0 ? (
                    <Typography variant="pi" textColor="neutral400">No roles yet.</Typography>
                ) : roles.map(r => {
                    const inputId = `dom-role-${r.id}`;
                    return (
                        <Flex key={r.id} gap={2} alignItems="center" paddingBottom={1}>
                            <input
                                id={inputId}
                                type="checkbox"
                                checked={selectedRoleIds.includes(String(r.id))}
                                onChange={() => toggleRole(r.id)}
                            />
                            <label htmlFor={inputId}>
                                <Typography variant="pi">{r.key || r.name || `#${r.id}`}</Typography>
                            </label>
                        </Flex>
                    );
                })}
            </Box>
        </>
    );
}

/**
 * Expandable role chip inside a domain card.
 * Shows linked policies (grants) when expanded.
 */
function RoleRow({ role, policies, onDelete }) {
    const [expanded, setExpanded] = React.useState(false);
    // policies linked to this role via grants relation
    const roleGrants = React.useMemo(() => {
        return (policies || []).filter(p => {
            const grantIds = (p.grants || []).map(g => String(g.id ?? g));
            return grantIds.includes(String(role.id));
        });
    }, [policies, role.id]);

    return (
        <Box
            style={{
                border: `1px solid ${role.isActive !== false ? `${tokens.primary}33` : '#ddd'}`,
                borderRadius: 6,
                marginBottom: 4,
                background: role.isActive !== false ? `${tokens.primary}08` : '#fafafa',
                overflow: 'hidden',
            }}
        >
            <Flex
                justifyContent="space-between"
                alignItems="center"
                style={{ padding: '5px 10px', cursor: 'pointer' }}
                onClick={() => setExpanded(v => !v)}
            >
                <Flex gap={2} alignItems="center">
                    <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{expanded ? '?' : '?'}</span>
                    <span style={{ fontFamily: tokens.monoFont, fontSize: 12, fontWeight: 600, color: role.isActive !== false ? tokens.primary : '#999' }}>
                        {role.key || role.name || `#${role.id}`}
                    </span>
                    {role.name && role.key && role.name !== role.key && (
                        <span style={{ fontSize: 11, color: '#888' }}>· {role.name}</span>
                    )}
                    {role.isActive === false && (
                        <span style={{ fontSize: 10, color: '#aaa', padding: '1px 4px', background: '#f0f0f0', borderRadius: 3 }}>inactive</span>
                    )}
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                        background: roleGrants.length > 0 ? '#e8f5e9' : '#fff8f8',
                        color: roleGrants.length > 0 ? '#2e7d32' : '#c62828',
                        border: `1px solid ${roleGrants.length > 0 ? '#a5d6a7' : '#fddcdc'}`,
                    }}>
                        {roleGrants.length} grant{roleGrants.length !== 1 ? 's' : ''}
                    </span>
                </Flex>
                <Box onClick={e => e.stopPropagation()}>
                    <Button size="S" variant="danger-light" onClick={() => onDelete(role.id)}>Delete</Button>
                </Box>
            </Flex>
            {expanded && (
                <Box style={{ borderTop: '1px solid #f0f0f4', padding: '8px 14px 10px 28px', background: '#fff' }}>
                    <Typography variant="pi" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 6 }}>
                        Grants (Policies)
                    </Typography>
                    {roleGrants.length === 0 ? (
                        <Typography variant="pi" textColor="neutral400">No policies linked to this role yet.</Typography>
                    ) : roleGrants.map(p => (
                        <Flex key={p.id} gap={2} alignItems="center" style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', fontFamily: 'monospace' }}>
                                {p.actionName || 'any'}
                            </span>
                            <Typography variant="pi" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {p.key || p.uid || `#${p.id}`}
                            </Typography>
                            {p.description && (
                                <Typography variant="pi" textColor="neutral400">— {p.description}</Typography>
                            )}
                            <span style={{
                                fontSize: 10, padding: '1px 5px', borderRadius: 3,
                                background: p.isActive !== false ? '#e8f5e9' : '#f0f0f0',
                                color: p.isActive !== false ? '#2e7d32' : '#aaa',
                                border: `1px solid ${p.isActive !== false ? '#a5d6a7' : '#ddd'}`,
                            }}>
                                {p.isActive !== false ? 'active' : 'inactive'}
                            </span>
                        </Flex>
                    ))}
                </Box>
            )}
        </Box>
    );
}

function DomainCard({ row, roles, policies, onEdit, onDelete, onDeleteRole }) {
    const [expanded, setExpanded] = React.useState(false);
    const domainRoles = roles.filter(r => {
        const rDomains = r.domains || [];
        return rDomains.some(d => String(d.id ?? d) === String(row.id));
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
                    <span style={{ fontSize: 13, color: '#aaa', flexShrink: 0 }}>{expanded ? '?' : '?'}</span>
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

            {/* Expanded: roles list with grants */}
            {expanded && (
                <Box style={{ borderTop: '1px solid #f0f0f4', background: tokens.surfaceBg, padding: '10px 14px 12px 36px' }}>
                    <Typography variant="pi" fontWeight="semiBold" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, marginBottom: 8, display: 'block' }}>
                        Roles in this domain — click a role to see its grants
                    </Typography>
                    {domainRoles.length === 0 ? (
                        <Typography variant="pi" textColor="neutral400">No roles assigned to this domain yet.</Typography>
                    ) : domainRoles.map(r => (
                        <RoleRow
                            key={r.id}
                            role={r}
                            policies={policies}
                            onDelete={onDeleteRole}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}

function Domains({ domains, roles = [], policies = [], panelOpen, editingRecord, formData, onFormChange, onOpenNew, onEdit, onDelete, onDeleteRole, onSubmitForm, onCancelForm, actionLoading }) {
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
                        policies={policies}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDeleteRole={onDeleteRole}
                    />
                ))}
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </Box>
            {panelOpen && (
                <Box background="neutral0" style={{ width: 450, marginLeft: 16, borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                    <Typography variant="beta" paddingBottom={4}>{editingRecord ? 'Edit Domain' : 'Create New Domain'}</Typography>
                    <DomainForm formData={formData} onChange={onFormChange} roles={roles} />
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
