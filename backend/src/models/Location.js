const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema(
  {
    // Basic Info
    customerId: { type: String, required: true },
    type: { type: String, enum: ['home', 'building'], required: true },
    name: { type: String, required: true },

    // Coordinates
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

    // GeoJSON mirror of lat/lng, kept in sync automatically (see pre-save hook below).
    // Required for $geoNear / 2dsphere queries — MongoDB can't index plain lat/lng pairs.
    geo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat] — GeoJSON order, NOT lat/lng
    },

    // Address Details
    unitNumber: String,      // null for buildings
    houseNumber: String,     // null for buildings
    notes: String,
    customerPhones: [String], // Array of phone numbers

    // Status & Approval
    status: {
      type: String,
      enum: ['active', 'pending', 'rejected'],
      default: 'active',
    },

    // Tracking
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastEditedBy: String,
    lastEditedAt: Date,

    // Approval Details
    reviewedBy: String,
    reviewedAt: Date,
    rejectionReason: String,
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Keep `geo` in sync with lat/lng whenever a document is saved (create or update via .save()).
LocationSchema.pre('save', function () {
  if (this.isModified('lat') || this.isModified('lng') || this.isNew) {
    this.geo = { type: 'Point', coordinates: [this.lng, this.lat] };
  }
});

// Indexes for fast queries
LocationSchema.index({ lat: 1, lng: 1 });
LocationSchema.index({ customerPhones: 'text', name: 'text' });
LocationSchema.index({ status: 1 });
LocationSchema.index({ geo: '2dsphere' }); // powers $geoNear

module.exports = mongoose.model('Location', LocationSchema);