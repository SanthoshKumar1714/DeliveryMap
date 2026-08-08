const express = require('express');
const Settings = require('../models/Settings');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get approval mode status
router.get('/approval-mode', async (req, res) => {
  try {
    let settings = await Settings.findById('global_settings');
    if (!settings) {
      settings = await Settings.create({ approvalMode: false });
    }
    res.json({ approvalMode: settings.approvalMode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle approval mode (admin only)
router.post('/approval-mode/toggle', adminMiddleware, async (req, res) => {
  try {
    let settings = await Settings.findById('global_settings');
    if (!settings) {
      settings = await Settings.create({});
    }

    settings.approvalMode = !settings.approvalMode;
    settings.approvalModeEnabledAt = new Date();
    await settings.save();

    res.json({
      approvalMode: settings.approvalMode,
      message: settings.approvalMode
        ? '✅ Approval mode enabled'
        : '❌ Approval mode disabled',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;