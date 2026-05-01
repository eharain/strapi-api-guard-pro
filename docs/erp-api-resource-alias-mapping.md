# ERP API Request Analysis → API Resource Alias Mapping

This document analyzes ERP client API usage in `D:\Rutba\ERP` and maps request patterns into API Guard Pro Resource aliases.

## Scan Scope and Method

- Scanned only code files: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`
- Skipped hidden/dot directories and generated/vendor folders
- Focused on client call-sites (`authApi.*`, `axios.*`, `fetch`) instead of Strapi backend route/controller definitions

## Observed Request Patterns (Representative)

### A) List endpoints with server-shape query controls

Examples found:
- `GET /delivery-zones` with `sort` and `pagination`
- `GET /delivery-methods` with `sort`, `populate`, `pagination`
- `GET /cms-footers` with `status`, `sort`, `pagination`
- `GET /brands`, `GET /categories`, `GET /category-groups` with `status`, `fields`, `pagination`

Typical current call shape:
- static: sort order, max page size, allowed populate tree, status mode
- dynamic: page/pageSize, free-text search, optional filter values

### B) Filtered list/read where one filter is business-static

Example found:
- `GET product-groups` with filter `slug.$eq = "home-sneak"` and fixed populate tree

Typical current call shape:
- static: `filters.slug.$eq`, fixed `populate`
- dynamic: usually none (or small runtime filter additions)

### C) Detail calls with dynamic path parameters

Examples found:
- `GET /web-orders/{orderId}?populate=*`
- `POST /brands/{documentId}/publish`
- `POST /brands/{documentId}/unpublish`
- same publish/unpublish pattern for categories, groups, footers

Typical current call shape:
- static: route template + controller action intent
- dynamic: `orderId`, `documentId`

### D) Create/update with mutable request body

Examples found:
- `POST /delivery-zones` with `data: {...}`
- `POST /return-requests` with `data: { order, reason }`
- `PUT /rider/me/status` with `{ status }`
- `PUT /cms-footers/{documentId}` with `data: row`

Typical current call shape:
- static: protected body fields and validation constraints
- dynamic: allowed editable fields only

---

## Static vs Dynamic Parameter Classification

Use this classification for Resource design:

- **Static (lock on server in Resource):**
  - fixed `status` values (e.g., draft/published)
  - fixed `sort` arrays
  - fixed `populate` trees
  - fixed `fields` lists
  - enforced pagination ceilings
  - invariant filters (e.g., `slug=$eq home-sneak`)

- **Dynamic (pass from alias call at runtime):**
  - path params: `:id`, `:documentId`, `:orderId`, `:slug`
  - search text and user-entered filter values
  - current-user values (resolved from context)
  - selected page number / cursor

- **Dynamic but constrained:**
  - values allowed only in whitelisted keys/operators
  - values range-limited (e.g., pageSize max)

---

## Proposed Alias Strategy

## 1) CMS list aliases (lock heavy query shape)

Create aliases that hide long query strings and keep client payload minimal.

Examples:
- Alias: `GET /api/cms/footers/draft`
  - underlying: `/api/cms-footers`
  - locked query: `status=draft`, `sort=["createdAt:desc"]`, `pagination.pageSize<=50`
  - runtime params: optional `page`, optional `search`

- Alias: `GET /api/cms/footers/published-ids`
  - underlying: `/api/cms-footers`
  - locked query: `status=published`, `fields=["documentId"]`, `pagination.pageSize<=200`
  - runtime params: optional page

Apply same pattern for:
- `/brands`
- `/categories`
- `/category-groups`

## 2) Business-scenario aliases for fixed filters

Example:
- Alias: `GET /api/store/home-sneak-banners`
  - underlying: `/api/product-groups`
  - locked query:
    - `filters.slug.$eq=home-sneak`
    - `populate=["cover_image","products.gallery","products.logo"]`
  - runtime params: none (or optional paging)

## 3) Detail aliases with pass-through dynamic path values

Examples:
- Alias: `GET /api/user/orders/:orderId`
  - underlying: `/api/web-orders/:orderId`
  - locked query: allowed populate contract
  - runtime params: `orderId`

- Alias: `POST /api/cms/brands/:documentId/publish`
  - underlying: `/api/brands/:documentId/publish`
  - runtime params: `documentId`

## 4) Write aliases with body augmentation/restrictions

Examples:
- Alias: `POST /api/order-management/return-requests`
  - underlying: `/api/return-requests`
  - request mutation: enforce owner/customer from auth context
  - request rules: disallow privileged fields

- Alias: `PUT /api/rider/me/status`
  - underlying: `/api/rider/me/status`
  - request rules: `status` must be allowed enum

---

## Resource Contract Recommendations

For each alias resource:

- `requestRules`
  - allowed query keys/operators
  - allowed populate paths
  - allowed fields/sort
  - filter enforcement/merge strategy

- `requestMutation`
  - add/override system fields (owner, updatedBy, domain)
  - strip forbidden fields from body

- `responseRules`
  - whitelist/strip fields (e.g., hide approval/private fields)

- `responseMutation`
  - final shaping if required

Follow project rules:
- parse query with `qs` semantics
- separate path and query in recorder-derived resources
- allow dynamic alias parameter values to pass through

---

## Suggested Initial Resource Backlog

High-value aliases to implement first:

1. `GET /api/cms/footers/draft`
2. `GET /api/cms/footers/published-ids`
3. `POST /api/cms/footers/:documentId/publish`
4. `POST /api/cms/footers/:documentId/unpublish`
5. `GET /api/order-management/delivery-zones`
6. `POST /api/order-management/delivery-zones`
7. `GET /api/store/home-sneak-banners`
8. `GET /api/user/orders/:orderId`
9. `POST /api/user/return-requests`
10. `PUT /api/rider/me/status`

These ten aliases cover repeated long-query patterns, publish workflows, and common create/update operations.

---

## Production Recording Strategy (Recommended)

A better long-term mapping method is to record actual production-day requests and analyze them periodically.

### Rollout mode alignment (parallel-safe adoption)

Use plugin `enforcementMode` to introduce aliases without disrupting existing systems:

- `observe`: run in shadow mode, collect real patterns, no blocking.
- `hybrid`: enforce where resources are ready, allow Users & Permissions fallback for unmatched/legacy routes.
- `enforce`: strict API Guard enforcement after domain-by-domain validation.

Recommended migration flow:

1. Start with `observe` in production-like traffic windows.
2. Build aliases for high-frequency request shapes from recorder logs.
3. Move selected domains/apps to `hybrid` while legacy authorization still runs.
4. Promote validated domains/apps to `enforce`.

Recommended approach:

- Persist recorder logs in database (not memory-only) for trend and replay analysis.
- Capture method, path, parsed query (`qs` semantics), body shape, response status, and frequency.
- Separate URL path from query object JSON for reliable rule extraction.
- Build alias/resource candidates from high-frequency repeated request shapes.
- Classify captured params into static (lock in resource) vs dynamic (pass from client at runtime).
- Require review/approval before promoting a recorded pattern into an active Resource alias.

This ensures ERP Resource mapping is driven by real usage patterns, reduces guesswork, and improves security by locking only proven stable query structures server-side.

## Notes and Limitations

- This is a static code scan; runtime-generated URLs may add additional variants.
- Non-Strapi endpoints should be excluded during Resource onboarding.
- Before activation, each alias should be validated against actual Strapi routes and content-type schemas.
