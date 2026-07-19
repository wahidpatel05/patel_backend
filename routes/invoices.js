const express = require('express');
const Invoice = require('../models/Invoice');
const Settings = require('../models/Settings');
const { sendInvoiceNotification } = require('../lib/mailer');

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const query = {};

    if (search) {
      const isNumericSearch = /^\d+$/.test(search);
      query.$or = [
        { buyerName: { $regex: search, $options: 'i' } },
      ];

      if (isNumericSearch) {
        query.$or.push({ invoiceNumber: Number(search) });
        query.$or.push({ invoiceNumber: Number.parseInt(search, 10) });
      }
    }

    const invoices = await Invoice.find(query).sort({ invoiceNumber: -1 });
    return res.json({ invoices });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load invoices' });
  }
});

router.get('/next-number', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const settingsNext = settings ? settings.nextInvoiceNumber : 111;

    // Also check the highest existing invoice to avoid collisions
    const lastInvoice = await Invoice.findOne().sort({ invoiceNumber: -1 }).select('invoiceNumber');
    const dbNext = lastInvoice ? lastInvoice.invoiceNumber + 1 : 111;

    return res.json({ nextInvoiceNumber: Math.max(settingsNext, dbNext) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load next invoice number' });
  }
});

router.get('/lookup/by-gstin/:gstin', async (req, res) => {
  try {
    const gstin = String(req.params.gstin || '').trim().toUpperCase();

    if (!/^\d{2}[A-Z0-9]{13}$/.test(gstin)) {
      return res.status(400).json({ message: 'Invalid GSTIN format.' });
    }

    const invoice = await Invoice.findOne({ buyerGstin: gstin }).sort({ invoiceNumber: -1, createdAt: -1 });

    if (!invoice) {
      return res.status(404).json({ message: 'No prior invoice found for this GSTIN.' });
    }

    return res.json({
      gstin,
      buyerName: invoice.buyerName || '',
      buyerAddress: invoice.buyerAddress || '',
      buyerStateCode: invoice.buyerStateCode || gstin.slice(0, 2),
      sourceInvoiceId: invoice._id,
      sourceInvoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to look up GSTIN in invoices.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    return res.json(invoice);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load invoice' });
  }
});

router.post('/', async (req, res) => {
  try {
    const invoiceNumber = Number(req.body.invoiceNumber);

    if (Number.isNaN(invoiceNumber)) {
      return res.status(400).json({ message: 'Invoice number is required' });
    }

    const existingInvoice = await Invoice.findOne({ invoiceNumber });
    if (existingInvoice) {
      return res.status(400).json({ message: 'Invoice number already exists. Please use a different number.' });
    }

    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber,
    });

    const settings = await Settings.findOne();
    if (settings) {
      settings.nextInvoiceNumber = Math.max(settings.nextInvoiceNumber + 1, invoiceNumber + 1);
      await settings.save();
    }

    // Send email notification (awaited so it completes before Vercel kills the function)
    const businessName = (settings && settings.businessName) ? settings.businessName : 'Patel Industries';
    let emailSent = true;
    try {
      await sendInvoiceNotification({
        businessName,
        invoice,
        settings: settings ? settings.toObject() : {},
      });
    } catch (err) {
      console.error('[Mailer] Failed to send invoice notification email:', err.message);
      emailSent = false;
    }

    return res.status(201).json({ ...invoice.toObject(), emailSent });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ message: 'Invoice number already exists. Please use a different number.' });
    }
    return res.status(500).json({ message: 'Failed to create invoice' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

module.exports = router;
