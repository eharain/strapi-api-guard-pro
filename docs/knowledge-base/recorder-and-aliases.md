# Recorder and Aliases

This page captures best practices for recorder-driven resource design and alias contracts.

## Why recorder-first design

Static assumptions about client traffic are usually wrong. Recorder data gives real patterns:

- repeated endpoints
- dominant query shapes
- actual filter/populate usage
- realistic action/method mix

Use recorder logs as primary evidence for Resource and Policy design.

## Recording strategy

Recommended approach:

1. Capture production-day traffic windows.
2. Persist logs in database (not memory-only).
3. Include method, path, query object, status, frequency, and last seen.
4. Periodically review and promote repeated patterns.

## Query handling: use `qs` semantics

Strapi query strings are structured objects (nested filters, arrays, populate paths). Always parse query using `qs` semantics.

Do not treat query as flat key-value text.

Examples requiring object parsing:

- `filters[slug][$eq]=index`
- `fields[]=title&fields[]=slug`
- `populate[]=category&populate[]=author.avatar`

## Path/query separation for recorder-derived resources

When promoting recorder entries:

- keep route path as path
- keep query as JSON object
- avoid storing entire URL as one opaque string

This enables reliable rule extraction and alias generation.

## Alias contract principles

1. Keep aliases short and stable.
2. Lock static filters server-side where needed.
3. Allow dynamic runtime values to pass through (for example `slug=index` or path ids).
4. Restrict dangerous query/body fields via policy rules.
5. Validate response shaping for public/mobile clients.

## Rollout guidance

Use staged enforcement:

- `observe`: collect and classify
- `hybrid`: partial enforcement with fallback
- `enforce`: strict policy-only authorization

Move domain-by-domain after validation.

## Promotion checklist

Before enabling a new alias/resource:

- route mapping validated
- action name verified
- policy rules reviewed
- grants assigned to intended roles
- test requests verified for allowed and denied cases
