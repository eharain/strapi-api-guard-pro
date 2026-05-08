# Resource Workflows

This page documents expected workflows for creating and managing Resources in Strapi API Guard Pro.

## Resource creation entry points

### 1) From Content Types

Path:

- Resources -> Content Types -> Use

Expected behavior:

1. Opens the New Resource form.
2. Prefills content type identity fields.
3. Seeds an initial policy draft for action-level configuration.
4. On save, creates Resource first, then linked Policy from draft.

### 2) From API Request Recordings

Path:

- Resources -> API Request Recordings -> Create Resource

Expected behavior:

1. Uses recorded route/method context.
2. Prefills resource form (content type, display name, description where available).
3. Seeds initial policy draft based on inferred action/method.
4. Saves resource + linked policy in one guided flow.

## New resource form expectations

For a new resource flow, users should see:

- Resource identity section
- Initial Policy section (for editable policy configuration)
- Submit actions (Create Resource)

If editing an existing resource, the form should show existing policy management panel instead of initial draft section.

## Policy seeding logic (high-level)

Initial draft policy typically includes:

- `contentTypeUid`
- action name (`find`, `findOne`, `create`, `update`, `delete`)
- default active state
- empty query/filters/body objects
- empty grants

This draft is user-editable before resource submission.

## Recommended operator flow

1. Choose content type or recording suggestion.
2. Confirm resource identity.
3. Configure initial policy query/body/field behavior.
4. Assign grants (roles).
5. Save and validate with real API requests.

## Common pitfalls

- Creating resources without grants leaves policies unreachable.
- Missing admin rebuild in host Strapi app can hide recent UI updates.
- Overly strict alias normalization can break dynamic runtime values.
