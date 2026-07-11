require('dotenv').config();

const express = require('express');
const cors = require('cors');
const invoicesRouter = require('./routes/invoices');
const settingsRouter = require('./routes/settings');
const gstinLookupRouter = require('./routes/gstinLookup');
const partiesRouter = require('./routes/parties');
const connectToDatabase = require('./lib/connectToDatabase');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.VITE_FRONTEND_URL || '*';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use(cors({ origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ ok: true });
});

app.get(['/', '/api'], (req, res) => {
  res.json({
    ok: true,
    message: 'Patel Industries billing API is running',
    health: '/api/health',
  });
});

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    return next();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return res.status(500).json({ message: 'Failed to connect to database' });
  }
});

app.use(['/api/settings', '/settings'], settingsRouter);
app.use(['/api/invoices', '/invoices'], invoicesRouter);
app.use(['/api/gstin-lookup', '/gstin-lookup'], gstinLookupRouter);
app.use(['/api/parties', '/parties'], partiesRouter);

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`Patel Industries billing server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
