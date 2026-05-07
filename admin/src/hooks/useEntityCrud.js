import { useState, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { getEmptyForm } from '../utils/forms';

const apiEndpoint = (path) => `/api-guard-pro${path}`;

export function useEntityCrud({ activeTab, notify, loadEntity, loadOverview }) {
    const { post, put, del } = useFetchClient();
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({});
    const [actionLoading, setActionLoading] = useState(false);

    const openNewForm = useCallback(() => {
        setEditingRecord(null);
        setFormData(getEmptyForm(activeTab));
        setPanelOpen(true);
    }, [activeTab]);

    const openEditForm = useCallback((record) => {
        setEditingRecord(record);
        const form = { ...record };
        if (form.domain && typeof form.domain === 'object') form.domain = form.domain.id;
        if (form.resource && typeof form.resource === 'object') form.resource = form.resource.id;
        if (form.role && typeof form.role === 'object') form.role = form.role.id;
        if (form.policy && typeof form.policy === 'object') form.policy = form.policy.id;
        if (Array.isArray(form.grants)) {
            form.grants = form.grants.map(g => (typeof g === 'object' ? g.id : g));
        }
        setFormData(form);
        setPanelOpen(true);
    }, []);

    const cancelForm = useCallback(() => {
        setPanelOpen(false);
        setEditingRecord(null);
    }, []);

    const submitForm = useCallback(async () => {
        setActionLoading(true);
        notify('');
        try {
            const payload = { ...formData };
            if (payload.domain) payload.domain = parseInt(payload.domain, 10);
            if (payload.resource) payload.resource = parseInt(payload.resource, 10);
            if (payload.role) payload.role = parseInt(payload.role, 10);
            if (payload.policy) payload.policy = parseInt(payload.policy, 10);
            if (Array.isArray(payload.grants)) {
                payload.grants = payload.grants
                    .map(g => (typeof g === 'object' ? g.id : g))
                    .map(g => parseInt(g, 10))
                    .filter(g => Number.isFinite(g));
            }

            if (editingRecord) {
                await put(apiEndpoint(`/entities/${activeTab}/${editingRecord.id}`), { data: payload });
                notify('Updated successfully.', 'success');
            } else {
                await post(apiEndpoint(`/entities/${activeTab}`), { data: payload });
                notify('Created successfully.', 'success');
            }
            setPanelOpen(false);
            setEditingRecord(null);
            await loadEntity(activeTab);
            await loadOverview();
        } catch {
            notify(editingRecord ? 'Failed to update.' : 'Failed to create.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [post, put, formData, editingRecord, activeTab, notify, loadEntity, loadOverview]);

    const deleteRecord = useCallback(async (entity, id) => {
        if (!window.confirm('Delete this record?')) return;
        setActionLoading(true);
        notify('');
        try {
            await del(apiEndpoint(`/entities/${entity}/${id}`));
            notify('Deleted.', 'success');
            if (editingRecord?.id === id) { setPanelOpen(false); setEditingRecord(null); }
            await loadEntity(entity);
            await loadOverview();
        } catch {
            notify('Failed to delete.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [del, editingRecord, notify, loadEntity, loadOverview]);

    const submitResource = useCallback(async (resource) => {
        setActionLoading(true);
        notify('');
        try {
            await post(apiEndpoint('/entities/resources'), { data: resource });
            notify('Resource created successfully.', 'success');
            await loadEntity('resources');
            await loadOverview();
        } catch {
            notify('Failed to create resource.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [post, notify, loadEntity, loadOverview]);

    return {
        panelOpen,
        setPanelOpen,
        editingRecord,
        setEditingRecord,
        formData,
        setFormData,
        actionLoading,
        openNewForm,
        openEditForm,
        cancelForm,
        submitForm,
        deleteRecord,
        submitResource,
    };
}
