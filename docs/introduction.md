# Strapi API Guard Pro

Enterprise-grade API security and access control for Strapi.

## What it does

Strapi API Guard Pro intercepts requests and responses, maps routes to Resources, and applies Policies to enforce:

- domain isolation
- row-level filtering
- field-level response shaping
- request body restrictions/augmentation
- clean alias URLs over complex Strapi query strings

The plugin is designed for multi-app and multi-tenant environments where default endpoint-level permissions are not enough.

---

## Core concepts

### Domain
A logical application boundary (for example: `store`, `warehouse`, `delivery`).

### Role
A permission carrier assigned to users. Roles belong to Domains.

### Resource
An interceptor-layer mapping for API routes to Strapi content-type controller actions. A Resource can include predefined query/filter/populate/fields rules.

### Policy
A per-action rule set attached to a Resource that controls:

- query constraints
- request-body restrictions and forced fields
- response field allow/strip behavior
- role grants for access

### Grant
The relation assigning a Policy to a Role.

---

## Why this plugin

Default Strapi permissions control endpoint access. Real production apps also need:

- user sees only own records
- manager sees team records only
- hide sensitive fields from response
- force server-side ownership fields on create/update
- short, stable alias URLs for mobile/web clients

API Guard Pro handles these as first-class policy behaviors.

---

## Interception model

1. Request enters API Guard middleware.
2. Route is resolved to a Resource.
3. Matching active Policies are resolved by user/domain/role/action.
4. Request is validated/mutated (query/body rules).
5. Strapi controller executes.
6. Response is filtered/shaped by response rules.

Deny-by-default can be enabled so unmatched requests are blocked.

---

## Resource and alias design rules

- Treat Resource as an interceptor mapping layer over content-type actions.
- Support shortened alias URLs that route to underlying content-type controllers.
- Preconfigure query/filter/populate/fields in Resource/Policy rules.
- Apply automatic request body augmentation/restrictions where required.
- Keep dynamic alias parameters pass-through (do not over-normalize runtime values).
- Parse query parameters using `qs` semantics, not naive key-value splitting.

For recorder-derived resources:

- capture production-day requests
- separate URL path and query
- persist query as JSON (qs-parsed object)
- use captured traffic patterns to shape alias contracts

---

## Typical setup flow

1. Create Domains.
2. Create Roles and assign users.
3. Define Resources for protected content types/routes.
4. Create Policies per action (`find`, `findOne`, `create`, `update`, `delete`).
5. Attach grants (role -> policy).
6. Validate behavior using real request scenarios.

For guided creation, use:

- Resources -> Content Types -> Use
- Resources -> API Request Recordings -> Create Resource

Both should lead to a prefilled Resource form and policy-aware configuration flow.

---

## Rollout modes (recommended)

Use gradual rollout for production safety:

- **observe**: monitor and record patterns, no hard enforcement
- **hybrid**: enforce where configured, allow fallback for legacy paths
- **enforce**: strict API Guard enforcement

Recommended migration:

1. observe
2. build resources/policies from recorder insights
3. hybrid by domain/app
4. enforce after validation

---

## Operational notes

- Keep policy keys stable.
- Prefer deactivation over hard deletion in production.
- Keep import/export file-based for repeatable deployments.
- Rebuild host Strapi admin when plugin admin UI changes are not reflected.

---

## Documentation map

- [Content Types](./content-types.md)
- [ERP API Resource Alias Mapping](./erp-api-resource-alias-mapping.md)
- [Knowledge Base](./knowledge-base/README.md)
