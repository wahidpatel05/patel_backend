const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    hsnCode: { type: String, default: '3923' },
    quantity: { type: Number, default: 0 },
    bags: { type: Number, default: null },
    unit: { type: String, enum: ['PCS', 'KG', 'BOX', 'ROLL'], default: 'PCS' },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: Number, required: true, unique: true },
    invoiceDate: { type: String, required: true },
    buyerName: { type: String, default: '' },
    buyerAddress: { type: String, default: '' },
    buyerGstin: { type: String, default: '' },
    buyerStateCode: { type: String, default: '' },
    buyerMobile: { type: String, default: '' },
    items: { type: [lineItemSchema], default: [] },
    gstType: { type: String, enum: ['INTRA_STATE', 'INTER_STATE'], default: 'INTRA_STATE' },
    subtotal: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountInWords: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
