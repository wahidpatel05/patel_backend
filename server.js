require('dotenv').config();

const express = require('express');
const cors = require('cors');
const invoicesRouter = require('./routes/invoices');
const settingsRouter = require('./routes/settings');
const gstinLookupRouter = require('./routes/gstinLookup');
const connectToDatabase = require('./lib/connectToDatabase');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ ok: true });
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
