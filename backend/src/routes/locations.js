const express = require('express');
const { sanitizeLocationUpdate } = require('../utils/sanitizeLocationUpdate');
const Location = require('../models/Location');
const Settings = require('../models/Settings');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { searchLimiter, writeLimiter } = require('../middleware/rateLimiter');
const { validateCreate, validateUpdate } = require('../validators/locationValidator');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============ GET ROUTES ============

// Get all locations within radius + search
// was: router.get('/', async (req, res) => {
router.get('/', searchLimiter, optionalAuthMiddleware, async (req, res) => {
  try {
    const { lat, lng, radius = 30, search } = req.query;

    const isAdmin = req.user?.role === 'admin';
    let matchStage = {};
    if (!isAdmin) {
      matchStage.status = 'active';
    }
    if (search) {
      matchStage.$text = { $search: search };
    }

    let locations;

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusMeters = parseFloat(radius) * 1000; // $geoNear wants meters

      locations = await Location.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lngNum, latNum] },
            distanceField: 'distanceKm',
            maxDistance: radiusMeters,
            spherical: true,
            query: matchStage,
          },
        },
        { $addFields: { distanceKm: { $divide: ['$distanceKm', 1000] } } },
        { $limit: 1000 },
      ]);
    } else {
      locations = await Location.find(matchStage).limit(1000);
    }

    res.json(locations);
  } catch (error) {
    console.error('GET /locations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Haversine formula: real distance in km between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get pending locations (admin only)
router.get('/pending', adminMiddleware, async (req, res) => {
  try {
    const pending = await Location.find({ status: 'pending' }).sort({
      createdAt: -1,
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single location
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ POST ROUTES ============

// Add new location (respects approval mode)
// was: router.post('/', authMiddleware, async (req, res) => {
// was: router.post('/', authMiddleware, writeLimiter, async (req, res) => {
router.post('/', authMiddleware, writeLimiter, validateCreate, async (req, res) => {
  try {
    const settings = await Settings.findById('global_settings');
    const approvalMode = settings?.approvalMode || false;

    const newLocation = new Location({
      ...req.body,
      createdBy: req.user.id,
      status: approvalMode ? 'pending' : 'active',
    });

    await newLocation.save();

    res.status(201).json({
      location: newLocation,
      message: approvalMode
        ? 'Location added, awaiting approval'
        : 'Location added successfully',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ PUT ROUTES ============

// Edit location (respects approval mode)
// was: router.put('/:id', authMiddleware, async (req, res) => {
// was: router.put('/:id', authMiddleware, writeLimiter, async (req, res) => {
router.put('/:id', authMiddleware, writeLimiter, validateUpdate, async (req, res) => {
  try {
    const settings = await Settings.findById('global_settings');
    const approvalMode = settings?.approvalMode || false;

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // If approval mode is ON and location was active, move to pending
    if (approvalMode && location.status === 'active') {
      location.status = 'pending';
      location.reviewedBy = null;
      location.reviewedAt = null;
    }

    // Update fields
// Update fields
Object.assign(location, sanitizeLocationUpdate(req.body));
location.lastEditedBy = req.user.id;
location.lastEditedAt = new Date();
location.version += 1;

    await location.save();

    res.json({
      location,
      message: approvalMode
        ? 'Location updated, awaiting re-approval'
        : 'Location updated successfully',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ APPROVAL ROUTES ============

// Approve location (admin only)
router.post('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (location.status === 'active') {
      return res.status(400).json({ error: 'Already approved' });
    }

    location.status = 'active';
    location.reviewedBy = req.user.id;
    location.reviewedAt = new Date();
    location.rejectionReason = null;

    await location.save();

    res.json({ location, message: 'Location approved' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reject location (admin only)
router.post('/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    location.status = 'rejected';
    location.reviewedBy = req.user.id;
    location.reviewedAt = new Date();
    location.rejectionReason = reason;

    await location.save();

    res.json({ location, message: 'Location rejected' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ DELETE ROUTES ============

// Delete location (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;