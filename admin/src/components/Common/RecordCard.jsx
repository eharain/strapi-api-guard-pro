import React from 'react';
import { Box, Flex, Typography, Button } from '@strapi/design-system';

const labelFor = (rec) => {
    if (!rec) return '';
    return rec.key || rec.name || rec.displayName || rec.username || rec.email || `#${rec.id}`;
};

function Badge({ text, bg, color, border }) {
    return (
        <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
            background: bg, color, border: `1px solid ${border}`
        }}>
            {text}
        </span>
    );
}

function RecordCard({ row, onClick, onDelete }) {
    return (
        <Box
            padding={3}
            background="neutral0"
            style={{ border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}
            onClick={onClick}
        >
            <Flex justifyContent="space-between" alignItems="center" gap={2}>
                <Flex gap={2} alignItems="center" wrap="wrap">
                    <Typography variant="sigma" style={{ wordBreak: 'break-all' }}>
                        {labelFor(row)}
                    </Typography>
                    {row.effect && (
                        <Badge
                            text={row.effect}
                            bg={row.effect === 'allow' ? '#2ecc7122' : '#e74c3c22'}
                            color={row.effect === 'allow' ? '#2ecc71' : '#e74c3c'}
                            border={row.effect === 'allow' ? '#2ecc7144' : '#e74c3c44'}
                        />
                    )}
                    {row.level && (
                        <Badge text={row.level} bg="#3498db22" color="#3498db" border="#3498db44" />
                    )}
                    {row.type && (
                        <Badge text={row.type} bg="#9b59b622" color="#9b59b6" border="#9b59b644" />
                    )}
                    {row.method && (
                        <Badge text={row.method} bg="#f39c1222" color="#f39c12" border="#f39c1244" />
                    )}
                    {row.domain && !row.level && (
                        <Typography variant="pi" textColor="neutral500">({labelFor(row.domain)})</Typography>
                    )}
                    {row.resource && (
                        <Typography variant="pi" textColor="neutral500">→ {labelFor(row.resource)}</Typography>
                    )}
                </Flex>
                <Button
                    variant="danger-light"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                    Delete
                </Button>
            </Flex>
        </Box>
    );
}

export default RecordCard;
