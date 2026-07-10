require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const invoicesRouter = require('./routes/invoices');
const settingsRouter = require('./routes/settings');
const gstinLookupRouter = require('./routes/gstinLookup');
const seedDatabase = require('./seed');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patel_industries';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/settings', settingsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/gstin-lookup', gstinLookupRouter);

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Patel Industries billing server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
