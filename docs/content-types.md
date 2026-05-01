# API Guard Pro Content Types Reference

This document is the technical source of truth for all plugin content-type schemas in `server/src/content-types/*/schema.json`.

## Scope

- `domain`
- `resource`
- `policy`
- `role`
- `group`
- `grant`

## Design Intent

These schemas define the authorization graph used by the plugin:

1. A **Domain** establishes tenant/app context.
2. A **Resource** defines the protected API route pattern.
3. A **Policy** defines allow/deny behavior on a resource.
4. A **Role** models permission ownership in a domain.
5. A **Grant** links a role to a policy.
6. A **Group** models resource collections and hierarchy.

---

## 1) Domain (`guard_domains`)

**File:** `server/src/content-types/domain/schema.json`  
**Purpose:** Multi-tenant or multi-application boundary.

### Attributes

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `key` | string | Yes | — | Unique, min length `2`, regex `^[a-z][a-z0-9-]*$` |
| `name` | string | Yes | — | Human-readable name |
| `description` | text | No | — | Optional detail |
| `isActive` | boolean | No | `true` | Soft enable/disable |
| `strapiRoleType` | string | No | `authenticated` | Integration hint for Strapi role type |
| `matchMode` | enumeration | No | `header` | One of `header`, `query`, `both` |
| `matchKey` | string | No | `x-app-name` | Header/query key used to resolve domain |

### Development Rules

- `key` must remain URL-safe and stable (used as a domain identifier).
- Domain resolution logic must honor `matchMode` and `matchKey`.
- Deactivation should be handled as runtime access blocking, not hard delete assumptions.

---

## 2) Resource (`guard_resources`)

**File:** `server/src/content-types/resource/schema.json`  
**Purpose:** Interceptor entity that links end-user API requests (URL/method) to a Strapi content-type controller action, while enforcing server-defined request/response behavior.

### Attributes

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `content-type-uid` | string | No | — | Legacy/helper UID link |
| `route-name` | string | Yes | — | Route label |
| `key` | string | Yes | — | Unique logical key |
| `displayName` | string | Yes | — | Human-readable label |
| `description` | text | No | — | Optional detail |
| `type` | enumeration | Yes | `standard` | One of `standard`, `extended`, `alias` |
| `method` | enumeration | Yes | — | One of `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `pathPattern` | string | Yes | — | Must match regex `^/.*$` |
| `aliasPath` | string | No | — | Must match regex `^/.*$`; used for alias resources |
| `contentTypeUid` | string | No | — | Primary content-type UID |
| `controllerAction` | string | No | — | Optional controller action reference |
| `isPublic` | boolean | No | `false` | Public route bypass semantics |
| `isActive` | boolean | No | `true` | Soft enable/disable |
| `effect` | enumeration | No | `allow` | One of `allow`, `deny` |
| `requestRules` | json | No | `{}` | Request enforcement rules |
| `responseRules` | json | No | `{}` | Response filtering rules |
| `matchCriteria` | json | No | `{}` | Additional route matching constraints |
| `requestMutation` | json | No | `{}` | Request mutation instructions |
| `responseMutation` | json | No | `{}` | Response mutation instructions |
| `recordedRequestRaw` | json | No | `{}` | Recorded raw request metadata |
| `recordedRequestParsed` | json | No | `{}` | Parsed request metadata |
| `domain` | relation | No | — | many-to-one → `plugin::api-guard-pro.domain` |
| `parentResource` | relation | No | — | many-to-one → `plugin::api-guard-pro.resource` |

### Runtime Responsibilities

A Resource acts as the secure boundary between Strapi APIs and client applications.

- Maps incoming request URL + method to the intended content-type controller action.
- Supports shortened/clean alias URLs for long Strapi query URLs.
- Stores preconfigured server-side query behavior (filters, populate, sort, fields) so clients cannot freely manipulate sensitive access patterns.
- Enforces row-level visibility patterns (for example, only user-owned rows).
- Enforces field-level visibility (for example, hide approval/status or other sensitive attributes).
- Applies request-body mutation and restriction before persistence (for example: auto-assign current user as owner, block owner changes, permit/deny approval fields).
- Allows multiple resources to be derived from the same underlying Strapi API endpoint for different roles, use-cases, or app surfaces.

### Development Rules

- `pathPattern` is the canonical route matcher; always store as absolute-style path beginning with `/`.
- `type=alias` should use `aliasPath` as external path mapping to base resource behavior and shortened API URLs.
- Parse and persist URL parts separately for recorder-based resources: keep path independently and store query parameters as JSON using `qs` semantics.
- `requestRules` and `responseRules` must stay JSON-object compatible and backward-safe.
- Dynamic parameter values on aliased resources must pass through without over-normalization.
- For recorder-driven resources, preserve both `recordedRequestRaw` and `recordedRequestParsed` for diagnostics and reproducibility.

### Admin UI and Recorder Expectations

To drive development correctly, Resource management should provide a precise mechanism to define and edit:

- filters
- populate constraints
- field allow/strip rules
- sorting behavior
- request body override/augmentation rules for POST/PUT/PATCH

Resource creation should be automatable via recorded requests, with correct linkage to:

- content-type UID
- controller action
- schema fields and nested relation schema

### Resource Creation Improvements (Implementation Guidance)

#### 1) Reduce Redundant Data in `resource`

- Deprecate `content-type-uid` in favor of `contentTypeUid` (single canonical field).
- Re-evaluate overlap between `route-name` and `displayName`; keep one technical route identifier and one user-facing label.
- Keep recorder payload fields (`recordedRequestRaw`, `recordedRequestParsed`) for diagnostics, but treat them as optional metadata and avoid using them as core identity fields.

#### 2) Prefer Linkage Over Duplicated Manual Entry

Resource creation should be guided from actual Strapi content types and discovered controller actions, instead of free-form duplication.

- Select Domain → Content Type UID → Controller Action/Route.
- Auto-fill method/path/action metadata from discovered route catalog.
- Validate selected fields/populate paths against real content-type schema and relation tree.

#### 3) Guided Wizard UX (Recommended)

Use a step-based flow for intuitive resource creation:

1. Domain selection
2. Content type selection
3. Controller action/route selection
4. Resource mode (`standard`/`extended`/`alias`)
5. Rules and mutations editor
6. Review and activate

#### 4) Rules Contract Clarity

- `requestRules`: request constraints (filters, populate, fields, sort, pagination).
- `requestMutation`: request/body/query augmentation or removal before controller.
- `responseRules`: response field visibility constraints.
- `responseMutation`: final response shaping after controller execution.

This split must remain explicit in UI labels and API payload contracts.

#### 5) Alias Security and Flexibility

- Alias resources must support shortened, stable URLs.
- Alias resolution must route to underlying content-type controller actions.
- Runtime dynamic parameter values must pass through without over-restrictive normalization.

#### 6) Recorder-to-Resource Automation

When creating from recorded traffic:

- Parse query strings with `qs` semantics.
- Store path separately from query object JSON.
- Suggest rules from observed query/body usage.
- Require explicit review before activation.

#### 7) Validation Rules (Recommended)

- Enforce uniqueness for `(domain, method, pathPattern)`.
- Enforce uniqueness for `(domain, aliasPath)` where alias is used.
- Require `aliasPath` for `type=alias` and disallow it for non-alias resources.
- Validate method/path/controller linkage at save time.

---

## 3) Policy (`guard_policies`)

**File:** `server/src/content-types/policy/schema.json`  
**Purpose:** Permission rule unit applied to a single resource.

### Attributes

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `key` | string | Yes | — | Unique policy key |
| `name` | string | Yes | — | Human-readable name |
| `description` | text | No | — | Optional detail |
| `actions` | json | Yes | `["read"]` | Action set (e.g., read/create/update/delete) |
| `effect` | enumeration | Yes | `allow` | One of `allow`, `deny` |
| `conditions` | json | No | `[]` | Conditional expressions |
| `fields` | json | No | `[]` | Field-level allow/deny configuration |
| `priority` | integer | No | `0` | Conflict resolution order |
| `isActive` | boolean | No | `true` | Soft enable/disable |
| `resource` | relation | No | — | many-to-one → `plugin::api-guard-pro.resource` |

### Development Rules

- Policy evaluation must include `priority` ordering and `effect` semantics.
- `actions`, `conditions`, and `fields` should be interpreted as structured JSON, not opaque strings.
- A policy without `resource` should be treated carefully in evaluators (avoid accidental global application).

---

## 4) Role (`guard_roles`)

**File:** `server/src/content-types/role/schema.json`  
**Purpose:** Role model scoped by domain and attached to users.

### Attributes

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `key` | string | Yes | — | Unique role key |
| `name` | string | Yes | — | Human-readable name |
| `level` | enumeration | Yes | `staff` | One of `staff`, `manager`, `admin`, `super-admin` |
| `description` | text | No | — | Optional detail |
| `isActive` | boolean | No | `true` | Soft enable/disable |
| `domain` | relation | No | — | many-to-one → `plugin::api-guard-pro.domain` |
| `users` | relation | No | — | many-to-many → `plugin::users-permissions.user` mappedBy `permission_roles` |

### Development Rules

- Role keys should be stable identifiers for assignment APIs.
- Domain-scoped roles must not leak permissions across domains.
- User relation depends on `permission_roles` field in users-permissions user model.

---

## 5) Group (`guard_groups`)

**File:** `server/src/content-types/group/schema.json`  
**Purpose:** Optional grouping and hierarchy of resources/permissions.

### Attributes

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `key` | string | Yes | — | Unique group key |
| `name` | string | Yes | — | Human-readable name |
| `description` | text | No | — | Optional detail |
| `isActive` | boolean | No | `true` | Soft enable/disable |
| `isBundle` | boolean | No | `false` | Distinguishes grouped bundle behavior |
| `domain` | relation | No | — | many-to-one → `plugin::api-guard-pro.domain` |
| `parentGroup` | relation | No | — | many-to-one self-reference → `plugin::api-guard-pro.group` |

### Development Rules

- Support parent/child hierarchy traversal without cyclic recursion.
- `isBundle` should be treated as behavioral metadata, not identity.

---

## 6) Grant (`guard_grants`)

**File:** `server/src/content-types/grant/schema.json`  
**Purpose:** Join entity that assigns a policy to a role.

### Attributes

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `key` | string | Yes | — | Unique grant key |
| `isActive` | boolean | No | `true` | Soft enable/disable |
| `role` | relation | Yes | — | many-to-one → `plugin::api-guard-pro.role` |
| `policy` | relation | Yes | — | many-to-one → `plugin::api-guard-pro.policy` |

### Development Rules

- Grant is the primary role-policy linkage; evaluators should ignore inactive grants.
- Enforce referential integrity in services (role and policy must exist and be active where required).

---

## Cross-Schema Relationship Map

- `Domain` 1 ── * `Role`
- `Domain` 1 ── * `Group`
- `Domain` 1 ── * `Resource`
- `Resource` 1 ── * `Policy`
- `Role` 1 ── * `Grant` * ── 1 `Policy`
- `Resource` 1 ── * `Resource` (parent/child)
- `Group` 1 ── * `Group` (parent/child)
- `Role` * ── * `User` (`users-permissions`)

## Recommended Validation and Evolution Practices

1. Keep `key` fields immutable after creation where possible.
2. Prefer soft deactivation (`isActive=false`) over hard deletion in production environments.
3. Version behavioral JSON contracts (`requestRules`, `responseRules`, `conditions`, `fields`) when introducing breaking semantics.
4. Maintain migration scripts whenever enum values or required fields change.
5. Keep this document updated in the same pull request as schema changes.
