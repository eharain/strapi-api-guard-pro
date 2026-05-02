import React from 'react';
import {
    Box,
    Typography,
    Flex,
    Button,
    TextInput,
    SingleSelect,
    SingleSelectOption,
    Divider
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';

const OPERATORS = [
    { value: '$eq', label: 'Equals (=)' },
    { value: '$ne', label: 'Not Equals (≠)' },
    { value: '$gt', label: 'Greater Than (>)' },
    { value: '$gte', label: 'Greater/Equal (≥)' },
    { value: '$lt', label: 'Less Than (<)' },
    { value: '$lte', label: 'Less/Equal (≤)' },
    { value: '$in', label: 'In Array' },
    { value: '$nin', label: 'Not In Array' },
    { value: '$contains', label: 'Contains' },
    { value: '$startsWith', label: 'Starts With' }
];

const DYNAMIC_VALUES = [
    { value: '$user.id', label: 'Current User ID' },
    { value: '$user.email', label: 'Current User Email' },
    { value: '$today', label: 'Today\'s Date' },
    { value: '$now', label: 'Current Timestamp' },
    { value: '$activeDomain', label: 'Active Domain Key' }
];

export const StepFilters = ({ contentType, action, value, onChange, onNext, onBack }) => {
    const [filters, setFilters] = React.useState(value?.filters || []);
    const [staticFilters, setStaticFilters] = React.useState(value?.staticFilters || []);
    const [isDynamic, setIsDynamic] = React.useState(false);

    const addFilter = () => {
        setFilters([...filters, { field: '', operator: '$eq', value: '' }]);
    };

    const updateFilter = (index, key, val) => {
        const updated = [...filters];
        updated[index][key] = val;
        setFilters(updated);
    };

    const removeFilter = (index) => {
        setFilters(filters.filter((_, i) => i !== index));
    };

    const addStaticFilter = () => {
        setStaticFilters([...staticFilters, { field: '', value: '' }]);
    };

    const updateStaticFilter = (index, key, val) => {
        const updated = [...staticFilters];
        updated[index][key] = val;
        setStaticFilters(updated);
    };

    const removeStaticFilter = (index) => {
        setStaticFilters(staticFilters.filter((_, i) => i !== index));
    };

    const handleNext = () => {
        onChange({
            filters,
            staticFilters,
            hasFilters: filters.length > 0 || staticFilters.length > 0
        });
        onNext();
    };

    const availableFields = contentType?.attributes || [];

    return (
        <Box>
            <Typography variant="beta" paddingBottom={2}>
                Configure Record Filters
            </Typography>
            <Typography variant="omega" textColor="neutral600" paddingBottom={6}>
                Control which records users can access
            </Typography>

            {/* Dynamic Filters (User-Specific) */}
            <Box paddingBottom={6}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">Dynamic Filters (User-Specific)</Typography>
                    <Button size="S" onClick={addFilter} startIcon={<Plus />}>
                        Add Filter
                    </Button>
                </Flex>
                <Typography variant="pi" textColor="neutral500" paddingBottom={4}>
                    These filters automatically use the current user's context (ID, roles, etc.)
                </Typography>

                {filters.map((filter, idx) => (
                    <Box key={idx} padding={3} style={{ border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 12, background: '#fafafa' }}>
                        <Flex gap={3} wrap="wrap" alignItems="flex-end">
                            <Box style={{ flex: 2, minWidth: 120 }}>
                                <Typography variant="pi" paddingBottom={1}>Field</Typography>
                                <SingleSelect
                                    value={filter.field}
                                    onChange={(v) => updateFilter(idx, 'field', v)}
                                    placeholder="Select field"
                                >
                                    {availableFields.map(field => (
                                        <SingleSelectOption key={field} value={field}>{field}</SingleSelectOption>
                                    ))}
                                </SingleSelect>
                            </Box>
                            <Box style={{ flex: 1, minWidth: 100 }}>
                                <Typography variant="pi" paddingBottom={1}>Operator</Typography>
                                <SingleSelect
                                    value={filter.operator}
                                    onChange={(v) => updateFilter(idx, 'operator', v)}
                                >
                                    {OPERATORS.map(op => (
                                        <SingleSelectOption key={op.value} value={op.value}>{op.label}</SingleSelectOption>
                                    ))}
                                </SingleSelect>
                            </Box>
                            <Box style={{ flex: 2, minWidth: 120 }}>
                                <Typography variant="pi" paddingBottom={1}>Value (Dynamic)</Typography>
                                <SingleSelect
                                    value={filter.value}
                                    onChange={(v) => updateFilter(idx, 'value', v)}
                                >
                                    {DYNAMIC_VALUES.map(dv => (
                                        <SingleSelectOption key={dv.value} value={dv.value}>{dv.label}</SingleSelectOption>
                                    ))}
                                </SingleSelect>
                            </Box>
                            <Box>
                                <button
                                    onClick={() => removeFilter(idx)}
                                    style={{ padding: '8px 10px', borderRadius: 4, background: '#fde8e8', color: '#c5221f', border: '1px solid #f5c6c6', cursor: 'pointer' }}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </Box>
                        </Flex>
                        <Box paddingTop={2}>
                            <Typography variant="pi" textColor="neutral500" style={{ fontSize: 12 }}>
                                Example: {filter.field} {filter.operator} {filter.value}
                            </Typography>
                        </Box>
                    </Box>
                ))}

                {filters.length === 0 && (
                    <Box padding={6} style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }}>
                        <Typography textColor="neutral500">No dynamic filters. Click "Add Filter" to restrict by user.</Typography>
                    </Box>
                )}
            </Box>

            <Divider />

            {/* Static Filters (Fixed Values) */}
            <Box paddingTop={6} paddingBottom={6}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
                    <Typography variant="delta">Static Filters (Fixed Values)</Typography>
                    <Button size="S" onClick={addStaticFilter} startIcon={<Plus />}>
                        Add Static Filter
                    </Button>
                </Flex>
                <Typography variant="pi" textColor="neutral500" paddingBottom={4}>
                    These filters are locked and cannot be changed by the client
                </Typography>

                {staticFilters.map((filter, idx) => (
                    <Box key={idx} padding={3} style={{ border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 12, background: '#fafafa' }}>
                        <Flex gap={3} wrap="wrap" alignItems="flex-end">
                            <Box style={{ flex: 2, minWidth: 120 }}>
                                <Typography variant="pi" paddingBottom={1}>Field</Typography>
                                <SingleSelect
                                    value={filter.field}
                                    onChange={(v) => updateStaticFilter(idx, 'field', v)}
                                >
                                    {availableFields.map(field => (
                                        <SingleSelectOption key={field} value={field}>{field}</SingleSelectOption>
                                    ))}
                                </SingleSelect>
                            </Box>
                            <Box style={{ flex: 2, minWidth: 120 }}>
                                <Typography variant="pi" paddingBottom={1}>Fixed Value</Typography>
                                <TextInput
                                    value={filter.value}
                                    onChange={(e) => updateStaticFilter(idx, 'value', e.target.value)}
                                    placeholder="e.g., published, true, 1"
                                />
                            </Box>
                            <Box>
                                <button
                                    onClick={() => removeStaticFilter(idx)}
                                    style={{ padding: '8px 10px', borderRadius: 4, background: '#fde8e8', color: '#c5221f', border: '1px solid #f5c6c6', cursor: 'pointer' }}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </Box>
                        </Flex>
                    </Box>
                ))}
            </Box>

            <Flex justifyContent="space-between" paddingTop={4}>
                <button
                    className="btn-secondary"
                    onClick={onBack}
                    style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                >
                    ← Back
                </button>
                <button
                    className="btn-primary"
                    onClick={handleNext}
                    style={{ padding: '8px 16px', borderRadius: 4, background: '#4945ff', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    Next: Configure Fields →
                </button>
            </Flex>
        </Box>
    );
};