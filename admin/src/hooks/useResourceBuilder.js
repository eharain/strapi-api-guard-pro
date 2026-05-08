import { useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { getEmptyForm } from '../utils/forms';

const apiEndpoint = (path) => `/api-guard-pro${path}`;

const buildInitialPolicy = ({ contentTypeUid = '', actionName = '', method = '' } = {}) => {
    const model = String(contentTypeUid || '').split('::').pop()?.split('.').pop() || 'resource';
    const fallbackAction = method === 'POST'
        ? 'create'
        : method === 'PUT' || method === 'PATCH'
            ? 'update'
            : method === 'DELETE'
                ? 'delete'
                : 'find';
    const normalizedAction = actionName || fallbackAction;
    const actionWithModel = normalizedAction.includes('.') ? normalizedAction : `${model}.${normalizedAction}`;
    const actionPart = actionWithModel.split('.').pop() || normalizedAction;
    const key = `${model}-${actionPart}`;

    return {
        uid: `${contentTypeUid}.${actionWithModel}.${key}`,
        key,
        contentTypeUid,
        actionName: actionWithModel,
        description: `Initial policy for ${actionWithModel}`,
        isActive: true,
        query: {},
        filters: {},
        body: {},
        grants: [],
    };
};

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
                __initialPolicy: buildInitialPolicy({
                    contentTypeUid: payload.contentTypeUid || '',
                    actionName: payload.actionName || '',
                    method: payload.recordedRequestRaw?.method || item.method || '',
                }),
            };
            openResourceForm(form);
        } catch {
            const form = {
                ...getEmptyForm('resources'),
                contentTypeUid: item.contentTypeUid || '',
                displayName: item.displayName || item.contentTypeUid || '',
                __initialPolicy: buildInitialPolicy({
                    contentTypeUid: item.contentTypeUid || '',
                    actionName: item.actionName || '',
                    method: item.method || '',
                }),
            };
            openResourceForm(form);
        }
    }, [get, openResourceForm]);

    const buildResourceFromCatalog = useCallback((contentType, action) => {
        const form = {
            ...getEmptyForm('resources'),
            contentTypeUid: contentType.uid || '',
            displayName: contentType.displayName || contentType.uid || '',
            description: `Generated from builder catalog`,
            __initialPolicy: buildInitialPolicy({
                contentTypeUid: contentType.uid || '',
                actionName: action?.action || '',
                method: action?.method || '',
            }),
        };
        openResourceForm(form);
    }, [openResourceForm]);

    return { buildResourceFromSuggestion, buildResourceFromCatalog };
}
