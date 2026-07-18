'use strict';

const nodemailer = require('nodemailer');
const { generateInvoicePdf } = require('./pdfGenerator');

/**
 * Creates a reusable Gmail SMTP transporter.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Sends an invoice notification email with the bill attached as a PDF.
 *
 * @param {object} params
 * @param {string} params.businessName  - Company name from Settings (e.g. "Patel Industries")
 * @param {object} params.invoice       - Full invoice document from MongoDB
 * @param {object} params.settings      - Full settings document from MongoDB
 */
async function sendInvoiceNotification({ businessName, invoice, settings }) {
  const invoiceNumber = invoice.invoiceNumber;
  const buyerName = invoice.buyerName || '';
  const invoiceDate = invoice.invoiceDate || '';
  const grandTotal = invoice.grandTotal || 0;

  const from = process.env.GMAIL_USER;
  const to = process.env.NOTIFY_EMAIL;
  const subject = `${invoice?.buyerName} Bill #${invoiceNumber}`;

  // ── Generate PDF attachment ──────────────────────────────────
  console.log(`[Mailer] Generating PDF for invoice #${invoiceNumber}…`);
  const pdfBuffer = await generateInvoicePdf(invoice, settings);

  // PDF filename: "<buyername> bill number <N>.pdf"  e.g. "wholesaledock bill number 111.pdf"
  const buyerSlug = (buyerName || 'unknown').replace(/\s+/g, '').toLowerCase();
  const safeFilename = `${buyerSlug} bill number ${invoiceNumber}.pdf`;

  // ── HTML email body ──────────────────────────────────────────
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #1a237e; padding: 20px 30px;">
        <h2 style="color: #ffffff; margin: 0;">${businessName}</h2>
        <p style="color: #c5cae9; margin: 4px 0 0;">New Invoice Generated</p>
      </div>
      <div style="padding: 24px 30px; background: #fafafa;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #333;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 160px;">Invoice Number</td>
            <td style="padding: 8px 0;">#${String(invoiceNumber).padStart(3, '0')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Invoice Date</td>
            <td style="padding: 8px 0;">${formatDate(invoiceDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Buyer / Party</td>
            <td style="padding: 8px 0;">${buyerName || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Grand Total</td>
            <td style="padding: 8px 0; color: #1a237e; font-size: 17px; font-weight: bold;">
              &#8377;${Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </table>
        <p style="font-size:13px; color:#555; margin-top:16px;">
          Please find the bill attached as a PDF.
        </p>
      </div>
      <div style="padding: 16px 30px; background: #eeeeee; font-size: 12px; color: #777; text-align: center;">
        This is an automated notification from ${businessName} billing system.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments: [
      {
        filename: safeFilename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log(`[Mailer] Invoice #${invoiceNumber} notification sent → ${to} (messageId: ${info.messageId})`);
  return info;
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  const plain = String(dateValue).split('T')[0];
  const parts = plain.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return plain;
}

module.exports = { sendInvoiceNotification };
