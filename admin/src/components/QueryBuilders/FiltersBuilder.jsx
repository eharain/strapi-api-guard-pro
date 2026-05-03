import React, { useState, useCallback } from "react";
import { Box, Flex } from "@strapi/design-system";
import { tokens, smallInputStyle, ghostButtonStyle, removeButtonStyle } from "../ui.jsx";

const OPERATORS = [
    { value: "$eq",          label: "= equals" },
    { value: "$ne",          label: "!= not equals" },
    { value: "$lt",          label: "< less than" },
    { value: "$lte",         label: "<= less or equal" },
    { value: "$gt",          label: "> greater than" },
    { value: "$gte",         label: ">= greater or equal" },
    { value: "$contains",    label: "~ contains" },
    { value: "$notContains", label: "!~ not contains" },
    { value: "$startsWith",  label: "^ starts with" },
    { value: "$endsWith",    label: "$ ends with" },
    { value: "$in",          label: "in list" },
    { value: "$notIn",       label: "not in list" },
    { value: "$null",        label: "is null" },
    { value: "$notNull",     label: "not null" },
    { value: "$between",     label: "between" },
];

const NO_VALUE_OPS = new Set(["$null", "$notNull"]);
const RELATION_TYPES = new Set(["relation", "component", "media", "dynamiczone"]);
const MAX_DEPTH = 4;

let _uid = 1;
const uid = () => String(_uid++);
const makeGroup = (logic) => ({ id: uid(), type: "group", logic: logic || "$and", children: [] });
const makeCondition = () => ({ id: uid(), type: "condition", path: "", operator: "$eq", value: "" });

function buildFilterObject(node) {
    if (!node) return null;
    if (node.type === "condition") {
        if (!node.path) return null;
        const opVal = NO_VALUE_OPS.has(node.operator) ? true : (node.value || "");
        const leaf = { [node.operator]: opVal };
        return node.path.split(".").reduceRight((acc, part) => ({ [part]: acc }), leaf);
    }
    const children = (node.children || []).map(buildFilterObject).filter(Boolean);
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    return { [node.logic]: children };
}

function prependPath(node, prefix) {
    if (node.type === "condition") {
        return { ...node, path: node.path ? prefix + "." + node.path : prefix };
    }
    return { ...node, children: (node.children || []).map((c) => prependPath(c, prefix)) };
}

function parseFilterObject(obj, depth) {
    if (!obj || typeof obj !== "object") return makeGroup("$and");
    const keys = Object.keys(obj);
    if (keys.length === 1 && (keys[0] === "$and" || keys[0] === "$or")) {
        const logic = keys[0];
        const children = (obj[logic] || []).map((c) => parseFilterObject(c, (depth || 0) + 1));
        return { id: uid(), type: "group", logic, children };
    }
    if (keys.length > 1) {
        const children = keys.map((k) => parseFilterObject({ [k]: obj[k] }, (depth || 0) + 1));
        return { id: uid(), type: "group", logic: "$and", children };
    }
    if (keys.length === 1 && !keys[0].startsWith("$")) {
        const fieldKey = keys[0];
        const val = obj[fieldKey];
        if (val && typeof val === "object" && !Array.isArray(val)) {
            const subKeys = Object.keys(val);
            const isLeaf = subKeys.length === 1 && subKeys[0].startsWith("$") && subKeys[0] !== "$and" && subKeys[0] !== "$or";
            if (isLeaf) {
                const op = subKeys[0];
                const rawVal = val[op];
                return { id: uid(), type: "condition", path: fieldKey, operator: op, value: NO_VALUE_OPS.has(op) ? "" : String(rawVal || "") };
            }
            return prependPath(parseFilterObject(val, depth), fieldKey);
        }
    }
    return makeGroup("$and");
}

function FieldPathSelector({ attributes, allTypes, value, onChange }) {
    const [segments, setSegments] = useState([]);
    const resolveAttrs = (segs) => {
        let attrs = attributes || [];
        for (const seg of segs) {
            const attr = attrs.find((a) => a.name === seg);
            if (!attr) return [];
            const targetUid = attr.target || attr.component;
            if (targetUid && allTypes) {
                attrs = (allTypes.get(targetUid) || {}).attributes || [];
            } else {
                return [];
            }
        }
        return attrs;
    };
    const currentAttrs = resolveAttrs(segments);
    const handleSelect = (attrName, attr) => {
        if (attr && RELATION_TYPES.has(attr.type)) {
            setSegments([...segments, attrName]);
        } else {
            const path = segments.length > 0 ? segments.join(".") + "." + attrName : attrName;
            onChange(path);
            setSegments([]);
        }
    };
    return (
        <div style={{ position: "relative", minWidth: 150 }}>
            <input type="text" value={value || ""}
                onChange={(e) => { onChange(e.target.value); setSegments([]); }}
                placeholder={segments.length > 0 ? segments.join(".") + ".[field]" : "field.path"}
                style={{ ...smallInputStyle, width: "100%", fontFamily: tokens.monoFont }} />
            {currentAttrs.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 999, background: "#fff", border: "1px solid #e0e0e8", borderRadius: tokens.radius, minWidth: 200, maxHeight: 200, overflowY: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                    {segments.length > 0 && (
                        <button type="button" onClick={() => setSegments(segments.slice(0, -1))}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 10px", fontSize: tokens.fontSm, background: tokens.surfaceBg, border: "none", cursor: "pointer", color: tokens.primary }}>
                            ← back
                        </button>
                    )}
                    {currentAttrs.map((attr) => (
                        <button key={attr.name} type="button" onClick={() => handleSelect(attr.name, attr)}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 10px", fontSize: tokens.fontBase, background: "none", border: "none", cursor: "pointer", fontFamily: tokens.monoFont, color: RELATION_TYPES.has(attr.type) ? tokens.primary : "#32324d" }}>
                            {attr.name}
                            <span style={{ marginLeft: 6, fontSize: 10, color: "#aaa" }}>{attr.type}{RELATION_TYPES.has(attr.type) ? " →" : ""}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function FilterCondition({ node, attributes, allTypes, onUpdate, onDelete }) {
    const noValue = NO_VALUE_OPS.has(node.operator);
    return (
        <Flex gap={2} alignItems="center" wrap="wrap" style={{ padding: "4px 0" }}>
            <div style={{ flex: "2 1 150px", minWidth: 130 }}>
                <FieldPathSelector attributes={attributes} allTypes={allTypes} value={node.path} onChange={(path) => onUpdate({ ...node, path })} />
            </div>
            <select value={node.operator} onChange={(e) => onUpdate({ ...node, operator: e.target.value })}
                style={{ ...smallInputStyle, flex: "1 1 120px", minWidth: 110 }}>
                {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            {!noValue && (
                <input type="text" value={node.value || ""} placeholder="value or $auth.id"
                    onChange={(e) => onUpdate({ ...node, value: e.target.value })}
                    style={{ ...smallInputStyle, flex: "2 1 130px", minWidth: 110, fontFamily: tokens.monoFont }} />
            )}
            <button type="button" onClick={onDelete} style={{ ...removeButtonStyle, flexShrink: 0 }}>x</button>
        </Flex>
    );
}

function FilterGroup({ node, attributes, allTypes, depth, isRoot, onUpdate, onDelete }) {
    const canNest = depth < MAX_DEPTH;
    const logicColor = node.logic === "$and" ? "#0a8" : "#e96900";
    const updateChild = (idx, updated) => onUpdate({ ...node, children: node.children.map((c, i) => i === idx ? updated : c) });
    const deleteChild = (idx) => onUpdate({ ...node, children: node.children.filter((_, i) => i !== idx) });
    return (
        <div style={{ borderLeft: isRoot ? "none" : `3px solid ${logicColor}33`, paddingLeft: isRoot ? 0 : 10, marginTop: isRoot ? 0 : 8 }}>
            <Flex alignItems="center" gap={2} style={{ marginBottom: 6 }}>
                <button type="button"
                    onClick={() => onUpdate({ ...node, logic: node.logic === "$and" ? "$or" : "$and" })}
                    style={{ padding: "2px 10px", border: `1px solid ${logicColor}`, borderRadius: 12, fontSize: tokens.fontSm, fontWeight: 700, background: `${logicColor}18`, color: logicColor, cursor: "pointer" }}>
                    {node.logic === "$and" ? "AND" : "OR"}
                </button>
                {!isRoot && (
                    <button type="button" onClick={onDelete}
                        style={{ ...removeButtonStyle, fontSize: tokens.fontSm }}>
                        remove group
                    </button>
                )}
            </Flex>
            {(node.children || []).map((child, idx) =>
                child.type === "condition"
                    ? <FilterCondition key={child.id} node={child} attributes={attributes} allTypes={allTypes} onUpdate={(u) => updateChild(idx, u)} onDelete={() => deleteChild(idx)} />
                    : <FilterGroup key={child.id} node={child} attributes={attributes} allTypes={allTypes} depth={depth + 1} isRoot={false} onUpdate={(u) => updateChild(idx, u)} onDelete={() => deleteChild(idx)} />
            )}
            <Flex gap={2} style={{ marginTop: 8 }}>
                <button type="button"
                    onClick={() => onUpdate({ ...node, children: [...(node.children || []), makeCondition()] })}
                    style={ghostButtonStyle}>
                    + Condition
                </button>
                {canNest && (
                    <button type="button"
                        onClick={() => onUpdate({ ...node, children: [...(node.children || []), makeGroup(node.logic === "$and" ? "$or" : "$and")] })}
                        style={{ fontSize: tokens.fontSm, padding: "4px 10px", borderRadius: tokens.radius, border: "1px solid #888", background: "#88888811", color: "#555", cursor: "pointer" }}>
                        + Group
                    </button>
                )}
            </Flex>
        </div>
    );
}

export function FiltersBuilder({ attributes, allTypes, value, onChange }) {
    const [tree, setTree] = useState(() => {
        if (value && typeof value === "object" && Object.keys(value).length > 0) {
            return parseFilterObject(value);
        }
        return makeGroup("$and");
    });
    const handleUpdate = useCallback((updated) => {
        setTree(updated);
        const output = buildFilterObject(updated);
        onChange(output && typeof output === "object" && Object.keys(output).length > 0 ? output : undefined);
    }, [onChange]);
    return (
        <Box>
            <FilterGroup node={tree} attributes={attributes} allTypes={allTypes} depth={0} isRoot={true} onUpdate={handleUpdate} onDelete={() => {}} />
        </Box>
    );
}

export default FiltersBuilder;