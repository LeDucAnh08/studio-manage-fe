const path = require('path');
const assert = require('node:assert/strict');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '../../backend');
dotenv.config({ path: path.join(backendRoot, '.env') });

const TEST_DATABASE = 'studio_phase1_e2e';

function isolatedMongoUri() {
  const source = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
  assert.ok(source, 'Set MONGO_TEST_URI or backend/.env MONGO_URI to a local MongoDB instance');
  const uri = new URL(source);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(uri.hostname),
    'Phase 1 E2E tests refuse to use a non-local MongoDB host',
  );
  uri.pathname = `/${TEST_DATABASE}`;
  return uri.toString();
}

module.exports = { backendRoot, TEST_DATABASE, isolatedMongoUri };
