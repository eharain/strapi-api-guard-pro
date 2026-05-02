import React from 'react';
import {
    Box,
    Typography,
    Flex,
    Loader
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

export const StepContentType = ({ value, onChange, onNext }) => {
    const { get } = useFetchClient();
    const [contentTypes, setContentTypes] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [selected, setSelected] = React.useState(value?.uid || '');

    React.useEffect(() => {
        const fetchTypes = async () => {
            try {
                const { data } = await get('/api-guard-pro/strapi-content-types');
                setContentTypes(data?.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTypes();
    }, [get]);

    if (loading) {
        return (
            <Flex justifyContent="center" padding={8}>
                <Loader>Loading content types...</Loader>
            </Flex>
        );
    }

    const handleSelect = (uid) => {
        setSelected(uid);
        const ct = contentTypes.find(c => c.uid === uid);
        onChange({ uid, displayName: ct?.displayName, attributes: ct?.attributes });
    };

    const handleNext = () => {
        if (selected) {
            const ct = contentTypes.find(c => c.uid === selected);
            onChange({ uid: selected, displayName: ct?.displayName, attributes: ct?.attributes });
            onNext();
        }
    };

    return (
        <Box>
            <Typography variant="beta" paddingBottom={4}>
                Select Content Type
            </Typography>
            <Typography variant="omega" textColor="neutral600" paddingBottom={6}>
                Choose which Strapi content type this resource will protect
            </Typography>

            <Flex wrap="wrap" gap={3}>
                {contentTypes.map(ct => (
                    <Box
                        key={ct.uid}
                        padding={4}
                        style={{
                            cursor: 'pointer',
                            border: selected === ct.uid ? '2px solid #4945ff' : '1px solid #e0e0e0',
                            background: selected === ct.uid ? '#f0f0ff' : 'white',
                            borderRadius: 8,
                            flex: '1 1 calc(50% - 12px)',
                            minWidth: 200,
                            boxSizing: 'border-box'
                        }}
                        onClick={() => handleSelect(ct.uid)}
                    >
                        <Flex justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="sigma">{ct.displayName}</Typography>
                                <Typography variant="pi" textColor="neutral500">
                                    {ct.uid}
                                </Typography>
                                <Box paddingTop={2}>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: '2px 7px',
                                        borderRadius: 4,
                                        background: '#9b59b622',
                                        color: '#9b59b6',
                                        border: '1px solid #9b59b644'
                                    }}>
                                        {ct.attributes?.length || 0} fields
                                    </span>
                                </Box>
                            </Box>
                            <span style={{
                                width: 20, height: 20, borderRadius: '50%',
                                border: `2px solid ${selected === ct.uid ? '#4945ff' : '#ccc'}`,
                                background: selected === ct.uid ? '#4945ff' : 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {selected === ct.uid && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                            </span>
                        </Flex>
                    </Box>
                ))}
            </Flex>

            <Flex justifyContent="flex-end" paddingTop={6} gap={2}>
                <button
                    onClick={() => window.history.back()}
                    style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleNext}
                    disabled={!selected}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 4,
                        background: selected ? '#4945ff' : '#ccc',
                        color: 'white',
                        border: 'none',
                        cursor: selected ? 'pointer' : 'not-allowed'
                    }}
                >
                    Next: Choose Action →
                </button>
            </Flex>
        </Box>
    );
};