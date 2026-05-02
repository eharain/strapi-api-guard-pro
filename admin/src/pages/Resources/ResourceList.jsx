import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@strapi/design-system';
import RecordCard from '../../components/Common/RecordCard.jsx';
import Pagination from '../../components/Common/Pagination.jsx';
import ResourceFilters from './ResourceFilters.jsx';

const PAGE_SIZE = 20;

function ResourceList({ resources, domains, onEdit, onDelete }) {
    const [filters, setFilters] = useState({ search: '', domain: '', type: '' });
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        return resources.filter(row => {
            if (filters.search && !(row.key || row.displayName || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.domain && String(row.domain?.id) !== filters.domain) return false;
            if (filters.type && row.type !== filters.type) return false;
            return true;
        });
    }, [resources, filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleFiltersChange = (next) => {
        setFilters(next);
        setPage(1);
    };

    return (
        <Box>
            <ResourceFilters filters={filters} onFiltersChange={handleFiltersChange} domains={domains} />

            <Typography variant="delta" paddingBottom={3}>
                {filtered.length} of {resources.length} records
            </Typography>

            {paged.length === 0 ? (
                <Box padding={6} background="neutral100" style={{ borderRadius: 8, textAlign: 'center' }}>
                    <Typography textColor="neutral500">
                        {resources.length === 0
                            ? 'No resources yet. Click "+ New Resource" to create one.'
                            : 'No records match your current filters.'}
                    </Typography>
                </Box>
            ) : (
                paged.map(row => (
                    <RecordCard
                        key={row.id}
                        row={row}
                        onClick={() => onEdit(row)}
                        onDelete={() => onDelete(row.id)}
                    />
                ))
            )}

            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </Box>
    );
}

export default ResourceList;
