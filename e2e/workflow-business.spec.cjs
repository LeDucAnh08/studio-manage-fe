const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { test, expect } = require('@playwright/test');
const { backendRoot, TEST_DATABASE, isolatedMongoUri } = require('./test-env.cjs');
const backendRequire = createRequire(path.join(backendRoot, 'package.json'));
process.env.TS_NODE_PROJECT = path.join(backendRoot, 'tsconfig.json');
backendRequire('ts-node/register/transpile-only');
const mongoose = backendRequire('mongoose');
const model = (name) => backendRequire(path.join(backendRoot, 'src/models', name)).default;
const apiBase = 'http://127.0.0.1:5012/api';

test('role-specific screens complete photography with a revision and settlement', async ({
  browser,
  request,
}) => {
  test.setTimeout(180000);
  const suffix = randomUUID().slice(0, 8);
  const password = 'WorkflowE2e123!';
  let pack;
  await mongoose.connect(isolatedMongoUri());
  expect(mongoose.connection.name).toBe(TEST_DATABASE);
  try {
    const type = await model('CostumeType').create({ name: `Áo dài workflow ${suffix}` });
    await model('Costume').create({
      name: `Áo dài workflow ${suffix}`,
      type: type._id,
      gender: 'unisex',
      isRentalItem: false,
      inventory: [{ size: 'M', quantity: 1, condition: 'good' }],
    });
    pack = await model('Package').create({
      name: `Gói workflow ${suffix}`,
      pricePerMember: 500000,
      costumes: [type._id],
    });
    for (const [name, role] of [
      ['client', 6],
      ['accountant', 5],
      ['photographer', 3],
    ]) {
      await model('User').create({
        username: `workflow.${name}.${suffix}`,
        name: `Workflow ${name} ${suffix}`,
        password,
        roles: [role],
        isActive: true,
      });
    }
  } finally {
    await mongoose.disconnect();
  }

  const actors = {};
  for (const name of ['admin', 'client', 'accountant', 'photographer']) {
    const response = await request.post(`${apiBase}/auth/login`, {
      data:
        name === 'admin'
          ? { username: 'phase1.admin', password: 'E2eAdmin123!' }
          : { username: `workflow.${name}.${suffix}`, password },
    });
    expect(response.status(), await response.text()).toBe(200);
    actors[name] = (await response.json()).data;
  }
  const headers = (name) => ({ Authorization: `Bearer ${actors[name].token}` });
  const shootDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + 30 * 86400000));
  const created = await request.post(`${apiBase}/bookings`, {
    headers: { ...headers('client'), 'Idempotency-Key': randomUUID() },
    data: {
      packageId: String(pack._id),
      className: `Lớp workflow ${suffix}`,
      school: 'Trường kiểm thử',
      members: 1,
      contactName: 'Đại diện lớp',
      phone: '0901234567',
      startAt: `${shootDay}T08:00:00+07:00`,
      endAt: `${shootDay}T10:00:00+07:00`,
      location: 'Hà Nội',
      note: 'Isolated workflow E2E',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).data._id;
  const reviewed = await request.patch(`${apiBase}/bookings/${id}/review`, {
    headers: headers('admin'),
    data: { status: 'approved', note: 'Studio có thể phục vụ.' },
  });
  expect(reviewed.status(), await reviewed.text()).toBe(200);

  const contexts = [];
  const pages = {};
  try {
    for (const name of Object.keys(actors)) {
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4011' });
      contexts.push(context);
      await context.addInitScript((actor) => {
        localStorage.setItem('token', actor.token);
        localStorage.setItem('user', JSON.stringify(actor.user));
      }, actors[name]);
      pages[name] = await context.newPage();
    }
    const open = async (name) => {
      await pages[name].goto(
        name === 'client' ? `/account/bookings/${id}` : `/workflow-bookings/${id}`,
      );
      await expect(
        pages[name].getByRole('heading', { name: `Lớp workflow ${suffix}`, exact: true }),
      ).toBeVisible();
    };
    const command = async (name, label) => {
      const page = pages[name];
      const pending = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/workflow\/(actions|members)$/.test(new URL(response.url()).pathname),
        { timeout: 20000 },
      );
      await page.getByRole('button', { name: label, exact: true }).click();
      const response = await pending;
      expect(response.status(), await response.text()).toBe(200);
      await open(name);
    };
    const lifecycle = async (expected) => {
      const response = await request.get(`${apiBase}/bookings/${id}/workflow`, {
        headers: headers('client'),
      });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.workflow.lifecycle).toBe(expected);
    };

    await open('admin');
    await pages.admin.getByLabel('Đơn giá (đ)', { exact: false }).fill('500000');
    await pages.admin.getByLabel('Tiền đặt cọc (đ)').fill('100000');
    await pages.admin
      .getByLabel('Nội dung hậu kỳ, mỗi dòng một điều khoản')
      .fill('Một vòng chỉnh sửa');
    await pages.admin
      .getByLabel('Điều khoản dịch vụ, mỗi dòng một điều khoản')
      .fill('Bàn giao qua Drive');
    await command('admin', 'Gửi báo giá cho khách');
    await lifecycle('quoting');

    await open('client');
    await command('client', 'Tôi đồng ý báo giá phiên bản 1');
    await pages.client.getByRole('button', { name: 'Thêm thành viên', exact: true }).click();
    await pages.client.getByLabel('Họ tên', { exact: true }).fill('Thành viên workflow');
    await pages.client.getByLabel(`Size · Áo dài workflow ${suffix}`).selectOption('M');
    await command('client', 'Lưu danh sách thành viên');

    await open('accountant');
    await expect(
      pages.accountant.getByRole('heading', { name: 'Thông tin thành viên lớp' }),
    ).toHaveCount(0);
    await pages.accountant.getByLabel('Số tiền (đ)').fill('100000');
    await command('accountant', 'Ghi nhận giao dịch');
    await lifecycle('ready_to_confirm');

    await open('admin');
    await pages.admin.getByLabel(`Workflow photographer ${suffix}`).check();
    await pages.admin.getByRole('button', { name: 'Thêm dòng phân bổ', exact: true }).click();
    await pages.admin
      .getByLabel('Trang phục', { exact: true })
      .selectOption({ label: `Áo dài workflow ${suffix}` });
    await pages.admin.getByLabel('Size', { exact: true }).selectOption('M');
    await command('admin', 'Kiểm tra và giữ lịch');
    await lifecycle('confirmed');

    await open('photographer');
    await expect(
      pages.photographer.getByRole('heading', { name: /Báo giá phiên bản/ }),
    ).toHaveCount(0);
    await command('photographer', 'Bắt đầu buổi chụp');
    await command('photographer', 'Chuyển sang hậu kỳ');
    await pages.photographer
      .getByLabel('Đường dẫn thư mục Drive')
      .fill('https://drive.google.com/workflow-e2e-v1');
    await command('photographer', 'Gửi bản bàn giao mới');

    await open('client');
    await pages.client.getByLabel('Nội dung cần chỉnh sửa').fill('Chỉnh màu ảnh nhóm.');
    await command('client', 'Yêu cầu chỉnh sửa');
    await lifecycle('revision_requested');
    await open('photographer');
    await expect(
      pages.photographer.getByText('Chỉnh màu ảnh nhóm.', { exact: true }),
    ).toBeVisible();
    await command('photographer', 'Chuyển sang hậu kỳ');
    await pages.photographer
      .getByLabel('Đường dẫn thư mục Drive')
      .fill('https://drive.google.com/workflow-e2e-v2');
    await command('photographer', 'Gửi bản bàn giao mới');
    await open('client');
    await command('client', 'Nghiệm thu bản này');
    await lifecycle('accepted');
    await pages.client.setViewportSize({ width: 360, height: 800 });
    expect(
      await pages.client.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await pages.client.screenshot({
      path: path.join(__dirname, '../../.workflow-tools/screenshots/workflow-mobile.png'),
    });

    await open('accountant');
    await pages.accountant.getByLabel('Loại giao dịch').selectOption('balance');
    await pages.accountant.getByLabel('Số tiền (đ)').fill('400000');
    await command('accountant', 'Ghi nhận giao dịch');
    await lifecycle('completed');
    await open('client');
    await pages.client.getByLabel('Nhận xét', { exact: true }).fill('Đã nhận đủ ảnh.');
    await command('client', 'Gửi đánh giá');
    await expect(pages.client.getByRole('heading', { name: 'Đánh giá đã gửi' })).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
