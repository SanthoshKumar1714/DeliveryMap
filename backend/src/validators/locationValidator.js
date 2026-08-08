const { z } = require('zod');

// Fields a partner is allowed to set when creating a location.
// Notably excludes: status, createdBy, reviewedBy, reviewedAt, version, lastEditedBy, lastEditedAt
// — those are system-controlled and must never come from the client.
const createLocationSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  type: z.enum(['home', 'building']),
  name: z.string().min(1, 'name is required').max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  unitNumber: z.string().max(50).optional().nullable(),
  houseNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  customerPhones: z.array(z.string().max(20)).optional(),
});

// Same allowed fields for edits — still no status/version/reviewedBy etc.
const updateLocationSchema = createLocationSchema.partial();

function validateCreate(req, res, next) {
  const result = createLocationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid location data',
      details: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
  req.body = result.data; // strips any extra/unexpected fields automatically
  next();
}

function validateUpdate(req, res, next) {
  const result = updateLocationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid location data',
      details: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
  req.body = result.data; // strips any extra/unexpected fields automatically
  next();
}

module.exports = { validateCreate, validateUpdate };