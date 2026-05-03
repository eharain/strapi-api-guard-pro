import { useState, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

const apiEndpoint = (path) => `/api-guard-pro${path}`;

export function useUserAssignment({ users, notify, loadUsersAndRoles }) {
    const { put } = useFetchClient();
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const selectUser = useCallback((value) => {
        setSelectedUserId(value);
        const user = users.find(u => String(u.id) === String(value));
        setSelectedRoleIds((user?.permission_roles || []).map(r => String(r.id)));
    }, [users]);

    const toggleRole = useCallback((roleId) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    }, []);

    const saveAssignment = useCallback(async () => {
        if (!selectedUserId) return;
        setActionLoading(true);
        notify('');
        try {
            await put(apiEndpoint(`/users/${selectedUserId}/roles`), { roleIds: selectedRoleIds.map(Number) });
            notify('Assignment saved.', 'success');
            await loadUsersAndRoles();
        } catch {
            notify('Failed to save assignment.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [put, selectedUserId, selectedRoleIds, notify, loadUsersAndRoles]);

    return {
        selectedUserId,
        selectedRoleIds,
        userSearch,
        setUserSearch,
        selectUser,
        toggleRole,
        saveAssignment,
        userAssignmentLoading: actionLoading,
    };
}
