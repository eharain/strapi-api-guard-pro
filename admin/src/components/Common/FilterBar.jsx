import React from 'react';
import { Box, Flex, TextInput, SingleSelect, SingleSelectOption, Button } from '@strapi/design-system';

/**
 * Generic filter bar.
 * props:
 *   filters        - { search, ...rest }
 *   onFiltersChange - (newFilters) => void
 *   extraFilters   - array of { key, label, options: [{ value, label }] } for extra SingleSelects
 *   hasActiveFilters - boolean
 *   onClear        - () => void
 */
function FilterBar({ filters, onFiltersChange, extraFilters = [], hasActiveFilters, onClear }) {
    return (
        <Box padding={3} background="neutral100" style={{ border: '1px solid #e8eaf0', borderRadius: 8, marginBottom: 10 }}>
            <Flex gap={2} wrap="wrap" alignItems="flex-end">
                <Box style={{ flex: '1 1 180px' }}>
                    <TextInput
                        label="Search"
                        placeholder="Filter by key..."
                        value={filters.search || ''}
                        onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
                    />
                </Box>
                {extraFilters.map(f => (
                    <Box key={f.key} style={{ flex: '1 1 160px' }}>
                        <SingleSelect
                            label={f.label}
                            value={filters[f.key] || ''}
                            onChange={v => onFiltersChange({ ...filters, [f.key]: v || '' })}
                        >
                            <SingleSelectOption value="">All {f.label.toLowerCase()}s</SingleSelectOption>
                            {f.options.map(opt => (
                                <SingleSelectOption key={opt.value} value={String(opt.value)}>{opt.label}</SingleSelectOption>
                            ))}
                        </SingleSelect>
                    </Box>
                ))}
                {hasActiveFilters && (
                    <Button variant="tertiary" onClick={onClear}>Clear filters</Button>
                )}
            </Flex>
        </Box>
    );
}

export default FilterBar;
