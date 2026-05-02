import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Flex,
    Divider,
} from '@strapi/design-system';
import { Magic } from '@strapi/icons';
import BuilderCatalog from '../../components/Resources/BuilderCatalog.jsx';
import ResourceList from './ResourceList.jsx';
import ResourceForm from './ResourceForm.jsx';

/* â”€â”€â”€ Recorder panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function RecorderPanel({ recorder, actionLoading, onToggleEnabled, onRefresh, onClear, onToggleFilter, onCreateFromSuggestion }) {
    return (
        <Box>
            {/* Controls row */}
            <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2} paddingBottom={3}>
                <Flex alignItems="center" gap={3}>
                    <Box
                        style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: recorder.enabled ? '#2ecc71' : '#bbb',
                            boxShadow: recorder.enabled ? '0 0 0 3px #2ecc7133' : 'none',
                            flexShrink: 0
                        }}
                    />
                    <Box>
                        <Typography variant="omega" fontWeight="semiBold">
                            {recorder.enabled ? 'Recording active' : 'Recording paused'}
                        </Typography>
                        <Typography variant="pi" textColor="neutral500">
                            {recorder.records?.length || 0} route{(recorder.records?.length || 0) !== 1 ? 's' : ''} captured
                        </Typography>
                    </Box>
                </Flex>
                <Flex gap={2}>
                    <Button
                        variant={recorder.enabled ? 'danger-light' : 'default'}
                        onClick={onToggleEnabled}
                        loading={actionLoading}
                        size="S"
                    >
                        {recorder.enabled ? 'â¹ Stop' : 'âº Start Recording'}
                    </Button>
                    <Button variant="tertiary" size="S" onClick={onRefresh}>Refresh</Button>
                    <Button variant="tertiary" size="S" onClick={onClear}>Clear</Button>
                </Flex>
            </Flex>

            {/* Filters */}
            <Box
                padding={3}
                background="neutral100"
                style={{ borderRadius: 8, marginBottom: 12 }}
            >
                <Typography variant="pi" fontWeight="semiBold" textColor="neutral600" paddingBottom={2}>
                    Capture filters
                </Typography>
                <Flex gap={6} wrap="wrap">
                    <Box>
                        <Typography variant="pi" textColor="neutral500" paddingBottom={1}>Methods</Typography>
                        <Flex gap={2} wrap="wrap">
                            {['get', 'post', 'put', 'delete'].map(method => {
                                const id = `rec-method-${method}`;
                                return (
                                    <Flex key={method} alignItems="center" gap={1}>
                                        <input id={id} type="checkbox"
                                            checked={Boolean(recorder.filters?.methods?.[method])}
                                            onChange={() => onToggleFilter('methods', method)}
                                        />
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
                                        <input id={id} type="checkbox"
                                            checked={Boolean(recorder.filters?.paths?.[key])}
                                            onChange={() => onToggleFilter('paths', key)}
                                        />
                                        <label htmlFor={id} style={{ fontSize: 11, fontFamily: 'monospace' }}>{label}</label>
                                    </Flex>
                                );
                            })}
                        </Flex>
                    </Box>
                </Flex>
            </Box>

            {/* Suggestions */}
            {(recorder.suggestions || []).length === 0 ? (
                <Box padding={5} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                    <Typography variant="pi" textColor="neutral400">
                        {recorder.enabled
                            ? 'Waiting for incoming API requestsâ€¦'
                            : 'Start recording to capture API requests from live traffic.'}
                    </Typography>
                </Box>
            ) : (
                <Box>
                    <Typography variant="pi" fontWeight="semiBold" textColor="neutral600" paddingBottom={2}>
                        Captured routes â€” click "Create Resource" to scaffold
                    </Typography>
                    {(recorder.suggestions || []).slice(0, 50).map(item => (
                        <Box
                            key={`${item.key}-${item.path}`}
                            padding={3}
                            background="neutral0"
                            style={{ border: '1px solid #e8eaf0', borderRadius: 8, marginBottom: 6 }}
                        >
                            <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={2}>
                                <Box style={{ minWidth: 0 }}>
                                    <Flex gap={2} alignItems="center" paddingBottom={1}>
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                                            background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9',
                                            flexShrink: 0
                                        }}>
                                            {item.method}
                                        </span>
                                        <Typography variant="sigma" style={{ wordBreak: 'break-all', fontSize: 13 }}>{item.path}</Typography>
                                    </Flex>
                                    <Typography variant="pi" textColor="neutral500">
                                        {item.count} hit{item.count !== 1 ? 's' : ''} Â· status {item.lastStatus ?? 'â€”'} Â· type: {item.type}
                                        {item.exampleUrl && <> Â· <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{item.exampleUrl}</span></>}
                                    </Typography>
                                </Box>
                                <Button size="S" onClick={() => onCreateFromSuggestion(item)}>Create Resource</Button>
                            </Flex>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

/* â”€â”€â”€ Create mode card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ModeCard({ icon, title, description, active, onClick }) {
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
                background: active ? '#f0f0ff' : 'var(--strapi-colors-neutral0, #fff)',
                transition: 'border-color 0.15s, background 0.15s',
                userSelect: 'none',
            }}
        >
            <Flex gap={3} alignItems="flex-start">
                <Typography style={{ fontSize: 28, lineHeight: 1 }}>{icon}</Typography>
                <Box>
                    <Typography variant="sigma" style={{ color: active ? '#4945ff' : undefined }}>{title}</Typography>
                    <Typography variant="pi" textColor="neutral500">{description}</Typography>
                </Box>
            </Flex>
        </Box>
    );
}

/* â”€â”€â”€ Main Resources page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    onWizardOpen,
    onToggleRecorderEnabled,
    onRefreshRecorder,
    onClearRecorder,
    onToggleRecorderFilter,
    onCreateFromSuggestion,
    onRefreshCatalog,
    onUseFromCatalog,
}) {
    const [createMode, setCreateMode] = useState(null); // null | 'manual' | 'record'

    const toggleMode = (mode) => setCreateMode(prev => prev === mode ? null : mode);

    return (
        <Flex gap={0} alignItems="flex-start">
            {/* Main column */}
            <Box style={{ flex: 1, minWidth: 0, paddingRight: panelOpen ? 20 : 0 }}>

                {/* â”€â”€ Section 1: Resource list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3} wrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="beta">Resources</Typography>
                        <Typography variant="pi" textColor="neutral500">
                            {resources.length} resource{resources.length !== 1 ? 's' : ''} defined
                        </Typography>
                    </Box>
                    <Button variant="secondary" startIcon={<Magic />} size="S" onClick={onWizardOpen}>
                        Wizard
                    </Button>
                </Flex>

                <ResourceList
                    resources={resources}
                    domains={domains}
                    onEdit={(row) => {
                        setCreateMode(null);
                        onEdit(row);
                    }}
                    onDelete={onDelete}
                />

                {/* â”€â”€ Section 2: Create a Resource â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Box paddingTop={6}>
                    <Divider />
                    <Box paddingTop={4} paddingBottom={3}>
                        <Typography variant="beta">Create a Resource</Typography>
                        <Typography variant="pi" textColor="neutral500">
                            Choose how you want to define the new resource
                        </Typography>
                    </Box>

                    {/* Mode picker cards */}
                    <Flex gap={3} wrap="wrap" paddingBottom={4}>
                        <ModeCard
                            icon="ðŸ—‚ï¸"
                            title="Manually â€” pick a route or action"
                            description="Browse the catalog of Strapi content types, select a route and action, then customise the resource."
                            active={createMode === 'manual'}
                            onClick={() => toggleMode('manual')}
                        />
                        <ModeCard
                            icon="âº"
                            title="By Recording â€” capture from live traffic"
                            description="Start the recorder, make real API calls, and let the system discover routes and actions automatically."
                            active={createMode === 'record'}
                            onClick={() => toggleMode('record')}
                        />
                    </Flex>

                    {/* Manual mode: catalog browser */}
                    {createMode === 'manual' && (
                        <Box
                            padding={4}
                            background="neutral0"
                            style={{ border: '1px solid #e0e0f0', borderRadius: 10 }}
                        >
                            <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                                <Box>
                                    <Typography variant="delta">Select a Route or Action</Typography>
                                    <Typography variant="pi" textColor="neutral500">
                                        Click <strong>Use</strong> next to any route to pre-fill the resource form on the right.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="tertiary"
                                    size="S"
                                    onClick={() => { setCreateMode(null); onOpenNew(); }}
                                >
                                    + Blank Form
                                </Button>
                            </Flex>
                            <BuilderCatalog
                                resourceCatalog={resourceCatalog}
                                onRefresh={onRefreshCatalog}
                                onUse={(ct, action) => {
                                    onUseFromCatalog(ct, action);
                                }}
                            />
                        </Box>
                    )}

                    {/* Record mode: recorder panel */}
                    {createMode === 'record' && (
                        <Box
                            padding={4}
                            background="neutral0"
                            style={{ border: '1px solid #e0e0f0', borderRadius: 10 }}
                        >
                            <Box paddingBottom={3}>
                                <Typography variant="delta">Request Recorder</Typography>
                                <Typography variant="pi" textColor="neutral500">
                                    Captured routes appear below â€” click <strong>Create Resource</strong> to scaffold one.
                                </Typography>
                            </Box>
                            <RecorderPanel
                                recorder={recorder}
                                actionLoading={actionLoading}
                                onToggleEnabled={onToggleRecorderEnabled}
                                onRefresh={onRefreshRecorder}
                                onClear={onClearRecorder}
                                onToggleFilter={onToggleRecorderFilter}
                                onCreateFromSuggestion={onCreateFromSuggestion}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            {/* â”€â”€ Edit / Create panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    {/* Panel header */}
                    <Flex justifyContent="space-between" alignItems="flex-start" paddingBottom={3}>
                        <Box>
                            <Typography variant="beta">
                                {editingRecord ? 'Edit Resource' : 'New Resource'}
                            </Typography>
                            {editingRecord && (
                                <Typography variant="pi" textColor="neutral500" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                    #{editingRecord.id} Â· {editingRecord.key}
                                </Typography>
                            )}
                        </Box>
                        <Button variant="tertiary" size="S" onClick={onCancelForm}>âœ•</Button>
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
