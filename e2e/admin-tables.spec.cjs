const path = require('node:path');
const { mkdir } = require('node:fs/promises');
const { createRequire } = require('node:module');
const { test, expect } = require('@playwright/test');
const { backendRoot, TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');
const r = createRequire(path.join(backendRoot, 'package.json'));
process.env.TS_NODE_PROJECT = path.join(backendRoot, 'tsconfig.json');
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const model = (name) => r(path.join(backendRoot, 'src/models', name)).default;

test('all staff lists use the same scrollable tables on desktop and mobile', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);
  const audit = path.resolve(__dirname, '../../audit/admin-tables-2026-10-31');
  await mkdir(audit, { recursive: true });
  const now = new Date(),
    shoot = new Date(Date.now() + 86400000);
  await mongoose.connect(isolatedMongoUri());
  expect(mongoose.connection.name).toBe(TEST_DATABASE);
  try {
    const admin = await model('User').findOne({ username: 'phase1.admin' });
    const client = await model('User').create({
      username: 'admin.tables.client',
      name: 'Khách bảng',
      password: 'TablesClient123!',
      roles: [6],
      isActive: true,
    });
    const photographer = await model('User').create({
      username: 'admin.tables.photo',
      name: 'Thợ bảng',
      password: 'TablesPhoto123!',
      roles: [3],
      isActive: true,
    });
    const season = await model('Season').create({
      name: 'Mùa kiểm tra bảng',
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: new Date(now.getFullYear() + 1, 11, 31),
    });
    const type = await model('CostumeType').create({
      name: 'Áo dài kiểm tra bảng',
      description: 'Loại mẫu kiểm tra',
    });
    const costume = await model('Costume').create({
      name: 'Áo dài kiểm tra bảng',
      type: type._id,
      isRentalItem: true,
      rentalPrice: 50000,
      inventory: [{ size: 'M', quantity: 20, condition: 'good' }],
    });
    const pkg = await model('Package').findOne();
    pkg.costumes = [type._id];
    await pkg.save();
    const customer = await model('Customer').create({
      className: '12A Bảng',
      school: 'Trường kiểm tra',
      contactName: 'Người liên hệ',
      contactPhone: '0901234567',
      contactAddress: 'Hà Nội',
      total: 1,
      totalFemale: 1,
      createdBy: admin._id,
      season: season._id,
    });
    await model('Student').create({
      customer: customer._id,
      name: 'Học sinh bảng',
      gender: 'female',
      height: 160,
      weight: 48,
    });
    await model('Schedule').create({
      customer: customer._id,
      package: pkg._id,
      shootDate: shoot,
      startTime: '08:00',
      endTime: '10:00',
      location: 'Sân trường',
      leadPhotographer: photographer._id,
      bookedBy: admin._id,
      status: 'confirmed',
      season: season._id,
    });
    await model('Booking').create({
      client: client._id,
      package: pkg._id,
      packageName: pkg.name,
      pricePerMember: pkg.pricePerMember,
      packageSnapshot: {
        name: pkg.name,
        pricePerMember: pkg.pricePerMember,
        costumeIds: [type._id],
      },
      members: 1,
      className: 'Đơn bảng',
      contactName: 'Khách bảng',
      phone: '0901234567',
      startAt: shoot,
      endAt: new Date(shoot.getTime() + 3600000),
      location: 'Sân trường',
      status: 'approved',
    });
    await model('RentalOrder').create({
      client: client._id,
      creationKey: 'admin-tables-rental',
      creationFingerprint: 'admin-tables',
      contactName: 'Khách thuê bảng',
      phone: '0901234567',
      requestedLines: [{ costumeId: costume._id, name: costume.name, size: 'M', quantity: 1 }],
      requestedReceiveDate: shoot,
      requestedReturnDate: new Date(shoot.getTime() + 86400000),
    });
    const category = await model('Category').create({
      name: 'Thu kiểm tra bảng',
      type: 'income',
      isDefault: true,
    });
    await model('Transaction').create({
      customer: customer._id,
      categoryId: category._id,
      type: 'income',
      amount: 150000,
      date: now,
      createdBy: admin._id,
      season: season._id,
    });
    await model('Feedback').create({
      customer: customer._id,
      phone: '0901234567',
      crewFeedback: { rating: 5, description: 'Ekip nhiệt tình' },
      albumFeedback: { rating: 4, description: 'Album đẹp' },
      content: 'Phản hồi kiểm tra bảng',
      suggestion: 'Góp ý đầy đủ',
    });
    await model('AccountRequest').create({
      username: 'admin.tables.request',
      name: 'Nhân sự chờ duyệt',
      passwordHash: await r('bcryptjs').hash('TablesRequest123!', 10),
      requestedRole: 3,
    });
  } finally {
    await mongoose.disconnect();
  }
  const response = await request.post('http://127.0.0.1:5012/api/auth/login', {
    data: { username: 'phase1.admin', password: 'E2eAdmin123!' },
  });
  expect(response.status()).toBe(200);
  await page.addInitScript(
    (actor) => {
      localStorage.setItem('token', actor.token);
      localStorage.setItem('user', JSON.stringify(actor.user));
    },
    (await response.json()).data,
  );
  const routes = [
    ['/workflow-bookings', 'Đơn chụp ảnh'],
    ['/rental-orders', 'Đơn thuê trang phục'],
    ['/customers', 'Danh sách lớp học'],
    ['/schedules', 'Danh sách lịch chụp'],
    ['/manage/finance', 'Danh sách giao dịch'],
    ['/manage/users', null],
    ['/manage/feedback', 'Phản hồi khách hàng'],
    ['/settings/categories', 'Danh mục thu chi'],
    ['/settings/costumes', 'Kho trang phục và phụ kiện'],
    ['/settings/costume-types', 'Loại trang phục'],
    ['/settings/packages', 'Gói chụp'],
    ['/special/seasons', null],
    ['/manage/reports', 'So sánh dịch vụ trong kỳ'],
    ['/', 'Lịch chụp sắp tới'],
    ['/customers/size', null],
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [url, name] of routes) {
      await page.goto(url);
      if (url === '/customers/size') {
        await page.getByRole('combobox').filter({ hasText: '-- Chọn lớp --' }).click();
        await page.getByRole('option', { name: '12A Bảng — Trường kiểm tra' }).click();
      }
      const table = name
        ? page.getByRole('table', { name, exact: true })
        : page.getByRole('table').last();
      await expect(table).toBeVisible();
      await expect(table.getByRole('columnheader').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        url + ' width ' + width,
      ).toBe(true);
      if (width === 390) {
        const region = table.locator('..');
        expect(
          await region.evaluate((el) => el.scrollWidth > el.clientWidth),
          url + ' has local horizontal scrolling',
        ).toBe(true);
        await region.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });
        expect(await region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      }
      if (
        [
          '/workflow-bookings',
          '/rental-orders',
          '/settings/packages',
          '/manage/feedback',
          '/customers',
        ].includes(url)
      ) {
        await page.screenshot({
          path: path.join(
            audit,
            (width === 390 ? 'mobile' : 'desktop') + url.replaceAll('/', '-') + '.png',
          ),
          fullPage: true,
        });
      }
    }
  }
  await page.goto('/manage/feedback');
  await page.getByRole('button', { name: /Xem phản hồi/ }).click();
  await expect(page.getByRole('dialog', { name: 'Chi tiết phản hồi' })).toContainText(
    'Góp ý đầy đủ',
  );
});
