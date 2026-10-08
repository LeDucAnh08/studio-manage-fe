const path = require('node:path');
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
test('guest rental draft completes quote, handover, damage return and deposit settlement', async ({
  browser,
  page,
  request,
}) => {
  test.setTimeout(180000);
  const suffix = randomUUID().slice(0, 8),
    password = 'RentalBrowser123!',
    title = `Khách thuê ${suffix}`,
    name = `Áo thuê ${suffix}`;
  let costume;
  await mongoose.connect(isolatedMongoUri());
  expect(mongoose.connection.name).toBe(TEST_DATABASE);
  try {
    const type = await model('CostumeType').create({ name: `Cho thuê ${suffix}` });
    costume = await model('Costume').create({
      name,
      gender: 'unisex',
      type: type._id,
      isRentalItem: true,
      rentalPrice: 100000,
      inventory: [{ size: 'M', condition: 'good', quantity: 1 }],
    });
    for (const [roleName, role] of [
      ['client', 6],
      ['accountant', 5],
    ])
      await model('User').create({
        username: `rental.${roleName}.${suffix}`,
        name: title,
        password,
        roles: [role],
        isActive: true,
      });
  } finally {
    await mongoose.disconnect();
  }
  const day = (offset) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() + offset * 86400000));
  await page.goto(`/rental/start?item=${costume._id}`);
  await expect(page.getByLabel('Mẫu thuê 1', { exact: true })).toHaveValue(String(costume._id));
  await page.getByLabel('Kích cỡ 1', { exact: true }).selectOption('M');
  await page.getByLabel('Ngày nhận mong muốn').fill(day(0));
  await page.getByLabel('Ngày trả mong muốn').fill(day(2));
  await page.getByLabel('Người liên hệ').fill(title);
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
  await page.getByLabel('Ghi chú thuê').fill('Một món, dùng độc lập với lịch chụp.');
  await page.getByRole('button', { name: 'Xem lại yêu cầu thuê' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng nhập để gửi yêu cầu thuê' }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.getByLabel('Tên đăng nhập').fill(`rental.client.${suffix}`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/rental\/start\?/);
  await expect(page.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/rentals\/[a-f0-9]{24}$/);
  const id = new URL(page.url()).pathname.split('/').pop();
  const contexts = [];
  const pages = { client: page };
  try {
    for (const role of ['admin', 'accountant']) {
      const response = await request.post(`${api}/auth/login`, {
        data:
          role === 'admin'
            ? { username: 'phase1.admin', password: 'E2eAdmin123!' }
            : { username: `rental.accountant.${suffix}`, password },
      });
      expect(response.status()).toBe(200);
      const actor = (await response.json()).data;
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4011' });
      contexts.push(context);
      await context.addInitScript((value) => {
        localStorage.setItem('token', value.token);
        localStorage.setItem('user', JSON.stringify(value.user));
      }, actor);
      pages[role] = await context.newPage();
    }
    const open = async (role) => {
      await pages[role].goto(`${role === 'client' ? '/account/rentals' : '/rental-orders'}/${id}`);
      await expect(pages[role].getByRole('heading', { name: title, exact: true })).toBeVisible();
    };
    const command = async (role, label) => {
      const actorPage = pages[role];
      const pending = actorPage.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === `/api/rentals/${id}/actions`,
        { timeout: 20000 },
      );
      await actorPage.getByRole('button', { name: label, exact: true }).click();
      const response = await pending;
      expect(response.status(), await response.text()).toBe(200);
      await open(role);
    };
    await open('admin');
    await pages.admin.getByLabel('Cọc bảo đảm (đ)', { exact: true }).fill('200000');
    await pages.admin
      .getByLabel('Điều khoản thuê, mỗi dòng một điều khoản')
      .fill('Phí thuê cho cả kỳ. Cọc bảo đảm được đối soát sau nhận trả.');
    await command('admin', 'Gửi báo giá thuê');
    await open('client');
    await command('client', 'Tôi đồng ý báo giá thuê 1');
    await open('accountant');
    await pages.accountant.getByLabel('Số tiền thuê (đ)', { exact: true }).fill('200000');
    await command('accountant', 'Ghi nhận tiền thuê');
    await open('admin');
    await command('admin', 'Kiểm tra và giữ hàng thuê');
    await open('accountant');
    await pages.accountant.getByLabel('Số tiền thuê (đ)', { exact: true }).fill('100000');
    await command('accountant', 'Ghi nhận tiền thuê');
    await open('admin');
    await command('admin', 'Xác nhận đã giao hàng');
    await pages.admin.getByLabel('Trả tốt 1', { exact: true }).fill('0');
    await pages.admin.getByLabel('Hỏng 1', { exact: true }).fill('1');
    await command('admin', 'Xác nhận nhận trả hàng');
    await pages.admin.getByRole('button', { name: 'Thêm phụ phí', exact: true }).click();
    await pages.admin
      .getByLabel('Lý do phụ phí 1', { exact: true })
      .fill('Sửa hàng theo điều khoản');
    await pages.admin.getByLabel('Phụ phí 1 (đ)', { exact: true }).fill('20000');
    await pages.admin.getByLabel('Ghi chú đối soát').fill('Hoàn cọc dư sau phí thuê và phí sửa.');
    await command('admin', 'Gửi đối soát nhận trả');
    await open('client');
    await command('client', 'Tôi đồng ý đối soát nhận trả');
    await open('accountant');
    await expect(pages.accountant.getByLabel('Loại giao dịch thuê')).toHaveValue('refund');
    await pages.accountant.getByLabel('Số tiền thuê (đ)', { exact: true }).fill('180000');
    await command('accountant', 'Ghi nhận tiền thuê');
    await open('client');
    await expect(
      pages.client.getByRole('heading', { name: 'Đánh giá dịch vụ thuê', exact: true }),
    ).toBeVisible();
    await pages.client.setViewportSize({ width: 360, height: 800 });
    expect(
      await pages.client.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await pages.client.screenshot({
      path: path.join(__dirname, '../../.workflow-tools/screenshots/rental-mobile.png'),
    });
    await pages.client.getByLabel('Nhận xét thuê').fill('Đã nhận hoàn cọc.');
    await command('client', 'Gửi đánh giá thuê');
    await expect(
      pages.client.getByRole('heading', { name: 'Đánh giá thuê đã gửi', exact: true }),
    ).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
