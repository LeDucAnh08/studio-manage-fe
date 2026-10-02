const mongoose = require('mongoose');
const { TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');

module.exports = async () => {
  await mongoose.connect(isolatedMongoUri());
  if (mongoose.connection.name !== TEST_DATABASE) {
    throw new Error('Refusing to clean an unexpected E2E database');
  }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};
