const path = require('path');
const mongoose = require('mongoose');
const { backendRoot, TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');

module.exports = async () => {
  process.env.TS_NODE_PROJECT = path.join(backendRoot, 'tsconfig.json');
  require(require.resolve('ts-node/register/transpile-only', { paths: [backendRoot] }));
  const User = require(path.join(backendRoot, 'src/models/User')).default;
  const Package = require(path.join(backendRoot, 'src/models/Package')).default;
  const Booking = require(path.join(backendRoot, 'src/models/Booking')).default;
  const AccountRequest = require(path.join(backendRoot, 'src/models/AccountRequest')).default;

  await mongoose.connect(isolatedMongoUri());
  if (mongoose.connection.name !== TEST_DATABASE) {
    throw new Error('Refusing to prepare an unexpected E2E database');
  }
  await mongoose.connection.dropDatabase();
  await Promise.all([
    User.syncIndexes(),
    Package.syncIndexes(),
    Booking.syncIndexes(),
    AccountRequest.syncIndexes(),
  ]);
  await User.create({
    username: 'phase1.admin',
    name: 'Phase 1 Admin',
    password: 'E2eAdmin123!',
    roles: [0],
    isActive: true,
  });
  await Package.create({
    name: 'Gói E2E Phase 1',
    pricePerMember: 500000,
    duration: 'full_day',
    description: 'Gói dùng cho kiểm thử E2E cô lập',
    isPopular: true,
  });
  await mongoose.disconnect();
};
