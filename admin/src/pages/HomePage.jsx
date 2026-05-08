import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Main,
    Typography,
    Button,
    Flex,
    Divider,
    Loader,
    Alert,
} from '@strapi/design-system';

import { getEmptyForm } from '../utils/forms';
import { useAppData } from '../hooks/useAppData';
import { useRecorder } from '../hooks/useRecorder';
import { useResourceBuilder } from '../hooks/useResourceBuilder';
import { useEntityCrud } from '../hooks/useEntityCrud';
import { useUserAssignment } from '../hooks/useUserAssignment';

import Domains from './Domains/index.jsx';
import Resources from './Resources/index.jsx';
import Roles from './Roles/index.jsx';
import Policies from './Policies/index.jsx';
import DataTransfer from './DataTransfer/index.jsx';
import Users from './Users/index.jsx';

const TABS = [
    { key: 'domains', label: 'Domains' },
    { key: 'roles', label: 'Roles' },
    { key: 'resources', label: 'Resources' },
    { key: 'policies', label: 'Policies' },
    { key: 'users', label: '👤 User Assignments' },
    { key: 'data-transfer', label: '⇅ Import / Export' },
];

export default function HomePage() {
    const [activeTab, setActiveTab] = useState('domains');
    const [globalLoading, setGlobalLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', variant: 'default' });
    const [resourceSubTab, setResourceSubTab] = useState('api-request-recordings');
    const pendingPanelRef = useRef(null);

    const notify = (text, variant = 'default') => setMessage({ text, variant });

    const {
        overview, entityData, users, roleOptions, strapiTypes, resourceCatalog,
        loadOverview, loadEntity, loadAllEntities, loadUsersAndRoles, loadStrapiTypes, loadResourceCatalog
    } = useAppData();

    const {
        recorder, recorderActionLoading,
        loadRecorder, toggleEnabled, toggleFilter, clearRecorder, saveRecorderSettings
    } = useRecorder(notify);

    const {
        panelOpen, setPanelOpen,
        editingRecord, setEditingRecord,
        formData, setFormData,
        actionLoading,
        openNewForm, openEditForm, cancelForm, submitForm, deleteRecord, submitResource
    } = useEntityCrud({ activeTab, notify, loadEntity, loadOverview });

    const { buildResourceFromSuggestion, buildResourceFromCatalog } = useResourceBuilder({
        activeTab, setActiveTab, setResourceSubTab, setEditingRecord, setFormData, setPanelOpen, pendingPanelRef
    });

    const {
        selectedUserId, selectedRoleIds, userSearch, setUserSearch,
        selectUser, toggleRole, saveAssignment, userAssignmentLoading
    } = useUserAssignment({ users, notify, loadUsersAndRoles });

    useEffect(() => { boot(); }, []);

    useEffect(() => {
        setPanelOpen(false);
        setEditingRecord(null);
        setFormData(getEmptyForm(activeTab));
        setMessage({ text: '', variant: 'default' });

        if (activeTab !== 'resources') setResourceSubTab('api-request-recordings');

        if (pendingPanelRef.current) {
            const { subTab, form } = pendingPanelRef.current;
            pendingPanelRef.current = null;
            if (subTab) setResourceSubTab(subTab);
            setEditingRecord(null);
            setFormData(form);
            setPanelOpen(true);
        }
    }, [activeTab]);

    async function boot() {
        setGlobalLoading(true);
        await Promise.all([
            loadOverview(),
            loadAllEntities(),
            loadUsersAndRoles(),
            loadStrapiTypes(),
            loadRecorder(),
            loadResourceCatalog()
        ]);
        setGlobalLoading(false);
    }

    const { domains, resources, roles, policies } = entityData;

    const commonTabProps = {
        panelOpen,
        editingRecord,
        formData,
        onFormChange: setFormData,
        onOpenNew: openNewForm,
        onEdit: (record) => {
            if (activeTab === 'resources') setResourceSubTab('api-resources');
            openEditForm(record);
        },
        onDelete: (id) => deleteRecord(activeTab, id),
        onSubmitForm: submitForm,
        onCancelForm: cancelForm,
        actionLoading,
    };

    if (globalLoading) {
        return (
            <Main>
                <Box padding={8} background="neutral100" style={{ minHeight: '100vh' }}>
                    <Flex justifyContent="center" paddingTop={10}>
                        <Loader>Loading API Guard Pro...</Loader>
                    </Flex>
                </Box>
            </Main>
        );
    }

    return (
        <Main>
            <Box padding={8} background="neutral100" style={{ minHeight: '100vh' }}>
                <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={4}>
                    <Box>
                        <Typography variant="alpha">API Guard Pro</Typography>
                        <Box paddingTop={1}>
                            <Typography variant="omega" textColor="neutral600">
                                Intercept, filter, and secure your APIs with domain isolation, field-level security, and URL aliases
                            </Typography>
                        </Box>
                    </Box>
                    <Button variant="secondary" onClick={boot}>Refresh</Button>
                </Flex>

                {/* Overview stats */}
                <Flex gap={3} wrap="wrap" paddingTop={4} paddingBottom={2}>
                    {['domains', 'roles', 'resources', 'policies', 'users'].map(k => (                        <Flex key={k} direction="column" alignItems="center" gap={1}
                            background="neutral0"
                            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '8px 18px', minWidth: 90 }}>
                            <Typography variant="beta" textColor="primary600">{overview[k] ?? 0}</Typography>
                            <Typography variant="pi" textColor="neutral600" style={{ textTransform: 'capitalize' }}>{k}</Typography>
                        </Flex>
                    ))}
                </Flex>

                <Divider marginTop={3} />

                {/* Tab navigation */}
                <Flex gap={2} wrap="wrap" paddingTop={4}>
                    {TABS.map(tab => (
                        <Button
                            key={tab.key}
                            variant={activeTab === tab.key ? 'default' : 'tertiary'}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </Flex>

                {message.text && (
                    <Box paddingTop={3}>
                        <Alert
                            closeLabel="Dismiss"
                            variant={message.variant === 'success' ? 'success' : message.variant === 'danger' ? 'danger' : 'default'}
                            onClose={() => setMessage({ text: '', variant: 'default' })}
                        >
                            {message.text}
                        </Alert>
                    </Box>
                )}

                {/* Tab content */}
                <Box paddingTop={4}>
                    {activeTab === 'domains' && (
                        <Domains {...commonTabProps} domains={domains} roles={roles} />
                    )}

                    {activeTab === 'resources' && (
                        <Resources
                            {...commonTabProps}
                            resources={resources}
                            domains={domains}
                            strapiTypes={strapiTypes}
                            policies={policies}
                            roles={roles}
                            resourceCatalog={resourceCatalog}
                            recorder={recorder}
                            subTab={resourceSubTab}
                            onSubTabChange={setResourceSubTab}
                            onToggleRecorderEnabled={toggleEnabled}
                            onRefreshRecorder={loadRecorder}
                            onClearRecorder={clearRecorder}
                            onToggleRecorderFilter={toggleFilter}
                            onSaveRecorderSettings={saveRecorderSettings}
                            onCreateFromSuggestion={buildResourceFromSuggestion}
                            onRefreshCatalog={loadResourceCatalog}
                            onUseFromCatalog={buildResourceFromCatalog}
                            onRefreshPolicies={() => loadEntity('policies')}
                        />
                    )}

                    {activeTab === 'roles' && (
                        <Roles {...commonTabProps} roles={roles} domains={domains} />
                    )}

                    {activeTab === 'policies' && (
                        <Policies {...commonTabProps} policies={policies} resources={resources} roles={roles} strapiTypes={strapiTypes} />
                    )}

                    {activeTab === 'users' && (
                        <Users
                            users={users}
                            roleOptions={roleOptions}
                            selectedUserId={selectedUserId}
                            selectedRoleIds={selectedRoleIds}
                            userSearch={userSearch}
                            onSelectUser={selectUser}
                            onToggleRole={toggleRole}
                            onSaveAssignment={saveAssignment}
                            onUserSearchChange={setUserSearch}
                            actionLoading={userAssignmentLoading}
                        />
                    )}

                    {activeTab === 'data-transfer' && (
                        <DataTransfer />
                    )}
                </Box>
            </Box>
        </Main>
    );
}