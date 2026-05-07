import React from 'react';
import FilterBar from '../../components/Common/FilterBar.jsx';

function ResourceFilters({ filters, onFiltersChange }) {
    const hasActive = Object.values(filters).some(Boolean);

    return (
        <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            hasActiveFilters={hasActive}
            onClear={() => onFiltersChange({ search: '' })}
        />
    );
}

export default ResourceFilters;

