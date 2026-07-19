'use strict';

const puppeteer = require('puppeteer-core');

// Try to load @sparticuz/chromium for serverless environments (Vercel / AWS Lambda)
let chromium;
try {
  chromium = require('@sparticuz/chromium');
} catch {
  chromium = null;
}

// Shared cell styles
const thStyle = 'padding:6px 8px; font-weight:bold; border-right:2px solid black;';
const tdStyle = 'padding:4px 8px; vertical-align:middle; border-right:2px solid black;';

/**
 * Generates a 3-page A4 PDF containing Triplicate, Duplicate, then Original copies.
 * Returns a Buffer containing the PDF bytes.
 *
 * Uses @sparticuz/chromium on Vercel / serverless, or system Chrome locally.
 *
 * @param {object} invoice  - Invoice document from MongoDB
 * @param {object} settings - Settings document from MongoDB
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePdf(invoice, settings) {
  const html = buildAllCopiesHtml(invoice, settings);

  let browser;
  const isServerless = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);

  if (isServerless && chromium) {
    // ── Serverless environment (Vercel, AWS Lambda) ────────────
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // ── Local development — use system Chrome ─────────────────
    const executablePath = findChromePath();
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Finds the system Chrome / Chromium executable for local development.
 */
function findChromePath() {
  const fs = require('fs');
  const candidates = [
    process.env.CHROME_PATH,
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean);

  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* skip */ }
  }
  throw new Error(
    'Chrome/Chromium not found. Install Google Chrome or set the CHROME_PATH env variable.'
  );
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatDate(dateValue) {
  if (!dateValue) return '';
  const plain = String(dateValue).split('T')[0];
  const parts = plain.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return plain;
}

function fmtQty(value) { return Number(value || 0).toFixed(3); }
function fmtAmt(value) { return Number(value || 0).toFixed(2); }

function fmtRoundOff(val) {
  const n = Number(val || 0);
  return n.toFixed(2);
}

// ─────────────────────────────────────────────────────────────
// COPY DEFINITIONS
// ─────────────────────────────────────────────────────────────

const ALL_COPIES = [
  { key: 'Triplicate', label: 'Triplicate - Supplier Copy' },
  { key: 'Duplicate', label: 'Duplicate - Transporter Copy' },
  { key: 'Original', label: 'Original - Buyer Copy' },
];

// ─────────────────────────────────────────────────────────────
// OUTER HTML WRAPPER — holds all 3 copies
// ─────────────────────────────────────────────────────────────

function buildAllCopiesHtml(invoice, settings) {
  const inv = invoice || {};
  const invoiceNumStr = String(inv.invoiceNumber || '').padStart(3, '0');

  const copiesHtml = ALL_COPIES.map((copy, idx) => {
    const isLast = idx === ALL_COPIES.length - 1;
    const pageBreak = isLast ? '' : 'page-break-after: always;';
    return `<div style="width:210mm; min-height:297mm; padding:6mm; display:flex; flex-direction:column; ${pageBreak}">
  ${buildCopyBlock(inv, settings || {}, copy)}
</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice #${invoiceNumStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: white;
      color: black;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { border-collapse: collapse; width: 100%; }
    @page { size: A4 portrait; margin: 0; }
  </style>
</head>
<body>
${copiesHtml}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// SINGLE-COPY BLOCK (one A4 page worth of content)
// ─────────────────────────────────────────────────────────────

function buildCopyBlock(inv, settings, currentCopy) {
  const s = settings || {};

  const addressFallback =
    'Mauli Bharat Udyog Nagar Industrial Estate, 1st Floor, Gala No. 51, Babasaheb Kotkar Road, Behind Sainath Industrial Estate, Goregaon (East), Mumbai - 400 063';
  const branchFallback =
    'No. 6, Aasharam Waghral Pada, Mangurni Gaon, Rajawal Boidapada, Sativali, Vasai (E), Dist. Palghar';

  const items = inv.items || [];
  const isInterState = Boolean(inv.igstAmount && Number(inv.igstAmount) > 0);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalBags = items.reduce(
    (sum, item) => sum + (item.bags != null && item.bags !== '' ? Number(item.bags) : 0), 0
  );
  const hasBags = items.some(
    (item) => item.bags !== null && item.bags !== undefined && item.bags !== '' && Number(item.bags) > 0
  );
  const primaryUnit = items[0]?.unit || 'PCS';
  const unitLabel =
    primaryUnit.toLowerCase() === 'kg' ? 'kg' :
      primaryUnit.toLowerCase() === 'pcs' ? 'pcs' : primaryUnit.toLowerCase();

  const colCount = hasBags ? 6 : 5;
  const emptyRowsNeeded = Math.max(0, 7 - items.length);
  const invoiceNumStr = String(inv.invoiceNumber || '').padStart(3, '0');

  // ── Checkbox rows for copy selector ──────────────────────────
  const copyRows = ALL_COPIES.map(({ key, label }) => {
    const checked = key === currentCopy.key;
    return `<div style="display:flex; align-items:center; gap:6px; white-space:nowrap;">
      <span style="font-size:13px;">${checked ? '☑' : '☐'}</span>
      <span${checked ? ' style="font-weight:bold;"' : ''}>${label}</span>
    </div>`;
  }).join('\n');

  // ── Item rows ─────────────────────────────────────────────────
  const itemRows = items.map((item, index) => {
    const desc = item.description || '';
    const lowerDesc = desc.toLowerCase();
    const hasPlastic = lowerDesc.includes('plastic') && lowerDesc.includes('packaging');
    const isFirstRowHeader = index === 0 && !hasPlastic;

    const descCell = isFirstRowHeader
      ? `<div style="font-style:italic;font-size:10px;font-weight:600;">Plastic Bags Industrial Packaging</div>${desc ? `<div>${desc}</div>` : ''}`
      : desc;

    const bagsCell = hasBags
      ? `<td style="${tdStyle} text-align:right; font-weight:bold;">${item.bags != null && item.bags !== '' && Number(item.bags) > 0 ? Number(item.bags) : '—'}</td>`
      : '';

    return `<tr style="height:30px;">
      ${bagsCell}
      <td style="${tdStyle}">${descCell}</td>
      <td style="${tdStyle} text-align:center;">${item.hsnCode || ''}</td>
      <td style="${tdStyle} text-align:right; font-weight:bold;">${fmtQty(item.quantity)} ${item.unit || 'PCS'}</td>
      <td style="${tdStyle} text-align:right;">${fmtAmt(item.rate)}</td>
      <td style="padding:4px 8px; vertical-align:middle; text-align:right; font-weight:bold; border-right:none;">${fmtAmt(item.amount)}</td>
    </tr>`;
  }).join('');

  // ── Empty filler rows ─────────────────────────────────────────
  const emptyRows = Array.from({ length: emptyRowsNeeded }).map(() =>
    `<tr style="height:30px;">
      ${hasBags ? `<td style="${tdStyle}"></td>` : ''}
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
      <td style="border-right:none;"></td>
    </tr>`
  ).join('');

  // ── GST rows ──────────────────────────────────────────────────
  const gstRows = !isInterState
    ? `<tr style="height:28px; border-bottom:1px solid black;">
        <td colspan="${colCount - 1}" style="${tdStyle} text-align:right; font-weight:bold;">CGST ${inv.cgstRate || 9}%</td>
        <td style="padding:4px 8px; text-align:right; border-right:none;">${fmtAmt(inv.cgstAmount)}</td>
      </tr>
      <tr style="height:28px; border-bottom:1px solid black;">
        <td colspan="${colCount - 1}" style="${tdStyle} text-align:right; font-weight:bold;">SGST ${inv.sgstRate || 9}%</td>
        <td style="padding:4px 8px; text-align:right; border-right:none;">${fmtAmt(inv.sgstAmount)}</td>
      </tr>`
    : `<tr style="height:28px; border-bottom:1px solid black;">
        <td colspan="${colCount - 1}" style="${tdStyle} text-align:right; font-weight:bold;">IGST ${inv.igstRate || 18}%</td>
        <td style="padding:4px 8px; text-align:right; border-right:none;">${fmtAmt(inv.igstAmount)}</td>
      </tr>`;

  return `<div style="border:1px solid black; flex:1; display:flex; flex-direction:column; justify-content:space-between;">

    <!-- TOP HEADER -->
    <div>
      <div style="display:flex; align-items:flex-start; border-bottom:2px solid black; padding:8px 12px;">
        <div style="flex:1; text-align:center;">
          <div style="font-size:10px; font-weight:bold; letter-spacing:0.5px; margin-bottom:4px;">SUBJECT TO MUMBAI JURISDICTION</div>
          <div style="font-size:30px; font-weight:bold; color:#d32f2f; font-family:Georgia,serif; letter-spacing:1px; line-height:1;">PATEL INDUSTRIES</div>
          <div style="margin-top:6px; font-size:12px; font-weight:bold;">M.: ${s.mobile1 || '9987567861'} / ${s.mobile2 || '9819282701'}</div>
        </div>
        <div style="width:185px; text-align:left; font-size:10px; line-height:1.6; padding-top:4px;">
          ${copyRows}
        </div>
      </div>

      <!-- MANUFACTURER DETAILS -->
      <div style="border-bottom:2px solid black; padding:4px 8px; text-align:center; font-size:10px; font-weight:bold; line-height:1.4;">
        <div style="text-transform:uppercase; letter-spacing:0.2px; margin-bottom:2px;">MANUFACTURERS OF: PLASTIC BAGS, TUBING, GRAVURE PRINTED, FLEXO PRINTED</div>
        <div style="font-size:9.5px; font-weight:500; color:#333;">Regd. Office: ${s.address || addressFallback} | E-mail: ${s.email || 'patelindustries92@gmail.com'}</div>
        <div style="font-size:9.5px; font-weight:500; color:#333;">Branch: ${s.branchAddress || branchFallback}</div>
      </div>

      <!-- BUYER & INVOICE META -->
      <div style="display:flex; min-height:100px; border-bottom:2px solid black;">
        <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; border-right:2px solid black; padding:8px;">
          <div>
            <div style="font-size:10px; font-style:italic; margin-bottom:2px;">Sold To, Messrs:</div>
            <div style="font-size:14px; font-weight:bold; margin-bottom:4px;">${inv.buyerName || ''}</div>
            <div style="font-size:10px; white-space:pre-line; line-height:1.3; font-weight:500;">${inv.buyerAddress || ''}</div>
          </div>
          <div style="font-size:10px;">
            <div><strong>Party's GSTIN No.:</strong> <span style="font-weight:600;">${inv.buyerGstin || ''}</span></div>
            <div><strong>State Code:</strong> <span style="font-weight:600;">${inv.buyerStateCode || '27'}</span></div>
          </div>
        </div>
        <div style="width:230px; display:flex; flex-direction:column; align-items:flex-end; justify-content:flex-start; gap:12px; padding:8px;">
          <div style="border:2px solid black; padding:4px 16px; text-align:center; font-size:13px; font-weight:bold; letter-spacing:0.5px;">TAX INVOICE</div>
          <div style="width:100%; font-size:11px; font-weight:500; padding-left:16px;">
            <div><strong>Invoice No.:</strong> ${invoiceNumStr}</div>
            <div><strong>Date:</strong> ${formatDate(inv.invoiceDate)}</div>
          </div>
        </div>
      </div>

      <!-- ITEM TABLE -->
      <table style="border-bottom:2px solid black; font-size:11px; text-align:left;">
        <thead>
          <tr style="border-bottom:2px solid black;">
            ${hasBags ? `<th style="width:9%; ${thStyle} text-align:center;">Bags</th>` : ''}
            <th style="${hasBags ? 'width:44%;' : 'width:52%;'} ${thStyle} text-align:center;">DESCRIPTION</th>
            <th style="${hasBags ? 'width:10%;' : 'width:12%;'} ${thStyle} text-align:center;">HSN/SAC Code</th>
            <th style="${hasBags ? 'width:10%;' : 'width:12%;'} ${thStyle} text-align:center;">Quantity</th>
            <th style="${hasBags ? 'width:12%;' : 'width:11%;'} ${thStyle} text-align:center;">RATE<br/><span style="font-size:9px;font-weight:normal;">Rs. P.</span></th>
            <th style="${hasBags ? 'width:15%;' : 'width:13%;'} padding:6px 8px; font-weight:bold; border-right:none; text-align:center;">AMOUNT<br/><span style="font-size:9px;font-weight:normal;">Rs. P.</span></th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${emptyRows}

          <!-- Net Row -->
          <tr style="height:28px; border-top:2px solid black; border-bottom:2px solid black; font-weight:bold; background:white;">
            ${hasBags ? `<td style="${tdStyle} text-align:center;">${totalBags}</td>` : ''}
            <td style="${tdStyle} text-align:right;">Net ${unitLabel}</td>
            <td style="${tdStyle}"></td>
            <td style="${tdStyle} text-align:center;">${fmtQty(totalQuantity)}</td>
            <td style="${tdStyle}"></td>
            <td style="border-right:none;"></td>
          </tr>

          <!-- Total -->
          <tr style="height:28px; border-bottom:1px solid black; font-weight:bold;">
            <td colspan="${colCount - 1}" style="${tdStyle} text-align:right;">Total</td>
            <td style="padding:4px 8px; text-align:right; border-right:none;">${fmtAmt(inv.subtotal)}</td>
          </tr>

          ${gstRows}

          <!-- Round Off -->
          <tr style="height:28px; border-bottom:1px solid black;">
            <td colspan="${colCount - 1}" style="${tdStyle} text-align:right; font-weight:bold;">Round off</td>
            <td style="padding:4px 8px; text-align:right; border-right:none;">${fmtRoundOff(inv.roundOff)}</td>
          </tr>

          <!-- Grand Total -->
          <tr style="height:32px; background:#fafafa; font-weight:bold;">
            <td colspan="${colCount - 1}" style="${tdStyle} text-align:right; font-weight:800; letter-spacing:0.5px;">GRAND TOTAL</td>
            <td style="padding:4px 8px; text-align:right; font-weight:800; font-size:12px; border-right:none;">${fmtAmt(inv.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BOTTOM SECTION -->
    <div style="margin-top:auto;">
      <!-- Amount in Words -->
      <div style="border-bottom:2px solid black; padding:6px 8px; font-size:11px; font-weight:bold;">
        Total Invoice Amount in Words: <span style="font-weight:normal; font-style:italic; margin-left:4px;">${inv.amountInWords || ''}</span>
      </div>

      <!-- Banking & Signature -->
      <div style="display:flex; min-height:110px;">
        <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; border-right:2px solid black; padding:8px; font-size:10px; line-height:1.45;">
          <div>
            <div><strong>GSTIN No.:</strong> ${s.gstin || '27AAAFP1402F1ZV'}</div>
            <div><strong>UDYOG AADHAAR NO.:</strong> ${s.udyogAadhar || 'MH17A0062572'}</div>
            <div style="margin-top:4px; font-weight:500;">
              <strong>Bank:</strong> ${s.bankName || 'CANARA BANK'}, <strong>Branch:</strong> ${s.bankBranch || 'Goregaon SME'}<br/>
              <strong>IFSC Code:</strong> ${s.ifsc || 'CNRB0015017'}, <strong>Account No.:</strong> ${s.accountNumber || '50171400000575'}
            </div>
          </div>
          <div style="font-weight:bold; font-style:italic; font-size:9px;">Interest @ 12% per annum will be charged if payment not received within 30 days.</div>
        </div>

        <div style="width:230px; display:flex; flex-direction:column; justify-content:space-between; padding:8px; font-size:10px;">
          <div>
            <div style="font-weight:bold; margin-bottom:2px;">E. &amp; O. E.</div>
            <div style="font-size:9px; font-style:italic; color:#555; line-height:1.3;">Certified that the particulars given above are true and correct.</div>
          </div>
          <div style="text-align:right; margin-top:auto;">
            <div style="padding-right:4px; font-size:10px; font-weight:bold; letter-spacing:0.5px;">For PATEL INDUSTRIES</div>
            <div style="height:40px;"></div>
            <div style="border-top:1px dashed #999; padding-top:4px; text-align:center; font-size:10.5px; font-weight:500; width:90%; margin:0 auto;">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>

  </div>`;
}

module.exports = { generateInvoicePdf };
