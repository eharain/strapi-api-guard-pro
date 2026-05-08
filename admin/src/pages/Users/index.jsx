import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Button, Flex, TextInput, SingleSelect, SingleSelectOption,
} from '@strapi/design-system';
import Pagination from '../../components/Common/Pagination.jsx';

const PAGE_SIZE = 15;

function Users({ users, roleOptions, selectedUserId, selectedRoleIds, userSearch, onSelectUser, onToggleRole, onSaveAssignment, onUserSearchChange, actionLoading }) {
    const [filterAgpRole, setFilterAgpRole] = useState('');
    const [filterUpRole, setFilterUpRole] = useState('');
    const [page, setPage] = useState(1);

    // Derive unique Strapi users-permissions roles from the user list
    const upRoleOptions = useMemo(() => {
        const seen = new Map();
        for (const u of users) {
            if (u.role && !seen.has(String(u.role.id))) {
                seen.set(String(u.role.id), u.role);
            }
        }
        return Array.from(seen.values());
    }, [users]);

    // Group roles by domain for the left assignment panel
    // roles.domains is a manyToMany array — a role may belong to multiple domains
    const rolesByDomain = useMemo(() => {
        const map = new Map(); // domainKey -> { label, roles[] }
        roleOptions.forEach(role => {
            const doms = Array.isArray(role.domains) && role.domains.length > 0 ? role.domains : null;
            if (doms) {
                doms.forEach(domain => {
                    const domainKey = String(domain.id);
                    const domainLabel = domain.key || domain.name || `Domain #${domain.id}`;
                    if (!map.has(domainKey)) map.set(domainKey, { label: domainLabel, roles: [] });
                    map.get(domainKey).roles.push(role);
                });
            } else {
                if (!map.has('__none__')) map.set('__none__', { label: 'No Domain', roles: [] });
                map.get('__none__').roles.push(role);
            }
        });
        // Sort: domains alphabetically, No Domain last
        return Array.from(map.entries()).sort(([ka, a], [kb, b]) => {
            if (ka === '__none__') return 1;
            if (kb === '__none__') return -1;
            return a.label.localeCompare(b.label);
        });
    }, [roleOptions]);

    const selectedSet = useMemo(() => new Set(selectedRoleIds.map(String)), [selectedRoleIds]);

    const handleAddAllInDomain = (roles) => {
        roles.forEach(role => {
            if (!selectedSet.has(String(role.id))) onToggleRole(String(role.id));
        });
    };

    const handleRemoveAllInDomain = (roles) => {
        roles.forEach(role => {
            if (selectedSet.has(String(role.id))) onToggleRole(String(role.id));
        });
    };

    const filtered = useMemo(() => {
        return users.filter(u => {
            if (userSearch) {
                const q = userSearch.toLowerCase();
                const match =
                    (u.username || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.displayName || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            if (filterAgpRole) {
                const hasRole = (u.api_guard_roles || []).some(r => String(r.id) === filterAgpRole);
                if (!hasRole) return false;
            }
            if (filterUpRole) {
                if (String(u.role?.id) !== filterUpRole) return false;
            }
            return true;
        });
    }, [users, userSearch, filterAgpRole, filterUpRole]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const resetPage = () => setPage(1);

    const hasFilters = userSearch || filterAgpRole || filterUpRole;

    return (
        <Box>
            <Typography variant="beta">User Role Assignments</Typography>
            <Flex gap={6} alignItems="flex-start" wrap="wrap" paddingTop={4}>
                {/* Left panel — role assignment for selected user */}
                <Box style={{ flex: '0 0 350px' }}>
                    <SingleSelect
                        label="Select User"
                        placeholder="Choose a user"
                        value={selectedUserId}
                        onChange={onSelectUser}
                    >
                        {users.map(user => (
                            <SingleSelectOption key={user.id} value={String(user.id)}>
                                {user.displayName || user.username || user.email}
                            </SingleSelectOption>
                        ))}
                    </SingleSelect>

                    {selectedUserId && (
                        <Box paddingTop={4}>
                            <Typography variant="sigma">Assigned AGP Roles</Typography>
                            <Box paddingTop={2}>
                                {rolesByDomain.map(([domainKey, { label, roles }]) => {
                                    const allAssigned = roles.every(r => selectedSet.has(String(r.id)));
                                    const someAssigned = roles.some(r => selectedSet.has(String(r.id)));
                                    const missingCount = roles.filter(r => !selectedSet.has(String(r.id))).length;
                                    return (
                                        <Box key={domainKey} style={{ marginBottom: 12, border: '1px solid #e8e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                            {/* Domain header */}
                                            <Flex justifyContent="space-between" alignItems="center" style={{ padding: '6px 10px', background: '#f4f4f8' }}>
                                                <Typography variant="pi" fontWeight="semiBold" textColor="neutral600">
                                                    {label}
                                                </Typography>
                                                <Flex gap={1}>
                                                    {missingCount > 0 && (
                                                        <Button size="S" variant="tertiary"
                                                            onClick={() => handleAddAllInDomain(roles)}>
                                                            + Add all ({missingCount})
                                                        </Button>
                                                    )}
                                                    {someAssigned && (
                                                        <Button size="S" variant="danger-light"
                                                            onClick={() => handleRemoveAllInDomain(roles)}>
                                                            Remove all
                                                        </Button>
                                                    )}
                                                </Flex>
                                            </Flex>
                                            {/* Roles in domain */}
                                            <Box style={{ padding: '6px 10px' }}>
                                                {roles.map(role => {
                                                    const inputId = `assign-role-${role.id}`;
                                                    const isChecked = selectedSet.has(String(role.id));
                                                    return (
                                                        <Flex key={role.id} gap={2} alignItems="center" paddingBottom={1}>
                                                            <input
                                                                id={inputId}
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => onToggleRole(String(role.id))}
                                                            />
                                                            <label htmlFor={inputId} style={{ cursor: 'pointer', flex: 1 }}>
                                                                <Typography variant="pi">{role.key}</Typography>
                                                                {role.name && role.name !== role.key && (
                                                                    <Typography variant="pi" textColor="neutral400" style={{ fontSize: 10, marginLeft: 4 }}>
                                                                        {role.name}
                                                                    </Typography>
                                                                )}
                                                            </label>
                                                            {isChecked && (
                                                                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', fontWeight: 700 }}>
                                                                    assigned
                                                                </span>
                                                            )}
                                                        </Flex>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                            <Button onClick={onSaveAssignment} loading={actionLoading} style={{ marginTop: 16 }}>
                                Save Assignment
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* Right panel — searchable, filterable, paginated user list */}
                <Box style={{ flex: 1, minWidth: 0 }}>
                    {/* Filters row */}
                    <Flex gap={3} wrap="wrap" alignItems="flex-end" paddingBottom={3}>
                        <Box style={{ flex: '1 1 200px' }}>
                            <TextInput
                                label="Search Users"
                                placeholder="Name or email..."
                                value={userSearch}
                                onChange={e => { onUserSearchChange(e.target.value); resetPage(); }}
                            />
                        </Box>
                        <Box style={{ flex: '1 1 180px' }}>
                            <SingleSelect
                                label="Filter by AGP Role"
                                placeholder="All AGP roles"
                                value={filterAgpRole}
                                onChange={v => { setFilterAgpRole(v || ''); resetPage(); }}
                            >
                                {roleOptions.map(r => (
                                    <SingleSelectOption key={r.id} value={String(r.id)}>
                                        {r.key}{r.domain ? ` (${r.domain.key || r.domain.name})` : ''}
                                    </SingleSelectOption>
                                ))}
                            </SingleSelect>
                        </Box>
                        <Box style={{ flex: '1 1 180px' }}>
                            <SingleSelect
                                label="Filter by Permissions Role"
                                placeholder="All UP roles"
                                value={filterUpRole}
                                onChange={v => { setFilterUpRole(v || ''); resetPage(); }}
                            >
                                {upRoleOptions.map(r => (
                                    <SingleSelectOption key={r.id} value={String(r.id)}>
                                        {r.name || r.type}
                                    </SingleSelectOption>
                                ))}
                            </SingleSelect>
                        </Box>
                        {hasFilters && (
                            <Button variant="tertiary" onClick={() => {
                                onUserSearchChange('');
                                setFilterAgpRole('');
                                setFilterUpRole('');
                                resetPage();
                            }}>
                                Clear
                            </Button>
                        )}
                    </Flex>

                    <Typography variant="pi" textColor="neutral500" paddingBottom={2}>
                        {filtered.length} of {users.length} users
                    </Typography>

                    <Box paddingTop={1}>
                        {paged.length === 0 ? (
                            <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                                <Typography textColor="neutral500">
                                    {users.length === 0 ? 'No users found.' : 'No users match your filters.'}
                                </Typography>
                            </Box>
                        ) : paged.map(user => (
                            <Flex
                                key={user.id}
                                justifyContent="space-between"
                                alignItems="center"
                                padding={3}
                                style={{
                                    background: String(user.id) === selectedUserId ? '#e8eaf6' : 'var(--strapi-colors-neutral0, transparent)',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    marginBottom: 6,
                                    cursor: 'pointer',
                                }}
                                onClick={() => onSelectUser(String(user.id))}
                            >
                                <Box>
                                    <Typography variant="sigma">{user.displayName || user.username}</Typography>
                                    <Typography variant="pi" textColor="neutral500">{user.email}</Typography>
                                    {user.role && (
                                        <Typography variant="pi" textColor="neutral400" style={{ fontSize: 10 }}>
                                            UP: {user.role.name || user.role.type}
                                        </Typography>
                                    )}
                                </Box>
                                <Flex gap={2} alignItems="center">
                                    <Box style={{
                                        background: (user.api_guard_roles || []).length > 0 ? '#e8f5e9' : '#f5f5f5',
                                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                    }}>
                                        {(user.api_guard_roles || []).length} AGP role{(user.api_guard_roles || []).length !== 1 ? 's' : ''}
                                    </Box>
                                </Flex>
                            </Flex>
                        ))}
                    </Box>

                    <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
                </Box>
            </Flex>
        </Box>
    );
}

export default Users;
