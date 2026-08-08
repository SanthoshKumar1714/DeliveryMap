const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Partner = require('../models/Partner');
const { adminMiddleware, authMiddleware } = require('../middleware/auth');
const { authLimiter, locationPingLimiter } = require('../middleware/rateLimiter');
const Location = require('../models/Location');
const EditRequest = require('../models/EditRequest');

const router = express.Router();

// ============ REGISTER (public) ============
router.post('/register',authLimiter, async (req, res) => {
  try {
    const { name, phone, pin } = req.body;

    if (!name || !phone || !pin) {
      return res.status(400).json({ error: 'Name, phone, and PIN are required' });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    const existing = await Partner.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const partner = new Partner({
      name,
      phone,
      pin: hashedPin,
      status: 'pending',
    });

    await partner.save();

    res.status(201).json({
      message: 'Registration submitted. Awaiting admin approval.',
      partnerId: partner._id,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ LOGIN (public) ============
// ============ LOGIN (public) ============
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ error: 'Phone and PIN required' });
    }

    const partner = await Partner.findOne({ phone });
    if (!partner) {
      return res.status(401).json({ error: 'Invalid phone or PIN' });
    }

    // Check if account is currently locked
    if (partner.lockedUntil && partner.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((partner.lockedUntil - new Date()) / 60000);
      return res.status(423).json({
        error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
      });
    }

    const validPin = await bcrypt.compare(pin, partner.pin);

    if (!validPin) {
      partner.failedLoginAttempts = (partner.failedLoginAttempts || 0) + 1;

      if (partner.failedLoginAttempts >= 5) {
        partner.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        partner.failedLoginAttempts = 0; // reset counter once locked
      }

      await partner.save();
      return res.status(401).json({ error: 'Invalid phone or PIN' });
    }

    // Successful login — clear any failed attempt history
    if (partner.failedLoginAttempts > 0 || partner.lockedUntil) {
      partner.failedLoginAttempts = 0;
      partner.lockedUntil = null;
      await partner.save();
    }

    if (partner.disabled) {
  return res.status(403).json({ error: 'Your account has been disabled. Contact admin.' });
}

if (partner.status !== 'approved') {
  return res.status(403).json({
    error:
      partner.status === 'pending'
        ? 'Your registration is awaiting admin approval'
        : 'Your registration was rejected',
  });
}

    if (partner.status !== 'approved') {
      return res.status(403).json({
        error:
          partner.status === 'pending'
            ? 'Your registration is awaiting admin approval'
            : 'Your registration was rejected',
      });
    }

    const token = jwt.sign(
      { id: partner._id, role: partner.role, name: partner.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      partner: {
        id: partner._id,
        name: partner.name,
        role: partner.role,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: List pending partners ============
router.get('/pending', adminMiddleware, async (req, res) => {
  try {
    const pending = await Partner.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PARTNER: Report own location (called every 30s from mobile) ============
router.post('/me/location',authLimiter, locationPingLimiter,authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng (numbers) are required' });
    }

    await Partner.findByIdAndUpdate(req.user.id, {
      lastLocation: { lat, lng, updatedAt: new Date() },
    });

    res.json({ message: 'Location updated' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: Get all approved partners' last known locations ============
router.get('/locations', adminMiddleware, async (req, res) => {
  try {
    const partners = await Partner.find(
      { status: 'approved' },
      'name phone role lastLocation'
    );
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN: List all partners ============
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN: Approve partner ============
router.post('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    partner.status = 'approved';
    partner.approvedBy = req.user.id;
    partner.approvedAt = new Date();
    await partner.save();

    res.json({ partner, message: 'Partner approved' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: Reject partner ============
router.post('/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    partner.status = 'rejected';
    await partner.save();

    res.json({ partner, message: 'Partner rejected' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: Assign role (e.g. make Head Delivery Partner) ============
router.post('/:id/role', adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'head_delivery', 'delivery'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    partner.role = role;
    await partner.save();

    res.json({ partner, message: `Role updated to ${role}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: Delete/remove partner ============
// ============ ADMIN: Delete/remove partner ============
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    const partnerId = req.params.id;

    const [locationCount, editRequestCount] = await Promise.all([
      Location.countDocuments({ createdBy: partnerId }),
      EditRequest.countDocuments({ requestedBy: partnerId }),
    ]);

    if (locationCount > 0 || editRequestCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: this partner has ${locationCount} location(s) and ${editRequestCount} edit request(s) on record. Disable their access instead to preserve history, or reassign/remove that data first.`,
        locationCount,
        editRequestCount,
        canDisableInstead: true,
      });
    }

    await Partner.findByIdAndDelete(partnerId);
    res.json({ message: 'Partner removed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: Disable partner (revoke access, keep all their data intact) ============
router.post('/:id/disable', adminMiddleware, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    partner.disabled = true;
    await partner.save();

    res.json({ partner, message: 'Partner access disabled. Their history remains intact.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ADMIN: Re-enable a disabled partner ============
router.post('/:id/enable', adminMiddleware, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    partner.disabled = false;
    await partner.save();

    res.json({ partner, message: 'Partner access re-enabled.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;