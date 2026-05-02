import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    Flex,
    TextInput,
    SingleSelect,
    SingleSelectOption,
} from '@strapi/design-system';
import MethodBadge from './MethodBadge.jsx';

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function BuilderCatalog({ resourceCatalog, onRefresh, onUse }) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [sortBy, setSortBy] = useState('displayName');
    const [sortDir, setSortDir] = useState('asc');
    const [expandedUids, setExpandedUids] = useState({});

    const toggleExpand = (uid) => setExpandedUids(prev => ({ ...prev, [uid]: !prev[uid] }));

    const allActions = useMemo(() => {
        const rows = [];
        for (const ct of resourceCatalog) {
            for (const a of (ct.standard || [])) rows.push({ ct, action: a, actionType: 'standard' });
            for (const a of (ct.extended || [])) rows.push({ ct, action: a, actionType: 'extended' });
        }
        return rows;
    }, [resourceCatalog]);

    const filteredCatalog = useMemo(() => {
        const q = search.toLowerCase();
        return resourceCatalog
            .map(ct => {
                const matchesCt = !q || ct.displayName.toLowerCase().includes(q) || ct.uid.toLowerCase().includes(q);
                const filterActions = (list) => list.filter(a => {
                    if (!matchesCt && q && !a.path.toLowerCase().includes(q)) return false;
                    if (typeFilter && a.type !== typeFilter) return false;
                    if (methodFilter && a.method?.toUpperCase() !== methodFilter) return false;
                    return true;
                });
                const standard = filterActions(ct.standard || []);
                const extended = filterActions(ct.extended || []);
                if (!matchesCt && standard.length === 0 && extended.length === 0) return null;
                return { ...ct, standard, extended };
            })
            .filter(Boolean)
            .sort((a, b) => {
                let av = sortBy === 'uid' ? a.uid : a.displayName;
                let bv = sortBy === 'uid' ? b.uid : b.displayName;
                const totalA = (a.standard.length + a.extended.length);
                const totalB = (b.standard.length + b.extended.length);
                if (sortBy === 'actions') { av = totalA; bv = totalB; }
                if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
                return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
            });
    }, [resourceCatalog, search, typeFilter, methodFilter, sortBy, sortDir]);

    const sortToggle = (key) => {
        if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('asc'); }
    };

    const sortIcon = (key) => sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

    const uniqueTypes = useMemo(() => {
        const s = new Set();
        allActions.forEach(({ action }) => s.add(action.type || 'standard'));
        return [...s].sort();
    }, [allActions]);

    return (
        <Box padding={3} background="neutral100" style={{ border: '1px solid #d8e6ff', borderRadius: 8, marginBottom: 10 }}>
            {/* Header */}
            <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={2} paddingBottom={3}>
                <Box>
                    <Typography variant="beta">Resource Builder</Typography>
                    <Typography variant="pi" textColor="neutral600">
                        Browse content types and their routes, then click <strong>Use</strong> to scaffold a resource.
                    </Typography>
                </Box>
                <Button variant="tertiary" onClick={onRefresh}>Refresh Catalog</Button>
            </Flex>

            {/* Filters + sort toolbar */}
            <Flex gap={2} wrap="wrap" alignItems="flex-end" paddingBottom={3}>
                <Box style={{ flex: '1 1 200px' }}>
                    <TextInput
                        label="Search"
                        placeholder="Content type or path..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </Box>
                <Box style={{ flex: '0 0 130px' }}>
                    <SingleSelect label="Method" value={methodFilter} onChange={v => setMethodFilter(v || '')}>
                        <SingleSelectOption value="">All methods</SingleSelectOption>
                        {METHOD_OPTIONS.map(m => <SingleSelectOption key={m} value={m}>{m}</SingleSelectOption>)}
                    </SingleSelect>
                </Box>
                <Box style={{ flex: '0 0 130px' }}>
                    <SingleSelect label="Type" value={typeFilter} onChange={v => setTypeFilter(v || '')}>
                        <SingleSelectOption value="">All types</SingleSelectOption>
                        {uniqueTypes.map(t => <SingleSelectOption key={t} value={t}>{t}</SingleSelectOption>)}
                    </SingleSelect>
                </Box>
                <Flex gap={1} alignItems="center" style={{ paddingBottom: 2 }}>
                    <Typography variant="pi" textColor="neutral500">Sort:</Typography>
                    {[['displayName', 'Name'], ['uid', 'UID'], ['actions', 'Actions']].map(([key, label]) => (
                        <Button key={key} size="S" variant={sortBy === key ? 'default' : 'tertiary'} onClick={() => sortToggle(key)}>
                            {label}{sortIcon(key)}
                        </Button>
                    ))}
                </Flex>
                {(search || typeFilter || methodFilter) && (
                    <Button variant="tertiary" size="S" onClick={() => { setSearch(''); setTypeFilter(''); setMethodFilter(''); }}>
                        Clear
                    </Button>
                )}
            </Flex>

            {resourceCatalog.length === 0 ? (
                <Typography variant="pi" textColor="neutral500">No content type actions discovered.</Typography>
            ) : filteredCatalog.length === 0 ? (
                <Typography variant="pi" textColor="neutral500">No results match your filters.</Typography>
            ) : (
                <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {filteredCatalog.map(ct => {
                        const totalActions = ct.standard.length + ct.extended.length;
                        const isOpen = expandedUids[ct.uid] !== false;
                        return (
                            <Box key={ct.uid} background="neutral0" style={{ border: '1px solid #e2e8f5', borderRadius: 8, overflow: 'hidden' }}>
                                <Flex
                                    justifyContent="space-between"
                                    alignItems="center"
                                    padding={3}
                                    style={{ borderBottom: isOpen ? '1px solid #e2e8f5' : 'none', cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => toggleExpand(ct.uid)}
                                >
                                    <Box style={{ minWidth: 0 }}>
                                        <Typography variant="sigma" style={{ wordBreak: 'break-all' }}>{ct.displayName}</Typography>
                                        <Typography variant="pi" textColor="neutral400" style={{ fontSize: 11, wordBreak: 'break-all' }}>{ct.uid}</Typography>
                                    </Box>
                                    <Flex gap={2} alignItems="center" style={{ flexShrink: 0 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, background: '#e8eaf6', color: '#3949ab', borderRadius: 10, padding: '1px 8px' }}>
                                            {totalActions} action{totalActions !== 1 ? 's' : ''}
                                        </span>
                                        <Typography variant="pi" textColor="neutral500">{isOpen ? '▲' : '▼'}</Typography>
                                    </Flex>
                                </Flex>

                                {isOpen && (
                                    <Box>
                                        <Flex
                                            gap={2}
                                            style={{
                                                padding: '4px 12px',
                                                background: 'var(--strapi-colors-neutral100, #f4f4f8)',
                                                borderBottom: '1px solid #e8eaf0'
                                            }}
                                        >
                                            <Box style={{ width: 54 }}>
                                                <Typography variant="pi" textColor="neutral500" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Method</Typography>
                                            </Box>
                                            <Box style={{ flex: 1 }}>
                                                <Typography variant="pi" textColor="neutral500" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Path</Typography>
                                            </Box>
                                            <Box style={{ width: 130 }}>
                                                <Typography variant="pi" textColor="neutral500" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Controller · Action</Typography>
                                            </Box>
                                            <Box style={{ width: 60 }}>
                                                <Typography variant="pi" textColor="neutral500" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Type</Typography>
                                            </Box>
                                            <Box style={{ width: 44 }} />
                                        </Flex>

                                        {[...ct.standard.map(a => ({ ...a, _t: 'standard' })), ...ct.extended.map(a => ({ ...a, _t: 'extended' }))].map((action, idx) => (
                                            <Flex
                                                key={`${ct.uid}-${action._t}-${idx}`}
                                                gap={2}
                                                alignItems="center"
                                                style={{
                                                    padding: '5px 12px',
                                                    borderBottom: idx < ct.standard.length + ct.extended.length - 1 ? '1px solid #f0f0f0' : 'none'
                                                }}
                                            >
                                                <Box style={{ width: 54, flexShrink: 0 }}>
                                                    <MethodBadge method={action.method} />
                                                </Box>
                                                <Box style={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="pi" style={{ wordBreak: 'break-all', fontSize: 12 }}>{action.path}</Typography>
                                                </Box>
                                                <Box style={{ width: 130, flexShrink: 0, minWidth: 0 }}>
                                                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                                                        {action.action && action.action !== 'custom'
                                                            ? <><span style={{ opacity: 0.6 }}>{ct.uid.split('::').pop()?.split('.').pop() || ct.uid}</span><span style={{ color: '#4945ff', fontWeight: 600 }}> · {action.action}</span></>
                                                            : <span style={{ opacity: 0.45, fontStyle: 'italic' }}>custom</span>
                                                        }
                                                    </Typography>
                                                </Box>
                                                <Box style={{ width: 60, flexShrink: 0 }}>
                                                    <span style={{
                                                        fontSize: 10, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                                                        background: action._t === 'extended' ? '#fce4ec' : '#e8f5e9',
                                                        color: action._t === 'extended' ? '#880e4f' : '#2e7d32',
                                                        border: `1px solid ${action._t === 'extended' ? '#f48fb1' : '#a5d6a7'}`
                                                    }}>
                                                        {action._t}
                                                    </span>
                                                </Box>
                                                <Box style={{ width: 44, flexShrink: 0 }}>
                                                    <Button size="S" onClick={() => onUse(ct, action)}>Use</Button>
                                                </Box>
                                            </Flex>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}

export default BuilderCatalog;
