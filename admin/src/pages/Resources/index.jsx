import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Flex,
    Divider,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import BuilderCatalog from '../../components/Resources/BuilderCatalog.jsx';
import ResourceList from './ResourceList.jsx';
import ResourceForm from './ResourceForm.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import { tokens } from '../../components/ui.jsx';
import { PolicyForm } from '../Policies/index.jsx';

const RESOURCE_TABS = [
    { key: 'api-resources', label: 'API Resources' },
    { key: 'content-types', label: 'Content Types' },
    { key: 'api-request-recordings', label: 'API Request Recordings' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

function RecorderPanel({ recorder, actionLoading, onToggleEnabled, onRefresh, onClear, onToggleFilter, onCreateFromSuggestion, onSaveSettings }) {
    const { get } = useFetchClient();
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [matchedFilter, setMatchedFilter] = useState('');
    const [page, setPage] = useState(1);
    const [logsData, setLogsData] = useState({ data: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 1 } });
    const [logsLoading, setLogsLoading] = useState(false);
    const [timeLimitSeconds, setTimeLimitSeconds] = useState(recorder.timeLimitSeconds || 0);
    const [maxRecords, setMaxRecords] = useState(recorder.maxRecords || 500);
    const [settingsDirty, setSettingsDirty] = useState(false);

    const fetchLogs = useCallback(async (opts = {}) => {
        setLogsLoading(true);
        try {
            const q = new URLSearchParams();
            q.set('page', String(opts.page || page));
            q.set('pageSize', '20');
            if (opts.search !== undefined ? opts.search : search) q.set('search', opts.search !== undefined ? opts.search : search);
            if (opts.method !== undefined ? opts.method : methodFilter) q.set('method', opts.method !== undefined ? opts.method : methodFilter);
            if (opts.matched !== undefined ? opts.matched : matchedFilter) q.set('matched', opts.matched !== undefined ? opts.matched : matchedFilter);
            const { data } = await get(`/api-guard-pro/resource-recorder/logs?${q.toString()}`);
            setLogsData(data || { data: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 1 } });
        } catch { }
        finally { setLogsLoading(false); }
    }, [get, page, search, methodFilter, matchedFilter]);

    useEffect(() => { fetchLogs(); }, []);

    const handleSearch = (val) => { setSearch(val); setPage(1); fetchLogs({ search: val, page: 1 }); };
    const handleMethodFilter = (val) => { setMethodFilter(val); setPage(1); fetchLogs({ method: val, page: 1 }); };
    const handleMatchedFilter = (val) => { setMatchedFilter(val); setPage(1); fetchLogs({ matched: val, page: 1 }); };
    const handlePage = (p) => { setPage(p); fetchLogs({ page: p }); };

    const handleRefresh = () => { onRefresh(); fetchLogs(); };
    const handleClear = () => { onClear(); setTimeout(() => fetchLogs(), 400); };

    const handleSaveSettings = () => {
        onSaveSettings({ timeLimitSeconds: Number(timeLimitSeconds) || 0, maxRecords: Number(maxRecords) || 500 });
        setSettingsDirty(false);
    };

    return (
        <Box>
            {/* Status + controls */}
            <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2} paddingBottom={3}>
                <Flex alignItems="center" gap={3}>
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: recorder.enabled ? '#2ecc71' : '#bbb', boxShadow: recorder.enabled ? '0 0 0 3px #2ecc7133' : 'none', flexShrink: 0 }} />
                    <Box>
                        <Typography variant="omega" fontWeight="semiBold">
                            {recorder.enabled ? 'Recording active' : 'Recording paused'}
                        </Typography>
                        <Typography variant="pi" textColor="neutral500">
                            {logsData.meta?.total || 0} route{(logsData.meta?.total || 0) !== 1 ? 's' : ''} captured
                            {recorder.startedAt ? ` · started ${new Date(recorder.startedAt).toLocaleTimeString()}` : ''}
                        </Typography>
                    </Box>
                </Flex>
                <Flex gap={2}>
                    <Button variant={recorder.enabled ? 'danger-light' : 'default'} onClick={onToggleEnabled} loading={actionLoading} size="S">
                        {recorder.enabled ? 'Stop' : 'Start Recording'}
                    </Button>
                    <Button variant="tertiary" size="S" onClick={handleRefresh}>Refresh</Button>
                    <Button variant="danger-light" size="S" onClick={handleClear}>Clear Logs</Button>
                </Flex>
            </Flex>

            {/* Capture filters + auto-stop settings */}
            <Box padding={3} background="neutral100" style={{ borderRadius: 8, marginBottom: 12 }}>
                <Typography variant="pi" fontWeight="semiBold" textColor="neutral600" paddingBottom={2}>Capture filters</Typography>
                <Flex gap={6} wrap="wrap" paddingBottom={3}>
                    <Box>
                        <Typography variant="pi" textColor="neutral500" paddingBottom={1}>Methods</Typography>
                        <Flex gap={2} wrap="wrap">
                            {['get', 'post', 'put', 'delete'].map(method => {
                                const id = `rec-method-${method}`;
                                return (
                                    <Flex key={method} alignItems="center" gap={1}>
                                        <input id={id} type="checkbox" checked={Boolean(recorder.filters?.methods?.[method])} onChange={() => onToggleFilter('methods', method)} />
                                        <label htmlFor={id} style={{ fontSize: 11, fontWeight: 600 }}>{method.toUpperCase()}</label>
                                    </Flex>
                                );
                            })}
                        </Flex>
                    </Box>
                    <Box>
                        <Typography variant="pi" textColor="neutral500" paddingBottom={1}>URL prefixes</Typography>
                        <Flex gap={2} wrap="wrap">
                            {[['api', '/api'], ['contentManager', '/content-manager']].map(([key, label]) => {
                                const id = `rec-path-${key}`;
                                return (
                                    <Flex key={key} alignItems="center" gap={1}>
                                        <input id={id} type="checkbox" checked={Boolean(recorder.filters?.paths?.[key])} onChange={() => onToggleFilter('paths', key)} />
                                        <label htmlFor={id} style={{ fontSize: 11, fontFamily: 'monospace' }}>{label}</label>
                                    </Flex>
                                );
                            })}
                        </Flex>
                    </Box>
                </Flex>

                <Divider />
                <Box paddingTop={3}>
                    <Typography variant="pi" fontWeight="semiBold" textColor="neutral600" paddingBottom={2}>Auto-stop settings</Typography>
                    <Flex gap={4} wrap="wrap" alignItems="flex-end">
                        <Box>
                            <label htmlFor="rec-time-limit" style={{ fontSize: 11, display: 'block', marginBottom: 4, color: '#666' }}>
                                Time limit (seconds, 0 = unlimited)
                            </label>
                            <input
                                id="rec-time-limit"
                                type="number"
                                min="0"
                                value={timeLimitSeconds}
                                onChange={(e) => { setTimeLimitSeconds(e.target.value); setSettingsDirty(true); }}
                                style={{ width: 120, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                            />
                        </Box>
                        <Box>
                            <label htmlFor="rec-max-records" style={{ fontSize: 11, display: 'block', marginBottom: 4, color: '#666' }}>
                                Max recordings (0 = unlimited)
                            </label>
                            <input
                                id="rec-max-records"
                                type="number"
                                min="0"
                                value={maxRecords}
                                onChange={(e) => { setMaxRecords(e.target.value); setSettingsDirty(true); }}
                                style={{ width: 120, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                            />
                        </Box>
                        {settingsDirty && (
                            <Button size="S" onClick={handleSaveSettings}>Save Settings</Button>
                        )}
                    </Flex>
                </Box>
            </Box>

            {/* Search / filter bar */}
            <Flex gap={2} wrap="wrap" paddingBottom={3} alignItems="center">
                <Box style={{ flex: 1, minWidth: 180 }}>
                    <label htmlFor="rec-search" style={{ fontSize: 11, display: 'block', marginBottom: 4, color: '#666' }}>Search path</label>
                    <input
                        id="rec-search"
                        type="text"
                        placeholder="Filter by path..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                    />
                </Box>
                <Box>
                    <label htmlFor="rec-method-filter" style={{ fontSize: 11, display: 'block', marginBottom: 4, color: '#666' }}>Method</label>
                    <select
                        id="rec-method-filter"
                        value={methodFilter}
                        onChange={(e) => handleMethodFilter(e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                    >
                        <option value="">All methods</option>
                        {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </Box>
                <Box>
                    <label htmlFor="rec-matched-filter" style={{ fontSize: 11, display: 'block', marginBottom: 4, color: '#666' }}>Resource match</label>
                    <select
                        id="rec-matched-filter"
                        value={matchedFilter}
                        onChange={(e) => handleMatchedFilter(e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                    >
                        <option value="">All</option>
                        <option value="true">Matched</option>
                        <option value="false">Unmatched</option>
                    </select>
                </Box>
                {(search || methodFilter || matchedFilter) && (
                    <Button size="S" variant="tertiary" onClick={() => { setSearch(''); setMethodFilter(''); setMatchedFilter(''); setPage(1); fetchLogs({ search: '', method: '', matched: '', page: 1 }); }}>
                        Clear filters
                    </Button>
                )}
            </Flex>

            {/* Recordings list */}
            {logsLoading ? (
                <Box padding={4} style={{ textAlign: 'center' }}>
                    <Typography variant="pi" textColor="neutral400">Loading...</Typography>
                </Box>
            ) : logsData.data.length === 0 ? (
                <Box padding={5} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                    <Typography variant="pi" textColor="neutral400">
                        {recorder.enabled ? 'Waiting for incoming API requests...' : 'Start recording to capture API requests from live traffic.'}
                    </Typography>
                </Box>
            ) : (
                <Box>
                    <Typography variant="pi" fontWeight="semiBold" textColor="neutral600" paddingBottom={2}>
                        {logsData.meta?.total || 0} captured routes &mdash; click &quot;Create Resource&quot; to scaffold
                    </Typography>
                    {logsData.data.map(item => (
                        <Box key={item.id || item.recordKey} padding={3} background="neutral0" style={{ border: '1px solid #e8eaf0', borderRadius: 8, marginBottom: 6 }}>
                            <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={2}>
                                <Box style={{ minWidth: 0 }}>
                                    <Flex gap={2} alignItems="center" paddingBottom={1}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', flexShrink: 0 }}>
                                            {item.method}
                                        </span>
                                        <Typography variant="sigma" style={{ wordBreak: 'break-all', fontSize: 13 }}>{item.path}</Typography>
                                        {item.matched && (
                                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>matched</span>
                                        )}
                                    </Flex>
                                    <Typography variant="pi" textColor="neutral500">
                                        {item.count} hit{item.count !== 1 ? 's' : ''} &middot; status {item.lastStatus ?? '-'} &middot; last seen {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : '-'}
                                    </Typography>
                                </Box>
                                <Button size="S" onClick={() => onCreateFromSuggestion({
                                    ...item,
                                    key: item.recordKey,
                                    displayName: item.method + ' ' + item.path,
                                })}>Create Resource</Button>
                            </Flex>
                        </Box>
                    ))}
                    <Pagination page={logsData.meta?.page || 1} totalPages={logsData.meta?.pageCount || 1} onPageChange={handlePage} />
                </Box>
            )}
        </Box>
    );
}

                    function ModeCard({ title, description, active, onClick }) {
    return (
        <Box
            onClick={onClick}
            style={{
                flex: 1,
                minWidth: 200,
                border: `2px solid ${active ? '#4945ff' : '#e0e0e8'}`,
                borderRadius: 10,
                padding: '16px 20px',
                cursor: 'pointer',
                background: active ? '#f0f0ff' : '#fff',
                transition: 'border-color 0.15s',
                userSelect: 'none',
            }}
        >
            <Typography variant="sigma" style={{ color: active ? '#4945ff' : undefined }}>{title}</Typography>
            <Typography variant="pi" textColor="neutral500">{description}</Typography>
        </Box>
    );
}

// ── Standard Strapi actions for a content type ────────────────────────────────
const STRAPI_ACTIONS = ['find', 'findOne', 'create', 'update', 'delete'];

const normalizeActionName = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parts = raw.split('.');
    return (parts[parts.length - 1] || '').trim();
};

const ACTION_COLORS = {
    find:    { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    findOne: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    create:  { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
    update:  { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
    delete:  { bg: '#fce4ec', color: '#b71c1c', border: '#f48fb1' },
};

function ActionBadge({ action }) {
    const c = ACTION_COLORS[action] || { bg: '#f4f4f8', color: '#555', border: '#ddd' };
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
        }}>
            {action}
        </span>
    );
}

/**
 * Inline form for creating or editing a single policy on a resource.
 * Calls /api-guard-pro/entities/policies directly.
 */
function InlinePolicyEditor({ resource, action, existingPolicy, roles, strapiTypes, allTypes, attributes, onDone, onCancel }) {
    const { post, put } = useFetchClient();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(() => {
        if (existingPolicy) {
            const f = { ...existingPolicy };
            if (f.resource && typeof f.resource === 'object') f.resource = f.resource.id;
            if (Array.isArray(f.grants)) f.grants = f.grants.map(g => typeof g === 'object' ? g.id : g);
            return f;
        }
        return {
            uid: '',
            key: `${(resource.contentTypeUid || '').split('::').pop()?.split('.').pop() || 'resource'}-${action}`,
            contentTypeUid: resource.contentTypeUid || '',
            actionName: action,
            description: '',
            isActive: true,
            query: {},
            filters: {},
            body: {},
            resource: resource.id,
            grants: [],
        };
    });

    const save = async () => {
        setSaving(true);
        try {
            const payload = { ...formData };
            if (payload.resource) payload.resource = parseInt(payload.resource, 10);
            if (Array.isArray(payload.grants)) {
                payload.grants = payload.grants.map(g => typeof g === 'object' ? g.id : g).map(g => parseInt(g, 10)).filter(g => Number.isFinite(g));
            }
            if (existingPolicy) {
                await put(`/api-guard-pro/entities/policies/${existingPolicy.id}`, { data: payload });
            } else {
                await post('/api-guard-pro/entities/policies', { data: payload });
            }
            onDone();
        } catch {
            // swallow — user sees no change
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box style={{ border: `1px solid ${tokens.primary}44`, borderRadius: 8, padding: 14, background: '#fafaff', marginTop: 6 }}>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                <Typography variant="pi" fontWeight="semiBold" textColor="primary600">
                    {existingPolicy ? 'Edit Policy' : 'Create Policy'} — <code style={{ fontFamily: 'monospace' }}>{action}</code>
                </Typography>
                <button type="button" onClick={onCancel} style={{ fontSize: 16, border: 'none', background: 'none', cursor: 'pointer', color: '#888' }}>✕</button>
            </Flex>
            <PolicyForm
                formData={formData}
                onChange={setFormData}
                resources={[resource]}
                roles={roles}
                attributes={attributes}
                allTypes={allTypes}
            />
            <Flex gap={2} justifyContent="flex-end" paddingTop={3}>
                <Button variant="tertiary" size="S" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button size="S" onClick={save} loading={saving}>{existingPolicy ? 'Update' : 'Create'}</Button>
            </Flex>
        </Box>
    );
}

/**
 * Per-resource expandable policies section.
 * Used both in the list view (per card) and in the edit panel.
 *
 * For each standard action shows:
 *   - attached policy (clickable to expand details + grants)
 *   - quick Activate / Deactivate toggle
 *   - Delete button
 *   - If no policy: "+ Create Policy" AND a list of existing unattached
 *     policies that share the same actionName (so you can assign one).
 */
function ResourcePoliciesPanel({ resource, policies, roles, strapiTypes, onRefresh }) {
    const { put, del } = useFetchClient();
    const [editing, setEditing] = useState(null);   // action name being inline-edited
    const [creating, setCreating] = useState(null); // action name being inline-created
    const [expanded, setExpanded] = useState(null);  // action name whose policy details are shown
    const [deleting, setDeleting] = useState(null);
    const [toggling, setToggling] = useState(null);
    const [linking, setLinking] = useState(null);    // action name whose "assign existing" picker is open
    const [saving, setSaving] = useState(null);

    const allTypes = useMemo(() => {
        const map = new Map();
        (strapiTypes || []).forEach(ct => map.set(ct.uid, ct));
        return map;
    }, [strapiTypes]);

    const attributes = useMemo(() => {
        const uid = resource.contentTypeUid;
        return uid ? (allTypes.get(uid)?.attributes || []) : [];
    }, [resource.contentTypeUid, allTypes]);

    // Map action → attached policy for THIS resource
    const policiesByAction = useMemo(() => {
        const map = {};
        STRAPI_ACTIONS.forEach(a => { map[a] = null; });
        policies.forEach(p => {
            if (String(p.resource?.id ?? p.resource) === String(resource.id)) {
                const a = normalizeActionName(p.actionName);
                if (a) map[a] = p;
            }
        });
        return map;
    }, [policies, resource.id]);

    // For each action, collect existing policies NOT attached to this resource
    // that have the same actionName — candidate "reuse" policies
    const candidatesByAction = useMemo(() => {
        const map = {};
        STRAPI_ACTIONS.forEach(a => { map[a] = []; });
        policies.forEach(p => {
            const rid = p.resource?.id ?? p.resource;
            // Only show candidates already linked to this same resource.
            // Never suggest policies from other resources.
            if (String(rid) !== String(resource.id)) return;
            const a = normalizeActionName(p.actionName);
            if (a && map[a] !== undefined) map[a].push(p);
        });
        return map;
    }, [policies, resource.id]);

    const handleDelete = async (policy) => {
        if (!window.confirm(`Delete policy "${policy.key || policy.uid}"?`)) return;
        setDeleting(policy.id);
        try {
            await del(`/api-guard-pro/entities/policies/${policy.id}`);
            onRefresh();
        } catch { }
        finally { setDeleting(null); }
    };

    const handleToggleActive = async (policy) => {
        setToggling(policy.id);
        try {
            await put(`/api-guard-pro/entities/policies/${policy.id}`, { data: { isActive: policy.isActive === false } });
            onRefresh();
        } catch { }
        finally { setToggling(null); }
    };

    // Link an existing policy to this resource by updating its resource field
    const handleLinkExisting = async (policy, action) => {
        setSaving(action);
        try {
            await put(`/api-guard-pro/entities/policies/${policy.id}`, { data: { resource: resource.id, actionName: action } });
            setLinking(null);
            onRefresh();
        } catch { }
        finally { setSaving(null); }
    };

    return (
        <Box>
            <Typography variant="pi" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, fontWeight: 700, color: '#888', display: 'block', marginBottom: 8 }}>
                Actions &amp; Policies
            </Typography>
            {STRAPI_ACTIONS.map(action => {
                const policy = policiesByAction[action];
                const candidates = candidatesByAction[action] || [];
                const isEditingThis = editing === action;
                const isCreatingThis = creating === action;
                const isExpanded = expanded === action;
                const isLinking = linking === action;

                return (
                    <Box key={action} style={{ marginBottom: 6 }}>
                        {/* ── Row ── */}
                        <Flex
                            alignItems="center"
                            gap={2}
                            style={{
                                padding: '6px 10px',
                                borderRadius: isExpanded || isEditingThis || isLinking ? '6px 6px 0 0' : 6,
                                background: policy
                                    ? (policy.isActive !== false ? '#f0fff4' : '#fafafa')
                                    : '#fff8f8',
                                border: `1px solid ${policy
                                    ? (policy.isActive !== false ? '#b2dfdb' : '#e0e0e0')
                                    : '#fddcdc'}`,
                                borderBottom: isExpanded || isEditingThis || isLinking
                                    ? 'none'
                                    : undefined,
                            }}
                        >
                            <ActionBadge action={action} />

                            {policy ? (
                                <>
                                    {/* Clickable policy key — toggles detail view */}
                                    <Box
                                        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                        onClick={() => setExpanded(isExpanded ? null : action)}
                                    >
                                        <Flex gap={2} alignItems="center">
                                            <Typography variant="pi" style={{ fontFamily: 'monospace', fontWeight: 600, color: tokens.primary }}>
                                                {policy.key || policy.uid || `#${policy.id}`}
                                            </Typography>
                                            {policy.description && (
                                                <Typography variant="pi" textColor="neutral400" style={{ fontSize: 11 }}>— {policy.description}</Typography>
                                            )}
                                            <span style={{ fontSize: 10, color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                                        </Flex>
                                    </Box>

                                    {/* Active badge */}
                                    <span style={{
                                        fontSize: 10, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                                        background: policy.isActive !== false ? '#e8f5e9' : '#f0f0f0',
                                        color: policy.isActive !== false ? '#2e7d32' : '#aaa',
                                        border: `1px solid ${policy.isActive !== false ? '#a5d6a7' : '#ddd'}`,
                                    }}>
                                        {policy.isActive !== false ? 'active' : 'inactive'}
                                    </span>

                                    {/* Activate / Deactivate */}
                                    <Button
                                        size="S"
                                        variant="tertiary"
                                        loading={toggling === policy.id}
                                        onClick={() => handleToggleActive(policy)}
                                    >
                                        {policy.isActive !== false ? 'Deactivate' : 'Activate'}
                                    </Button>

                                    <Button size="S" variant="secondary" onClick={() => {
                                        setExpanded(null);
                                        setLinking(null);
                                        setCreating(null);
                                        setEditing(isEditingThis ? null : action);
                                    }}>
                                        {isEditingThis ? 'Close' : 'Edit'}
                                    </Button>
                                    <Button size="S" onClick={() => {
                                        setExpanded(null);
                                        setLinking(null);
                                        setEditing(null);
                                        setCreating(isCreatingThis ? null : action);
                                    }}>
                                        {isCreatingThis ? 'Close' : '+ Create Policy'}
                                    </Button>
                                    <Button size="S" variant="danger-light" loading={deleting === policy.id} onClick={() => handleDelete(policy)}>
                                        Delete
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Typography variant="pi" textColor="neutral400" style={{ flex: 1, fontStyle: 'italic' }}>
                                        No policy — action is unguarded
                                    </Typography>
                                    {candidates.length > 0 && (
                                        <Button size="S" variant="tertiary" onClick={() => {
                                            setEditing(null);
                                            setCreating(null);
                                            setLinking(isLinking ? null : action);
                                        }}>
                                            {isLinking ? 'Close' : `Assign existing (${candidates.length})`}
                                        </Button>
                                    )}
                                    <Button size="S" onClick={() => {
                                        setLinking(null);
                                        setEditing(null);
                                        setCreating(isCreatingThis ? null : action);
                                    }}>
                                        {isCreatingThis ? 'Close' : '+ Create Policy'}
                                    </Button>
                                </>
                            )}
                        </Flex>

                        {/* ── Expanded detail: grants + full policy info ── */}
                        {isExpanded && policy && (
                            <Box style={{
                                border: `1px solid ${policy.isActive !== false ? '#b2dfdb' : '#e0e0e0'}`,
                                borderTop: 'none',
                                borderRadius: '0 0 6px 6px',
                                padding: '10px 14px',
                                background: '#f9fffc',
                            }}>
                                <Flex gap={6} wrap="wrap" paddingBottom={2}>
                                    {policy.uid && (
                                        <Box>
                                            <Typography variant="pi" style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', fontWeight: 700 }}>UID</Typography>
                                            <Typography variant="pi" style={{ fontFamily: 'monospace' }}>{policy.uid}</Typography>
                                        </Box>
                                    )}
                                    <Box>
                                        <Typography variant="pi" style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', fontWeight: 700 }}>Content Type</Typography>
                                        <Typography variant="pi" style={{ fontFamily: 'monospace' }}>{policy.contentTypeUid || '—'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="pi" style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', fontWeight: 700 }}>Action</Typography>
                                        <Typography variant="pi" style={{ fontFamily: 'monospace' }}>{policy.actionName || '—'}</Typography>
                                    </Box>
                                </Flex>
                                {/* Grants (roles) */}
                                <Box paddingTop={1}>
                                    <Typography variant="pi" style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                                        Granted Roles
                                    </Typography>
                                    {(policy.grants || []).length === 0 ? (
                                        <Typography variant="pi" textColor="neutral400">No roles granted — policy is unreachable.</Typography>
                                    ) : (
                                        <Flex gap={2} wrap="wrap">
                                            {(policy.grants || []).map(g => {
                                                const role = typeof g === 'object' ? g : (roles || []).find(r => String(r.id) === String(g));
                                                return (
                                                    <span key={g?.id ?? g} style={{
                                                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                                        background: `${tokens.primary}11`, color: tokens.primary,
                                                        border: `1px solid ${tokens.primary}33`, fontFamily: 'monospace',
                                                    }}>
                                                        {role?.key || role?.name || `#${g?.id ?? g}`}
                                                    </span>
                                                );
                                            })}
                                        </Flex>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {/* ── Assign existing policy picker ── */}
                        {isLinking && !policy && (
                            <Box style={{
                                border: '1px solid #e0e0f0',
                                borderTop: 'none',
                                borderRadius: '0 0 6px 6px',
                                padding: '10px 14px',
                                background: '#fafafe',
                            }}>
                                <Typography variant="pi" fontWeight="semiBold" style={{ display: 'block', marginBottom: 8 }}>
                                    Existing policies with action <code style={{ fontFamily: 'monospace' }}>{action}</code> — click to assign:
                                </Typography>
                                {candidates.map(c => (
                                    <Flex key={c.id} justifyContent="space-between" alignItems="center" gap={2}
                                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e8e8e8', marginBottom: 4, background: '#fff' }}>
                                        <Box style={{ minWidth: 0 }}>
                                            <Typography variant="pi" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                                {c.key || c.uid || `#${c.id}`}
                                            </Typography>
                                            {c.description && (
                                                <Typography variant="pi" textColor="neutral400" style={{ fontSize: 11 }}>
                                                    {c.description}
                                                </Typography>
                                            )}
                                            <Typography variant="pi" textColor="neutral400" style={{ fontSize: 10 }}>
                                                Currently on: {c.resource?.contentTypeUid || c.resource?.displayName || (c.resource ? `resource #${c.resource.id ?? c.resource}` : 'unattached')}
                                            </Typography>
                                        </Box>
                                        <Button size="S" loading={saving === action} onClick={() => handleLinkExisting(c, action)}>
                                            Assign
                                        </Button>
                                    </Flex>
                                ))}
                            </Box>
                        )}

                        {/* ── Inline create/edit form ── */}
                        {(isEditingThis || isCreatingThis) && (
                            <InlinePolicyEditor
                                resource={resource}
                                action={action}
                                existingPolicy={isEditingThis ? policy : null}
                                roles={roles}
                                strapiTypes={strapiTypes}
                                allTypes={allTypes}
                                attributes={attributes}
                                onDone={() => { setEditing(null); setCreating(null); onRefresh(); }}
                                onCancel={() => { setEditing(null); setCreating(null); }}
                            />
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}

/**
 * Expandable resource card for the list view.
 */
function ResourceCard({ row, policies, roles, strapiTypes, onEdit, onDelete, onRefresh }) {
    const [expanded, setExpanded] = useState(false);
    const resourcePolicies = policies.filter(p => String(p.resource?.id ?? p.resource) === String(row.id));
    const coveredActions = new Set(
        resourcePolicies
            .map(p => normalizeActionName(p.actionName))
            .filter(Boolean)
    );
    const coveredCount = STRAPI_ACTIONS.filter(a => coveredActions.has(a)).length;
    const missingCount = STRAPI_ACTIONS.filter(a => !coveredActions.has(a)).length;

    return (
        <Box background="neutral0" style={{ border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            {/* Header */}
            <Flex
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                style={{ padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => setExpanded(v => !v)}
            >
                <Flex gap={3} alignItems="center" style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, color: '#aaa', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
                    <Box style={{ minWidth: 0 }}>
                        <Flex gap={2} alignItems="center" wrap="wrap">
                            <Typography variant="sigma" style={{ fontFamily: 'monospace', wordBreak: 'break-word', fontSize: 13 }}>
                                {row.contentTypeUid || row.displayName || `#${row.id}`}
                            </Typography>
                            {row.displayName && row.displayName !== row.contentTypeUid && (
                                <Typography variant="pi" textColor="neutral500">{row.displayName}</Typography>
                            )}
                            {row.isActive === false && (
                                <span style={{ fontSize: 10, background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 3, padding: '1px 5px', color: '#888' }}>inactive</span>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: resourcePolicies.length > 0 ? '#e8f5e9' : '#fff8f8', color: resourcePolicies.length > 0 ? '#2e7d32' : '#c62828', border: `1px solid ${resourcePolicies.length > 0 ? '#a5d6a7' : '#fddcdc'}` }}>
                                {coveredCount}/{STRAPI_ACTIONS.length} actions covered
                            </span>
                            {missingCount > 0 && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082' }}>
                                    {missingCount} missing
                                </span>
                            )}
                        </Flex>
                    </Box>
                </Flex>
                <Flex gap={2} onClick={e => e.stopPropagation()}>
                    <Button size="S" variant="secondary" onClick={() => onEdit(row)}>Edit</Button>
                    <Button size="S" variant="danger-light" onClick={() => onDelete(row.id)}>Delete</Button>
                </Flex>
            </Flex>
            {/* Expanded policies */}
            {expanded && (
                <Box style={{ borderTop: '1px solid #f0f0f4', background: tokens.surfaceBg, padding: '12px 14px 14px 36px' }}>
                    <ResourcePoliciesPanel
                        resource={row}
                        policies={policies}
                        roles={roles}
                        strapiTypes={strapiTypes}
                        onRefresh={onRefresh}
                    />
                </Box>
            )}
        </Box>
    );
}

function Resources({
    resources,
    domains,
    strapiTypes,
    policies = [],
    roles = [],
    resourceCatalog,
    recorder,
    actionLoading,
    panelOpen,
    editingRecord,
    formData,
    onFormChange,
    onOpenNew,
    onEdit,
    onDelete,
    onSubmitForm,
    onCancelForm,
    onToggleRecorderEnabled,
    onRefreshRecorder,
    onClearRecorder,
    onToggleRecorderFilter,
    onSaveRecorderSettings,
    onCreateFromSuggestion,
    onRefreshCatalog,
    onUseFromCatalog,
    onRefreshPolicies,
    subTab,
    onSubTabChange,
}) {
    const [showCreateSection, setShowCreateSection] = useState(false);
    const [createMode, setCreateMode] = useState(null);
    const activeTab = subTab || 'api-resources';
    const rawPolicy = formData?.__initialPolicy;

    // Always provide a default initialPolicy block for new records even if missing from formData
    const initialPolicy = !editingRecord 
        ? (rawPolicy && typeof rawPolicy === 'object' ? rawPolicy : { key: '', actionName: '', query: {}, filters: {}, body: {}, grants: [] })
        : null;

    const allTypes = useMemo(() => {
        const map = new Map();
        (strapiTypes || []).forEach(ct => map.set(ct.uid, ct));
        return map;
    }, [strapiTypes]);
    const initialPolicyAttributes = useMemo(() => {
        const uid = initialPolicy?.contentTypeUid || formData?.contentTypeUid;
        return uid ? (allTypes.get(uid)?.attributes || []) : [];
    }, [allTypes, initialPolicy?.contentTypeUid, formData?.contentTypeUid]);

    function handleUseFromCatalog(ct, action) {
        onUseFromCatalog(ct, action);
        if (onSubTabChange) onSubTabChange('api-resources');
    }

    function handleCreateFromSuggestion(item) {
        onCreateFromSuggestion(item);
        if (onSubTabChange) onSubTabChange('api-resources');
    }

    function handleOpenBlankForm() {
        setShowCreateSection(false);
        setCreateMode(null);
        onOpenNew();
    }

    // ── Full-width form view (replaces list when panelOpen) ──────────────────
    if (panelOpen) {
        return (
            <Box>
                {/* Top action bar */}
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} wrap="wrap" gap={2}>
                    <Flex alignItems="center" gap={3}>
                        <Button variant="tertiary" size="S" onClick={onCancelForm}>
                            ← Back to List
                        </Button>
                        <Box>
                            <Typography variant="beta">
                                {editingRecord ? 'Edit Resource' : 'New Resource'}
                            </Typography>
                            {editingRecord && (
                                <Typography variant="pi" textColor="neutral500" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                    #{editingRecord.id} · {editingRecord.contentTypeUid}
                                </Typography>
                            )}
                        </Box>
                    </Flex>
                    <Flex gap={2}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>
                            {editingRecord ? 'Update Resource' : 'Create Resource'}
                        </Button>
                    </Flex>
                </Flex>

                <Divider />

                <Box paddingTop={4}>
                    <ResourceForm
                        formData={formData}
                        onChange={onFormChange}
                        strapiTypes={strapiTypes}
                    />
                </Box>

                {!editingRecord && initialPolicy && (
                    <Box paddingTop={4}>
                        <Divider />
                        <Box paddingTop={4} paddingBottom={2}>
                            <Typography variant="beta">Initial Policy (required)</Typography>
                            <Typography variant="pi" textColor="neutral500">
                                This resource will create one policy under it. Configure it before saving.
                            </Typography>
                        </Box>
                        <PolicyForm
                            formData={initialPolicy}
                            onChange={(nextPolicy) => onFormChange({ ...formData, __initialPolicy: { ...initialPolicy, ...nextPolicy } })}
                            resources={[]}
                            roles={roles}
                            attributes={initialPolicyAttributes}
                            allTypes={allTypes}
                        />
                    </Box>
                )}

                {/* Policies panel — only shown when editing an existing resource */}
                {editingRecord && (
                    <Box paddingTop={4}>
                        <Divider />
                        <Box paddingTop={4} paddingBottom={2}>
                            <Typography variant="beta">Policies for this Resource</Typography>
                            <Typography variant="pi" textColor="neutral500">
                                Each action can have one policy controlling read/write shaping and row-level access.
                            </Typography>
                        </Box>
                        <ResourcePoliciesPanel
                            resource={editingRecord}
                            policies={policies}
                            roles={roles}
                            strapiTypes={strapiTypes}
                            onRefresh={onRefreshPolicies || (() => {})}
                        />
                    </Box>
                )}

                {/* Bottom action bar */}
                <Box paddingTop={6} paddingBottom={4}>
                    <Divider />
                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>
                            {editingRecord ? 'Update Resource' : 'Create Resource'}
                        </Button>
                    </Flex>
                </Box>
            </Box>
        );
    }

    // ── Normal list view ─────────────────────────────────────────────────────
    return (
        <Box>
                {/* Tab bar */}
                <Flex gap={2} wrap="wrap" paddingBottom={4}>
                    {RESOURCE_TABS.map(tab => (
                        <Button
                            key={tab.key}
                            variant={activeTab === tab.key ? 'default' : 'tertiary'}
                            onClick={() => {
                                if (onSubTabChange) onSubTabChange(tab.key);
                                setShowCreateSection(false);
                                setCreateMode(null);
                            }}
                        >
                            {tab.label}
                            {tab.key === 'api-resources' && (
                                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>({resources.length})</span>
                            )}
                            {tab.key === 'content-types' && (
                                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>({resourceCatalog.length})</span>
                            )}
                            {tab.key === 'api-request-recordings' && (
                                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>({recorder.suggestions?.length || 0})</span>
                            )}
                        </Button>
                    ))}
                </Flex>

                {/* API Resources tab */}
                {activeTab === 'api-resources' && (
                    <Box>
                        <Flex justifyContent="space-between" alignItems="center" paddingBottom={3} wrap="wrap" gap={2}>
                            <Box>
                                <Typography variant="beta">API Resources</Typography>
                                <Typography variant="pi" textColor="neutral500">
                                    {resources.length} resource{resources.length !== 1 ? 's' : ''} defined
                                </Typography>
                            </Box>
                            <Button
                                variant="secondary"
                                size="S"
                                onClick={() => {
                                    setShowCreateSection(prev => !prev);
                                    setCreateMode(null);
                                }}
                            >
                                {showCreateSection ? 'Hide' : '+ New Resource'}
                            </Button>
                        </Flex>

                        {resources.length === 0 ? (
                            <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                                <Typography textColor="neutral500">No resources yet.</Typography>
                            </Box>
                        ) : resources.map(row => (
                            <ResourceCard
                                key={row.id}
                                row={row}
                                policies={policies}
                                roles={roles}
                                strapiTypes={strapiTypes}
                                onEdit={(r) => { setShowCreateSection(false); setCreateMode(null); onEdit(r); }}
                                onDelete={onDelete}
                                onRefresh={onRefreshPolicies || (() => {})}
                            />
                        ))}

                        {showCreateSection && (
                            <Box paddingTop={4}>
                                <Divider />
                                <Box paddingTop={4} paddingBottom={3}>
                                    <Typography variant="beta">Create a Resource</Typography>
                                    <Typography variant="pi" textColor="neutral500">
                                        Choose how you want to define the new resource
                                    </Typography>
                                </Box>
                                <Flex gap={3} wrap="wrap" paddingBottom={4}>
                                    <ModeCard
                                        title="Select a Route / Controller Action"
                                        description="Browse content types and routes, then click Use to pre-fill the form."
                                        active={createMode === 'catalog'}
                                        onClick={() => setCreateMode(prev => prev === 'catalog' ? null : 'catalog')}
                                    />
                                    <ModeCard
                                        title="Blank Form"
                                        description="Open an empty resource form and fill in the details manually."
                                        active={false}
                                        onClick={handleOpenBlankForm}
                                    />
                                </Flex>
                                {createMode === 'catalog' && (
                                    <Box
                                        padding={4}
                                        background="neutral0"
                                        style={{ border: '1px solid #e0e0f0', borderRadius: 10 }}
                                    >
                                        <Box paddingBottom={3}>
                                            <Typography variant="delta">Select a Route or Action</Typography>
                                            <Typography variant="pi" textColor="neutral500">
                                                Click <strong>Use</strong> next to any route to pre-fill the resource form.
                                            </Typography>
                                        </Box>
                                        <BuilderCatalog
                                            resourceCatalog={resourceCatalog}
                                            onRefresh={onRefreshCatalog}
                                            onUse={(ct, action) => {
                                                setShowCreateSection(false);
                                                setCreateMode(null);
                                                onUseFromCatalog(ct, action);
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Content Types tab */}
                {activeTab === 'content-types' && (
                    <Box>
                        <Box paddingBottom={3}>
                            <Typography variant="beta">Content Types</Typography>
                            <Typography variant="pi" textColor="neutral500">
                                Browse content types and their routes. Click <strong>Use</strong> to create a resource
                                from a route &mdash; you will be switched back to API Resources with the form pre-filled.
                            </Typography>
                        </Box>
                        <BuilderCatalog
                            resourceCatalog={resourceCatalog}
                            onRefresh={onRefreshCatalog}
                            onUse={handleUseFromCatalog}
                        />
                    </Box>
                )}

                {/* API Request Recordings tab */}
                {activeTab === 'api-request-recordings' && (
                    <Box>
                        <Box paddingBottom={3}>
                            <Typography variant="beta">API Request Recordings</Typography>
                            <Typography variant="pi" textColor="neutral500">
                                Start recording to capture live API traffic. Click <strong>Create Resource</strong> on
                                any suggestion to scaffold a resource and switch to the API Resources tab.
                            </Typography>
                        </Box>
                        <RecorderPanel
                            recorder={recorder}
                            actionLoading={actionLoading}
                            onToggleEnabled={onToggleRecorderEnabled}
                            onRefresh={onRefreshRecorder}
                            onClear={onClearRecorder}
                            onToggleFilter={onToggleRecorderFilter}
                            onSaveSettings={onSaveRecorderSettings}
                            onCreateFromSuggestion={handleCreateFromSuggestion}
                        />
                    </Box>
                )}
        </Box>
    );
}

export default Resources;

