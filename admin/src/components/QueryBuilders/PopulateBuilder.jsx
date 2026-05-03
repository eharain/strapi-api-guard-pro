import React, { useState } from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { tokens } from '../ui.jsx';

const RELATION_TYPES = ['relation', 'component', 'media'];

/**
 * Build a nested Strapi populate object from the tree selection.
 * Internal structure per node: { included: bool, populate: { [key]: node } }
 * Output:
 *   - true  - include with no nested populate
 *   - { populate: { ... } } - include with nested populate
 */
function buildPopulateOutput(node) {
    if (!node || !node.included) return undefined;
    const nested = node.populate || {};
    const nestedKeys = Object.keys(nested).filter(k => nested[k]?.included);
    if (nestedKeys.length === 0) return true;
    const result = {};
    nestedKeys.forEach(k => {
        const child = buildPopulateOutput(nested[k]);
        if (child !== undefined) result[k] = child;
    });
    return Object.keys(result).length > 0 ? { populate: result } : true;
}

/**
 * Parse an existing populate value back into the internal tree shape.
 * value: true | { populate: { ... } }
 */
function parsePopulateNode(value) {
    if (!value) return { included: false, populate: {} };
    if (value === true) return { included: true, populate: {} };
    if (value && typeof value === 'object' && value.populate) {
        const populate = {};
        Object.entries(value.populate).forEach(([k, v]) => {
            populate[k] = parsePopulateNode(v);
        });
        return { included: true, populate };
    }
    return { included: true, populate: {} };
}

/**
 * Parse the top-level populate value into the internal tree.
 * value: { [relationKey]: true | { populate: {...} } }
 */
function parsePopulateValue(value) {
    if (!value || typeof value !== 'object') return {};
    const tree = {};
    Object.entries(value).forEach(([k, v]) => {
        tree[k] = parsePopulateNode(v);
    });
    return tree;
}

const RELATION_TYPE_COLORS = {
    relation: '#4945ff', component: '#945af2', media: '#0c75af',
};

function RelationBadge({ type, relation }) {
    const color = RELATION_TYPE_COLORS[type] || '#888';
    const label = type === 'relation' ? (relation || 'relation') : type;
    return (
        <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: tokens.radius,
            background: `${color}22`, color, border: `1px solid ${color}66`,
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
        }}>
            {label}
        </span>
    );
}

/**
 * Recursive node renderer.
 * Props:
 *   attr         - { name, type, target, component, relation }
 *   node         - { included, populate: { [k]: node } }
 *   allTypes     - Map uid - { uid, displayName, attributes[] }
 *   depth        - nesting depth (for indent)
 *   onChange     - (newNode) => void
 */
function PopulateNode({ attr, node = {}, allTypes, depth = 0, onChange }) {
    const [expanded, setExpanded] = useState(false);
    const included = node.included || false;
    const childPopulate = node.populate || {};

    // Resolve child attributes
    const targetUid = attr.target || attr.component;
    const targetCt = targetUid ? allTypes.get(targetUid) : null;
    const childAttrs = (targetCt?.attributes || []).filter(a => RELATION_TYPES.includes(a.type));

    const hasChildren = childAttrs.length > 0;

    const setIncluded = (val) => {
        onChange({ included: val, populate: childPopulate });
    };

    const setChildNode = (childName, childNode) => {
        onChange({ included: true, populate: { ...childPopulate, [childName]: childNode } });
    };

    const indent = depth * 16;

    return (
        <Box style={{ borderLeft: depth > 0 ? '2px solid #e0e0f0' : 'none', marginLeft: depth > 0 ? 8 : 0 }}>
            <Flex
                alignItems="center"
                gap={2}
                style={{
                    padding: '5px 8px',
                    paddingLeft: 8 + indent,
                    background: included ? `${tokens.primary}08` : 'transparent',
                    borderBottom: '1px solid #f0f0f4',
                    cursor: 'pointer',
                }}
                onClick={() => setIncluded(!included)}
            >
                <input
                    type="checkbox"
                    checked={included}
                    onChange={() => setIncluded(!included)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: tokens.fontBase, fontFamily: tokens.monoFont }}>{attr.name}</span>
                <RelationBadge type={attr.type} relation={attr.relation} />
                {targetUid && (
                    <span style={{ fontSize: 10, color: '#888', fontFamily: tokens.monoFont }}>— {targetUid}</span>
                )}
                {hasChildren && included && (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                        style={{
                            fontSize: tokens.fontSm, padding: '1px 6px', borderRadius: tokens.radius,
                            border: `1px solid ${tokens.primary}`,
                            background: expanded ? tokens.primary : '#fff',
                            color: expanded ? '#fff' : tokens.primary, cursor: 'pointer',
                        }}
                    >
                        {expanded ? '▲ nested' : '▼ nested'}
                    </button>
                )}
            </Flex>

            {hasChildren && included && expanded && (
                <Box style={{ background: tokens.surfaceBg }}>
                    {childAttrs.map(childAttr => (
                        <PopulateNode
                            key={childAttr.name}
                            attr={childAttr}
                            node={childPopulate[childAttr.name] || {}}
                            allTypes={allTypes}
                            depth={depth + 1}
                            onChange={childNode => setChildNode(childAttr.name, childNode)}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}

/**
 * PopulateBuilder
 * Props:
 *   attributes:  Array<{ name, type, target, component, relation, ... }> - root CT attributes
 *   allTypes:    Map<uid, { uid, displayName, attributes[] }>             - all CTs keyed by uid
 *   value:       Object - requestRules.allowedPopulate (Strapi populate shape)
 *   onChange:    (newValue: Object) => void
 */
export function PopulateBuilder({ attributes = [], allTypes = new Map(), value, onChange }) {
    const populateable = attributes.filter(a => RELATION_TYPES.includes(a.type));

    // Parse current value into internal tree
    const [tree, setTree] = useState(() => parsePopulateValue(value));

    // Sync tree - output whenever it changes
    const updateNode = (name, node) => {
        const newTree = { ...tree, [name]: node };
        setTree(newTree);
        // Build output and call onChange
        const output = {};
        Object.entries(newTree).forEach(([k, n]) => {
            const built = buildPopulateOutput(n);
            if (built !== undefined) output[k] = built;
        });
        onChange(Object.keys(output).length > 0 ? output : {});
    };

    if (populateable.length === 0) {
        return (
            <Box padding={3} style={{ background: tokens.surfaceBg, borderRadius: tokens.radius }}>
                <Typography variant="pi" textColor="neutral400">
                    No relations or components found. Select a content type first.
                </Typography>
            </Box>
        );
    }

    const selectedCount = Object.values(tree).filter(n => n?.included).length;

    return (
        <Box>
            {selectedCount > 0 && (
                <Box paddingBottom={2}>
                    <Typography variant="pi" textColor="neutral500">
                        {selectedCount} relation{selectedCount !== 1 ? 's' : ''} included
                    </Typography>
                </Box>
            )}
            <Box style={{ border: '1px solid #e0e0e8', borderRadius: tokens.radius, overflow: 'hidden' }}>
                {populateable.map(attr => (
                    <PopulateNode
                        key={attr.name}
                        attr={attr}
                        node={tree[attr.name] || {}}
                        allTypes={allTypes}
                        depth={0}
                        onChange={node => updateNode(attr.name, node)}
                    />
                ))}
            </Box>
        </Box>
    );
}
