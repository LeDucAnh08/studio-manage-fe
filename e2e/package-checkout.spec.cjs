const path = require('node:path');
const { mkdir } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { test, expect } = require('@playwright/test');
const { backendRoot, TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');
const r = createRequire(path.join(backendRoot, 'package.json'));
process.env.TS_NODE_PROJECT = path.join(backendRoot, 'tsconfig.json');
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const model = (name) => r(path.join(backendRoot, 'src/models', name)).default;
const api = 'http://127.0.0.1:5012/api';

test('published package checkout approves a temporary crew hold and confirms automatically after deposit', async ({
  browser,
  request,
}) => {
  test.setTimeout(180000);
  const suffix = randomUUID().slice(0, 8),
    password = 'PackageE2e123!';
  const audit = path.resolve(__dirname, '../../audit/package-checkout-2026-10-31');
  await mkdir(audit, { recursive: true });
  let pkg;
  await mongoose.connect(isolatedMongoUri());
  expect(mongoose.connection.name).toBe(TEST_DATABASE);
  try {
    const type = await model('CostumeType').create({ name: `Áo dài checkout ${suffix}` });
    await model('Costume').create({
      name: `Áo dài checkout ${suffix}`,
      type: type._id,
      inventory: [{ size: 'M', quantity: 5, condition: 'good' }],
    });
    pkg = await model('Package').create({
      name: `Gói checkout ${suffix}`,
      pricePerMember: 500000,
      depositPercent: 30,
      depositHoldHours: 24,
      studentsPerCrew: 15,
      deliveryDays: 7,
      costumes: [type._id],
    });
    for (const [name, role] of [
      ['client', 6],
      ['accountant', 5],
      ['photo', 3],
    ])
      await model('User').create({
        username: `package.${name}.${suffix}`,
        name: `Package ${name} ${suffix}`,
        password,
        roles: [role],
        isActive: true,
      });
  } finally {
    await mongoose.disconnect();
  }
  const contexts = [],
    pages = {};
  try {
    for (const role of ['client', 'admin', 'accountant']) {
      const response = await request.post(`${api}/auth/login`, {
        data:
          role === 'admin'
            ? { username: 'phase1.admin', password: 'E2eAdmin123!' }
            : { username: `package.${role}.${suffix}`, password },
      });
      expect(response.ok(), await response.text()).toBe(true);
      const actor = (await response.json()).data;
      const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:4011',
        viewport: { width: 1440, height: 1000 },
      });
      contexts.push(context);
      await context.addInitScript((value) => {
        localStorage.setItem('token', value.token);
        localStorage.setItem('user', JSON.stringify(value.user));
      }, actor);
      pages[role] = await context.newPage();
    }
    const client = pages.client;
    await client.goto(`/account/bookings/new?package=${pkg._id}`);
    await client.getByRole('button', { name: /Tiếp tục/ }).click();
    const shootDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() + 30 * 86400000));
    await client.getByLabel('Tên lớp / nhóm').fill('Lớp checkout');
    await client.getByLabel('Trường', { exact: true }).fill('Trường test');
    await client.getByLabel('Họ tên người liên hệ').fill('Khách checkout');
    await client.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await client.getByLabel('Số thành viên dự kiến').fill('1');
    await client.getByLabel('Địa điểm mong muốn').fill('Sân trường test');
    await client.getByLabel('Ngày và giờ bắt đầu mong muốn').fill(`${shootDay}T08:00`);
    await client.getByLabel('Ngày và giờ kết thúc mong muốn').fill(`${shootDay}T10:00`);
    await client.getByRole('button', { name: /Xem lại yêu cầu/ }).click();
    await expect(client.getByRole('heading', { name: 'Tổng tiền gói' })).toBeVisible();
    await expect(client.getByText('Tiền cọc 30%:', { exact: true })).toBeVisible();
    await client.getByRole('checkbox', { name: /Tôi đồng ý giá gói/ }).check();
    await client.screenshot({ path: path.join(audit, '01-package-checkout.png'), fullPage: true });
    await client.getByRole('button', { name: 'Gửi yêu cầu tới Yume' }).click();
    await expect(client).toHaveURL(/\/account\/bookings\/[a-f0-9]{24}$/);
    const id = new URL(client.url()).pathname.split('/').pop();
    await expect(client.getByRole('heading', { name: 'Thông tin gói đã xác nhận' })).toBeVisible();
    const admin = pages.admin;
    await admin.goto(`/workflow-bookings/${id}`);
    await admin.getByRole('button', { name: 'Gắn thợ', exact: true }).click();
    await admin.getByRole('checkbox', { name: new RegExp(`Package photo ${suffix}`) }).check();
    await admin.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Đổi thợ', exact: true })).toBeVisible();
    await admin.getByRole('button', { name: 'Duyệt và giữ lịch tạm' }).click();
    await expect(
      admin.getByRole('heading', { name: 'Đang giữ lịch tạm, chờ đặt cọc' }),
    ).toBeVisible();
    await expect(admin.getByRole('heading', { name: 'Lập báo giá và đề xuất lịch' })).toHaveCount(
      0,
    );
    await admin.screenshot({
      path: path.join(audit, '02-admin-temporary-hold.png'),
      fullPage: true,
    });
    const accountant = pages.accountant;
    await accountant.goto(`/workflow-bookings/${id}`);
    await accountant.getByLabel('Số tiền (đ)', { exact: true }).fill('150000');
    await accountant.getByLabel('Phương thức', { exact: true }).selectOption('cash');
    await accountant.getByRole('button', { name: 'Ghi nhận giao dịch', exact: true }).click();
    await expect(accountant.getByText('Đã chốt lịch', { exact: true }).first()).toBeVisible();
    await admin.reload();
    await expect(admin.getByRole('button', { name: 'Bắt đầu buổi chụp' })).toBeDisabled();
    await expect(
      admin.getByRole('heading', { name: 'Chuẩn bị trang phục cho buổi chụp' }),
    ).toBeVisible();
    await admin.getByRole('button', { name: 'Thêm dòng phân bổ' }).click();
    await admin
      .getByLabel('Trang phục', { exact: true })
      .selectOption({ label: `Áo dài checkout ${suffix}` });
    await admin.getByLabel('Size', { exact: true }).selectOption('M');
    await admin.getByRole('button', { name: 'Kiểm tra tồn kho và lưu phân bổ' }).click();
    await expect(admin.getByRole('heading', { name: 'Trang phục đã giữ' })).toBeVisible();
    await admin.screenshot({
      path: path.join(audit, '04-admin-costume-preparation.png'),
      fullPage: true,
    });
    await client.reload();
    await expect(client.getByRole('heading', { name: 'Thông tin thành viên lớp' })).toBeVisible();
    await expect(
      client.getByRole('heading', { name: 'Lịch và nguồn lực đã xác nhận' }),
    ).toBeVisible();
    await expect(client.getByRole('button', { name: /Tôi đồng ý báo giá/ })).toHaveCount(0);
    await client.getByRole('button', { name: 'Thêm thành viên', exact: true }).click();
    await client.getByLabel('Họ tên', { exact: true }).fill('Thành viên sau chốt lịch');
    await client.getByLabel('Giới tính', { exact: true }).selectOption('female');
    await client.getByRole('button', { name: 'Lưu danh sách thành viên', exact: true }).click();
    await expect(client.getByText('Đã khai báo 1 / 1 thành viên.', { exact: false })).toBeVisible();
    await client.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await client.screenshot({ path: path.join(audit, '03-confirmed-package.png'), fullPage: true });
    await client.setViewportSize({ width: 390, height: 844 });
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await admin.reload();
    await expect(admin.getByRole('button', { name: 'Bắt đầu buổi chụp' })).toBeEnabled();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
