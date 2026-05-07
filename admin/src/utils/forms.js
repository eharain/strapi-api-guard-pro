export const ensureLeadingSlash = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.startsWith('/') ? raw : `/${raw}`;
};

export const getEmptyForm = (tab) => {
    switch (tab) {
        case 'domains':
            return { key: '', name: '', description: '', isActive: true };
        case 'resources':
            return {
                contentTypeUid: '',
                displayName: '',
                description: '',
                isActive: true,
            };
        case 'roles':
            return { key: '', name: '', description: '', isActive: true, domain: null };
        case 'policies':
            return {
                uid: '',
                key: '',
                contentTypeUid: '',
                actionName: '',
                description: '',
                isActive: true,
                query: {},
                filters: {},
                body: {},
                resource: null,
                grants: [],
            };
        default:
            return {};
    }
};

