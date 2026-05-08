# Policy Model

This page explains how access control entities connect in Strapi API Guard Pro.

## Entity chain

Primary flow:

- Domain -> Role -> Grant -> Policy -> Resource -> Content Type action

Interpretation:

- **Domain**: app boundary/context.
- **Role**: permission container for users within a domain.
- **Grant**: binds role to policy.
- **Policy**: action-level rules and enforcement contract.
- **Resource**: maps incoming route to protected Strapi action.

## Policy action model

Policies are action-scoped. Typical action names:

- `find`
- `findOne`
- `create`
- `update`
- `delete`

Action names can be stored fully qualified (for example `article.find`) but evaluators typically normalize to action suffix.

## What a policy can enforce

### Request side

- query restrictions
- row-level filters
- allowed populate/fields/sort contracts
- request body stripping
- forced request body fields

### Response side

- allowed field projection
- strip sensitive fields
- nested relation field stripping

## Role grant behavior

Access is based on active grants from user roles to matching policies.

Practical implications:

- policy without grants is effectively unreachable
- inactive policy/grant should not authorize
- multiple roles can combine access through union of active grants

## Deny-by-default

When enabled, requests without a matching authorized policy are rejected.

This should be considered the secure baseline for production.

## Design guidance

1. Keep policy keys stable and readable.
2. Prefer per-action explicit policies over broad shared policies.
3. Keep policy scope close to the resource/content type.
4. Validate grants and action coverage during onboarding.
5. Deactivate before deleting in production.
