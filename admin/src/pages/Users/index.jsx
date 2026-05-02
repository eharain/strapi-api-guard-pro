import React from 'react';
import {
    Box, Typography, Button, Flex, TextInput, SingleSelect, SingleSelectOption,
} from '@strapi/design-system';

function Users({ users, roleOptions, selectedUserId, selectedRoleIds, userSearch, onSelectUser, onToggleRole, onSaveAssignment, onUserSearchChange, actionLoading }) {
    return (
        <Box>
            <Typography variant="beta">User Role Assignments</Typography>
            <Flex gap={6} alignItems="flex-start" wrap="wrap" paddingTop={4}>
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
                            <Typography variant="sigma">Assigned Roles</Typography>
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

                <Box style={{ flex: 1 }}>
                    <TextInput
                        label="Search Users"
                        placeholder="Filter by name or email..."
                        value={userSearch}
                        onChange={e => onUserSearchChange(e.target.value)}
                    />
                    <Box paddingTop={2} style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {users
                            .filter(u => {
                                if (!userSearch) return true;
                                const q = userSearch.toLowerCase();
                                return (
                                    (u.username || '').toLowerCase().includes(q) ||
                                    (u.email || '').toLowerCase().includes(q) ||
                                    (u.displayName || '').toLowerCase().includes(q)
                                );
                            })
                            .map(user => (
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
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => onSelectUser(String(user.id))}
                                >
                                    <Box>
                                        <Typography variant="sigma">{user.displayName || user.username}</Typography>
                                        <Typography variant="pi" textColor="neutral500">{user.email}</Typography>
                                    </Box>
                                    <Box style={{
                                        background: (user.permission_roles || []).length > 0 ? '#e8f5e9' : '#f5f5f5',
                                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600
                                    }}>
                                        {(user.permission_roles || []).length} role{(user.permission_roles || []).length !== 1 ? 's' : ''}
                                    </Box>
                                </Flex>
                            ))}
                    </Box>
                </Box>
            </Flex>
        </Box>
    );
}

export default Users;
