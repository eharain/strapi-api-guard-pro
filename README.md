# 🔒 Strapi API Guard Pro

Enterprise-grade API security and access control for Strapi 5.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/eharain/strapi-api-guard-pro)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Strapi](https://img.shields.io/badge/Strapi-5.x-purple.svg)](https://strapi.io)

---

## Table of Contents

- [Overview](#overview)
- [Problem It Solves](#problem-it-solves)
- [Key Features](#key-features)
- [Request/Response Flow](#requestresponse-flow)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Admin API Endpoints](#admin-api-endpoints)
- [Dynamic Values](#dynamic-values)
- [Programmatic API](#programmatic-api)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Strapi API Guard Pro** intercepts and enforces access rules before and after Strapi handlers run.

It provides:
- domain isolation
- record-level filtering
- ownership enforcement
- field-level response security
- clean URL aliases

> Every request is intercepted twice: once before Strapi (to enforce query/body rules) and once after Strapi (to sanitize output).

## Problem It Solves

Strapi default permissions answer: *"Can this role call this endpoint?"*  
Real systems also need: *"Which records and which fields are visible to this user in this app domain?"*

| Gap | Example |
|---|---|
| Tenant/domain separation | Staff should only see their domain data |
| User-scoped access | Rider should only see assigned deliveries |
| Field privacy | Managers can view records but not salary fields |
| Locked queries | Mobile app needs fixed secure filters |

## Key Features

### Security

| Feature | Description |
|---|---|
| Request Interception | Modify query/body before controller execution |
| Response Interception | Strip or whitelist response fields |
| Deny by Default | Block unmatched resources unless explicitly allowed |
| Field-Level Security | Restrict sensitive attributes |
| Record-Level Security | Enforce user/domain/team filters |

### Multi-Tenancy

| Feature | Description |
|---|---|
| Domain Isolation | Separate access by app/domain |
| Header Detection | Detect domain using `x-app-name` |
| Cross-Domain Users | Users can hold roles in multiple domains |

### Access Control

| Feature | Description |
|---|---|
| Domain + Group model | Primary and secondary access layers |
| Group inheritance | Parent group permission inheritance |
| Multi-role support | Union of effective permissions |
| Permission levels | staff, manager, admin, super-admin |

### Resource Types

| Type | Description |
|---|---|
| Standard | Basic CRUD endpoint guards |
| Extended | Standard endpoint + stricter rules |
| Alias | Clean URL mapped to locked resource behavior |

## Request/Response Flow

```text
Client Request
  -> Request Interceptor
     - resolve domain/user context
     - enforce resource and permission checks
     - inject filters and body constraints
  -> Strapi Controller/Service
  -> Response Interceptor
     - keep allowed fields
     - strip sensitive fields
  -> Safe Response
```

## Installation

### 1) Install

```bash
npm install strapi-api-guard-pro
```

### 2) Configure plugin (`config/plugins.js`)

```javascript
module.exports = {
  'api-guard-pro': {
    enabled: true,
    config: {
      headerDomainKey: 'x-app-name',
      domainQueryKey: '_domain',
      headerElevatedKey: 'x-app-admin',
      denyByDefault: true,
      interceptorEnabled: true,
      bypassPaths: ['/admin', '/_health', '/documentation', '/uploads'],
      cacheTTL: 30000,
      enableAdminUI: true,
      enableLogging: true,
      logLevel: 'info',
    },
  },
};
```

### 3) Ensure user relation

If using Users & Permissions, add `permission_roles` relation on user model.

### 4) Rebuild and start

```bash
npm run build
npm run develop
```

## Quick Start

### Create Domain

```http
POST /api-guard-pro/entities/domains
Content-Type: application/json

{
  "key": "pos",
  "name": "Point of Sale",
  "description": "Retail point of sale operations"
}
```

### Create Resource

```http
POST /api-guard-pro/entities/resources
Content-Type: application/json

{
  "key": "pos.products",
  "displayName": "POS Products",
  "method": "GET",
  "pathPattern": "/api/products",
  "contentTypeUid": "api::product.product",
  "type": "standard",
  "domain": 1
}
```

### Create Policy

```http
POST /api-guard-pro/entities/policies
Content-Type: application/json

{
  "key": "products.read",
  "name": "Read Products",
  "actions": ["read"],
  "effect": "allow",
  "resource": 1
}
```

### Create Role + Grant

```http
POST /api-guard-pro/entities/roles
Content-Type: application/json

{
  "key": "pos.staff",
  "name": "POS Staff",
  "level": "staff",
  "domain": 1
}
```

```http
POST /api-guard-pro/entities/grants
Content-Type: application/json

{
  "key": "staff-can-read-products",
  "role": 1,
  "policy": 1
}
```

### Assign Role to User

```http
PUT /api-guard-pro/users/1/roles
Content-Type: application/json

{
  "roleIds": [1]
}
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| headerDomainKey | string | `x-app-name` | Domain header key |
| domainQueryKey | string | `_domain` | Domain query key |
| headerElevatedKey | string | `x-app-admin` | Elevation header key |
| denyByDefault | boolean | `true` | Block when resource not matched |
| interceptorEnabled | boolean | `true` | Enable request/response interception |
| bypassPaths | string[] | `['/admin','/_health','/documentation','/uploads']` | Excluded paths |
| cacheTTL | number | `30000` | Permission cache TTL in ms |
| enableAdminUI | boolean | `true` | Show plugin admin UI |
| enableLogging | boolean | `true` | Enable plugin logs |
| logLevel | string | `info` | `debug`, `info`, `warn`, `error` |

## Admin API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api-guard-pro/overview` | Dashboard stats |
| GET | `/api-guard-pro/entities/:entity` | List entities |
| POST | `/api-guard-pro/entities/:entity` | Create entity |
| PUT | `/api-guard-pro/entities/:entity/:id` | Update entity |
| DELETE | `/api-guard-pro/entities/:entity/:id` | Delete entity |
| GET | `/api-guard-pro/users` | List users + roles |
| PUT | `/api-guard-pro/users/:userId/roles` | Assign roles |
| GET | `/api-guard-pro/strapi-content-types` | List Strapi collection types |
| GET | `/api-guard-pro/clear-cache` | Clear permission cache |

Supported entities: `domains`, `resources`, `roles`, `policies`, `grants`, `groups`.

## Dynamic Values

| Value | Meaning | Example |
|---|---|---|
| `$user.id` | Current user ID | `filters.owner.$eq = $user.id` |
| `$user.teamIds` | Current user team IDs | `filters.teamId.$in = $user.teamIds` |
| `$activeDomain` | Active domain key | `filters.domain.$eq = $activeDomain` |
| `$today` | Current date (`YYYY-MM-DD`) | date filtering |
| `$now` | Current timestamp | auto `updatedAt` |
| `$date:-30days` | Relative past date | last 30 days |
| `$date:+7days` | Relative future date | upcoming 7 days |

## Programmatic API

```javascript
const allowed = await strapi.apiGuard.can({
  user: ctx.state.user,
  action: 'read',
  resourceUid: 'api::product.product',
  context: { activeDomain: 'pos' },
});

strapi.apiGuard.clearCache(userId);
strapi.apiGuard.clearAllCache();
```

## Examples

### Alias Resource (Clean URL)

**Internal target**:

```text
GET /api/orders?filters[customerId][eq]=123&filters[status][ne]=cancelled
```

**Public alias**:

```text
GET /api/store/my/orders
```

```json
{
  "key": "store.my-orders",
  "type": "alias",
  "method": "GET",
  "pathPattern": "/api/orders",
  "aliasPath": "/api/store/my/orders",
  "requestRules": {
    "dynamicFilters": [
      { "path": "filters.customerId", "value": "$user.id" },
      { "path": "filters.status.ne", "value": "cancelled" }
    ]
  }
}
```

## Troubleshooting

| Issue | Resolution |
|---|---|
| 403 on all endpoints | Check `denyByDefault` and ensure resources/policies/grants exist |
| Domain not detected | Confirm request header matches `headerDomainKey` |
| Changes not reflected | Clear cache via `/api-guard-pro/clear-cache` |
| Roles not loading | Verify `permission_roles` relation on user model |

Enable debug logs:

```javascript
module.exports = {
  'api-guard-pro': {
    enabled: true,
    config: { logLevel: 'debug' },
  },
};
```

## Support

- Email: eharain@yahoo.com
- Issues: GitHub Issues
- GitHub: https://github.com/eharain/strapi-api-guard-pro
- LinkedIn: https://linkedin.com/in/ejazarain

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add some amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE).
