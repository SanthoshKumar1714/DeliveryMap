// Whitelists which fields a user-provided payload is allowed to modify
// on a Location document. Used before Object.assign in both the direct
// PUT /locations/:id route and the edit-request approval flow, so that
// arbitrary/unexpected keys in req.body or proposedChanges (e.g. _id,
// version, status, createdBy, lastEditedBy) can never be written by a
// client, regardless of how the request reached this point.
//
// This is intentionally a hard whitelist, independent of Zod validation
// elsewhere in the request pipeline — defense in depth, not a replacement
// for validateUpdate.

const ALLOWED_LOCATION_FIELDS = [
  'name',
  'type',
  'customerPhones',
  'unitNumber',
  'notes',
];

// Returns a new object containing only the whitelisted fields present
// in the input. Fields not in ALLOWED_LOCATION_FIELDS are silently
// dropped — this is not meant to throw or warn, callers that need to
// validate shape/types should do so before or after this step.
function sanitizeLocationUpdate(input) {
  const sanitized = {};
  if (!input || typeof input !== 'object') {
    return sanitized;
  }

  for (const field of ALLOWED_LOCATION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      sanitized[field] = input[field];
    }
  }

  return sanitized;
}

module.exports = { sanitizeLocationUpdate, ALLOWED_LOCATION_FIELDS };