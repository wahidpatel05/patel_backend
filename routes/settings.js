const express = require('express');
const Settings = require('../models/Settings');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update settings' });
  }
});

module.exports = router;
