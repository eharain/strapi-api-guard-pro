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

import { useFetchClient } from '@strapi/strapi/admin';
import { ResourceWizard } from '../components/ResourceWizard';

import Domains from './Domains/index.jsx';
import Resources from './Resources/index.jsx';
import Roles from './Roles/index.jsx';
import Policies from './Policies/index.jsx';
import Grants from './Grants/index.jsx';
import Groups from './Groups/index.jsx';
import Users from './Users/index.jsx';

const TABS = [
    { key: 'domains', label: 'Domains' },
    { key: 'resources', label: 'Resources' },
    { key: 'roles', label: 'Roles' },
    { key: 'policies', label: 'Policies' },
    { key: 'grants', label: 'Grants' },
    { key: 'groups', label: 'Groups' },
    { key: 'assignments', label: 'User Assignments' }
];

const endpoint = (path) => `/api-guard-pro${path}`;

const getEmptyForm = (tab) => {
    switch (tab) {
        case 'domains':
            return { key: '', name: '', description: '', isActive: true, matchMode: 'header', matchKey: 'x-app-name', strapiRoleType: 'authenticated' };
        case 'resources':
            return {
                key: '', 'route-name': '', displayName: '', description: '', type: 'standard', method: 'GET',
                pathPattern: '', aliasPath: '', contentTypeUid: '', 'content-type-uid': '', controllerAction: '',
                domain: null, parentResource: null, isPublic: false, isActive: true, effect: 'allow',
                requestRules: {}, responseRules: {}, matchCriteria: {}, requestMutation: {}, responseMutation: {},
                recordedRequestRaw: {}, recordedRequestParsed: {}
            };
        case 'roles':
            return { key: '', name: '', level: 'staff', description: '', isActive: true, domain: null };
        case 'policies':
            return { key: '', name: '', description: '', actions: ['read'], effect: 'allow', conditions: [], fields: [], priority: 0, isActive: true, resource: null };
        case 'grants':
            return { key: '', isActive: true, role: null, policy: null };
        case 'groups':
            return { key: '', name: '', description: '', isActive: true, isBundle: false, domain: null, parentGroup: null };
        default:
            return {};
    }
};

const ensureLeadingSlash = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.startsWith('/') ? raw : `/${raw}`;
};

export default function HomePage() {
    const { get, post, put, del } = useFetchClient();
    const [activeTab, setActiveTab] = useState('domains');
    const [overview, setOverview] = useState({});
    const [entityData, setEntityData] = useState({
        domains: [], resources: [], roles: [], policies: [], grants: [], groups: []
    });
    const [wizardOpen, setWizardOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [roleOptions, setRoleOptions] = useState([]);
    const [strapiTypes, setStrapiTypes] = useState([]);
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);
    const [globalLoading, setGlobalLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', variant: 'default' });
    const [userSearch, setUserSearch] = useState('');
    const [resourceSubTab, setResourceSubTab] = useState('api-request-recordings');
    const [resourceRecorder, setResourceRecorder] = useState({
        enabled: false,
        filters: { methods: { get: true, post: true, put: true, delete: true }, paths: { api: true, contentManager: true } },
        records: [],
        suggestions: []
    });
    const [resourceCatalog, setResourceCatalog] = useState([]);
    const pendingPanelRef = useRef(null);

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

    const notify = (text, variant = 'default') => setMessage({ text, variant });

    async function boot() {
        setGlobalLoading(true);
        await Promise.all([
            loadOverview(),
            loadAllEntities(),
            loadUsersAndRoles(),
            loadStrapiTypes(),
            loadResourceRecorder(),
            loadResourceCatalog()
        ]);
        setGlobalLoading(false);
    }

    async function loadOverview() {
        try { const { data } = await get(endpoint('/overview')); setOverview(data || {}); } catch { }
    }

    async function loadEntity(entity) {
        const { data } = await get(endpoint(`/entities/${entity}`));
        setEntityData(prev => ({ ...prev, [entity]: data?.data || [] }));
    }

    async function loadAllEntities() {
        await Promise.all(
            ['domains', 'resources', 'roles', 'policies', 'grants', 'groups'].map(e => loadEntity(e).catch(() => { }))
        );
    }

    async function loadUsersAndRoles() {
        try {
            const [ur, rr] = await Promise.all([get(endpoint('/users')), get(endpoint('/entities/roles'))]);
            setUsers(ur?.data?.data || []);
            setRoleOptions(rr?.data?.data || []);
        } catch { }
    }

    async function loadStrapiTypes() {
        try { const { data } = await get(endpoint('/strapi-content-types')); setStrapiTypes(data?.data || []); } catch { }
    }

    async function loadResourceRecorder() {
        try {
            const { data } = await get(endpoint('/resource-recorder'));
            setResourceRecorder(data?.data || { enabled: false, filters: { methods: { get: true, post: true, put: true, delete: true }, paths: { api: true, contentManager: true } }, records: [], suggestions: [] });
        } catch { }
    }

    async function loadResourceCatalog() {
        try { const { data } = await get(endpoint('/resource-builder/catalog')); setResourceCatalog(data?.data || []); } catch { }
    }

    async function saveRecorderConfig(nextConfig = {}) {
        setActionLoading(true);
        try {
            await put(endpoint('/resource-recorder'), {
                enabled: nextConfig.enabled,
                filters: nextConfig.filters,
                ...(nextConfig.maxRecords !== undefined ? { maxRecords: nextConfig.maxRecords } : {}),
                ...(nextConfig.timeLimitSeconds !== undefined ? { timeLimitSeconds: nextConfig.timeLimitSeconds } : {})
            });
            await loadResourceRecorder();
            notify('Recorder settings updated.', 'success');
        } catch { notify('Failed to update recorder settings.', 'danger'); }
        finally { setActionLoading(false); }
    }

    async function saveRecorderSettings(settings = {}) {
        setActionLoading(true);
        try {
            await put(endpoint('/resource-recorder'), {
                enabled: resourceRecorder.enabled,
                filters: resourceRecorder.filters,
                ...settings
            });
            await loadResourceRecorder();
            notify('Recorder settings saved.', 'success');
        } catch { notify('Failed to save recorder settings.', 'danger'); }
        finally { setActionLoading(false); }
    }

    async function toggleRecorderFilter(section, key) {
        const nextFilters = {
            methods: { ...(resourceRecorder.filters?.methods || {}) },
            paths: { ...(resourceRecorder.filters?.paths || {}) }
        };
        nextFilters[section][key] = !Boolean(nextFilters[section][key]);
        await saveRecorderConfig({ enabled: resourceRecorder.enabled, filters: nextFilters });
    }

    async function clearRecorder() {
        setActionLoading(true);
        try { await del(endpoint('/resource-recorder')); await loadResourceRecorder(); notify('Recorded requests cleared.', 'success'); }
        catch { notify('Failed to clear recorded requests.', 'danger'); }
        finally { setActionLoading(false); }
    }

    function buildResourceFromSuggestion(item) {
        const form = {
            ...getEmptyForm('resources'),
            key: item.key,
            displayName: item.displayName,
            type: item.type || 'standard',
            method: item.method || 'GET',
            pathPattern: item.pathPattern || item.path || '',
            matchCriteria: { method: item.method || 'GET', pathPattern: item.pathPattern || item.path || '', uri: item.urlParts || null, queryParams: item.queryParamsJson || {} },
            requestMutation: { ...(item.requestRules || {}) },
            responseMutation: { exampleQuery: item.exampleQuery || null, exampleBody: item.exampleBody || null },
            requestRules: { ...(item.requestRules || {}), recordedUrlParts: item.urlParts || null, recordedQueryParams: item.queryParamsJson || {}, recordedBodySample: item.exampleBody || null },
            responseRules: { exampleQuery: item.exampleQuery || null, exampleBody: item.exampleBody || null },
            recordedRequestRaw: item.recordedRequestRaw || { method: item.method || 'GET', path: item.path || item.pathPattern || '', url: item.exampleUrl || null, query: item.exampleQuery || {}, body: item.exampleBody || null, status: item.lastStatus ?? null },
            recordedRequestParsed: item.recordedRequestParsed || { uri: item.urlParts || null, queryParams: item.queryParamsJson || {}, body: item.exampleBody || null, requestRules: item.requestRules || {} },
            description: [`Suggested from recorder (${item.count || 1} hit${(item.count || 1) > 1 ? 's' : ''})`, item.exampleUrl ? `Example URL: ${item.exampleUrl}` : null, item.lastStatus ? `Last status: ${item.lastStatus}` : null].filter(Boolean).join(' | ')
        };
        if (activeTab === 'resources') {
            setResourceSubTab('api-resources');
            setEditingRecord(null);
            setFormData(form);
            setPanelOpen(true);
        } else {
            pendingPanelRef.current = { subTab: 'api-resources', form };
            setActiveTab('resources');
        }
    }

    function buildResourceFromCatalog(contentType, action) {
        const sanitizedUid = String(contentType.uid || '').replace(/[^a-zA-Z0-9_.-]/g, '.');
        const actionName = String(action.action || 'custom').toLowerCase();
        const form = {
            ...getEmptyForm('resources'),
            key: `${sanitizedUid}.${actionName}`,
            displayName: `${contentType.displayName} · ${action.method} ${action.path}`,
            type: action.type || 'standard',
            method: action.method || 'GET',
            pathPattern: action.path || '',
            contentTypeUid: contentType.uid || '',
            controllerAction: `${contentType.uid}.${action.action || 'custom'}`,
            description: `Generated from builder catalog (${action.type || 'standard'})`
        };
        if (activeTab === 'resources') {
            setResourceSubTab('api-resources');
            setEditingRecord(null);
            setFormData(form);
            setPanelOpen(true);
        } else {
            pendingPanelRef.current = { subTab: 'api-resources', form };
            setActiveTab('resources');
        }
    }

    async function submitResource(resource) {
        setActionLoading(true);
        notify('');
        try {
            await post(endpoint('/entities/resources'), { data: resource });
            notify('Resource created successfully.', 'success');
            await loadEntity('resources');
            await loadOverview();
        } catch { notify('Failed to create resource.', 'danger'); }
        finally { setActionLoading(false); }
    }

    async function submitForm() {
        setActionLoading(true);
        notify('');
        try {
            const payload = { ...formData };
            if (payload.domain) payload.domain = parseInt(payload.domain, 10);
            if (payload.resource) payload.resource = parseInt(payload.resource, 10);
            if (payload.role) payload.role = parseInt(payload.role, 10);
            if (payload.policy) payload.policy = parseInt(payload.policy, 10);
            if (payload.parentGroup) payload.parentGroup = parseInt(payload.parentGroup, 10);
            if (payload.parentResource) payload.parentResource = parseInt(payload.parentResource, 10);

            if (editingRecord) {
                await put(endpoint(`/entities/${activeTab}/${editingRecord.id}`), { data: payload });
                notify('Updated successfully.', 'success');
            } else {
                await post(endpoint(`/entities/${activeTab}`), { data: payload });
                notify('Created successfully.', 'success');
            }
            setPanelOpen(false);
            setEditingRecord(null);
            await loadEntity(activeTab);
            await loadOverview();
        } catch { notify(editingRecord ? 'Failed to update.' : 'Failed to create.', 'danger'); }
        finally { setActionLoading(false); }
    }

    async function deleteRecord(entity, id) {
        if (!window.confirm('Delete this record?')) return;
        setActionLoading(true);
        notify('');
        try {
            await del(endpoint(`/entities/${entity}/${id}`));
            notify('Deleted.', 'success');
            if (editingRecord?.id === id) { setPanelOpen(false); setEditingRecord(null); }
            await loadEntity(entity);
            await loadOverview();
        } catch { notify('Failed to delete.', 'danger'); }
        finally { setActionLoading(false); }
    }

    function openEditForm(record) {
        setEditingRecord(record);
        if (activeTab === 'resources') setResourceSubTab('api-resources');
        const form = { ...record };
        if (form.domain && typeof form.domain === 'object') form.domain = form.domain.id;
        if (form.resource && typeof form.resource === 'object') form.resource = form.resource.id;
        if (form.role && typeof form.role === 'object') form.role = form.role.id;
        if (form.policy && typeof form.policy === 'object') form.policy = form.policy.id;
        if (form.parentGroup && typeof form.parentGroup === 'object') form.parentGroup = form.parentGroup.id;
        if (form.parentResource && typeof form.parentResource === 'object') form.parentResource = form.parentResource.id;
        setFormData(form);
        setPanelOpen(true);
    }

    async function saveAssignment() {
        if (!selectedUserId) return;
        setActionLoading(true);
        notify('');
        try {
            await put(endpoint(`/users/${selectedUserId}/roles`), { roleIds: selectedRoleIds.map(Number) });
            notify('Assignment saved.', 'success');
            await loadUsersAndRoles();
        } catch { notify('Failed to save assignment.', 'danger'); }
        finally { setActionLoading(false); }
    }

    function selectUser(value) {
        setSelectedUserId(value);
        const user = users.find(u => String(u.id) === String(value));
        setSelectedRoleIds((user?.permission_roles || []).map(r => String(r.id)));
    }

    function toggleRole(roleId) {
        setSelectedRoleIds(prev =>
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    }

    const { domains, resources, roles, policies, grants, groups } = entityData;

    const commonTabProps = {
        panelOpen,
        editingRecord,
        formData,
        onFormChange: setFormData,
        onOpenNew: () => { setEditingRecord(null); setFormData(getEmptyForm(activeTab)); setPanelOpen(true); },
        onEdit: openEditForm,
        onDelete: (id) => deleteRecord(activeTab, id),
        onSubmitForm: submitForm,
        onCancelForm: () => { setPanelOpen(false); setEditingRecord(null); },
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
                            recorder={resourceRecorder}
                            subTab={resourceSubTab}
                            onSubTabChange={setResourceSubTab}
                            onToggleRecorderEnabled={() => saveRecorderConfig({ enabled: !resourceRecorder.enabled, filters: resourceRecorder.filters })}
                            onRefreshRecorder={loadResourceRecorder}
                            onClearRecorder={clearRecorder}
                            onToggleRecorderFilter={toggleRecorderFilter}
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
                            actionLoading={actionLoading}
                        />
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