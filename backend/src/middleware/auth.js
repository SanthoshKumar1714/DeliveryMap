const jwt = require('jsonwebtoken');
const Partner = require('../models/Partner');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const partner = await Partner.findById(decoded.id);
    if (!partner) {
      return res.status(401).json({ error: 'Account no longer exists. Please contact admin.' });
    }
    if (partner.disabled) {
      return res.status(403).json({ error: 'Your account has been disabled. Contact admin.' });
    }
    if (partner.status !== 'approved') {
      return res.status(403).json({ error: 'Your account access has been revoked.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

const canEditFreelyMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'head_delivery') {
      return res.status(403).json({ error: 'Elevated permissions required' });
    }
    next();
  });
};

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const partner = await Partner.findById(decoded.id);
      if (partner && !partner.disabled && partner.status === 'approved') {
        req.user = decoded;
      }
    }
  } catch (error) {
    // Invalid/expired token on an optional route — just proceed as anonymous
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, canEditFreelyMiddleware, optionalAuthMiddleware };