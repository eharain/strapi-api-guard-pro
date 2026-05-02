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
                                    type: item.matched ? 'extended' : 'standard',
                                    pathPattern: item.path,
                                    requestRules: item.suggestedRequestRules || {}
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

function Resources({
    resources,
    domains,
    strapiTypes,
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
    subTab,
    onSubTabChange,
}) {
    const [showCreateSection, setShowCreateSection] = useState(false);
    const [createMode, setCreateMode] = useState(null);
    const activeTab = subTab || 'api-resources';

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

    return (
        <Flex gap={0} alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 20 : 0 }}>

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

                        <ResourceList
                            resources={resources}
                            domains={domains}
                            onEdit={(row) => {
                                setShowCreateSection(false);
                                setCreateMode(null);
                                onEdit(row);
                            }}
                            onDelete={onDelete}
                        />

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
                                                Click <strong>Use</strong> next to any route to pre-fill the resource form on the right.
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

            {/* Edit / Create side panel */}
            {panelOpen && (
                <Box
                    background="neutral0"
                    style={{
                        width: 480,
                        flexShrink: 0,
                        marginLeft: 20,
                        borderRadius: 10,
                        border: '1px solid #e0e0e8',
                        padding: 20,
                        maxHeight: 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        position: 'sticky',
                        top: 16,
                    }}
                >
                    <Flex justifyContent="space-between" alignItems="flex-start" paddingBottom={3}>
                        <Box>
                            <Typography variant="beta">
                                {editingRecord ? 'Edit Resource' : 'New Resource'}
                            </Typography>
                            {editingRecord && (
                                <Typography variant="pi" textColor="neutral500" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                    #{editingRecord.id} &middot; {editingRecord.key}
                                </Typography>
                            )}
                        </Box>
                        <Button variant="tertiary" size="S" onClick={onCancelForm}>Close</Button>
                    </Flex>

                    <Divider />

                    <Box paddingTop={3}>
                        <ResourceForm
                            formData={formData}
                            onChange={onFormChange}
                            domains={domains}
                            resources={resources}
                            strapiTypes={strapiTypes}
                            editingRecord={editingRecord}
                        />
                    </Box>

                    <Flex gap={2} justifyContent="flex-end" paddingTop={4}>
                        <Button variant="tertiary" onClick={onCancelForm} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={onSubmitForm} loading={actionLoading}>
                            {editingRecord ? 'Update' : 'Create'}
                        </Button>
                    </Flex>
                </Box>
            )}
        </Flex>
    );
}

export default Resources;
