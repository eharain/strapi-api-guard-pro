import React from 'react';
import FilterBar from '../../components/Common/FilterBar.jsx';

const RESOURCE_TYPES = ['standard', 'extended', 'alias'];

function ResourceFilters({ filters, onFiltersChange, domains }) {
    const extraFilters = [
        {
            key: 'domain',
            label: 'Domain',
            options: domains.map(d => ({ value: String(d.id), label: d.key || d.name || d.displayName || `#${d.id}` }))
        },
        {
            key: 'type',
            label: 'Type',
            options: RESOURCE_TYPES.map(t => ({ value: t, label: t }))
        }
    ];

    const hasActive = Object.values(filters).some(Boolean);

    return (
        <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            extraFilters={extraFilters}
            hasActiveFilters={hasActive}
            onClear={() => onFiltersChange({ search: '', domain: '', type: '' })}
        />
    );
}

export default ResourceFilters;
