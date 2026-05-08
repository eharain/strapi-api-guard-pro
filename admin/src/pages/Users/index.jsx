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
                                {roleOptions.map(role => {
                                    const inputId = `assign-role-${role.id}`;
                                    return (
                                        <Flex key={role.id} gap={2} alignItems="center" paddingBottom={2}>
                                            <input
                                                id={inputId}
                                                type="checkbox"
                                                checked={selectedRoleIds.includes(String(role.id))}
                                                onChange={() => onToggleRole(String(role.id))}
                                            />
                                            <label htmlFor={inputId}>
                                                <Typography variant="pi">{role.key}</Typography>
                                            </label>
                                            {role.domain && (
                                                <Typography variant="pi" textColor="neutral500" style={{ fontSize: 11 }}>
                                                    ({role.domain.key || role.domain.name || `#${role.domain.id}`})
                                                </Typography>
                                            )}
                                        </Flex>
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
