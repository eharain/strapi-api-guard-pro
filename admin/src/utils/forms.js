export const ensureLeadingSlash = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.startsWith('/') ? raw : `/${raw}`;
};

export const getEmptyForm = (tab) => {
    switch (tab) {
        case 'domains':
            return { key: '', name: '', description: '', isActive: true, matchMode: 'header', matchKey: 'x-app-name', strapiRoleType: 'authenticated' };
        case 'resources':
            return {
                key: '', 'route-name': '', displayName: '', description: '', type: 'standard', method: 'GET',
                pathPattern: '', aliasPath: '', contentTypeUid: '', 'content-type-uid': '', controllerAction: '',
                domain: null, parentResource: null, isPublic: false, isActive: true, effect: 'allow',
                requestRules: {}, responseRules: {}, matchCriteria: {}, requestMutation: {}, responseMutation: {},
                recordedRequestRaw: {}, recordedRequestParsed: {}
            };
        case 'roles':
            return { key: '', name: '', level: 'staff', description: '', isActive: true, domain: null };
        case 'policies':
            return { key: '', name: '', description: '', actions: ['read'], effect: 'allow', conditions: [], fields: [], priority: 0, isActive: true, resource: null };
        case 'grants':
            return { key: '', isActive: true, role: null, policy: null };
        case 'groups':
            return { key: '', name: '', description: '', isActive: true, isBundle: false, domain: null, parentGroup: null };
        default:
            return {};
    }
};
