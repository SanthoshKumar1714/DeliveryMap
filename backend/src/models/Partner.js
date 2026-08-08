const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pin: { type: String, required: true }, // hashed, 4-6 digits

    role: {
      type: String,
      enum: ['admin', 'head_delivery', 'delivery'],
      default: 'delivery',
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    disabled: { type: Boolean, default: false },

    approvedBy: String,
    approvedAt: Date,
    lastLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', PartnerSchema);