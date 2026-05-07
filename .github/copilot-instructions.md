# Copilot Instructions

## Project Guidelines
- Use `qs` semantics for parsing REST query strings; interpret Strapi query parameters as objects parsed with the `qs` library rather than naive key/value parsing. For recorder-derived resources, record actual production-day requests and persist recording logs in the database; when creating resources from recordings, separate URL parts (path vs query) and store query parameters as JSON (parse with `qs`); analyze persisted logs to drive API Resource alias design.
- Allow dynamic parameter values on aliased resources to pass through (e.g., `slug=index` and other runtime values on the same aliased route); avoid over-restricting or normalizing these values.

### Code Scanning
- When scanning ERP code for API usage, search only source code files (e.g., .js, .jsx, .ts, .tsx) and skip directories starting with a dot.

### Plugin Technical Docs
- Describe Resource as an interceptor layer that maps request URLs to content-type controller actions.
- Support shortened alias URLs and allow aliasing to route to underlying content-type controllers.
- Define and document preconfigured query/filter/populate/fields rules applied by the Resource.
- Document automatic request body augmentation and restrictions applied by the Resource (what is added, removed, or validated).
- For the plugin UI, make the import/export workflow file-based only; do not implement textarea-based import.
- Simplify plugin database schemas to align with the compact import/export layout: model domains, roles, and resources for file-based interchange, and embed policies/grants-per-action within resource records to support compact import/export.

## Frontend & Accessibility
- Ensure every form field has its own associated input label (use `label` with matching `for`/`id` or wrap the input in the `label`).