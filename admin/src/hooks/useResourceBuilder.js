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
            const payload = data?.data || {};
            const form = {
                ...getEmptyForm('resources'),
                contentTypeUid: payload.contentTypeUid || '',
                displayName: payload.displayName || payload.contentTypeUid || '',
                description: payload.description || '',
                isActive: payload.isActive !== false,
            };
            openResourceForm(form);
        } catch {
            const form = {
                ...getEmptyForm('resources'),
                contentTypeUid: item.contentTypeUid || '',
                displayName: item.displayName || item.contentTypeUid || '',
            };
            openResourceForm(form);
        }
    }, [get, openResourceForm]);

    const buildResourceFromCatalog = useCallback((contentType /*, action */) => {
        const form = {
            ...getEmptyForm('resources'),
            contentTypeUid: contentType.uid || '',
            displayName: contentType.displayName || contentType.uid || '',
            description: `Generated from builder catalog`,
        };
        openResourceForm(form);
    }, [openResourceForm]);

    return { buildResourceFromSuggestion, buildResourceFromCatalog };
}
