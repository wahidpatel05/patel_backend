const mongoose = require('mongoose');
const seedDatabase = require('../seed');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patel_industries';

const cached = global.__patelIndustriesMongo || { promise: null };
global.__patelIndustriesMongo = cached;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI)
      .then(async (connection) => {
        await seedDatabase();
        return connection;
      })
      .finally(() => {
        cached.promise = null;
      });
  }

  return cached.promise;
}

module.exports = connectToDatabase;