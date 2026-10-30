const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
const mongoose = require('mongoose');
const { isolatedMongoUri, backendRoot, TEST_DATABASE } = require('./test-env.cjs');
process.env.TS_NODE_PROJECT = path.join(backendRoot, 'tsconfig.json');
require(require.resolve('ts-node/register/transpile-only', { paths: [backendRoot] }));
const User = require(path.join(backendRoot, 'src/models/User')).default;
const Booking = require(path.join(backendRoot, 'src/models/Booking')).default;
const Schedule = require(path.join(backendRoot, 'src/models/Schedule')).default;

let bookingId;
let expiredBookingId;
test.beforeAll(async () => {
  await mongoose.connect(isolatedMongoUri());
  if (mongoose.connection.name !== TEST_DATABASE) throw new Error('Wrong test database');
  const [client, photographer, busy] = await User.create(
    [
      ['assignment.client', 'Khách kiểm thử', [6]],
      ['assignment.free', 'Minh · thợ trống', [3]],
      ['assignment.busy', 'Hà · thợ bận', [3]],
      ['assignment.support', 'Lan · thợ hỗ trợ', [3]],
    ].map(([username, name, roles]) => ({
      username,
      name,
      roles,
      password: 'Assignment123!',
      isActive: true,
    })),
  );
  const booking = await Booking.create({
    client: client._id,
    package: new mongoose.Types.ObjectId(),
    packageName: 'Gói kiểm thử phân công',
    pricePerMember: 500000,
    packageSnapshot: { name: 'Gói kiểm thử phân công', pricePerMember: 500000 },
    members: 1,
    className: '12A1 Phân công',
    contactName: 'Khách kiểm thử',
    phone: '0901234567',
    startAt: '2027-02-01T08:00:00+07:00',
    endAt: '2027-02-01T11:00:00+07:00',
    location: 'Trường THPT Yume',
    note: 'Chụp ngoài trời.',
    status: 'pending',
  });
  bookingId = String(booking._id);
  const expired = await Booking.create({
    ...booking.toObject(),
    _id: new mongoose.Types.ObjectId(),
    className: '12A0 Quá hạn',
    startAt: new Date(Date.now() - 2 * 86400000),
    endAt: new Date(Date.now() - 2 * 86400000 + 3600000),
    createdAt: new Date(Date.now() - 3 * 86400000),
  });
  expiredBookingId = String(expired._id);
  await Schedule.create({
    customer: new mongoose.Types.ObjectId(),
    shootDate: '2027-02-01T00:00:00+07:00',
    startTime: '09:00',
    endTime: '12:00',
    leadPhotographer: busy._id,
    status: 'confirmed',
    location: 'Trường A',
  });
  await mongoose.disconnect();
});

async function login(page, username, password = 'Assignment123!') {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForFunction(
    (name) => JSON.parse(localStorage.getItem('user') || '{}').username === name,
    username,
  );
}
const evidence = path.resolve(__dirname, '../../audit/photographer-assignment-2026-10-29');
async function noHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('admin assigns an available photographer; staff manages busy time; customer sees the caretaker', async ({
  page,
}) => {
  await fs.mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, 'phase1.admin', 'E2eAdmin123!');
  await page.goto('/booking-requests?view=pending');
  await expect(page).toHaveURL(/\/workflow-bookings\?view=pending$/);
  await expect(page.getByRole('heading', { name: 'Đơn chụp ảnh', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Đơn chụp ảnh', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Yêu cầu đặt dịch vụ', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Quy trình dịch vụ', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Trạng thái đơn' })).toHaveValue('pending');
  const statusFilter = page.getByRole('combobox', { name: 'Trạng thái đơn' });
  await expect(statusFilter).toHaveCSS('appearance', 'none');
  await expect(statusFilter).toHaveCSS('padding-right', '40px');
  await expect(statusFilter).not.toHaveCSS('background-image', 'none');
  await statusFilter.screenshot({ path: path.join(evidence, '07-status-filter-light.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await statusFilter.focus();
  await expect(statusFilter).toHaveCSS('appearance', 'none');
  await expect(statusFilter).not.toHaveCSS('background-image', 'none');
  await statusFilter.screenshot({ path: path.join(evidence, '08-status-filter-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.getByRole('combobox', { name: 'Trạng thái đơn' }).selectOption('active');
  await expect(page.getByRole('heading', { name: 'Chưa có đơn chụp ảnh phù hợp' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Trạng thái đơn' }).selectOption('cancelled');
  await page.getByRole('link', { name: /12A0 Quá hạn/ }).click();
  await expect(page.getByText(/Tự động hủy vì đã quá ngày chụp dự kiến/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt yêu cầu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gắn thợ', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '← Quay lại danh sách' }).click();
  await expect(page).toHaveURL(/\/workflow-bookings\?view=cancelled$/);
  await page.getByRole('combobox', { name: 'Trạng thái đơn' }).selectOption('pending');
  await expect(page.getByRole('heading', { name: '12A1 Phân công' })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: path.join(evidence, '05-unified-orders-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: path.join(evidence, '06-unified-orders-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: /12A1 Phân công/ }).click();
  await expect(page).toHaveURL(new RegExp(`/workflow-bookings/${bookingId}$`));
  await page.getByRole('link', { name: '← Quay lại danh sách' }).click();
  await expect(page).toHaveURL(/\/workflow-bookings\?view=pending$/);
  await page.goto(`/booking-requests/${bookingId}`);
  await expect(page).toHaveURL(new RegExp(`/workflow-bookings/${bookingId}$`));
  await page.getByRole('button', { name: 'Gắn thợ' }).click();
  await expect(page.getByRole('checkbox', { name: /Minh/ })).toBeEnabled();
  await expect(page.getByRole('checkbox', { name: /Hà/ })).toBeDisabled();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(evidence, '01-admin-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  const free = page.getByRole('checkbox', { name: /Minh/ });
  await free.focus();
  await page.keyboard.press('Space');
  await expect(free).toBeChecked();
  await page.getByRole('checkbox', { name: /Lan/ }).check();
  await page
    .getByRole('combobox', { name: 'Thợ chính / người chăm khách' })
    .selectOption({ label: 'Lan · thợ hỗ trợ' });
  await page
    .getByRole('combobox', { name: 'Thợ chính / người chăm khách' })
    .selectOption({ label: 'Minh · thợ trống' });
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(evidence, '02-admin-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Lưu phân công' }).click();
  await expect(page.getByRole('button', { name: 'Đổi thợ' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Đổi thợ' })).toBeVisible();
  await expect(page.getByText('Thợ hỗ trợ: Lan · thợ hỗ trợ', { exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await login(page, 'assignment.free');
  await page.goto('/workflow-bookings');
  await expect(page.getByRole('heading', { name: '12A1 Phân công' })).toBeVisible();
  await page.getByText('Lịch bận của tôi', { exact: true }).click();
  await page.getByLabel('Bắt đầu', { exact: true }).fill('2027-02-02T08:00');
  await page.getByLabel('Kết thúc', { exact: true }).fill('2027-02-02T12:00');
  await page.getByLabel('Ghi chú (tùy chọn)').fill('Nghỉ cá nhân');
  await page.getByRole('button', { name: 'Thêm lịch bận' }).click();
  await expect(page.getByText('Nghỉ cá nhân', { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(evidence, '03-staff-mobile.png'), fullPage: true });
  await page.goto(`/workflow-bookings/${bookingId}`);
  await expect(page.getByText('0901234567', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt yêu cầu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Đổi thợ' })).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await login(page, 'assignment.client');
  await page.goto(`/account/bookings/${bookingId}`);
  await expect(page.getByText('Thợ phụ trách: Minh · thợ trống', { exact: true })).toBeVisible();
  await expect(page.getByText('Thợ hỗ trợ: Lan · thợ hỗ trợ', { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: path.join(evidence, '04-customer-mobile.png'), fullPage: true });
  await page.goto(`/account/bookings/${expiredBookingId}`);
  await expect(page.getByText(/Tự động hủy vì đã quá ngày chụp dự kiến/).first()).toBeVisible();
  await page.screenshot({
    path: path.join(evidence, '09-expired-intake-customer.png'),
    fullPage: true,
  });
});
