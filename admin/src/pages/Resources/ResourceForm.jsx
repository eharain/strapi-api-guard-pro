import React from 'react';
import { Box, Flex, Switch } from '@strapi/design-system';
import { FormInput, FormTextarea, FormSelect, SectionLabel } from '../../components/ui.jsx';

/**
 * Resource form for the compact api-guard-pro model.
 *
 * A resource is keyed by `contentTypeUid` — that's its identity. Per-action
 * authorization (find, findOne, create, ...) is handled by Policy records on
 * the dedicated Policies tab.
 */
function ResourceForm({ formData, onChange, strapiTypes = [] }) {
    const set = (patch) => onChange({ ...formData, ...patch });

    return (
        <Box>
            <SectionLabel text="Identity" hint="A resource maps 1:1 to a Strapi content type." />
            <Flex gap={4} wrap="wrap" paddingBottom={3}>
                <Box style={{ flex: '1 1 320px' }}>
                    <FormSelect
                        label="Content Type"
                        required
                        value={formData.contentTypeUid || ''}
                        onChange={(uid) => set({
                            contentTypeUid: uid,
                            displayName: formData.displayName || uid,
                        })}
                        hint="The Strapi content type this resource guards"
                    >
                        <option value="">Select content type…</option>
                        {strapiTypes.map((type) => (
                            <option key={type.uid} value={type.uid}>
                                {type.displayName} ({type.uid})
                            </option>
                        ))}
                    </FormSelect>
                </Box>
                <Box style={{ flex: '1 1 220px' }}>
                    <FormInput
                        label="Display Name"
                        value={formData.displayName || ''}
                        onChange={(e) => set({ displayName: e.target.value })}
                        hint="Human-readable label"
                    />
                </Box>
            </Flex>

            <Box paddingBottom={3}>
                <FormTextarea
                    label="Description"
                    value={formData.description || ''}
                    onChange={(e) => set({ description: e.target.value })}
                    minHeight={90}
                />
            </Box>

            <Flex gap={6} paddingBottom={3}>
                <Switch
                    label="Active"
                    selected={formData.isActive !== false}
                    onChange={() => set({ isActive: formData.isActive === false })}
                />
            </Flex>
        </Box>
    );
}

export default ResourceForm;
