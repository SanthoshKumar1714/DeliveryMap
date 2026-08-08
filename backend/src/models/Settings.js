const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global_settings' },
  approvalMode: { type: Boolean, default: false },
  approvalModeEnabledAt: Date,
});

module.exports = mongoose.model('Settings', SettingsSchema);