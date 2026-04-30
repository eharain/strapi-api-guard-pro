import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Main,
  Typography,
  Button,
  Flex,
  TextInput,
  SingleSelect,
  SingleSelectOption,
  Divider,
  Loader,
  Alert,
  Textarea,
  Switch,
  JSONInput
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const PAGE_SIZE = 20;
const TABS = [
  { key: 'domains', label: 'Domains' },
  { key: 'resources', label: 'Resources' },
  { key: 'roles', label: 'Roles' },
  { key: 'policies', label: 'Policies' },
  { key: 'grants', label: 'Grants' },
  { key: 'groups', label: 'Groups' },
  { key: 'assignments', label: 'User Assignments' }
];

const LEVEL_OPTIONS = ['staff', 'manager', 'admin', 'super-admin'];
const EFFECT_OPTIONS = ['allow', 'deny'];
const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const RESOURCE_TYPES = ['standard', 'extended', 'alias'];
const MATCH_MODE_OPTIONS = ['header', 'query', 'both'];
const RESOURCE_SUB_TABS = [
  { key: 'recorder', label: 'Recorder' },
  { key: 'builder', label: 'Builder' },
  { key: 'manual', label: 'Manual' }
];

const endpoint = (path) => `/api-guard-pro${path}`;
const labelFor = (rec) => {
  if (!rec) return '';
  return rec.key || rec.name || rec.displayName || rec.username || rec.email || `#${rec.id}`;
};

const emptyFilters = () => ({
  search: '',
  domain: '',
  level: '',
  effect: '',
  resource: '',
  role: '',
  policy: '',
  type: ''
});

const getEmptyForm = (tab) => {
  switch (tab) {
    case 'domains':
      return { key: '', name: '', description: '', isActive: true, matchMode: 'header', matchKey: 'x-app-name', strapiRoleType: 'authenticated' };
    case 'resources':
      return { key: '', displayName: '', description: '', type: 'standard', method: 'GET', pathPattern: '', aliasPath: '', contentTypeUid: '', isActive: true, effect: 'allow', requestRules: {}, responseRules: {} };
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

export default function HomePage() {
  const { get, post, put, del } = useFetchClient();
  const [activeTab, setActiveTab] = useState('domains');
  const [overview, setOverview] = useState({});
  const [entityData, setEntityData] = useState({
    domains: [], resources: [], roles: [], policies: [], grants: [], groups: []
  });
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [strapiTypes, setStrapiTypes] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', variant: 'default' });
  const [userSearch, setUserSearch] = useState('');
  const [resourceSubTab, setResourceSubTab] = useState('recorder');
  const [resourceRecorder, setResourceRecorder] = useState({
    enabled: false,
    filters: {
      methods: { get: true, post: true, put: true, delete: true },
      paths: { api: true, contentManager: true }
    },
    records: [],
    suggestions: []
  });
  const [resourceCatalog, setResourceCatalog] = useState([]);

  useEffect(() => { boot(); }, []);
  useEffect(() => {
    setPanelOpen(false);
    setEditingRecord(null);
    setFormData(getEmptyForm(activeTab));
    setPage(1);
    setFilters(emptyFilters());
    setMessage({ text: '', variant: 'default' });

    if (activeTab !== 'resources') {
      setResourceSubTab('recorder');
    }
  }, [activeTab]);
  useEffect(() => { setPage(1); }, [filters]);

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
    try {
      const { data } = await get(endpoint('/overview'));
      setOverview(data || {});
    } catch {}
  }

  async function loadEntity(entity) {
    const { data } = await get(endpoint(`/entities/${entity}`));
    setEntityData(prev => ({ ...prev, [entity]: data?.data || [] }));
  }

  async function loadAllEntities() {
    await Promise.all(
      ['domains', 'resources', 'roles', 'policies', 'grants', 'groups'].map(e =>
        loadEntity(e).catch(() => {})
      )
    );
  }

  async function loadUsersAndRoles() {
    try {
      const [ur, rr] = await Promise.all([
        get(endpoint('/users')),
        get(endpoint('/entities/roles'))
      ]);
      setUsers(ur?.data?.data || []);
      setRoleOptions(rr?.data?.data || []);
    } catch {}
  }

  async function loadStrapiTypes() {
    try {
      const { data } = await get(endpoint('/strapi-content-types'));
      setStrapiTypes(data?.data || []);
    } catch {}
  }

  async function loadResourceRecorder() {
    try {
      const { data } = await get(endpoint('/resource-recorder'));
      setResourceRecorder(data?.data || {
        enabled: false,
        filters: {
          methods: { get: true, post: true, put: true, delete: true },
          paths: { api: true, contentManager: true }
        },
        records: [],
        suggestions: []
      });
    } catch {}
  }

  async function saveRecorderConfig(nextConfig = {}) {
    setActionLoading(true);
    try {
      await put(endpoint('/resource-recorder'), {
        enabled: nextConfig.enabled,
        filters: nextConfig.filters
      });
      await loadResourceRecorder();
      notify('Recorder settings updated.', 'success');
    } catch {
      notify('Failed to update recorder settings.', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  async function setRecorderEnabled(enabled) {
    await saveRecorderConfig({
      enabled,
      filters: resourceRecorder.filters
    });
  }

  async function clearRecorder() {
    setActionLoading(true);
    try {
      await del(endpoint('/resource-recorder'));
      await loadResourceRecorder();
      notify('Recorded requests cleared.', 'success');
    } catch {
      notify('Failed to clear recorded requests.', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleRecorderFilter(section, key) {
    const nextFilters = {
      methods: {
        ...(resourceRecorder.filters?.methods || {})
      },
      paths: {
        ...(resourceRecorder.filters?.paths || {})
      }
    };

    nextFilters[section][key] = !Boolean(nextFilters[section][key]);

    await saveRecorderConfig({
      enabled: resourceRecorder.enabled,
      filters: nextFilters
    });
  }

  async function loadResourceCatalog() {
    try {
      const { data } = await get(endpoint('/resource-builder/catalog'));
      setResourceCatalog(data?.data || []);
    } catch {}
  }

  function buildResourceFromSuggestion(item) {
    const extensiveDescription = [
      `Suggested from recorder (${item.count || 1} hit${(item.count || 1) > 1 ? 's' : ''})`,
      item.exampleUrl ? `Example URL: ${item.exampleUrl}` : null,
      item.lastStatus ? `Last status: ${item.lastStatus}` : null,
      item.firstSeenAt ? `First seen: ${item.firstSeenAt}` : null,
      item.lastSeenAt ? `Last seen: ${item.lastSeenAt}` : null
    ].filter(Boolean).join(' | ');

    setActiveTab('resources');
    setResourceSubTab('manual');
    setEditingRecord(null);
    setFormData({
      ...getEmptyForm('resources'),
      key: item.key,
      displayName: item.displayName,
      type: item.type || 'standard',
      method: item.method || 'GET',
      pathPattern: item.pathPattern || item.path || '',
      requestRules: {
        ...(item.requestRules || {}),
        recordedUrlParts: item.urlParts || null,
        recordedQueryParams: item.queryParamsJson || {},
        recordedBodySample: item.exampleBody || null
      },
      responseRules: {
        exampleQuery: item.exampleQuery || null,
        exampleBody: item.exampleBody || null
      },
      description: extensiveDescription
    });
    setPanelOpen(true);
  }

  function buildResourceFromCatalog(contentType, action) {
    const sanitizedUid = String(contentType.uid || '').replace(/[^a-zA-Z0-9_.-]/g, '.');
    const actionName = String(action.action || 'custom').toLowerCase();

    setActiveTab('resources');
    setResourceSubTab('manual');
    setEditingRecord(null);
    setFormData({
      ...getEmptyForm('resources'),
      key: `${sanitizedUid}.${actionName}`,
      displayName: `${contentType.displayName} · ${action.method} ${action.path}`,
      type: action.type || 'standard',
      method: action.method || 'GET',
      pathPattern: action.path || '',
      contentTypeUid: contentType.uid || '',
      controllerAction: `${contentType.uid}.${action.action || 'custom'}`,
      description: `Generated from builder catalog (${action.type || 'standard'})`
    });
    setPanelOpen(true);
  }

  async function submitForm() {
    setActionLoading(true);
    notify('');
    try {
      const payload = { ...formData };
      // Convert relation IDs to numbers
      if (payload.domain) payload.domain = parseInt(payload.domain, 10);
      if (payload.resource) payload.resource = parseInt(payload.resource, 10);
      if (payload.role) payload.role = parseInt(payload.role, 10);
      if (payload.policy) payload.policy = parseInt(payload.policy, 10);
      if (payload.parentGroup) payload.parentGroup = parseInt(payload.parentGroup, 10);
      
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
    } catch (err) {
      console.error(err);
      notify(editingRecord ? 'Failed to update.' : 'Failed to create.', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteRecord(entity, id) {
    if (!window.confirm('Delete this record?')) return;
    setActionLoading(true);
    notify('');
    try {
      await del(endpoint(`/entities/${entity}/${id}`));
      notify('Deleted.', 'success');
      if (editingRecord?.id === id) {
        setPanelOpen(false);
        setEditingRecord(null);
      }
      await loadEntity(entity);
      await loadOverview();
    } catch {
      notify('Failed to delete.', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  function openEditForm(record) {
    setEditingRecord(record);
    const form = { ...record };
    // Convert relation objects to IDs for selects
    if (form.domain && typeof form.domain === 'object') form.domain = form.domain.id;
    if (form.resource && typeof form.resource === 'object') form.resource = form.resource.id;
    if (form.role && typeof form.role === 'object') form.role = form.role.id;
    if (form.policy && typeof form.policy === 'object') form.policy = form.policy.id;
    if (form.parentGroup && typeof form.parentGroup === 'object') form.parentGroup = form.parentGroup.id;
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
    } catch {
      notify('Failed to save assignment.', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  function selectUser(value) {
    setSelectedUserId(value);
    const user = users.find(u => String(u.id) === String(value));
    setSelectedRoleIds((user?.permission_roles || []).map(r => String(r.id)));
  }

  const filteredRows = useMemo(() => {
    const rows = entityData[activeTab] || [];
    return rows.filter(row => {
      if (filters.search && !labelFor(row).toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.domain && String(row.domain?.id) !== filters.domain) return false;
      if (filters.level && row.level !== filters.level) return false;
      if (filters.effect && row.effect !== filters.effect) return false;
      if (filters.type && row.type !== filters.type) return false;
      if (filters.resource && String(row.resource?.id) !== filters.resource) return false;
      if (filters.role && String(row.role?.id) !== filters.role) return false;
      if (filters.policy && String(row.policy?.id) !== filters.policy) return false;
      return true;
    });
  }, [entityData, activeTab, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const { domains, resources, roles, policies, groups } = entityData;

  const renderForm = () => {
    const commonFields = (
      <>
        <Box paddingBottom={4}>
          <TextInput
            label="Key"
            name="key"
            value={formData.key || ''}
            onChange={e => setFormData({ ...formData, key: e.target.value })}
            required
            hint="Unique identifier (e.g., pos.products)"
          />
        </Box>
        <Box paddingBottom={4}>
          <TextInput
            label="Name"
            name="name"
            value={formData.name || formData.displayName || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value, displayName: e.target.value })}
            required
          />
        </Box>
        <Box paddingBottom={4}>
          <Textarea
            label="Description"
            name="description"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </Box>
        <Box paddingBottom={4}>
          <Switch
            label="Active"
            selected={formData.isActive !== false}
            onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
          />
        </Box>
      </>
    );

    switch (activeTab) {
      case 'domains':
        return (
          <>
            {commonFields}
            <Box paddingBottom={4}>
              <SingleSelect
                label="Match Mode"
                value={formData.matchMode || 'header'}
                onChange={v => setFormData({ ...formData, matchMode: v })}
              >
                {MATCH_MODE_OPTIONS.map(opt => (
                  <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <TextInput
                label="Match Key"
                value={formData.matchKey || 'x-app-name'}
                onChange={e => setFormData({ ...formData, matchKey: e.target.value })}
              />
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Strapi Role Type"
                value={formData.strapiRoleType || 'authenticated'}
                onChange={v => setFormData({ ...formData, strapiRoleType: v })}
              >
                <SingleSelectOption value="authenticated">Authenticated</SingleSelectOption>
                <SingleSelectOption value="public">Public</SingleSelectOption>
              </SingleSelect>
            </Box>
          </>
        );

      case 'resources':
        return (
          <>
            {commonFields}
            <Box paddingBottom={4}>
              <SingleSelect
                label="Type"
                value={formData.type || 'standard'}
                onChange={v => setFormData({ ...formData, type: v })}
              >
                {RESOURCE_TYPES.map(opt => (
                  <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Method"
                value={formData.method || 'GET'}
                onChange={v => setFormData({ ...formData, method: v })}
              >
                {METHOD_OPTIONS.map(opt => (
                  <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <TextInput
                label="Path Pattern"
                value={formData.pathPattern || ''}
                onChange={e => setFormData({ ...formData, pathPattern: e.target.value })}
                required
                hint="e.g., /api/products/:id"
              />
            </Box>
            {formData.type === 'alias' && (
              <Box paddingBottom={4}>
                <TextInput
                  label="Alias Path"
                  value={formData.aliasPath || ''}
                  onChange={e => setFormData({ ...formData, aliasPath: e.target.value })}
                  hint="Clean URL for this resource"
                />
              </Box>
            )}
            <Box paddingBottom={4}>
              <SingleSelect
                label="Content Type"
                value={formData.contentTypeUid || ''}
                onChange={v => setFormData({ ...formData, contentTypeUid: v })}
              >
                <SingleSelectOption value="">None</SingleSelectOption>
                {strapiTypes.map(type => (
                  <SingleSelectOption key={type.uid} value={type.uid}>{type.displayName}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Domain"
                value={formData.domain ? String(formData.domain) : ''}
                onChange={v => setFormData({ ...formData, domain: v || null })}
              >
                <SingleSelectOption value="">None</SingleSelectOption>
                {domains.map(d => (
                  <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Effect"
                value={formData.effect || 'allow'}
                onChange={v => setFormData({ ...formData, effect: v })}
              >
                {EFFECT_OPTIONS.map(opt => (
                  <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <TextInput
                label="Controller Action"
                value={formData.controllerAction || ''}
                onChange={e => setFormData({ ...formData, controllerAction: e.target.value })}
                hint="e.g., api::article.article.find"
              />
            </Box>
            <Box paddingBottom={4}>
              <Textarea
                label="Request Rules (JSON)"
                value={JSON.stringify(formData.requestRules || {}, null, 2)}
                onChange={e => {
                  try {
                    const next = JSON.parse(e.target.value || '{}');
                    setFormData({ ...formData, requestRules: next });
                  } catch {
                    // keep previous valid JSON while editing invalid text
                  }
                }}
              />
            </Box>
            <Box paddingBottom={4}>
              <Textarea
                label="Response Rules (JSON)"
                value={JSON.stringify(formData.responseRules || {}, null, 2)}
                onChange={e => {
                  try {
                    const next = JSON.parse(e.target.value || '{}');
                    setFormData({ ...formData, responseRules: next });
                  } catch {
                    // keep previous valid JSON while editing invalid text
                  }
                }}
              />
            </Box>
          </>
        );

      case 'roles':
        return (
          <>
            {commonFields}
            <Box paddingBottom={4}>
              <SingleSelect
                label="Level"
                value={formData.level || 'staff'}
                onChange={v => setFormData({ ...formData, level: v })}
              >
                {LEVEL_OPTIONS.map(opt => (
                  <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Domain"
                value={formData.domain ? String(formData.domain) : ''}
                onChange={v => setFormData({ ...formData, domain: v || null })}
              >
                <SingleSelectOption value="">None</SingleSelectOption>
                {domains.map(d => (
                  <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
          </>
        );

      case 'policies':
        return (
          <>
            {commonFields}
            <Box paddingBottom={4}>
              <SingleSelect
                label="Effect"
                value={formData.effect || 'allow'}
                onChange={v => setFormData({ ...formData, effect: v })}
              >
                {EFFECT_OPTIONS.map(opt => (
                  <SingleSelectOption key={opt} value={opt}>{opt}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Resource"
                value={formData.resource ? String(formData.resource) : ''}
                onChange={v => setFormData({ ...formData, resource: v || null })}
              >
                <SingleSelectOption value="">None</SingleSelectOption>
                {resources.map(r => (
                  <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <TextInput
                label="Actions (comma-separated)"
                value={Array.isArray(formData.actions) ? formData.actions.join(', ') : 'read'}
                onChange={e => setFormData({ ...formData, actions: e.target.value.split(',').map(s => s.trim()) })}
                hint="e.g., read, write, delete"
              />
            </Box>
          </>
        );

      case 'grants':
        return (
          <>
            <Box paddingBottom={4}>
              <TextInput
                label="Key"
                value={formData.key || ''}
                onChange={e => setFormData({ ...formData, key: e.target.value })}
                required
              />
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Role"
                value={formData.role ? String(formData.role) : ''}
                onChange={v => setFormData({ ...formData, role: v || null })}
                required
              >
                <SingleSelectOption value="">Select a role</SingleSelectOption>
                {roles.map(r => (
                  <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Policy"
                value={formData.policy ? String(formData.policy) : ''}
                onChange={v => setFormData({ ...formData, policy: v || null })}
                required
              >
                <SingleSelectOption value="">Select a policy</SingleSelectOption>
                {policies.map(p => (
                  <SingleSelectOption key={p.id} value={String(p.id)}>{labelFor(p)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <Switch
                label="Active"
                selected={formData.isActive !== false}
                onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
              />
            </Box>
          </>
        );

      case 'groups':
        return (
          <>
            {commonFields}
            <Box paddingBottom={4}>
              <Switch
                label="Is Bundle"
                selected={formData.isBundle === true}
                onChange={() => setFormData({ ...formData, isBundle: !formData.isBundle })}
              />
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Domain"
                value={formData.domain ? String(formData.domain) : ''}
                onChange={v => setFormData({ ...formData, domain: v || null })}
              >
                <SingleSelectOption value="">None</SingleSelectOption>
                {domains.map(d => (
                  <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
            <Box paddingBottom={4}>
              <SingleSelect
                label="Parent Group"
                value={formData.parentGroup ? String(formData.parentGroup) : ''}
                onChange={v => setFormData({ ...formData, parentGroup: v || null })}
              >
                <SingleSelectOption value="">None</SingleSelectOption>
                {groups.filter(g => g.id !== editingRecord?.id).map(g => (
                  <SingleSelectOption key={g.id} value={String(g.id)}>{labelFor(g)}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
          </>
        );

      default:
        return null;
    }
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

        <Flex gap={3} wrap="wrap" paddingTop={4} paddingBottom={2}>
          {['domains', 'resources', 'roles', 'policies', 'grants', 'groups', 'users'].map(k => (
            <Flex key={k} direction="column" alignItems="center" gap={1}
              style={{
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '8px 18px',
                minWidth: 90
              }}>
              <Typography variant="beta" textColor="primary600">{overview[k] ?? 0}</Typography>
              <Typography variant="pi" textColor="neutral600" style={{ textTransform: 'capitalize' }}>{k}</Typography>
            </Flex>
          ))}
        </Flex>

        <Divider marginTop={3} />

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

        <Box paddingTop={4}>
          {activeTab === 'assignments' ? (
            <Box>
              <Typography variant="beta">User Role Assignments</Typography>
              <Flex gap={6} alignItems="flex-start" wrap="wrap" paddingTop={4}>
                <Box style={{ flex: '0 0 350px' }}>
                  <SingleSelect
                    label="Select User"
                    placeholder="Choose a user"
                    value={selectedUserId}
                    onChange={selectUser}
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
                        {roleOptions.map(role => (
                          <Flex key={role.id} gap={2} alignItems="center" paddingBottom={2}>
                            <input
                              type="checkbox"
                              checked={selectedRoleIds.includes(String(role.id))}
                              onChange={() => {
                                if (selectedRoleIds.includes(String(role.id))) {
                                  setSelectedRoleIds(selectedRoleIds.filter(id => id !== String(role.id)));
                                } else {
                                  setSelectedRoleIds([...selectedRoleIds, String(role.id)]);
                                }
                              }}
                            />
                            <Typography variant="pi">{role.key}</Typography>
                            {role.domain && (
                              <Typography variant="pi" textColor="neutral500" style={{ fontSize: 11 }}>
                                ({labelFor(role.domain)})
                              </Typography>
                            )}
                          </Flex>
                        ))}
                      </Box>
                      <Button onClick={saveAssignment} loading={actionLoading} style={{ marginTop: 16 }}>
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
                    onChange={e => setUserSearch(e.target.value)}
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
                            background: String(user.id) === selectedUserId ? '#e8eaf6' : 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: 8,
                            marginBottom: 6,
                            cursor: 'pointer'
                          }}
                          onClick={() => selectUser(String(user.id))}
                        >
                          <Box>
                            <Typography variant="sigma">{user.displayName || user.username}</Typography>
                            <Typography variant="pi" textColor="neutral500">{user.email}</Typography>
                          </Box>
                          <Box
                            style={{
                              background: (user.permission_roles || []).length > 0 ? '#e8f5e9' : '#f5f5f5',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600
                            }}
                          >
                            {(user.permission_roles || []).length} role{(user.permission_roles || []).length !== 1 ? 's' : ''}
                          </Box>
                        </Flex>
                      ))}
                  </Box>
                </Box>
              </Flex>
            </Box>
          ) : (
            <Flex gap={0} alignItems="flex-start">
              <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 16 : 0 }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3} wrap="wrap" gap={2}>
                  <Typography variant="delta">{filteredRows.length} of {entityData[activeTab]?.length || 0} records</Typography>
                  <Flex gap={2} wrap="wrap">
                    {activeTab === 'resources' && RESOURCE_SUB_TABS.map(tab => (
                      <Button
                        key={tab.key}
                        variant={resourceSubTab === tab.key ? 'default' : 'tertiary'}
                        onClick={() => setResourceSubTab(tab.key)}
                      >
                        {tab.label}
                      </Button>
                    ))}
                    {(activeTab !== 'resources' || resourceSubTab === 'manual') && (
                      <Button onClick={() => { setEditingRecord(null); setFormData(getEmptyForm(activeTab)); setPanelOpen(true); }}>
                        + New {activeTab.slice(0, -1)}
                      </Button>
                    )}
                  </Flex>
                </Flex>

                {activeTab === 'resources' && resourceSubTab === 'recorder' && (
                  <Box padding={3} style={{ background: '#fffdf0', border: '1px solid #f2e3a0', borderRadius: 8, marginBottom: 10 }}>
                    <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                      <Box>
                        <Typography variant="beta">Resource Request Recorder</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          Capture incoming API requests and convert suggestions to resources.
                        </Typography>
                      </Box>
                      <Flex gap={2}>
                        <Button
                          variant={resourceRecorder.enabled ? 'danger-light' : 'secondary'}
                          onClick={() => setRecorderEnabled(!resourceRecorder.enabled)}
                          loading={actionLoading}
                        >
                          {resourceRecorder.enabled ? 'Stop Recording' : 'Start Recording'}
                        </Button>
                        <Button variant="tertiary" onClick={loadResourceRecorder}>
                          Refresh Logs
                        </Button>
                        <Button variant="tertiary" onClick={clearRecorder}>
                          Clear Logs
                        </Button>
                      </Flex>
                    </Flex>

                    <Box paddingTop={3}>
                      <Typography variant="pi" textColor="neutral600">
                        Status: {resourceRecorder.enabled ? 'Recording active' : 'Recording inactive'} · {resourceRecorder.records?.length || 0} captured route(s)
                      </Typography>
                    </Box>

                    <Box paddingTop={3}>
                      <Typography variant="omega">Recorder Filters</Typography>
                      <Flex gap={4} wrap="wrap" paddingTop={2}>
                        <Box>
                          <Typography variant="pi" textColor="neutral600">Methods</Typography>
                          <Flex gap={2} wrap="wrap" paddingTop={1}>
                            {['get', 'post', 'put', 'delete'].map(method => (
                              <label key={`method-${method}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(resourceRecorder.filters?.methods?.[method])}
                                  onChange={() => toggleRecorderFilter('methods', method)}
                                />
                                {method.toUpperCase()}
                              </label>
                            ))}
                          </Flex>
                        </Box>

                        <Box>
                          <Typography variant="pi" textColor="neutral600">URL Prefixes</Typography>
                          <Flex gap={2} wrap="wrap" paddingTop={1}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(resourceRecorder.filters?.paths?.api)}
                                onChange={() => toggleRecorderFilter('paths', 'api')}
                              />
                              /api
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(resourceRecorder.filters?.paths?.contentManager)}
                                onChange={() => toggleRecorderFilter('paths', 'contentManager')}
                              />
                              /content-manager
                            </label>
                          </Flex>
                        </Box>
                      </Flex>
                    </Box>

                    <Box paddingTop={3}>
                      {(resourceRecorder.suggestions || []).length === 0 ? (
                        <Typography variant="pi" textColor="neutral500">No recorded suggestions yet.</Typography>
                      ) : (
                        (resourceRecorder.suggestions || []).slice(0, 50).map(item => (
                          <Box
                            key={`${item.key}-${item.path}`}
                            padding={3}
                            style={{ border: '1px solid #ececec', borderRadius: 8, background: 'white', marginBottom: 8 }}
                          >
                            <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                              <Box>
                                <Typography variant="sigma">{item.method} {item.path}</Typography>
                                <Typography variant="pi" textColor="neutral600">
                                  Hits: {item.count} · Last status: {item.lastStatus ?? '-'} · Suggested type: {item.type}
                                </Typography>
                                {item.exampleUrl && (
                                  <Typography variant="pi" textColor="neutral500" style={{ wordBreak: 'break-all' }}>
                                    URL: {item.exampleUrl}
                                  </Typography>
                                )}
                                {(item.exampleQuery || item.exampleBody) && (
                                  <Typography variant="pi" textColor="neutral500">
                                    Has captured query/body context
                                  </Typography>
                                )}
                                {item.urlParts && (
                                  <Typography variant="pi" textColor="neutral500" style={{ wordBreak: 'break-all' }}>
                                    Path: {item.urlParts.pathname} | Segments: {(item.urlParts.segments || []).join(' / ') || '-'}
                                  </Typography>
                                )}
                              </Box>
                              <Button size="S" onClick={() => buildResourceFromSuggestion(item)}>Create Resource</Button>
                            </Flex>
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                )}

                {activeTab === 'resources' && resourceSubTab === 'builder' && (
                  <Box padding={3} style={{ background: '#f4f8ff', border: '1px solid #d8e6ff', borderRadius: 8, marginBottom: 10 }}>
                    <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                      <Box>
                        <Typography variant="beta">Permission-Style Resource Builder</Typography>
                        <Typography variant="pi" textColor="neutral600">
                          Browse content types and standard/extended actions, then create resource entries from selected actions.
                        </Typography>
                      </Box>
                      <Button variant="tertiary" onClick={loadResourceCatalog}>Refresh Catalog</Button>
                    </Flex>

                    <Box paddingTop={3}>
                      {resourceCatalog.length === 0 ? (
                        <Typography variant="pi" textColor="neutral500">No content type actions discovered.</Typography>
                      ) : (
                        resourceCatalog.map(ct => (
                          <Box key={ct.uid} padding={3} style={{ border: '1px solid #e2e8f5', borderRadius: 8, background: 'white', marginBottom: 10 }}>
                            <Typography variant="sigma">{ct.displayName}</Typography>
                            <Typography variant="pi" textColor="neutral500">{ct.uid}</Typography>

                            <Box paddingTop={2}>
                              <Typography variant="omega">Standard actions</Typography>
                              {ct.standard.map((action, idx) => (
                                <Flex key={`${ct.uid}-std-${idx}`} justifyContent="space-between" alignItems="center" paddingTop={1} wrap="wrap" gap={2}>
                                  <Typography variant="pi">{action.method} {action.path}</Typography>
                                  <Button size="S" variant="tertiary" onClick={() => buildResourceFromCatalog(ct, action)}>Use</Button>
                                </Flex>
                              ))}
                            </Box>

                            <Box paddingTop={2}>
                              <Typography variant="omega">Extended actions</Typography>
                              {ct.extended.length === 0 ? (
                                <Typography variant="pi" textColor="neutral500">No extended routes discovered.</Typography>
                              ) : (
                                ct.extended.map((action, idx) => (
                                  <Flex key={`${ct.uid}-ext-${idx}`} justifyContent="space-between" alignItems="center" paddingTop={1} wrap="wrap" gap={2}>
                                    <Typography variant="pi">{action.method} {action.path}</Typography>
                                    <Button size="S" variant="tertiary" onClick={() => buildResourceFromCatalog(ct, action)}>Use</Button>
                                  </Flex>
                                ))
                              )}
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                )}

                {/* Filters */}
                <Box padding={3} style={{ background: '#f8f9fc', border: '1px solid #e8eaf0', borderRadius: 8, marginBottom: 10 }}>
                  <Flex gap={2} wrap="wrap" alignItems="flex-end">
                    <Box style={{ flex: '1 1 180px' }}>
                      <TextInput
                        label="Search"
                        placeholder="Filter by key..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                      />
                    </Box>

                    {(activeTab === 'resources' || activeTab === 'roles') && (
                      <Box style={{ flex: '1 1 160px' }}>
                        <SingleSelect
                          label="Domain"
                          value={filters.domain}
                          onChange={v => setFilters({ ...filters, domain: v || '' })}
                        >
                          <SingleSelectOption value="">All domains</SingleSelectOption>
                          {domains.map(d => (
                            <SingleSelectOption key={d.id} value={String(d.id)}>{labelFor(d)}</SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Box>
                    )}

                    {activeTab === 'resources' && (
                      <Box style={{ flex: '1 1 140px' }}>
                        <SingleSelect
                          label="Type"
                          value={filters.type}
                          onChange={v => setFilters({ ...filters, type: v || '' })}
                        >
                          <SingleSelectOption value="">All types</SingleSelectOption>
                          {RESOURCE_TYPES.map(t => (
                            <SingleSelectOption key={t} value={t}>{t}</SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Box>
                    )}

                    {activeTab === 'roles' && (
                      <Box style={{ flex: '1 1 140px' }}>
                        <SingleSelect
                          label="Level"
                          value={filters.level}
                          onChange={v => setFilters({ ...filters, level: v || '' })}
                        >
                          <SingleSelectOption value="">All levels</SingleSelectOption>
                          {LEVEL_OPTIONS.map(l => (
                            <SingleSelectOption key={l} value={l}>{l}</SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Box>
                    )}

                    {activeTab === 'policies' && (
                      <>
                        <Box style={{ flex: '1 1 140px' }}>
                          <SingleSelect
                            label="Effect"
                            value={filters.effect}
                            onChange={v => setFilters({ ...filters, effect: v || '' })}
                          >
                            <SingleSelectOption value="">All effects</SingleSelectOption>
                            {EFFECT_OPTIONS.map(e => (
                              <SingleSelectOption key={e} value={e}>{e}</SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Box>
                        <Box style={{ flex: '1 1 160px' }}>
                          <SingleSelect
                            label="Resource"
                            value={filters.resource}
                            onChange={v => setFilters({ ...filters, resource: v || '' })}
                          >
                            <SingleSelectOption value="">All resources</SingleSelectOption>
                            {resources.map(r => (
                              <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Box>
                      </>
                    )}

                    {activeTab === 'grants' && (
                      <>
                        <Box style={{ flex: '1 1 160px' }}>
                          <SingleSelect
                            label="Role"
                            value={filters.role}
                            onChange={v => setFilters({ ...filters, role: v || '' })}
                          >
                            <SingleSelectOption value="">All roles</SingleSelectOption>
                            {roles.map(r => (
                              <SingleSelectOption key={r.id} value={String(r.id)}>{labelFor(r)}</SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Box>
                        <Box style={{ flex: '1 1 160px' }}>
                          <SingleSelect
                            label="Policy"
                            value={filters.policy}
                            onChange={v => setFilters({ ...filters, policy: v || '' })}
                          >
                            <SingleSelectOption value="">All policies</SingleSelectOption>
                            {policies.map(p => (
                              <SingleSelectOption key={p.id} value={String(p.id)}>{labelFor(p)}</SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Box>
                      </>
                    )}

                    {Object.values(filters).some(Boolean) && (
                      <Button variant="tertiary" onClick={() => setFilters(emptyFilters())}>
                        Clear filters
                      </Button>
                    )}
                  </Flex>
                </Box>

                {/* Records list */}
                {pagedRows.length === 0 ? (
                  <Box padding={6} style={{ background: '#f9f9fc', borderRadius: 8, textAlign: 'center' }}>
                    <Typography textColor="neutral500">
                      {entityData[activeTab]?.length === 0
                        ? 'No records yet. Click "+ New" to create one.'
                        : 'No records match your current filters.'}
                    </Typography>
                  </Box>
                ) : (
                  pagedRows.map(row => (
                    <Box
                      key={row.id}
                      padding={3}
                      style={{
                        background: 'white',
                        border: '1px solid #e8e8e8',
                        borderRadius: 8,
                        marginBottom: 6,
                        cursor: 'pointer'
                      }}
                      onClick={() => openEditForm(row)}
                    >
                      <Flex justifyContent="space-between" alignItems="center" gap={2}>
                        <Flex gap={2} alignItems="center" wrap="wrap">
                          <Typography variant="sigma" style={{ wordBreak: 'break-all' }}>
                            {labelFor(row)}
                          </Typography>
                          {row.effect && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: row.effect === 'allow' ? '#2ecc7122' : '#e74c3c22',
                              color: row.effect === 'allow' ? '#2ecc71' : '#e74c3c',
                              border: `1px solid ${row.effect === 'allow' ? '#2ecc7144' : '#e74c3c44'}`
                            }}>
                              {row.effect}
                            </span>
                          )}
                          {row.level && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: '#3498db22',
                              color: '#3498db',
                              border: '1px solid #3498db44'
                            }}>
                              {row.level}
                            </span>
                          )}
                          {row.type && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: '#9b59b622',
                              color: '#9b59b6',
                              border: '1px solid #9b59b644'
                            }}>
                              {row.type}
                            </span>
                          )}
                          {row.method && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: '#f39c1222',
                              color: '#f39c12',
                              border: '1px solid #f39c1244'
                            }}>
                              {row.method}
                            </span>
                          )}
                          {row.domain && !row.level && (
                            <Typography variant="pi" textColor="neutral500">({labelFor(row.domain)})</Typography>
                          )}
                          {row.resource && (
                            <Typography variant="pi" textColor="neutral500">â†’ {labelFor(row.resource)}</Typography>
                          )}
                        </Flex>
                        <Button
                          variant="danger-light"
                          onClick={(e) => { e.stopPropagation(); deleteRecord(activeTab, row.id); }}
                        >
                          Delete
                        </Button>
                      </Flex>
                    </Box>
                  ))
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <Flex justifyContent="center" gap={2} paddingTop={4}>
                    <Button variant="tertiary" onClick={() => setPage(1)} disabled={page === 1}>
                      First
                    </Button>
                    <Button variant="tertiary" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      Previous
                    </Button>
                    <Typography variant="pi" textColor="neutral600">
                      Page {safePage} of {totalPages}
                    </Typography>
                    <Button variant="tertiary" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                      Next
                    </Button>
                    <Button variant="tertiary" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                      Last
                    </Button>
                  </Flex>
                )}
              </Box>

              {/* Edit/Create Panel */}
              {panelOpen && (activeTab !== 'resources' || resourceSubTab === 'manual') && (
                <Box style={{ width: 450, marginLeft: 16, background: 'white', borderRadius: 8, border: '1px solid #e8e8e8', padding: 16 }}>
                  <Typography variant="beta" paddingBottom={4}>
                    {editingRecord ? `Edit ${activeTab.slice(0, -1)}` : `Create New ${activeTab.slice(0, -1)}`}
                  </Typography>
                  {renderForm()}
                  <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                    <Button variant="tertiary" onClick={() => { setPanelOpen(false); setEditingRecord(null); }} disabled={actionLoading}>
                      Cancel
                    </Button>
                    <Button onClick={submitForm} loading={actionLoading}>
                      {editingRecord ? 'Update' : 'Create'}
                    </Button>
                  </Flex>
                </Box>
              )}
            </Flex>
          )}
        </Box>
      </Box>
    </Main>
  );
}
