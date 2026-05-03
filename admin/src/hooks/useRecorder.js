import { useState, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

const apiEndpoint = (path) => `/api-guard-pro${path}`;

const DEFAULT_RECORDER_STATE = {
    enabled: false,
    filters: { methods: { get: true, post: true, put: true, delete: true }, paths: { api: true, contentManager: true } },
    records: [],
    suggestions: []
};

export function useRecorder(notify) {
    const { get, put, del } = useFetchClient();
    const [recorder, setRecorder] = useState(DEFAULT_RECORDER_STATE);
    const [actionLoading, setActionLoading] = useState(false);

    const loadRecorder = useCallback(async () => {
        try {
            const { data } = await get(apiEndpoint('/resource-recorder'));
            setRecorder(data?.data || DEFAULT_RECORDER_STATE);
        } catch { }
    }, [get]);

    const saveRecorderConfig = useCallback(async (nextConfig = {}) => {
        setActionLoading(true);
        try {
            await put(apiEndpoint('/resource-recorder'), {
                enabled: nextConfig.enabled,
                filters: nextConfig.filters,
                ...(nextConfig.maxRecords !== undefined ? { maxRecords: nextConfig.maxRecords } : {}),
                ...(nextConfig.timeLimitSeconds !== undefined ? { timeLimitSeconds: nextConfig.timeLimitSeconds } : {})
            });
            await loadRecorder();
            notify('Recorder settings updated.', 'success');
        } catch {
            notify('Failed to update recorder settings.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [put, loadRecorder, notify]);

    const saveRecorderSettings = useCallback(async (settings = {}) => {
        setActionLoading(true);
        try {
            await put(apiEndpoint('/resource-recorder'), {
                enabled: recorder.enabled,
                filters: recorder.filters,
                ...settings
            });
            await loadRecorder();
            notify('Recorder settings saved.', 'success');
        } catch {
            notify('Failed to save recorder settings.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [put, recorder.enabled, recorder.filters, loadRecorder, notify]);

    const toggleEnabled = useCallback(() => {
        return saveRecorderConfig({ enabled: !recorder.enabled, filters: recorder.filters });
    }, [saveRecorderConfig, recorder.enabled, recorder.filters]);

    const toggleFilter = useCallback(async (section, key) => {
        const nextFilters = {
            methods: { ...(recorder.filters?.methods || {}) },
            paths: { ...(recorder.filters?.paths || {}) }
        };
        nextFilters[section][key] = !Boolean(nextFilters[section][key]);
        await saveRecorderConfig({ enabled: recorder.enabled, filters: nextFilters });
    }, [saveRecorderConfig, recorder.enabled, recorder.filters]);

    const clearRecorder = useCallback(async () => {
        setActionLoading(true);
        try {
            await del(apiEndpoint('/resource-recorder'));
            await loadRecorder();
            notify('Recorded requests cleared.', 'success');
        } catch {
            notify('Failed to clear recorded requests.', 'danger');
        } finally {
            setActionLoading(false);
        }
    }, [del, loadRecorder, notify]);

    return {
        recorder,
        recorderActionLoading: actionLoading,
        loadRecorder,
        toggleEnabled,
        toggleFilter,
        clearRecorder,
        saveRecorderSettings,
    };
}
