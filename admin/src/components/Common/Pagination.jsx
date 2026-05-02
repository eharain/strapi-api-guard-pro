import React from 'react';
import { Flex, Button, Typography } from '@strapi/design-system';

function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    return (
        <Flex justifyContent="center" gap={2} paddingTop={4}>
            <Button variant="tertiary" onClick={() => onPageChange(1)} disabled={page === 1}>First</Button>
            <Button variant="tertiary" onClick={() => onPageChange(page - 1)} disabled={page === 1}>Previous</Button>
            <Typography variant="pi" textColor="neutral600">Page {page} of {totalPages}</Typography>
            <Button variant="tertiary" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Next</Button>
            <Button variant="tertiary" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>Last</Button>
        </Flex>
    );
}

export default Pagination;
