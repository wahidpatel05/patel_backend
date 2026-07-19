const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: 'Patel Industries' },
    address: { type: String, default: '' },
    branchAddress: { type: String, default: '' },
    gstin: { type: String, default: '' },
    udyogAadhar: { type: String, default: '' },
    mobile1: { type: String, default: '' },
    mobile2: { type: String, default: '' },
    email: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    jurisdiction: { type: String, default: '' },
    nextInvoiceNumber: { type: Number, default: 111 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
