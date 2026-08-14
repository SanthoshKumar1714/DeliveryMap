const mongoose = require('mongoose');

const EditRequestSchema = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    requestType: { type: String, enum: ['edit', 'delete'], required: true },

    // For edits: the proposed new field values. For deletes: can be empty.
    proposedChanges: { type: mongoose.Schema.Types.Mixed },

    // Snapshot of Location.version at the moment this request was submitted.
    // Used to detect if the location changed elsewhere before this request gets approved.
    baseVersion: { type: Number, required: true },

    reason: String, // why the partner wants this change

    requestedBy: { type: String, required: true }, // partner id
    requestedByName: String,

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    reviewedBy: String,
    reviewedAt: Date,
    rejectionReason: String,

    // Set only when status moves to approved/rejected — see routes.
    // MongoDB's TTL monitor deletes the document once this timestamp is reached.
    // Pending requests never get this field set, so they're never auto-deleted.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index — MongoDB checks this in the background (~every 60s) and removes
// any document once its expiresAt timestamp has passed. Documents with
// expiresAt: null are simply never picked up, so pending requests are safe.
EditRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EditRequest', EditRequestSchema);