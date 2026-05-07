'use strict';

/**
 * Response interceptor for the api-guard-pro plugin.
 *
 * In the new model the response shape is already constrained at request time
 * via `policy.query.fields` / `populate`. This service stays as a thin helper
 * for any consumer that wants to additionally trim a response body.
 */

const stripFields = (data, fieldsToStrip = []) => {
  if (!data || typeof data !== 'object' || !fieldsToStrip.length) return data;
  if (Array.isArray(data)) return data.map((item) => stripFields(item, fieldsToStrip));
  const out = { ...data };
  for (const f of fieldsToStrip) delete out[f];
  return out;
};

const pickFields = (data, allowedFields = []) => {
  if (!data || typeof data !== 'object' || !allowedFields.length) return data;
  if (Array.isArray(data)) return data.map((item) => pickFields(item, allowedFields));
  const out = {};
  for (const f of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, f)) out[f] = data[f];
  }
  if (data.id != null && out.id == null) out.id = data.id;
  if (data.documentId != null && out.documentId == null) out.documentId = data.documentId;
  return out;
};

module.exports = () => ({
  stripFields,
  pickFields,
  // Back-compat alias so older callers still work.
  filterFields: pickFields,
});
