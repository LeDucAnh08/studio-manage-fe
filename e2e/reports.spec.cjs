const path = require('node:path');
const { createRequire } = require('node:module');
const { test, expect } = require('@playwright/test');
const { backendRoot, TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');
const { seedReportData } = require('../../ops/fixtures/report-data.cjs');
const r = createRequire(path.join(backendRoot, 'package.json'));
const mongoose = r('mongoose');
test('accountant reconciles service cash, current liabilities and shared inventory on mobile', async ({
  page,
  request,
}) => {
  const password = 'ReportBrowser123!';
  await mongoose.connect(isolatedMongoUri());
  expect(mongoose.connection.name).toBe(TEST_DATABASE);
  let ids;
  try {
    const bcrypt = r('bcryptjs');
    await mongoose.connection.db.collection('users').insertOne({
      username: 'reports.accountant',
      name: 'Kế toán báo cáo',
      password: await bcrypt.hash(password, 10),
      roles: [5],
      isActive: true,
    });
    ids = await seedReportData(mongoose.connection.db, mongoose.Types.ObjectId);
  } finally {
    await mongoose.disconnect();
  }
  const response = await request.post('http://127.0.0.1:5012/api/auth/login', {
    data: { username: 'reports.accountant', password },
  });
  expect(response.status()).toBe(200);
  await page.addInitScript(
    (actor) => {
      localStorage.setItem('token', actor.token);
      localStorage.setItem('user', JSON.stringify(actor.user));
    },
    (await response.json()).data,
  );
  await page.goto('/manage/reports?from=2026-10-01&to=2026-10-03');
  await expect(
    page.getByRole('heading', { name: 'Báo cáo dịch vụ và kho', exact: true }),
  ).toBeVisible();
  const table = page.getByRole('table', { name: 'So sánh dịch vụ trong kỳ', exact: true });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row').filter({ hasText: 'Cho thuê' })).toContainText('1.500');
  await expect(table.getByRole('row').filter({ hasText: 'Cho thuê' })).toContainText('1.300');
  await expect(
    page.getByText('Cọc thuê đang bảo đảm', { exact: true }).locator('..'),
  ).toContainText('550');
  await page.getByLabel('Nội dung đối chiếu').selectOption('due');
  await expect(
    page.getByRole('table', { name: 'Hồ sơ còn thu hiện tại', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Dịch vụ đối chiếu').selectOption('photography');
  await expect(
    page.getByRole('table', { name: 'Hồ sơ còn thu hiện tại', exact: true }).getByRole('row'),
  ).toHaveCount(2);
  const reference = page.getByRole('link', { name: 'Chụp #' + ids.bookingB.slice(-6) });
  await expect(reference).toHaveAttribute('href', '/workflow-bookings/' + ids.bookingB);
  await page.getByLabel('Từ ngày', { exact: true }).fill('2026-10-04');
  await page.getByLabel('Đến ngày', { exact: true }).fill('2026-10-04');
  await page.getByRole('button', { name: 'Xem báo cáo', exact: true }).click();
  await expect(table.getByRole('row').filter({ hasText: 'Chưa phân loại' })).toContainText('9.000');
  await expect(reference).toBeVisible(); // Outstanding debt is independent of cash dates.
  await page.getByLabel('Từ ngày', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Đến ngày', { exact: true }).fill('2026-10-03');
  await page.getByRole('button', { name: 'Xem báo cáo', exact: true }).click();
  await page.getByRole('button', { name: 'Phân bổ kho', exact: true }).click();
  const inventory = page.getByRole('table', {
    name: 'Phân bổ trang phục theo mẫu và size',
    exact: true,
  });
  await expect(inventory).toBeVisible();
  await expect(
    inventory.getByRole('row').filter({ hasText: 'Áo báo cáo' }).filter({ hasText: 'Cỡ M' }),
  ).toContainText('160%');
  await expect(inventory.getByRole('row').filter({ hasText: 'Mẫu lịch cũ' })).toContainText(
    'Chưa xác định',
  );
  await page.getByLabel('Tìm tên mẫu').fill('Áo báo cáo');
  await page.getByRole('button', { name: 'Tìm mẫu', exact: true }).click();
  await expect(inventory.getByRole('row')).toHaveCount(3);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole('complementary')).not.toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Phân bổ theo mẫu và kích cỡ' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: path.resolve(__dirname, '../../.workflow-tools/screenshots/reports-mobile.png'),
    fullPage: true,
  });
  await page.getByLabel('Tìm tên mẫu').fill('Không có mẫu này');
  await page.getByRole('button', { name: 'Tìm mẫu', exact: true }).click();
  await expect(page.getByText('Không có mẫu phù hợp.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dịch vụ và dòng tiền', exact: true }).click();
  await expect(table).toBeVisible();
  await page.getByLabel('Dịch vụ đối chiếu').selectOption('all');
  await page.getByLabel('Nội dung đối chiếu').selectOption('cash');
  await expect(page.getByRole('table', { name: 'Giao dịch trong kỳ', exact: true })).toBeVisible();
  await mongoose.connect(isolatedMongoUri());
  try {
    await mongoose.connection.db.collection('transactions').insertMany(
      Array.from({ length: 25 }, (_, n) => ({
        type: 'income',
        amount: n,
        date: new Date('2026-10-02T00:00:00+07:00'),
      })),
    );
  } finally {
    await mongoose.disconnect();
  }
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Trang sau', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page.getByText('Trang 2/2 · 30 dòng', { exact: true })).toBeVisible();
  await mongoose.connect(isolatedMongoUri());
  try {
    await mongoose.connection.db.collection('transactions').deleteMany({
      workflowBooking: { $exists: false },
      rentalOrder: { $exists: false },
      amount: { $lt: 25 },
    });
  } finally {
    await mongoose.disconnect();
  }
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Giao dịch trong kỳ', exact: true }).getByRole('row'),
  ).toHaveCount(6);
  await page.route('**/reports/finance?**', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Lỗi báo cáo thử nghiệm' }),
    }),
  );
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Lỗi báo cáo thử nghiệm');
  await page.unroute('**/reports/finance?**');
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
  await expect(table).toBeVisible();
});
