const Settings = require('./models/Settings');
const Invoice = require('./models/Invoice');

const defaultSettings = {
  businessName: 'Patel Industries',
  address:
    'Mauli Bharat Udyog Nagar Industrial Estate, 1st Floor, Gala No. 51, Babasaheb Kotkar Road, Behind Sainath Industrial Estate, Goregaon (East), Mumbai - 400 063',
  branchAddress:
    'No. 6, Aasharam Waghral Pada, Mangurni Gaon, Rajawal Boidapada, Sativali, Vasai (E), Dist. Palghar',
  gstin: '27AAAFP1402F1ZV',
  udyogAadhar: 'MH17A0062572',
  mobile1: '9987567861',
  mobile2: '98192 82701',
  email: 'patelindustries92@gmail.com',
  bankName: 'CANARA BANK',
  bankBranch: 'Goregaon SME',
  ifsc: 'CNRB0015017',
  accountNumber: '50171400000575',
  jurisdiction: 'Mumbai',
  nextInvoiceNumber: 73,
};

const sampleInvoice = {
  invoiceNumber: 72,
  invoiceDate: '2026-06-13',
  buyerName: 'Wholesale Dock LLP',
  buyerAddress: 'Plot No. 3, Green Park 2, Behind Mathura Hotel, Kaman Bhivandi Road, Vasai (E)',
  buyerGstin: '27AACFW4913C1ZE',
  buyerStateCode: '27',
  buyerMobile: '',
  items: [
    {
      description: 'Vibrator pad 8x12 + 2 FebTep + 50mm pal',
      hsnCode: '3923',
      quantity: 25000,
      unit: 'PCS',
      rate: 0.95,
      amount: 23750,
    },
    {
      description: 'Vibrator pad 8x12 + 2 FebTep + 50mm pal',
      hsnCode: '3923',
      quantity: 22600,
      unit: 'PCS',
      rate: 0.74,
      amount: 16724,
    },
  ],
  gstType: 'INTRA_STATE',
  subtotal: 40474,
  cgstRate: 9,
  cgstAmount: 3642.66,
  sgstRate: 9,
  sgstAmount: 3642.66,
  igstRate: 0,
  igstAmount: 0,
  roundOff: -0.32,
  grandTotal: 47759,
  amountInWords: 'Forty Seven Thousand Seven Hundred Fifty Nine Rupees Only',
};

async function seedDatabase() {
  const existingSettings = await Settings.findOne();

  if (!existingSettings) {
    await Settings.create(defaultSettings);
    await Invoice.findOneAndUpdate(
      { invoiceNumber: sampleInvoice.invoiceNumber },
      sampleInvoice,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = seedDatabase;
