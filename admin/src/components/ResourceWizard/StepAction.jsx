import React from 'react';
import {
    Box,
    Typography,
    Flex,
    Divider,
    Loader
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

const METHOD_COLORS = {
    GET: { bg: '#34a85322', color: '#137333', border: '#34a85366' },
    POST: { bg: '#fbbc0422', color: '#b06000', border: '#fbbc0466' },
    PUT: { bg: '#4285f422', color: '#1a73e8', border: '#4285f466' },
    PATCH: { bg: '#9b59b622', color: '#6c3483', border: '#9b59b666' },
    DELETE: { bg: '#ea433522', color: '#c5221f', border: '#ea433566' }
};

const MethodBadge = ({ method }) => {
    const s = METHOD_COLORS[method] || { bg: '#eee', color: '#333', border: '#ccc' };
    return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {method}
        </span>
    );
};

const ActionCard = ({ action, selected, onSelect }) => (
    <Box
        padding={3}
        style={{
            cursor: 'pointer',
            border: selected ? '2px solid #4945ff' : '1px solid #e0e0e0',
            background: selected ? '#f0f0ff' : 'white',
            borderRadius: 8, marginBottom: 8
        }}
        onClick={() => onSelect(action)}
    >
        <Flex justifyContent="space-between" alignItems="center">
            <Box>
                <Flex gap={2} alignItems="center">
                    <MethodBadge method={action.method} />
                    <Typography variant="sigma">{action.action}</Typography>
                </Flex>
                <Typography variant="pi" textColor="neutral500" style={{ marginTop: 4 }}>{action.path}</Typography>
                {action.action === 'find' && <Typography variant="pi" textColor="neutral600">List all records</Typography>}
                {action.action === 'findOne' && <Typography variant="pi" textColor="neutral600">Get single record by ID</Typography>}
                {action.action === 'create' && <Typography variant="pi" textColor="neutral600">Create new record</Typography>}
                {action.action === 'update' && <Typography variant="pi" textColor="neutral600">Update existing record</Typography>}
                {action.action === 'delete' && <Typography variant="pi" textColor="neutral600">Delete record</Typography>}
            </Box>
            <span style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${selected ? '#4945ff' : '#ccc'}`,
                background: selected ? '#4945ff' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
            </span>
        </Flex>
    </Box>
);

export const StepAction = ({ contentType, value, onChange, onNext, onBack }) => {
    const { get } = useFetchClient();
    const [actions, setActions] = React.useState({ standard: [], extended: [] });
    const [loading, setLoading] = React.useState(true);
    const [selected, setSelected] = React.useState(value?.action || '');

    React.useEffect(() => {
        const fetchActions = async () => {
            try {
                const { data } = await get('/api-guard-pro/resource-builder/catalog');
                const ctData = data?.data?.find(c => c.uid === contentType.uid);
                if (ctData) {
                    setActions({ standard: ctData.standard || [], extended: ctData.extended || [] });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchActions();
    }, [get, contentType]);

    const handleSelect = (action) => {
        setSelected(action.action);
        onChange({
            action: action.action,
            method: action.method,
            path: action.path,
            type: action.type || 'standard'
        });
    };

    if (loading) {
        return (
            <Flex justifyContent="center" padding={8}>
                <Loader>Loading actions...</Loader>
            </Flex>
        );
    }

    return (
        <Box>
            <Typography variant="beta" paddingBottom={2}>
                Select API Action
            </Typography>
            <Typography variant="omega" textColor="neutral600" paddingBottom={6}>
                Choose the CRUD operation for {contentType?.displayName}
            </Typography>

            {actions.standard.length > 0 && (
                <>
                    <Typography variant="delta" paddingBottom={3}>Standard CRUD Operations</Typography>
                    {actions.standard.map((action, idx) => (
                        <ActionCard key={`std-${idx}`} action={action} selected={selected === action.action} onSelect={handleSelect} />
                    ))}
                </>
            )}

            {actions.extended.length > 0 && (
                <>
                    <Divider style={{ margin: '16px 0' }} />
                    <Typography variant="delta" paddingBottom={3}>Custom Endpoints</Typography>
                    {actions.extended.map((action, idx) => (
                        <ActionCard key={`ext-${idx}`} action={action} selected={selected === action.action} onSelect={handleSelect} />
                    ))}
                </>
            )}

            {actions.standard.length === 0 && actions.extended.length === 0 && (
                <Box padding={6} style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }}>
                    <Typography textColor="neutral500">No actions found for this content type.</Typography>
                </Box>
            )}

            <Flex justifyContent="space-between" paddingTop={6}>
                <button
                    onClick={onBack}
                    style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!selected}
                    style={{
                        padding: '8px 16px', borderRadius: 4,
                        background: selected ? '#4945ff' : '#ccc',
                        color: 'white', border: 'none',
                        cursor: selected ? 'pointer' : 'not-allowed'
                    }}
                >
                    Next: Configure Filters →
                </button>
            </Flex>
        </Box>
    );
};