const { test, expect } = require('@playwright/test');

const client = {
  name: 'Khách E2E Phase 1',
  username: 'phase1.client',
  password: 'E2eClient123!',
};

function vietnamInputAfter(days, hours = 10) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  value.setSeconds(0, 0);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${String(hours).padStart(2, '0')}`;
}

async function login(page, username, password) {
  if (!new URL(page.url()).pathname.endsWith('/login')) await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForFunction(
    (expectedUsername) => {
      const stored = localStorage.getItem('user');
      return stored && JSON.parse(stored).username === expectedUsername;
    },
    username,
  );
}

async function logout(page) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
}

test('guest signs in before booking and continues through studio review', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Họ tên').fill(client.name);
  await page.getByLabel('Tên đăng nhập').fill(client.username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(client.password);
  await page.getByLabel('Nhập lại mật khẩu').fill(client.password);
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/booking/start?source=portfolio&concept=Vintage');
  await expect(page).toHaveURL(/\/login$/);
  await login(page, client.username, client.password);
  await expect(page).toHaveURL(/\/account\/bookings\/new\?/);
  await expect(page.getByText('Concept tham khảo: Vintage')).toBeVisible();
  await page.getByRole('button', { name: 'Chọn gói' }).click();
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
  await page.getByLabel('Tên lớp / nhóm').fill('12A1 E2E');
  await page.getByLabel('Trường').fill('THPT Yume');
  await page.getByLabel('Họ tên người liên hệ').fill(client.name);
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel('Số thành viên dự kiến').fill('1');
  await page.getByLabel('Địa điểm mong muốn').fill('Hà Nội');
  await page.getByLabel('Ngày và giờ bắt đầu mong muốn (giờ Việt Nam)').fill(vietnamInputAfter(30, 10));
  await page.getByLabel('Ngày và giờ kết thúc mong muốn (giờ Việt Nam)').fill(vietnamInputAfter(30, 12));
  await page.getByLabel('Điều Yume nên biết thêm').fill('Luồng E2E với bản nháp qua đăng nhập.');
  await page.getByRole('button', { name: /Xem lại yêu cầu/ }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra trước khi gửi' })).toBeVisible();
  await expect(page.getByText('12A1 E2E')).toBeVisible();
  await expect(page.getByText('THPT Yume')).toBeVisible();
  await page.getByRole('button', { name: 'Gửi yêu cầu tới Yume' }).click();
  await expect(page).toHaveURL(/\/account\/bookings\/[a-f0-9]{24}$/);
  const bookingUrl = page.url();
  const bookingId = new URL(bookingUrl).pathname.split('/').pop();
  await expect(page.getByRole('heading', { name: /(?:Yêu cầu của lớp )?12A1 E2E/ })).toBeVisible();
  await expect(page.getByText(/Yêu cầu đang chờ studio xem xét/)).toBeVisible();
  await expect(page.getByText('Concept tham khảo: Vintage')).toBeVisible();

  await logout(page);
  await login(page, 'phase1.admin', 'E2eAdmin123!');
  await page.goto(`/booking-requests/${bookingId}`);
  await page.getByLabel('Phản hồi cho khách').fill('Studio có thể tiếp nhận yêu cầu và sẽ gửi báo giá.');
  await page.getByRole('button', { name: 'Duyệt yêu cầu' }).click();
  await expect(page.getByText(/Studio đã duyệt tiếp nhận yêu cầu/)).toBeVisible();
  await expect(page.getByText('Studio có thể tiếp nhận yêu cầu và sẽ gửi báo giá.', { exact: true })).toBeVisible();

  await logout(page);
  await login(page, client.username, client.password);
  await page.goto(bookingUrl);
  await expect(page.getByText(/Studio đã duyệt tiếp nhận yêu cầu/)).toBeVisible();
  await expect(page.getByText('Studio có thể tiếp nhận yêu cầu và sẽ gửi báo giá.', { exact: true })).toBeVisible();
  await expect(page.getByText('THPT Yume')).toBeVisible();
});
