/**
 * AccessControl — Hierarchical tree view
 *
 * Layout:
 *   Domain
 *   └─ Role
 *      └─ Grant → Policy → Resource
 *
 * Every row has inline add / edit forms that expand below the row.
 * No side-panels. All CRUD goes through /api-guard-pro/entities/:entity.
 */
import React, { useState, useCallback } from 'react';
import { Box, Flex, Typography, Button } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
    tokens,
    FormInput, FormTextarea, FormSelect, FormSwitch,
} from '../../components/ui.jsx';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
    border: '#e0e0e0',
    borderLeft: '#c5c5d9',
    bg0: '#ffffff',
    bg1: '#f8f8fc',
    bg2: '#f0f0f8',
    bg3: '#e8e8f4',
    badge: { allow: '#d4edda', deny: '#f8d7da', text_allow: '#155724', text_deny: '#721c24' },
    primary: tokens.primary,
    danger: tokens.danger,
    radius: 6,
};

const treeLineStyle = {
    borderLeft: `2px solid ${C.borderLeft}`,
    marginLeft: 18,
    paddingLeft: 16,
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const label = (r) => r?.key || r?.name || r?.displayName || `#${r?.id}`;

function Badge({ text, bg, color }) {
    return (
        <span style={{
            background: bg, color, fontSize: 10, fontWeight: 700,
            borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
        }}>{text}</span>
    );
}

function EffectBadge({ effect }) {
    const allow = effect !== 'deny';
    return <Badge text={allow ? 'allow' : 'deny'}
        bg={allow ? C.badge.allow : C.badge.deny}
        color={allow ? C.badge.text_allow : C.badge.text_deny} />;
}

function ActiveDot({ active }) {
    return (
        <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: active !== false ? '#27ae60' : '#bbb',
            display: 'inline-block', flexShrink: 0,
        }} title={active !== false ? 'Active' : 'Inactive'} />
    );
}

function Chevron({ open }) {
    return (
        <span style={{
            display: 'inline-block', width: 14, height: 14,
            lineHeight: '14px', textAlign: 'center',
            fontSize: 10, color: '#888', flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .15s',
        }}>▶</span>
    );
}

// ─── Inline action row ────────────────────────────────────────────────────────
function RowActions({ onEdit, onDelete, onAdd, addLabel, deleting }) {
    return (
        <Flex gap={1} style={{ flexShrink: 0 }}>
            {onAdd && (
                <button onClick={onAdd} style={btnStyle(C.primary, '#fff')}>{addLabel || '+ Add'}</button>
            )}
            <button onClick={onEdit} style={btnStyle('#f0f0f8', '#32324d')}>Edit</button>
            <button onClick={onDelete} disabled={deleting}
                style={btnStyle(C.danger, '#fff')}>{deleting ? '…' : 'Delete'}</button>
        </Flex>
    );
}

const btnStyle = (bg, color) => ({
    background: bg, color, border: 'none', borderRadius: 4,
    padding: '3px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
    opacity: 1,
});

// ─── Inline form container ────────────────────────────────────────────────────
function InlineForm({ children, onSave, onCancel, saving, saveLabel = 'Save' }) {
    return (
        <Box background="neutral0"
            style={{ border: `1px solid ${C.primary}`, borderRadius: C.radius, padding: 12, marginTop: 6, marginBottom: 6 }}>
            {children}
            <Flex gap={2} justifyContent="flex-end" paddingTop={3}>
                <button onClick={onCancel} style={btnStyle('#f0f0f8', '#32324d')}>Cancel</button>
                <button onClick={onSave} disabled={saving}
                    style={btnStyle(C.primary, '#fff')}>{saving ? 'Saving…' : saveLabel}</button>
            </Flex>
        </Box>
    );
}

// ─── DOMAIN form ─────────────────────────────────────────────────────────────
const MATCH_MODES = ['header', 'query', 'both'];

function DomainInlineForm({ init = {}, onSave, onCancel, saving }) {
    const [d, setD] = useState({
        key: '', name: '', description: '', isActive: true,
        matchMode: 'header', matchKey: 'x-app-name',
        strapiRoleType: 'authenticated', blockDirectAccess: false,
        ...init,
    });
    const s = (patch) => setD(p => ({ ...p, ...patch }));
    return (
        <InlineForm onSave={() => onSave(d)} onCancel={onCancel} saving={saving}
            saveLabel={init.id ? 'Update Domain' : 'Create Domain'}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                    <FormInput label="Key" id="d_key" name="key" value={d.key} onChange={e => s({ key: e.target.value })} hint="Unique slug, e.g. my-app" required />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <FormInput label="Name" id="d_name" name="name" value={d.name} onChange={e => s({ name: e.target.value, displayName: e.target.value })} required />
                </div>
                <div style={{ flex: '2 1 220px' }}>
                    <FormTextarea label="Description" id="d_desc" value={d.description || ''} onChange={e => s({ description: e.target.value })} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 120px' }}>
                    <FormSelect label="Match Mode" id="d_matchMode" value={d.matchMode || 'header'} onChange={v => s({ matchMode: v })}
                        options={MATCH_MODES.map(m => ({ value: m, label: m }))} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <FormInput label="Match Key" id="d_matchKey" name="matchKey" value={d.matchKey || ''} onChange={e => s({ matchKey: e.target.value })} hint="Header or query param name" />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <FormSelect label="Strapi Role Type" id="d_roleType" value={d.strapiRoleType || 'authenticated'} onChange={v => s({ strapiRoleType: v })}
                        options={[{ value: 'authenticated', label: 'authenticated' }, { value: 'public', label: 'public' }]} />
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                    <FormSwitch label="Active" name="d_isActive" checked={d.isActive !== false} onChange={v => s({ isActive: v })} />
                    <FormSwitch label="Block Direct Access" name="d_blockDirectAccess" checked={d.blockDirectAccess === true} onChange={v => s({ blockDirectAccess: v })} />
                </div>
            </div>
        </InlineForm>
    );
}

// ─── ROLE form ────────────────────────────────────────────────────────────────
const LEVELS = ['staff', 'manager', 'admin', 'super-admin'];

function RoleInlineForm({ init = {}, domainId, domains = [], onSave, onCancel, saving }) {
    const resolvedDomains = Array.isArray(init.domains) && init.domains.length > 0
        ? init.domains.map(d => String(d?.id ?? d))
        : init.domain?.id
            ? [String(init.domain.id)]
            : init.domain
                ? [String(init.domain)]
                : domainId
                    ? [String(domainId)]
                    : [];

    const [r, setR] = useState({
        key: '', name: '', description: '', isActive: true, level: 'staff',
        ...init,
        domains: resolvedDomains,
    });
    const s = (patch) => setR(p => ({ ...p, ...patch }));
    const toggleDomain = (id) => {
        const strId = String(id);
        const current = Array.isArray(r.domains) ? r.domains.map(String) : [];
        const next = current.includes(strId)
            ? current.filter(d => d !== strId)
            : [...current, strId];
        s({ domains: next });
    };
    return (
        <InlineForm onSave={() => onSave(r)} onCancel={onCancel} saving={saving}
            saveLabel={init.id ? 'Update Role' : 'Create Role'}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 140px' }}>
                    <FormInput label="Key" id="r_key" name="key" value={r.key} onChange={e => s({ key: e.target.value })} hint="Unique slug, e.g. admin" required />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                    <FormInput label="Name" id="r_name" name="name" value={r.name} onChange={e => s({ name: e.target.value, displayName: e.target.value })} required />
                </div>
                <div style={{ flex: '1 1 110px' }}>
                    <FormSelect label="Level" id="r_level" value={r.level || 'staff'} onChange={v => s({ level: v })}
                        options={LEVELS.map(l => ({ value: l, label: l }))} />
                </div>
                <div style={{ flex: '2 1 180px' }}>
                    <FormTextarea label="Description" id="r_desc" value={r.description || ''} onChange={e => s({ description: e.target.value })} />
                </div>
                <div style={{ flex: '0 0 auto', paddingTop: 4 }}>
                    <FormSwitch label="Active" name="r_isActive" checked={r.isActive !== false} onChange={v => s({ isActive: v })} />
                </div>
            </div>
            <div style={{ marginTop: 10 }}>
                <Typography variant="pi" fontWeight="semiBold" style={{ display: 'block', marginBottom: 6 }}>Domains</Typography>
                {domains.length === 0 ? (
                    <Typography variant="pi" textColor="neutral400">No domains yet.</Typography>
                ) : domains.map(d => {
                    const inputId = `ac-role-domain-${init.id || 'new'}-${d.id}`;
                    return (
                        <Flex key={d.id} gap={2} alignItems="center" paddingBottom={1}>
                            <input
                                id={inputId}
                                type="checkbox"
                                checked={(r.domains || []).map(String).includes(String(d.id))}
                                onChange={() => toggleDomain(d.id)}
                            />
                            <label htmlFor={inputId}>
                                <Typography variant="pi">{d.key || d.name || `#${d.id}`}</Typography>
                            </label>
                        </Flex>
                    );
                })}
            </div>
        </InlineForm>
    );
}

// ─── GRANT form ───────────────────────────────────────────────────────────────
function GrantInlineForm({ init = {}, roleId, policies, onSave, onCancel, saving }) {
    const [g, setG] = useState(() => {
        const policyId = init.policy?.id ? String(init.policy.id) : (init.policy ? String(init.policy) : null);
        const roleIdStr = init.role?.id ? String(init.role.id) : (roleId ? String(roleId) : null);
        return {
            key: '', isActive: true,
            ...init,
            role: roleIdStr,
            policy: policyId,
        };
    });
    const s = (patch) => setG(p => ({ ...p, ...patch }));

    const derivedKey = () => {
        if (g.key) return g.key;
        const policyLabel = policies.find(p => String(p.id) === String(g.policy))?.key || 'policy';
        return `grant.${policyLabel}`;
    };

    const policyOptions = [
        { value: '', label: '— select policy —' },
        ...policies.map(p => ({
            value: String(p.id),
            label: `${p.key || p.name} ${p.effect === 'deny' ? '⛔' : '✅'} [${(p.actions || []).join(', ')}]`,
        })),
    ];

    return (
        <InlineForm onSave={() => onSave({ ...g, key: derivedKey() })} onCancel={onCancel} saving={saving}
            saveLabel={init.id ? 'Update Grant' : 'Assign Policy'}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '2 1 200px' }}>
                    <FormSelect label="Policy" id="g_policy" value={g.policy ? String(g.policy) : ''} onChange={v => s({ policy: v || null })}
                        options={policyOptions} />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <FormInput label="Key" id="g_key" name="key" value={g.key} onChange={e => s({ key: e.target.value })} hint="Leave blank to auto-derive from policy" />
                </div>
                <div style={{ flex: '0 0 auto', paddingTop: 4 }}>
                    <FormSwitch label="Active" name="g_isActive" checked={g.isActive !== false} onChange={v => s({ isActive: v })} />
                </div>
            </div>
        </InlineForm>
    );
}

// ─── Main AccessControl component ─────────────────────────────────────────────
export default function AccessControl({ domains, roles, grants, policies, resources, onRefresh }) {
    const { get, post, put, del } = useFetchClient();
    const api = (path) => `/api-guard-pro${path}`;

    // expanded sets
    const [openDomains, setOpenDomains] = useState(new Set());
    const [openRoles, setOpenRoles] = useState(new Set());

    // inline state: { type: 'add-domain'|'edit-domain'|'add-role'|'edit-role'|'add-grant'|'edit-grant', id, parentId }
    const [inline, setInline] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null); // id being deleted

    const clearInline = () => setInline(null);

    const toggleDomain = (id) => setOpenDomains(s => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const toggleRole = (id) => setOpenRoles(s => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    // ── CRUD helpers ─────────────────────────────────────────────────────────
    const save = useCallback(async (entity, data, existingId) => {
        setSaving(true);
        try {
            const payload = { ...data };
            if (entity === 'roles' && Array.isArray(payload.domains)) {
                payload.domains = payload.domains
                    .map(d => (typeof d === 'object' ? d.id : d))
                    .map(d => Number(d))
                    .filter(Number.isFinite);
                delete payload.domain;
            }

            if (existingId) {
                await put(api(`/entities/${entity}/${existingId}`), { data: payload });
            } else {
                await post(api(`/entities/${entity}`), { data: payload });
            }
            clearInline();
            await onRefresh(entity);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    }, [put, post, onRefresh]);

    const remove = useCallback(async (entity, id) => {
        if (!window.confirm(`Delete this ${entity.slice(0, -1)}?`)) return;
        setDeleting(id);
        try {
            await del(api(`/entities/${entity}/${id}`));
            await onRefresh(entity);
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(null);
        }
    }, [del, onRefresh]);

    // ── Domain-scoped lookups ─────────────────────────────────────────────────
    const rolesForDomain = (domainId) =>
        roles.filter(r => {
            const arr = Array.isArray(r.domains) ? r.domains : [];
            if (arr.some(d => String(d?.id ?? d) === String(domainId))) return true;
            return r.domain?.id === domainId || r.domain === domainId;
        });

    const grantsForRole = (roleId) =>
        grants.filter(g => g.role?.id === roleId || g.role === roleId);

    // unattached roles (no domain)
    const unattachedRoles = roles.filter(r => {
        const arr = Array.isArray(r.domains) ? r.domains : [];
        if (arr.length > 0) return false;
        return !r.domain && r.domain !== 0;
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box>
            {/* Header */}
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
                <Box>
                    <Typography variant="beta">Access Control</Typography>
                    <Typography variant="pi" textColor="neutral500" style={{ display: 'block', marginTop: 2 }}>
                        Domain → Role → Grant (Policy → Resource) · Click any row to expand · Edit/Add inline
                    </Typography>
                </Box>
                <Flex gap={2}>
                    <Button variant="secondary" onClick={onRefresh}>Refresh</Button>
                    <Button onClick={() => { clearInline(); setInline({ type: 'add-domain' }); }}>+ New Domain</Button>
                </Flex>
            </Flex>

            {/* Add-domain inline form (top-level) */}
            {inline?.type === 'add-domain' && (
                <DomainInlineForm
                    onSave={d => save('domains', d)}
                    onCancel={clearInline}
                    saving={saving}
                />
            )}

            {/* ── Domain list ──────────────────────────────────────────────── */}
            {domains.length === 0 && !inline && (
                <Box padding={6} background="neutral100" style={{ borderRadius: C.radius, textAlign: 'center' }}>
                    <Typography textColor="neutral500">No domains yet — create one above.</Typography>
                </Box>
            )}

            {domains.map(domain => {
                const domRoles = rolesForDomain(domain.id);
                const isOpen = openDomains.has(domain.id);

                return (
                    <Box key={domain.id} marginBottom={3}>
                        {/* Domain row */}
                        <Box background={C.bg1}
                            style={{ border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden' }}>
                            <Flex alignItems="center" gap={2}
                                style={{ padding: '8px 12px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => toggleDomain(domain.id)}>
                                <Chevron open={isOpen} />
                                <ActiveDot active={domain.isActive} />
                                <Typography variant="sigma" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                    {domain.key}
                                </Typography>
                                {domain.name && domain.name !== domain.key && (
                                    <Typography variant="pi" textColor="neutral500">— {domain.name}</Typography>
                                )}
                                <Badge text={`${domain.matchMode || 'header'}: ${domain.matchKey || 'x-app-name'}`}
                                    bg="#eee" color="#555" />
                                {domain.blockDirectAccess && (
                                    <Badge text="🔒 blockDirectAccess" bg="#ffeeba" color="#856404" />
                                )}
                                <Typography variant="pi" textColor="neutral400" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                    {domRoles.length} role{domRoles.length !== 1 ? 's' : ''}
                                </Typography>
                                {/* stop chevron-click from firing row actions */}
                                <span onClick={e => e.stopPropagation()}>
                                    <RowActions
                                        onEdit={() => { setInline({ type: 'edit-domain', id: domain.id }); setOpenDomains(s => new Set([...s, domain.id])); }}
                                        onDelete={() => remove('domains', domain.id)}
                                        onAdd={() => { setInline({ type: 'add-role', parentId: domain.id }); setOpenDomains(s => new Set([...s, domain.id])); }}
                                        addLabel="+ Role"
                                        deleting={deleting === domain.id}
                                    />
                                </span>
                            </Flex>

                            {/* Edit-domain inline form */}
                            {inline?.type === 'edit-domain' && inline.id === domain.id && (
                                <Box style={{ padding: '0 12px 12px' }} onClick={e => e.stopPropagation()}>
                                    <DomainInlineForm
                                        init={domain}
                                        onSave={d => save('domains', d, domain.id)}
                                        onCancel={clearInline}
                                        saving={saving}
                                    />
                                </Box>
                            )}
                        </Box>

                        {/* Expanded: roles tree */}
                        {isOpen && (
                            <div style={treeLineStyle}>
                                {/* Add-role inline form */}
                                {inline?.type === 'add-role' && inline.parentId === domain.id && (
                                    <RoleInlineForm
                                        domainId={domain.id}
                                        domains={domains}
                                        onSave={r => save('roles', r)}
                                        onCancel={clearInline}
                                        saving={saving}
                                    />
                                )}

                                {domRoles.length === 0 && inline?.type !== 'add-role' && (
                                    <Box padding={3} style={{ opacity: 0.6 }}>
                                        <Typography variant="pi" textColor="neutral400">No roles — click "+ Role" to add one.</Typography>
                                    </Box>
                                )}

                                {domRoles.map(role => {
                                    const roleGrants = grantsForRole(role.id);
                                    const roleOpen = openRoles.has(role.id);

                                    return (
                                        <Box key={role.id} marginBottom={2}>
                                            {/* Role row */}
                                            <Box background={C.bg2}
                                                style={{ border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden' }}>
                                                <Flex alignItems="center" gap={2}
                                                    style={{ padding: '7px 12px', cursor: 'pointer', userSelect: 'none' }}
                                                    onClick={() => toggleRole(role.id)}>
                                                    <Chevron open={roleOpen} />
                                                    <ActiveDot active={role.isActive} />
                                                    <Typography variant="pi" style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                                        {role.key}
                                                    </Typography>
                                                    {role.name && role.name !== role.key && (
                                                        <Typography variant="pi" textColor="neutral500">— {role.name}</Typography>
                                                    )}
                                                    <Badge text={role.level || 'staff'} bg={C.bg3} color="#32324d" />
                                                    <Typography variant="pi" textColor="neutral400" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                                        {roleGrants.length} grant{roleGrants.length !== 1 ? 's' : ''}
                                                    </Typography>
                                                    <span onClick={e => e.stopPropagation()}>
                                                        <RowActions
                                                            onEdit={() => { setInline({ type: 'edit-role', id: role.id }); setOpenRoles(s => new Set([...s, role.id])); }}
                                                            onDelete={() => remove('roles', role.id)}
                                                            onAdd={() => { setInline({ type: 'add-grant', parentId: role.id }); setOpenRoles(s => new Set([...s, role.id])); }}
                                                            addLabel="+ Grant"
                                                            deleting={deleting === role.id}
                                                        />
                                                    </span>
                                                </Flex>

                                                {/* Edit-role inline form */}
                                                {inline?.type === 'edit-role' && inline.id === role.id && (
                                                    <Box style={{ padding: '0 12px 12px' }} onClick={e => e.stopPropagation()}>
                                                        <RoleInlineForm
                                                            init={role}
                                                            domainId={domain.id}
                                                            domains={domains}
                                                            onSave={r => save('roles', r, role.id)}
                                                            onCancel={clearInline}
                                                            saving={saving}
                                                        />
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Expanded: grants */}
                                            {roleOpen && (
                                                <div style={treeLineStyle}>
                                                    {/* Add-grant inline form */}
                                                    {inline?.type === 'add-grant' && inline.parentId === role.id && (
                                                        <GrantInlineForm
                                                            roleId={role.id}
                                                            policies={policies}
                                                            onSave={g => save('grants', g)}
                                                            onCancel={clearInline}
                                                            saving={saving}
                                                        />
                                                    )}

                                                    {roleGrants.length === 0 && inline?.type !== 'add-grant' && (
                                                        <Box padding={3} style={{ opacity: 0.6 }}>
                                                            <Typography variant="pi" textColor="neutral400">No grants — click "+ Grant" to assign a policy.</Typography>
                                                        </Box>
                                                    )}

                                                    {roleGrants.map(grant => {
                                                        const policy = grant.policy;
                                                        const resource = policy?.resource
                                                            ? resources.find(r => r.id === (policy.resource?.id ?? policy.resource))
                                                            : null;

                                                        return (
                                                            <Box key={grant.id} marginBottom={1}>
                                                                {/* Grant row */}
                                                                <Box background={C.bg0}
                                                                    style={{ border: `1px solid ${C.border}`, borderRadius: C.radius }}>
                                                                    <Flex alignItems="center" gap={2}
                                                                        style={{ padding: '6px 12px', flexWrap: 'wrap' }}>
                                                                        <ActiveDot active={grant.isActive} />

                                                                        {/* Grant key */}
                                                                        <Typography variant="pi" textColor="neutral600"
                                                                            style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                                                            {grant.key}
                                                                        </Typography>

                                                                        {/* Arrow */}
                                                                        <Typography variant="pi" textColor="neutral400">→</Typography>

                                                                        {/* Policy */}
                                                                        {policy ? (
                                                                            <Flex gap={1} alignItems="center">
                                                                                <Typography variant="pi" style={{ fontWeight: 600 }}>
                                                                                    {label(policy)}
                                                                                </Typography>
                                                                                <EffectBadge effect={policy.effect} />
                                                                                {Array.isArray(policy.actions) && policy.actions.length > 0 && (
                                                                                    <Badge text={policy.actions.join(', ')} bg="#e8e8f4" color="#32324d" />
                                                                                )}
                                                                            </Flex>
                                                                        ) : (
                                                                            <Typography variant="pi" textColor="neutral400">(no policy)</Typography>
                                                                        )}

                                                                        {/* Arrow to resource */}
                                                                        {resource && (
                                                                            <>
                                                                                <Typography variant="pi" textColor="neutral400">→</Typography>
                                                                                <Flex gap={1} alignItems="center">
                                                                                    <Badge text={resource.method || 'GET'} bg="#e0e8ff" color="#1e3a8a" />
                                                                                    <Typography variant="pi"
                                                                                        style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                                                                        {resource.key}
                                                                                    </Typography>
                                                                                    {resource.pathPattern && (
                                                                                        <Typography variant="pi" textColor="neutral400"
                                                                                            style={{ fontFamily: 'monospace', fontSize: 10 }}>
                                                                                            {resource.pathPattern}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Flex>
                                                                            </>
                                                                        )}

                                                                        <span style={{ marginLeft: 'auto' }}>
                                                                            <RowActions
                                                                                onEdit={() => setInline({ type: 'edit-grant', id: grant.id, parentId: role.id })}
                                                                                onDelete={() => remove('grants', grant.id)}
                                                                                deleting={deleting === grant.id}
                                                                            />
                                                                        </span>
                                                                    </Flex>

                                                                    {/* Edit-grant inline form */}
                                                                    {inline?.type === 'edit-grant' && inline.id === grant.id && (
                                                                        <Box style={{ padding: '0 12px 12px' }}>
                                                                            <GrantInlineForm
                                                                                init={grant}
                                                                                roleId={role.id}
                                                                                policies={policies}
                                                                                onSave={g => save('grants', g, grant.id)}
                                                                                onCancel={clearInline}
                                                                                saving={saving}
                                                                            />
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </Box>
                                    );
                                })}
                            </div>
                        )}
                    </Box>
                );
            })}

            {/* ── Unattached roles section ───────────────────────────────────── */}
            {unattachedRoles.length > 0 && (
                <Box marginTop={4}>
                    <Flex alignItems="center" gap={2} paddingBottom={2}>
                        <Typography variant="pi" textColor="neutral400" style={{ fontWeight: 600 }}>
                            Roles without a domain ({unattachedRoles.length})
                        </Typography>
                    </Flex>
                    <div style={treeLineStyle}>
                        {unattachedRoles.map(role => {
                            const roleGrants = grantsForRole(role.id);
                            const roleOpen = openRoles.has(role.id);
                            return (
                                <Box key={role.id} marginBottom={2}>
                                    <Box background={C.bg2}
                                        style={{ border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden' }}>
                                        <Flex alignItems="center" gap={2}
                                            style={{ padding: '7px 12px', cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => toggleRole(role.id)}>
                                            <Chevron open={roleOpen} />
                                            <ActiveDot active={role.isActive} />
                                            <Typography variant="pi" style={{ fontWeight: 600, fontFamily: 'monospace' }}>{role.key}</Typography>
                                            {role.name && role.name !== role.key && (
                                                <Typography variant="pi" textColor="neutral500">— {role.name}</Typography>
                                            )}
                                            <Badge text={role.level || 'staff'} bg={C.bg3} color="#32324d" />
                                            <Typography variant="pi" textColor="neutral400" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                                {roleGrants.length} grant{roleGrants.length !== 1 ? 's' : ''}
                                            </Typography>
                                            <span onClick={e => e.stopPropagation()}>
                                                <RowActions
                                                    onEdit={() => { setInline({ type: 'edit-role', id: role.id }); setOpenRoles(s => new Set([...s, role.id])); }}
                                                    onDelete={() => remove('roles', role.id)}
                                                    onAdd={() => { setInline({ type: 'add-grant', parentId: role.id }); setOpenRoles(s => new Set([...s, role.id])); }}
                                                    addLabel="+ Grant"
                                                    deleting={deleting === role.id}
                                                />
                                            </span>
                                        </Flex>
                                        {inline?.type === 'edit-role' && inline.id === role.id && (
                                            <Box style={{ padding: '0 12px 12px' }} onClick={e => e.stopPropagation()}>
                                                <RoleInlineForm
                                                    init={role}
                                                    domains={domains}
                                                    onSave={r => save('roles', r, role.id)}
                                                    onCancel={clearInline}
                                                    saving={saving}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                    {roleOpen && (
                                        <div style={treeLineStyle}>
                                            {inline?.type === 'add-grant' && inline.parentId === role.id && (
                                                <GrantInlineForm
                                                    roleId={role.id}
                                                    policies={policies}
                                                    onSave={g => save('grants', g)}
                                                    onCancel={clearInline}
                                                    saving={saving}
                                                />
                                            )}
                                            {roleGrants.length === 0 && inline?.type !== 'add-grant' && (
                                                <Box padding={3} style={{ opacity: 0.6 }}>
                                                    <Typography variant="pi" textColor="neutral400">No grants yet.</Typography>
                                                </Box>
                                            )}
                                            {roleGrants.map(grant => {
                                                const policy = grant.policy;
                                                const resource = policy?.resource
                                                    ? resources.find(r => r.id === (policy.resource?.id ?? policy.resource))
                                                    : null;
                                                return (
                                                    <Box key={grant.id} marginBottom={1}>
                                                        <Box background={C.bg0}
                                                            style={{ border: `1px solid ${C.border}`, borderRadius: C.radius }}>
                                                            <Flex alignItems="center" gap={2}
                                                                style={{ padding: '6px 12px', flexWrap: 'wrap' }}>
                                                                <ActiveDot active={grant.isActive} />
                                                                <Typography variant="pi" textColor="neutral600"
                                                                    style={{ fontFamily: 'monospace', fontSize: 11 }}>{grant.key}</Typography>
                                                                <Typography variant="pi" textColor="neutral400">→</Typography>
                                                                {policy ? (
                                                                    <Flex gap={1} alignItems="center">
                                                                        <Typography variant="pi" style={{ fontWeight: 600 }}>{label(policy)}</Typography>
                                                                        <EffectBadge effect={policy.effect} />
                                                                        {Array.isArray(policy.actions) && policy.actions.length > 0 && (
                                                                            <Badge text={policy.actions.join(', ')} bg="#e8e8f4" color="#32324d" />
                                                                        )}
                                                                    </Flex>
                                                                ) : (
                                                                    <Typography variant="pi" textColor="neutral400">(no policy)</Typography>
                                                                )}
                                                                {resource && (
                                                                    <>
                                                                        <Typography variant="pi" textColor="neutral400">→</Typography>
                                                                        <Flex gap={1} alignItems="center">
                                                                            <Badge text={resource.method || 'GET'} bg="#e0e8ff" color="#1e3a8a" />
                                                                            <Typography variant="pi" style={{ fontFamily: 'monospace', fontSize: 11 }}>{resource.key}</Typography>
                                                                        </Flex>
                                                                    </>
                                                                )}
                                                                <span style={{ marginLeft: 'auto' }}>
                                                                    <RowActions
                                                                        onEdit={() => setInline({ type: 'edit-grant', id: grant.id, parentId: role.id })}
                                                                        onDelete={() => remove('grants', grant.id)}
                                                                        deleting={deleting === grant.id}
                                                                    />
                                                                </span>
                                                            </Flex>
                                                            {inline?.type === 'edit-grant' && inline.id === grant.id && (
                                                                <Box style={{ padding: '0 12px 12px' }}>
                                                                    <GrantInlineForm
                                                                        init={grant}
                                                                        roleId={role.id}
                                                                        policies={policies}
                                                                        onSave={g => save('grants', g, grant.id)}
                                                                        onCancel={clearInline}
                                                                        saving={saving}
                                                                    />
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Box>
                            );
                        })}
                    </div>
                </Box>
            )}
        </Box>
    );
}
