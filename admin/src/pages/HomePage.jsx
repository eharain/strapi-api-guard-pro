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

import { ResourceWizard } from '../components/ResourceWizard';
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
import Grants from './Grants/index.jsx';
import Groups from './Groups/index.jsx';
import Users from './Users/index.jsx';
import AccessControl from './AccessControl/index.jsx';
import DataTransfer from './DataTransfer/index.jsx';

const TABS = [
    { key: 'access-control', label: '🌳 Access Control' },
    { key: 'domains', label: 'Domains' },
    { key: 'resources', label: 'Resources' },
    { key: 'roles', label: 'Roles' },
    { key: 'policies', label: 'Policies' },
    { key: 'grants', label: 'Grants' },
    { key: 'groups', label: 'Groups' },
    { key: 'assignments', label: 'User Assignments' },
    { key: 'inspect', label: 'Inspect' },
    { key: 'data-transfer', label: '⇅ Import / Export' }
];

export default function HomePage() {
    const [activeTab, setActiveTab] = useState('domains');
    const [wizardOpen, setWizardOpen] = useState(false);
    const [globalLoading, setGlobalLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', variant: 'default' });
    const [resourceSubTab, setResourceSubTab] = useState('api-request-recordings');
    const pendingPanelRef = useRef(null);

    const notify = (text, variant = 'default') => setMessage({ text, variant });

    const {
        overview, entityData, users, roleOptions, strapiTypes, resourceCatalog, inspectData,
        loadOverview, loadEntity, loadAllEntities, loadUsersAndRoles, loadStrapiTypes, loadResourceCatalog, loadInspect
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
            loadResourceCatalog(),
            loadInspect()
        ]);
        setGlobalLoading(false);
    }

    const { domains, resources, roles, policies, grants, groups } = entityData;

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
                    {['domains', 'resources', 'roles', 'policies', 'grants', 'groups', 'users'].map(k => (
                        <Flex key={k} direction="column" alignItems="center" gap={1}
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
                    {activeTab === 'access-control' && (
                        <AccessControl
                            domains={domains}
                            roles={roles}
                            grants={grants}
                            policies={policies}
                            resources={resources}
                            onRefresh={async (entity) => {
                                if (entity) {
                                    await loadEntity(entity);
                                } else {
                                    await loadAllEntities();
                                }
                                await loadOverview();
                            }}
                        />
                    )}

                    {activeTab === 'domains' && (
                        <Domains {...commonTabProps} domains={domains} />
                    )}

                    {activeTab === 'resources' && (
                        <Resources
                            {...commonTabProps}
                            resources={resources}
                            domains={domains}
                            strapiTypes={strapiTypes}
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
                        />
                    )}

                    {activeTab === 'roles' && (
                        <Roles {...commonTabProps} roles={roles} domains={domains} />
                    )}

                    {activeTab === 'policies' && (
                        <Policies {...commonTabProps} policies={policies} resources={resources} />
                    )}

                    {activeTab === 'grants' && (
                        <Grants {...commonTabProps} grants={grants} roles={roles} policies={policies} />
                    )}

                    {activeTab === 'groups' && (
                        <Groups {...commonTabProps} groups={groups} domains={domains} />
                    )}

                    {activeTab === 'assignments' && (
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

                    {activeTab === 'inspect' && (
                        <Box>
                            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
                                <Typography variant="beta">System Inspect — Canonical URL Map</Typography>
                                <Button variant="secondary" onClick={loadInspect}>Refresh</Button>
                            </Flex>
                            {!inspectData ? (
                                <Typography textColor="neutral500">No data yet. Click Refresh.</Typography>
                            ) : (
                                <Box>
                                    <Typography variant="delta" paddingBottom={2}>Domains ({inspectData.totals?.domains ?? 0})</Typography>
                                    {inspectData.domains?.map(d => (
                                        <Box key={d.key} background="neutral0" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                                            <Flex justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="sigma">{d.key}</Typography>
                                                    <Typography variant="pi" textColor="neutral500"> — {d.name}</Typography>
                                                </Box>
                                                <Flex gap={3}>
                                                    <Typography variant="pi" textColor="neutral600">{d.resourceCount} resources · {d.roleCount} roles</Typography>
                                                    {d.blockDirectAccess && (
                                                        <Typography variant="pi" textColor="danger600" style={{ fontWeight: 700 }}>🔒 blockDirectAccess</Typography>
                                                    )}
                                                </Flex>
                                            </Flex>
                                        </Box>
                                    ))}

                                    <Box paddingTop={4}>
                                        <Typography variant="delta" paddingBottom={2}>Canonical URL Map ({inspectData.canonicalMap?.length ?? 0} resources)</Typography>
                                        {inspectData.canonicalMap?.length === 0 && (
                                            <Typography textColor="neutral400">No resources have both a domain and a key. Assign a domain to resources to generate canonical URLs.</Typography>
                                        )}
                                        {inspectData.canonicalMap?.map(r => (
                                            <Box key={r.resourceKey} background="neutral0" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                                                <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={2}>
                                                    <Box style={{ flex: '1 1 200px' }}>
                                                        <Typography variant="sigma">{r.method} {r.resourceKey}</Typography>
                                                        <Typography variant="pi" textColor="neutral500" style={{ display: 'block' }}>{r.displayName}</Typography>
                                                        <Typography variant="pi" textColor="neutral400" style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.pathPattern}</Typography>
                                                    </Box>
                                                    <Box style={{ flex: '2 1 280px' }}>
                                                        {r.canonicalUrls.length === 0 ? (
                                                            <Typography variant="pi" textColor="neutral400">No roles in domain "{r.domain}" — assign roles to generate canonical URLs</Typography>
                                                        ) : r.canonicalUrls.map(cu => (
                                                            <Box key={cu.role} paddingBottom={1}>
                                                                <Typography variant="pi" textColor="neutral600"><strong>{cu.role}</strong>: </Typography>
                                                                <Typography variant="pi" textColor="primary600" style={{ fontFamily: 'monospace' }}>{cu.url}</Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                    {r.blockLegacyPath && (
                                                        <Typography variant="pi" textColor="danger600" style={{ fontWeight: 700, flexShrink: 0 }}>🔒 blockLegacy</Typography>
                                                    )}
                                                </Flex>
                                            </Box>
                                        ))}
                                    </Box>

                                    <Box paddingTop={4}>
                                        <Typography variant="delta" paddingBottom={2}>Grant Chains ({inspectData.grantChains?.length ?? 0})</Typography>
                                        {inspectData.grantChains?.map((g, i) => (
                                            <Box key={g.grantId ?? i} background="neutral0" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 14px', marginBottom: 6 }}>
                                                <Typography variant="pi">
                                                    <strong>{g.role}</strong>{g.roleDomain ? ` (${g.roleDomain})` : ''}
                                                    {' → '}<strong>{g.policy}</strong> [{g.policyEffect}]
                                                    {g.resource ? ` → ${g.resource}` : ''}
                                                    {g.actions ? ` [${(g.actions || []).join(', ')}]` : ''}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                    {activeTab === 'data-transfer' && (
                        <DataTransfer />
                    )}
                </Box>
            </Box>

            <ResourceWizard
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onSave={async (resource) => {
                    await submitResource(resource);
                    setWizardOpen(false);
                }}
            />
        </Main>
    );
}