import { useState, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

const ENTITIES = ['domains', 'resources', 'roles', 'policies', 'grants', 'groups'];
const apiEndpoint = (path) => `/api-guard-pro${path}`;

export function useAppData() {
    const { get } = useFetchClient();
    const [overview, setOverview] = useState({});
    const [entityData, setEntityData] = useState(
        Object.fromEntries(ENTITIES.map(e => [e, []]))
    );
    const [users, setUsers] = useState([]);
    const [roleOptions, setRoleOptions] = useState([]);
    const [strapiTypes, setStrapiTypes] = useState([]);
    const [resourceCatalog, setResourceCatalog] = useState([]);
    const [inspectData, setInspectData] = useState(null);

    const loadOverview = useCallback(async () => {
        try {
            const { data } = await get(apiEndpoint('/overview'));
            setOverview(data || {});
        } catch { }
    }, [get]);

    const loadEntity = useCallback(async (entity) => {
        const { data } = await get(apiEndpoint(`/entities/${entity}`));
        setEntityData(prev => ({ ...prev, [entity]: data?.data || [] }));
    }, [get]);

    const loadAllEntities = useCallback(async () => {
        await Promise.all(ENTITIES.map(e => loadEntity(e).catch(() => { })));
    }, [loadEntity]);

    const loadUsersAndRoles = useCallback(async () => {
        try {
            const [ur, rr] = await Promise.all([
                get(apiEndpoint('/users')),
                get(apiEndpoint('/entities/roles'))
            ]);
            setUsers(ur?.data?.data || []);
            setRoleOptions(rr?.data?.data || []);
        } catch { }
    }, [get]);

    const loadStrapiTypes = useCallback(async () => {
        try {
            const { data } = await get(apiEndpoint('/strapi-content-types'));
            setStrapiTypes(data?.data || []);
        } catch { }
    }, [get]);

    const loadResourceCatalog = useCallback(async () => {
        try {
            const { data } = await get(apiEndpoint('/resource-builder/catalog'));
            setResourceCatalog(data?.data || []);
        } catch { }
    }, [get]);

    const loadInspect = useCallback(async () => {
        try {
            const { data } = await get(apiEndpoint('/inspect'));
            setInspectData(data?.data || null);
        } catch { }
    }, [get]);

    return {
        overview,
        entityData,
        users,
        roleOptions,
        strapiTypes,
        resourceCatalog,
        inspectData,
        loadOverview,
        loadEntity,
        loadAllEntities,
        loadUsersAndRoles,
        loadStrapiTypes,
        loadResourceCatalog,
        loadInspect,
    };
}
