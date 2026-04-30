# Copilot Instructions

## Project Guidelines
- Use `qs` semantics for parsing REST query strings; interpret Strapi query parameters as objects parsed with the `qs` library rather than naive key/value parsing. For recorder-derived resources, separate URL parts (path vs query) and store query parameters as JSON (parse with `qs`).
- Allow dynamic parameter values on aliased resources to pass through (e.g., `slug=index` and other runtime values on the same aliased route); avoid over-restricting or normalizing these values.

## Frontend & Accessibility
- Ensure every form field has its own associated input label (use `label` with matching `for`/`id` or wrap the input in the `label`).