import { useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { getEmptyForm } from '../utils/forms';

const apiEndpoint = (path) => `/api-guard-pro${path}`;

export function useResourceBuilder({ activeTab, setActiveTab, setResourceSubTab, setEditingRecord, setFormData, setPanelOpen, pendingPanelRef }) {
    const { get } = useFetchClient();

    const openResourceForm = useCallback((form) => {
        if (activeTab === 'resources') {
            setResourceSubTab('api-resources');
            setEditingRecord(null);
            setFormData(form);
            setPanelOpen(true);
        } else {
            pendingPanelRef.current = { subTab: 'api-resources', form };
            setActiveTab('resources');
        }
    }, [activeTab, setActiveTab, setResourceSubTab, setEditingRecord, setFormData, setPanelOpen, pendingPanelRef]);

    const buildResourceFromSuggestion = useCallback(async (item) => {
        const recordKey = item.recordKey || item.key;
        try {
            const { data } = await get(apiEndpoint(`/resource-recorder/to-resource/${encodeURIComponent(recordKey)}`));
            const form = { ...getEmptyForm('resources'), ...(data?.data || {}) };
            openResourceForm(form);
        } catch {
            // Fallback: use the item data directly if the endpoint fails
            const form = { ...getEmptyForm('resources'), key: item.key, displayName: item.displayName, method: item.method || 'GET', pathPattern: item.pathPattern || item.path || '', type: item.type || 'standard' };
            openResourceForm(form);
        }
    }, [get, openResourceForm]);

    const buildResourceFromCatalog = useCallback((contentType, action) => {
        const sanitizedUid = String(contentType.uid || '').replace(/[^a-zA-Z0-9_.-]/g, '.');
        const actionName = String(action.action || 'custom').toLowerCase();
        const form = {
            ...getEmptyForm('resources'),
            key: `${sanitizedUid}.${actionName}`,
            displayName: `${contentType.displayName} · ${action.method} ${action.path}`,
            type: action.type || 'standard',
            method: action.method || 'GET',
            pathPattern: action.path || '',
            contentTypeUid: contentType.uid || '',
            controllerAction: `${contentType.uid}.${action.action || 'custom'}`,
            description: `Generated from builder catalog (${action.type || 'standard'})`
        };
        openResourceForm(form);
    }, [openResourceForm]);

    return { buildResourceFromSuggestion, buildResourceFromCatalog };
}
