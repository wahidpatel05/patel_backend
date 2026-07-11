const express = require('express');
const Party = require('../models/Party');

const router = express.Router();

// Get all parties
router.get('/', async (req, res) => {
  try {
    const parties = await Party.find().sort({ name: 1 });
    return res.json({ parties });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load parties' });
  }
});

// Get party by GSTIN
router.get('/by-gstin/:gstin', async (req, res) => {
  try {
    const gstin = String(req.params.gstin || '').trim().toUpperCase();

    if (!/^\d{2}[A-Z0-9]{13}$/.test(gstin)) {
      return res.status(400).json({ message: 'Invalid GSTIN format.' });
    }

    const party = await Party.findOne({ gstin });

    if (!party) {
      return res.status(404).json({ message: 'No party found for this GSTIN.' });
    }

    return res.json({
      gstin: party.gstin,
      buyerName: party.name,
      buyerAddress: party.address,
      buyerMobile: party.mobile,
      buyerStateCode: party.gstin.slice(0, 2)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to look up party.' });
  }
});

// Create or update party
router.post('/', async (req, res) => {
  try {
    const { name, gstin, address, mobile } = req.body;

    if (!name || !gstin || !address) {
      return res.status(400).json({ message: 'Name, GSTIN, and Address are required.' });
    }

    const formattedGstin = String(gstin).trim().toUpperCase();
    if (!/^\d{2}[A-Z0-9]{13}$/.test(formattedGstin)) {
      return res.status(400).json({ message: 'Invalid GSTIN format.' });
    }

    // Check if party with this GSTIN already exists
    let party = await Party.findOne({ gstin: formattedGstin });

    if (party) {
      // Update existing party details
      party.name = name;
      party.address = address;
      party.mobile = mobile || '';
      await party.save();
      return res.status(200).json(party);
    } else {
      // Create new party
      party = await Party.create({
        name,
        gstin: formattedGstin,
        address,
        mobile: mobile || ''
      });
      return res.status(201).json(party);
    }
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save party.' });
  }
});

// Delete party
router.delete('/:id', async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found.' });
    }
    return res.json({ message: 'Party deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete party.' });
  }
});

module.exports = router;
