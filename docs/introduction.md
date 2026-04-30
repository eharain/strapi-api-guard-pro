# 🔒 Strapi API Guard Pro

## Enterprise-grade API Security and Access Control Plugin for Strapi

---

## What Is Strapi API Guard Pro?

**Strapi API Guard Pro** intercepts, augments, and restricts API requests before and after they reach Strapi — providing domain isolation, record-level filtering, ownership enforcement, field-level security, and clean URL aliases.

---

## The Problem It Solves

Strapi's default permissions only control **which users can access which endpoints**. Real applications need much more:

| Problem | Example |
|---------|---------|
| ❌ Warehouse isolation | "Staff should only see THEIR warehouse's inventory" |
| ❌ User-specific data | "Riders should only see TODAY'S deliveries assigned to THEM" |
| ❌ Privacy | "Employees should only see THEIR OWN HR records" |
| ❌ Assignment | "Support agents should only see THEIR assigned tickets" |
| ❌ Field hiding | "Managers should see team data but NOT salary fields" |
| ❌ Clean URLs | "Mobile apps need SHORT, SECURE URLs, not complex query strings" |

**Strapi API Guard Pro solves ALL of this.**

---

## How It Works
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ User │ │ INTERCEPT │ │ Strapi │ │ INTERCEPT │
│ Request │────▶│ (Before) │────▶│ API │────▶│ (After) │────▶│ Response │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
│ │
▼ ▼
"Only my records" "Hide salary field"
"Only today's tasks" "Only show name & price"
"Auto-add updatedBy" "Remove internal notes"

text

---

## Key Features

### 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **Request Interception** | Capture and modify every API request before processing |
| **Response Interception** | Strip sensitive data before sending to user |
| **Deny by Default** | Nothing is accessible unless explicitly allowed |
| **Field-Level Security** | Control exactly which fields each role can see/update |
| **Record-Level Security** | Filter which records each user can access |

### 🏢 Multi-Tenancy (App Domains)

| Feature | Description |
|---------|-------------|
| **Domain Isolation** | POS, HR, Warehouse users see only their data |
| **Header Detection** | `X-App-Name: pos` identifies the app context |
| **Cross-Domain Users** | Users can belong to multiple domains |

### 👥 Access Control

| Feature | Description |
|---------|-------------|
| **Two-Level System** | Domains (primary) + Groups (secondary) |
| **Group Inheritance** | Groups inherit permissions from parent groups |
| **Multiple Groups per User** | Union of all assigned group permissions |
| **Four Permission Levels** | Staff, Manager, Admin, Super-Admin |

### 📋 Resource Types

| Type | Description |
|------|-------------|
| **Standard Resources** | Basic CRUD endpoints (list, read, create, update, delete) |
| **Extended Resources** | Same endpoint with additional rules |
| **Alias Resources** | Pre-configured, locked queries with clean URLs |

---

## Request & Response Rules

### 🔧 Request Rules (Before Processing)

| Rule | Example | Effect |
|------|---------|--------|
| Dynamic User Filter | `filters[owner][$eq]=$user.id` | Only user's own records |
| Dynamic Team Filter | `filters[teamId][$in]=$user.teamIds` | Team members' records |
| Dynamic Date Filter | `filters[dueDate][$gte]=$today` | Future tasks only |
| Body Field Stripping | `stripBodyFields: ["approvedBy"]` | Remove disallowed fields |
| Force Body Fields | `forceBodyFields: { updatedBy: $user.id }` | Auto-set field values |
| Populate Restriction | `allowedPopulate: ["category"]` | Limit relations |
| Parameter Blacklisting | Block `filters[price]` | Prevent price manipulation |

### 📤 Response Rules (After Processing)

| Rule | Example | Effect |
|------|---------|--------|
| Field Allowing | `allowedFields: ["id", "name", "price"]` | Only return specific fields |
| Field Stripping | `stripFields: ["cost", "profit"]` | Remove sensitive fields |
| Nested Stripping | Strip fields from relations | Remove user password from response |

---

## Alias Resources (URL Management)

### Before Strapi API Guard Pro
GET /api/orders?filters[customerId][eq]=123&filters[status][ne]=cancelled&sort=createdAt:desc&populate=items.product

text

❌ User can modify customerId to see others' orders
❌ Long, complex, error-prone URL
❌ Hard to remember
❌ Not mobile-friendly

### After Strapi API Guard Pro
GET /api/store/my/orders

text

✅ Customer ID locked to current user (`$user.id`)
✅ Status filter locked (no cancelled orders)
✅ Sort order fixed
✅ Short, clean, secure URL
✅ Mobile app friendly

---

## Real-World Examples

### Example 1: Delivery Rider

```yaml
User: Ahmed (Rider)
Domain: delivery
Groups: rider

What Ahmed can do:
  ✅ GET /api/delivery/my/tasks        → Only HIS assigned deliveries
  ✅ PUT /api/delivery/tasks/:id/status → Update status, auto-set updatedBy=Ahmed

What Ahmed cannot do:
  ❌ See other riders' deliveries
  ❌ Modify assignedTo field
  ❌ Access POS or Warehouse domains
Example 2: Customer
yaml
User: Fatima (Customer)
Domain: store
Groups: customer

What Fatima can do:
  ✅ GET /api/store/featured       → Featured products only
  ✅ GET /api/store/my/orders      → Only HER orders
  ✅ POST /api/orders              → Creates order with HER as customer

What Fatima cannot do:
  ❌ See other customers' orders
  ❌ Modify product prices
  ❌ Access admin endpoints
Example 3: Store Manager
yaml
User: Omar (Manager)
Domains: admin, store
Groups: manager (admin), customer (store)

What Omar can do (admin domain):
  ✅ All products (CRUD)
  ✅ All orders (approve, reject)
  ✅ User list (view only)

What Omar can do (store domain):
  ✅ Same as customer (if he shops)

What Omar cannot do:
  ❌ Delete users (admin only)
  ❌ Access warehouse domain (not assigned)
Example 4: Multi-Warehouse Manager
yaml
User: Ali (Warehouse Manager)
Domain: warehouse
Groups: manager

What Ali can do:
  ✅ GET /api/warehouse/inventory?warehouse=A  → Warehouse A inventory
  ✅ GET /api/warehouse/inventory?warehouse=B  → Warehouse B inventory
  ✅ GET /api/warehouse/low-stock              → All warehouses low stock

What Ali cannot do:
  ❌ Access warehouse C (not assigned)
  ❌ See cost/profit fields (stripped from response)
  ❌ Delete inventory records (manager can't delete)
Technical Architecture
text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRAPI API GUARD PRO                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Domains    │───▶│   Resources  │───▶│   Policies   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │    Roles     │◀───│    Grants    │───▶│   Groups     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      INTERCEPTOR ENGINE                              │    │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │    │
│  │  │ Request Handler │───▶│  Strapi API    │───▶│ Response Handler│  │    │
│  │  │ (Add filters,   │    │  (Normal       │    │ (Strip fields,  │  │    │
│  │  │  strip fields)  │    │   Processing)  │    │  allow only)    │  │    │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CACHE LAYER                                  │    │
│  │                    (30-second permission cache)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
Installation
Step 1: Install the plugin
bash
npm install strapi-api-guard-pro
Step 2: Configure the plugin
Create or edit config/plugins.js:

javascript
module.exports = {
  'api-guard-pro': {
    enabled: true,
    config: {
      headerDomainKey: 'x-app-name',
      headerElevatedKey: 'x-app-admin',
      denyByDefault: true,
      interceptorEnabled: true,
      bypassPaths: ['/admin', '/_health', '/documentation'],
    },
  },
};
Step 3: Rebuild and restart
bash
npm run build
npm run develop
Quick Start Guide
Step 1: Create a Domain
http
POST /permission-manager-pro/entities/domains
Content-Type: application/json

{
  "key": "pos",
  "name": "Point of Sale",
  "description": "Retail point of sale operations"
}
Step 2: Create a Resource
http
POST /permission-manager-pro/entities/resources
Content-Type: application/json

{
  "key": "pos.products",
  "uid": "api::product.product",
  "methods": ["get", "post", "put"],
  "domain": 1
}
Step 3: Create a Policy
http
POST /permission-manager-pro/entities/policies
Content-Type: application/json

{
  "key": "products.read",
  "actions": ["read"],
  "effect": "allow",
  "resource": 1
}
Step 4: Create a Role
http
POST /permission-manager-pro/entities/roles
Content-Type: application/json

{
  "key": "pos.staff",
  "level": "staff",
  "domain": 1
}
Step 5: Create a Grant
http
POST /permission-manager-pro/entities/grants
Content-Type: application/json

{
  "key": "staff-can-read-products",
  "role": 1,
  "policy": 1
}
Step 6: Assign Role to User
http
PUT /permission-manager-pro/users/:userId/roles
Content-Type: application/json

{
  "roleIds": [1]
}
Step 7: Make Authenticated Request
http
GET /api/products
X-App-Name: pos
Authorization: Bearer <token>
Dynamic Values Reference
Value	Description	Example Usage
$user.id	Current user's ID	filters[owner][$eq]=$user.id
$user.teamIds	User's team IDs	filters[teamId][$in]=$user.teamIds
$today	Current date (YYYY-MM-DD)	filters[dueDate][$gte]=$today
$now	Current timestamp	forceBodyFields: { updatedAt: $now }
$activeDomain	Current app domain from header	filters[domain][$eq]=$activeDomain
$date:-30days	Date 30 days ago	filters[createdAt][$gte]=$date:-30days
$date:+7days	Date 7 days from now	filters[dueDate][$lte]=$date:+7days
Benefits Summary
Feature	Benefit
Domain Isolation	Separate applications share no data
Record-Level Security	Users see only their data
Field-Level Security	Hide sensitive fields per role
Ownership Enforcement	Users can't modify others' records
Team Access	Managers see team data
Clean URL Aliases	Short, secure, memorable URLs
Auto Field Injection	updatedBy, createdBy auto-set
Permission Caching	30-second cache for performance
Deny by Default	Security-first approach
Configuration Options
Option	Type	Default	Description
headerDomainKey	string	x-rutba-app	Header name for app domain
headerElevatedKey	string	x-rutba-app-admin	Header name for admin elevation
denyByDefault	boolean	true	Block if no matching resource
interceptorEnabled	boolean	true	Enable/disable request interceptor
bypassPaths	array	['/admin']	Paths to skip interception
API Endpoints
Method	Endpoint	Description
GET	/permission-manager-pro/overview	Statistics dashboard
GET	/permission-manager-pro/entities/:entity	List entities (domains, resources, roles, policies, grants)
POST	/permission-manager-pro/entities/:entity	Create entity
PUT	/permission-manager-pro/entities/:entity/:id	Update entity
DELETE	/permission-manager-pro/entities/:entity/:id	Delete entity
GET	/permission-manager-pro/users	List users with roles
PUT	/permission-manager-pro/users/:userId/roles	Assign roles to user
GET	/permission-manager-pro/clear-cache	Clear permission cache
GET	/permission-manager-pro/strapi-content-types	Discover Strapi content types
Support
📖 Documentation: GitHub Wiki

🐛 Issues: GitHub Issues

💬 Email: eharain@yahoo.com

🔗 GitHub: github.com/eharain

🔗 LinkedIn: linkedin.com/in/ejazarain

License
MIT License

In One Sentence
Strapi API Guard Pro intercepts every API request to add intelligent filters, enforce ownership, strip sensitive fields, and create clean URL aliases — giving you complete control over what data users can see, create, update, or delete.

