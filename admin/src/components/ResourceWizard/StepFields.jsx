import React from 'react';
import {
    Box,
    Typography,
    Flex,
    TextInput,
    Divider
} from '@strapi/design-system';

export const StepFields = ({ contentType, value, onChange, onNext, onBack }) => {
    const [allowedFields, setAllowedFields] = React.useState(value?.allowedFields || []);
    const [hiddenFields, setHiddenFields] = React.useState(value?.hiddenFields || []);
    const [populateRelations, setPopulateRelations] = React.useState(value?.populateRelations || []);
    const [searchMode, setSearchMode] = React.useState('');

    const attributes = contentType?.attributes || [];

    const toggleAllowedField = (field) => {
        if (allowedFields.includes(field)) {
            setAllowedFields(allowedFields.filter(f => f !== field));
        } else {
            setAllowedFields([...allowedFields, field]);
        }
    };

    const toggleHiddenField = (field) => {
        if (hiddenFields.includes(field)) {
            setHiddenFields(hiddenFields.filter(f => f !== field));
        } else {
            setHiddenFields([...hiddenFields, field]);
        }
    };

    const togglePopulateRelation = (field) => {
        if (populateRelations.includes(field)) {
            setPopulateRelations(populateRelations.filter(f => f !== field));
        } else {
            setPopulateRelations([...populateRelations, field]);
        }
    };

    const handleNext = () => {
        onChange({
            allowedFields,
            hiddenFields,
            populateRelations,
            hasFieldRestrictions: allowedFields.length > 0 || hiddenFields.length > 0
        });
        onNext();
    };

    const filteredAttributes = attributes.filter(attr =>
        attr.toLowerCase().includes(searchMode.toLowerCase())
    );

    return (
        <Box>
            <Typography variant="beta" paddingBottom={2}>
                Configure Field Visibility
            </Typography>
            <Typography variant="omega" textColor="neutral600" paddingBottom={6}>
                Control which fields are visible in API responses
            </Typography>

            <TextInput
                label="Search fields"
                placeholder="Filter fields..."
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                style={{ marginBottom: 16 }}
            />

            <Flex gap={4} wrap="wrap" alignItems="flex-start">
                {/* Visible Fields */}
                <Box style={{ flex: '1 1 220px', minWidth: 200 }}>
                    <Box padding={3} style={{ border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafff8' }}>
                        <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                            <Typography variant="sigma">✅ Visible Fields</Typography>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#34a85322', color: '#137333', border: '1px solid #34a85366' }}>
                                {allowedFields.length} selected
                            </span>
                        </Flex>
                        <Typography variant="pi" textColor="neutral500" paddingBottom={2}>Only these fields will be returned</Typography>
                        <Divider />
                        <Box paddingTop={3} style={{ maxHeight: 260, overflowY: 'auto' }}>
                            {filteredAttributes.map(attr => {
                                const id = `allow-${attr}`;
                                return (
                                    <Flex key={attr} gap={2} paddingBottom={2} alignItems="center">
                                        <input id={id} type="checkbox" checked={allowedFields.includes(attr)} onChange={() => toggleAllowedField(attr)} />
                                        <label htmlFor={id} style={{ cursor: 'pointer', fontSize: 13 }}>{attr}</label>
                                    </Flex>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>

                {/* Hidden Fields */}
                <Box style={{ flex: '1 1 220px', minWidth: 200 }}>
                    <Box padding={3} style={{ border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff8f8' }}>
                        <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                            <Typography variant="sigma">❌ Hidden Fields</Typography>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#ea433522', color: '#c5221f', border: '1px solid #ea433566' }}>
                                {hiddenFields.length} hidden
                            </span>
                        </Flex>
                        <Typography variant="pi" textColor="neutral500" paddingBottom={2}>These fields will be removed from responses</Typography>
                        <Divider />
                        <Box paddingTop={3} style={{ maxHeight: 260, overflowY: 'auto' }}>
                            {filteredAttributes.map(attr => {
                                const id = `hide-${attr}`;
                                const isSensitive = attr.includes('password') || attr.includes('secret') || attr.includes('token');
                                return (
                                    <Flex key={attr} gap={2} paddingBottom={2} alignItems="center">
                                        <input id={id} type="checkbox" checked={hiddenFields.includes(attr)} onChange={() => toggleHiddenField(attr)} />
                                        <label htmlFor={id} style={{ cursor: 'pointer', fontSize: 13 }}>{attr}</label>
                                        {isSensitive && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#ea433522', color: '#c5221f' }}>Sensitive</span>}
                                    </Flex>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            </Flex>

            {/* Relations to Populate */}
            <Box paddingTop={4}>
                <Box padding={3} style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                    <Typography variant="sigma" paddingBottom={2}>🔗 Relations to Populate</Typography>
                    <Typography variant="pi" textColor="neutral500" paddingBottom={2}>Include related data in responses</Typography>
                    <Divider />
                    <Flex paddingTop={3} wrap="wrap" gap={3}>
                        {filteredAttributes.map(attr => {
                            const id = `pop-${attr}`;
                            return (
                                <Flex key={attr} gap={2} alignItems="center" style={{ flex: '0 0 calc(25% - 12px)', minWidth: 120 }}>
                                    <input id={id} type="checkbox" checked={populateRelations.includes(attr)} onChange={() => togglePopulateRelation(attr)} />
                                    <label htmlFor={id} style={{ cursor: 'pointer', fontSize: 13 }}>{attr}</label>
                                </Flex>
                            );
                        })}
                    </Flex>
                </Box>
            </Box>

            <Flex justifyContent="space-between" paddingTop={6}>
                <button
                    onClick={onBack}
                    style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                >
                    ← Back
                </button>
                <button
                    onClick={handleNext}
                    style={{ padding: '8px 16px', borderRadius: 4, background: '#4945ff', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    Create Resource
                </button>
            </Flex>
        </Box>
    );
};