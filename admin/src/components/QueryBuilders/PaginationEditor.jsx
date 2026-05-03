import React from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { tokens, SmallInput } from '../ui.jsx';

/**
 * PaginationEditor
 * Props:
 *   value:    Object - requestRules.defaultPagination  e.g. { page: 1, pageSize: 25, withCount: true }
 *   onChange: (Object) => void
 */
export function PaginationEditor({ value = {}, onChange }) {
    const page = value.page ?? '';
    const pageSize = value.pageSize ?? '';
    const withCount = value.withCount !== false;
    const start = value.start ?? '';
    const limit = value.limit ?? '';
    const [mode, setMode] = React.useState(
        (value.start !== undefined || value.limit !== undefined) ? 'offset' : 'page'
    );

    const set = (patch) => onChange({ ...value, ...patch });

    return (
        <Box>
            {/* Mode toggle: page-based vs offset-based */}
            <Flex gap={0} paddingBottom={3} style={{ display: 'inline-flex' }}>
                <button
                    type="button"
                    onClick={() => setMode('page')}
                    style={{
                        fontSize: tokens.fontBase, padding: '4px 12px',
                        border: `1px solid ${tokens.border}`,
                        borderRadius: `${tokens.radius}px 0 0 ${tokens.radius}px`, cursor: 'pointer',
                        background: mode === 'page' ? tokens.primary : '#fff',
                        color: mode === 'page' ? '#fff' : '#555',
                    }}
                >
                    Page-based
                </button>
                <button
                    type="button"
                    onClick={() => setMode('offset')}
                    style={{
                        fontSize: tokens.fontBase, padding: '4px 12px',
                        border: `1px solid ${tokens.border}`, borderLeft: 'none',
                        borderRadius: `0 ${tokens.radius}px ${tokens.radius}px 0`, cursor: 'pointer',
                        background: mode === 'offset' ? tokens.primary : '#fff',
                        color: mode === 'offset' ? '#fff' : '#555',
                    }}
                >
                    Offset-based
                </button>
            </Flex>

            <Flex gap={4} wrap="wrap" alignItems="flex-end">
                {mode === 'page' ? (
                    <>
                        <Box>
                            <label htmlFor="pg-page" style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 3, color: '#666', fontWeight: 600 }}>
                                Default Page
                            </label>
                            <SmallInput id="pg-page" type="number" min="1" placeholder="1" value={page}
                                onChange={e => set({ page: e.target.value === '' ? undefined : Number(e.target.value), start: undefined, limit: undefined })} />
                        </Box>
                        <Box>
                            <label htmlFor="pg-pagesize" style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 3, color: '#666', fontWeight: 600 }}>
                                Page Size
                            </label>
                            <SmallInput id="pg-pagesize" type="number" min="1" max="200" placeholder="25" value={pageSize}
                                onChange={e => set({ pageSize: e.target.value === '' ? undefined : Number(e.target.value), start: undefined, limit: undefined })} />
                        </Box>
                    </>
                ) : (
                    <>
                        <Box>
                            <label htmlFor="pg-start" style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 3, color: '#666', fontWeight: 600 }}>
                                Start (offset)
                            </label>
                            <SmallInput id="pg-start" type="number" min="0" placeholder="0" value={start}
                                onChange={e => set({ start: e.target.value === '' ? undefined : Number(e.target.value), page: undefined, pageSize: undefined })} />
                        </Box>
                        <Box>
                            <label htmlFor="pg-limit" style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 3, color: '#666', fontWeight: 600 }}>
                                Limit
                            </label>
                            <SmallInput id="pg-limit" type="number" min="1" max="200" placeholder="25" value={limit}
                                onChange={e => set({ limit: e.target.value === '' ? undefined : Number(e.target.value), page: undefined, pageSize: undefined })} />
                        </Box>
                    </>
                )}

                <Box>
                    <label style={{ fontSize: tokens.fontSm, display: 'block', marginBottom: 3, color: '#666', fontWeight: 600 }}>
                        With Count
                    </label>
                    <Flex alignItems="center" gap={2} style={{ height: 32 }}>
                        <input id="pg-withcount" type="checkbox" checked={withCount}
                            onChange={e => set({ withCount: e.target.checked })}
                            style={{ cursor: 'pointer' }} />
                        <label htmlFor="pg-withcount" style={{ fontSize: tokens.fontBase, cursor: 'pointer', color: '#555' }}>
                            Include total count
                        </label>
                    </Flex>
                </Box>
            </Flex>

            {Object.keys(value).filter(k => value[k] !== undefined).length > 0 && (
                <Box paddingTop={2}>
                    <Typography variant="pi" textColor="neutral400" style={{ fontSize: tokens.fontSm }}>
                        <code>{JSON.stringify(value)}</code>
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
