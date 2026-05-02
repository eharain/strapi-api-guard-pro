import React from 'react';

const METHOD_COLORS = {
    GET: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    POST: { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    PUT: { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
    PATCH: { bg: '#fce4ec', color: '#880e4f', border: '#f48fb1' },
    DELETE: { bg: '#ffebee', color: '#b71c1c', border: '#ef9a9a' },
};

function MethodBadge({ method }) {
    const m = String(method || 'GET').toUpperCase();
    const c = METHOD_COLORS[m] || { bg: '#f5f5f5', color: '#555', border: '#ddd' };
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            minWidth: 46, display: 'inline-block', textAlign: 'center', letterSpacing: 0.5
        }}>
            {m}
        </span>
    );
}

export default MethodBadge;
