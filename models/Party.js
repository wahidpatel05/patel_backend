const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gstin: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true, 
      trim: true,
      match: [/^\d{2}[A-Z0-9]{13}$/, 'Please enter a valid 15-character GSTIN']
    },
    address: { type: String, required: true },
    mobile: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Party', partySchema);
