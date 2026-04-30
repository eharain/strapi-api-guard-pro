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
  Alert
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
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', variant: 'default' });
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => { boot(); }, []);
  useEffect(() => {
    setPanelOpen(false);
    setEditingRecord(null);
    setPage(1);
    setFilters(emptyFilters());
    setMessage({ text: '', variant: 'default' });
  }, [activeTab]);
  useEffect(() => { setPage(1); }, [filters]);

  const notify = (text, variant = 'default') => setMessage({ text, variant });

  async function boot() {
    setGlobalLoading(true);
    await Promise.all([
      loadOverview(),
      loadAllEntities(),
      loadUsersAndRoles(),
      loadStrapiTypes()
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

  async function submitForm(form) {
    setActionLoading(true);
    notify('');
    try {
      if (editingRecord) {
        await put(endpoint(`/entities/${activeTab}/${editingRecord.id}`), { data: form });
        notify('Updated successfully.', 'success');
      } else {
        await post(endpoint(`/entities/${activeTab}`), { data: form });
        notify('Created successfully.', 'success');
      }
      setPanelOpen(false);
      setEditingRecord(null);
      await loadEntity(activeTab);
      await loadOverview();
    } catch {
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
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                  <Typography variant="delta">{filteredRows.length} of {entityData[activeTab]?.length || 0} records</Typography>
                  <Button onClick={() => { setEditingRecord(null); setPanelOpen(true); }}>+ New {activeTab.slice(0, -1)}</Button>
                </Flex>

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
                        marginBottom: 6
                      }}
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
                            <Typography variant="pi" textColor="neutral500">({labelFor(row.domain)})
