const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { backendRoot, TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');
process.env.TS_NODE_PROJECT = path.join(backendRoot, 'tsconfig.json');
require(require.resolve('ts-node/register/transpile-only', { paths: [backendRoot] }));
const mongoose = require('mongoose');
const model = (name) => require(path.join(backendRoot, 'src/models', name)).default;
const apiBase = 'http://127.0.0.1:5012/api';

async function login(page, username, password) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForFunction(
    (name) => JSON.parse(localStorage.getItem('user') || 'null')?.username === name,
    username,
  );
}

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  test(`package includes clothing without a selection step or temporary hold on ${name}`, async ({
    page,
    request,
  }) => {
    const suffix = randomUUID().slice(0, 8);
    const username = `costume.e2e.${suffix}`;
    const password = 'CostumeE2e123!';
    let pack;
    let costume;
    await mongoose.connect(isolatedMongoUri());
    expect(mongoose.connection.name).toBe(TEST_DATABASE);
    try {
      const type = await model('CostumeType').create({ name: `Áo dài ${suffix}` });
      costume = await model('Costume').create({
        name: `Áo dài trắng ${suffix}`,
        type: type._id,
        gender: 'female',
        description: 'Áo dài chụp ảnh trong gói',
        isRentalItem: false,
        inventory: [
          { size: 'M', quantity: 3, condition: 'good' },
          { size: 'S', quantity: 2, condition: 'good' },
        ],
      });
      pack = await model('Package').create({
        name: `Gói trang phục ${suffix}`,
        pricePerMember: 500000,
        costumes: [type._id],
      });
      await model('User').create({
        username,
        password,
        name: 'Đại diện lớp',
        roles: [6],
        isActive: true,
      });
    } finally {
      await mongoose.disconnect();
    }
    await page.setViewportSize(viewport);
    await login(page, username, password);
    await page.goto(`/account/bookings/new?package=${pack._id}&item=${costume._id}`);
    const card = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: pack.name, exact: true }) });
    await expect(card.getByText('Trang phục đã bao gồm')).toBeVisible();
    await expect(card.getByText(`Áo dài ${suffix}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.getByLabel('Tên lớp / nhóm').fill(`12A ${suffix}`);
    await page.getByLabel('Số điện thoại').fill('0901234567');
    await page.getByLabel('Số thành viên dự kiến').fill('2');
    await page.getByLabel('Địa điểm mong muốn').fill('Hà Nội');
    const day = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Ngày và giờ bắt đầu mong muốn (giờ Việt Nam)').fill(`${day}T08:00`);
    await page.getByLabel('Ngày và giờ kết thúc mong muốn (giờ Việt Nam)').fill(`${day}T10:00`);
    await page.getByRole('button', { name: 'Xem lại yêu cầu', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kiểm tra trước khi gửi' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trang phục đã bao gồm' })).toBeVisible();
    await expect(page.getByText(`Áo dài ${suffix}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sửa trang phục' })).toHaveCount(0);
    await expect(
      page.getByRole('list', { name: 'Các bước gửi yêu cầu' }).getByRole('listitem'),
    ).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({
      path: path.resolve(__dirname, `../../.workflow-tools/booking-included-costumes-${name}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Kiểm tra trước khi gửi' })).toBeVisible();
    await expect(page.getByText(`Áo dài ${suffix}`, { exact: true })).toBeVisible();
    const submission = page.waitForResponse(
      (response) =>
        response.url() === `${apiBase}/bookings` && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Gửi yêu cầu tới Yume' }).click();
    const response = await submission;
    expect(response.ok()).toBeTruthy();
    expect(response.request().postDataJSON()).not.toHaveProperty('costumeSelections');
    await expect(page).toHaveURL(/\/account\/bookings\/[a-f\d]{24}$/);
    const id = new URL(page.url()).pathname.split('/').pop();
    await expect(page.getByText(/Đang giữ tạm đến/)).toHaveCount(0);
    const catalogUrl = `${apiBase}/public/packages/${pack._id}/costumes?startAt=${encodeURIComponent(`${day}T08:00:00+07:00`)}&endAt=${encodeURIComponent(`${day}T10:00:00+07:00`)}`;
    expect((await (await request.get(catalogUrl)).json()).data[0].availableBySize).toEqual({
      M: 3,
      S: 2,
    });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await login(page, 'phase1.admin', 'E2eAdmin123!');
    await page.goto(`/booking-requests/${id}`);
    await page
      .getByLabel('Phản hồi cho khách')
      .fill('Trang phục nằm trong gói, studio sẽ tư vấn mẫu và size khi chốt lịch.');
    await page.getByRole('button', { name: 'Duyệt yêu cầu', exact: true }).click();
    await expect(page.getByText(/Studio đã duyệt tiếp nhận yêu cầu/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bỏ giữ trang phục', exact: true })).toHaveCount(
      0,
    );
    expect((await (await request.get(catalogUrl)).json()).data[0].availableBySize).toEqual({
      M: 3,
      S: 2,
    });
  });
}
