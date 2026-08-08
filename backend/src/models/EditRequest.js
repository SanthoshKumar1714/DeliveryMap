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
  },
  { timestamps: true }
);

module.exports = mongoose.model('EditRequest', EditRequestSchema);