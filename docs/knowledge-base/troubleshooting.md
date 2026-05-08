# Troubleshooting

Common issues and fixes for Strapi API Guard Pro.

## 1) Admin UI changes are not visible

Symptoms:

- Code is updated in plugin `admin/src`, but UI looks unchanged.

Cause:

- Host Strapi app admin bundle is stale.

Fix:

1. Stop host Strapi server.
2. In host Strapi app (not plugin folder), clear cache/build if needed.
3. Rebuild and restart host admin.

Typical commands (host app):

- `npm run build`
- `npm run develop`

## 2) Initial policy form missing on new resource

Symptoms:

- New Resource form opens but policy section is absent.

Checks:

- ensure flow started from Content Types -> Use or Recordings -> Create Resource
- verify this is a new record flow, not edit flow
- verify host admin bundle is rebuilt

Technical expectation:

- new resource flow should carry initial policy draft state and render policy form block

## 3) Policy appears but does not apply

Symptoms:

- Request passes/blocks unexpectedly despite policy existing.

Checks:

- policy is active
- grant exists and is active
- user has the intended role
- action name normalization matches runtime action
- domain context headers are correct

## 4) Role/domain labels show undefined text in list UI

Symptoms:

- list cards show values like `#undefined`.

Cause:

- display helper expects object fields but receives primitive string.

Fix:

- update label rendering helper to support string/number primitives.

## 5) Grouped list behavior seems wrong with pagination

Symptoms:

- grouped sections look fragmented or unordered.

Cause:

- pagination applied before stable grouping sort.

Fix:

- pre-sort filtered list by group key (resource/content type), then paginate and render grouped slices.

## 6) Recorder suggestions are low quality

Symptoms:

- generated resources do not reflect real access patterns.

Cause:

- insufficient or non-representative recorded traffic.

Fix:

- capture production-day windows
- persist logs and analyze frequency
- promote only stable repeated patterns

## 7) Alias query handling breaks for nested filters

Symptoms:

- nested filters/populate contracts fail unexpectedly.

Cause:

- flat query parsing instead of `qs` semantics.

Fix:

- parse/stored query as object using `qs`
- keep path and query separate in persisted records
