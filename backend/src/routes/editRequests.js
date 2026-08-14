const express = require('express');
const { sanitizeLocationUpdate } = require('../utils/sanitizeLocationUpdate');
  const EditRequest = require('../models/EditRequest');
  const Location = require('../models/Location');
  const { authMiddleware, adminMiddleware, canEditFreelyMiddleware } = require('../middleware/auth');
  const { writeLimiter } = require('../middleware/rateLimiter');
  const router = express.Router();

  // Reviewed (approved/rejected) requests are auto-deleted this many days after
  // review, via the TTL index on EditRequest.expiresAt. Pending requests are
  // never touched — expiresAt only gets set once a decision is made.
  const REVIEWED_RETENTION_DAYS = 90;

  // ============ SUBMIT an edit/delete request (any delivery partner) ============
// was: router.post('/', authMiddleware, async (req, res) => {
router.post('/', authMiddleware, writeLimiter, async (req, res) => {
    try {
      const { locationId, requestType, proposedChanges, reason } = req.body;

      if (!locationId || !requestType) {
        return res.status(400).json({ error: 'locationId and requestType are required' });
      }

      const location = await Location.findById(locationId);
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Head delivery + admin can skip the request queue and act directly
      if (req.user.role === 'admin' || req.user.role === 'head_delivery') {
        if (requestType === 'delete') {
          if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can delete directly' });
          }
          await Location.findByIdAndDelete(locationId);
          return res.json({ message: 'Location deleted directly (elevated permissions)' });
        } else {
  Object.assign(location, sanitizeLocationUpdate(proposedChanges));
  location.lastEditedBy = req.user.id;
  location.lastEditedAt = new Date();
  location.version += 1;
  await location.save();
  return res.json({ location, message: 'Location updated directly (elevated permissions)' });
}
      }

      // Regular delivery partner — create a pending request instead
      // Regular delivery partner — create a pending request instead
const editRequest = new EditRequest({
  locationId,
  requestType,
  proposedChanges: proposedChanges || {},
  baseVersion: location.version, // snapshot current version to detect conflicts later
  reason,
  requestedBy: req.user.id,
  requestedByName: req.user.name,
});
      await editRequest.save();

      res.status(201).json({
        editRequest,
        message: `${requestType === 'delete' ? 'Delete' : 'Edit'} request submitted for admin approval`,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ ADMIN: List pending edit requests ============
  router.get('/pending', adminMiddleware, async (req, res) => {
    try {
      const requests = await EditRequest.find({ status: 'pending' })
        .populate('locationId')
        .sort({ createdAt: -1 });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ADMIN: Approve edit/delete request ============
 // ============ ADMIN: Approve edit/delete request ============
router.post('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const editRequest = await EditRequest.findById(req.params.id);
    if (!editRequest) return res.status(404).json({ error: 'Request not found' });
    if (editRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request already reviewed' });
    }

    const location = await Location.findById(editRequest.locationId);
    if (!location) return res.status(404).json({ error: 'Location no longer exists' });

    // Conflict check: has this location been modified since the request was submitted?
    if (location.version !== editRequest.baseVersion) {
      return res.status(409).json({
        error: 'This location was modified after the request was submitted. Please review the current location details before approving.',
        currentVersion: location.version,
        requestBaseVersion: editRequest.baseVersion,
      });
    }

    if (editRequest.requestType === 'delete') {
  await Location.findByIdAndDelete(editRequest.locationId);
} else {
  Object.assign(location, sanitizeLocationUpdate(editRequest.proposedChanges));
  location.lastEditedBy = editRequest.requestedBy;
  location.lastEditedAt = new Date();
  location.version += 1;
  await location.save();
}

    editRequest.status = 'approved';
    editRequest.reviewedBy = req.user.id;
    editRequest.reviewedAt = new Date();
    editRequest.expiresAt = new Date(Date.now() + REVIEWED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await editRequest.save();

    res.json({ message: `${editRequest.requestType} request approved and applied` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

  // ============ ADMIN: Reject edit/delete request ============
  router.post('/:id/reject', adminMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const editRequest = await EditRequest.findById(req.params.id);
      if (!editRequest) return res.status(404).json({ error: 'Request not found' });

      editRequest.status = 'rejected';
      editRequest.reviewedBy = req.user.id;
      editRequest.reviewedAt = new Date();
      editRequest.rejectionReason = reason;
      editRequest.expiresAt = new Date(Date.now() + REVIEWED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await editRequest.save();

      res.json({ message: 'Request rejected' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  module.exports = router;