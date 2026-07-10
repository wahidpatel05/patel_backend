const express = require('express');

const router = express.Router();

function normalizeLookupResponse(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const companyName =
    data.companyName ||
    data.company_name ||
    data.tradeName ||
    data.trade_name ||
    data.legalName ||
    data.legal_name ||
    data.name ||
    '';

  const address =
    data.address ||
    data.principalAddress ||
    data.principal_address ||
    data.businessAddress ||
    data.business_address ||
    data.fullAddress ||
    data.full_address ||
    '';

  if (!companyName && !address) {
    return null;
  }

  return {
    companyName,
    address,
    raw: data,
  };
}

router.get('/:gstin', async (req, res) => {
  const gstin = String(req.params.gstin || '').trim().toUpperCase();

  if (!/^\d{2}[A-Z0-9]{13}$/.test(gstin)) {
    return res.status(400).json({ message: 'Invalid GSTIN format.' });
  }

  const lookupUrl = process.env.GSTIN_LOOKUP_URL;

  if (!lookupUrl) {
    return res.status(501).json({ message: 'GSTIN lookup provider is not configured.' });
  }

  const requestUrl = lookupUrl.includes('{gstin}') ? lookupUrl.replaceAll('{gstin}', gstin) : `${lookupUrl.replace(/\/$/, '')}/${gstin}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: 'GSTIN lookup failed.' });
    }

    const data = await response.json();
    const normalized = normalizeLookupResponse(data);

    if (!normalized) {
      return res.status(404).json({ message: 'No company details found for the GSTIN.' });
    }

    return res.json(normalized);
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return res.status(504).json({ message: 'GSTIN lookup timed out.' });
    }

    return res.status(500).json({ message: 'GSTIN lookup failed.' });
  } finally {
    clearTimeout(timeoutId);
  }
});

module.exports = router;