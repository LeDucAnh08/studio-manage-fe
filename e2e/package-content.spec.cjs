const path = require('node:path');
const { mkdir } = require('node:fs/promises');
const { test, expect } = require('@playwright/test');

const api = 'http://127.0.0.1:5012/api';
const audit = path.resolve(__dirname, '../../audit/package-detail-2026-10-30');

test('admin publishes a package with photos and guests can view it and book after login', async ({
  page,
  browser,
  request,
}) => {
  await mkdir(audit, { recursive: true });
  const packages = await (await request.get(`${api}/public/packages`)).json();
  const pkg = packages.data.find((item) => item.name === 'Gói E2E Phase 1');
  expect(pkg).toBeTruthy();
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill('phase1.admin');
  await page.getByLabel('Mật khẩu').fill('E2eAdmin123!');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/settings/packages');
  await page
    .getByRole('link', { name: `Nội dung chi tiết gói ${pkg.name}` })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/settings/packages/${pkg._id}/content$`));
  await page
    .getByLabel('Đối tượng phù hợp')
    .fill('Dành cho lớp cuối cấp muốn lưu lại một ngày thật đáng nhớ.');
  await page
    .getByLabel('Quyền lợi bổ sung (mỗi dòng một quyền lợi)')
    .fill('Album ảnh chung của lớp\nTư vấn concept theo phong cách riêng');
  await page
    .getByLabel('Chọn ảnh từ máy')
    .setInputFiles([
      path.resolve(__dirname, '../src/assets/images/customer-portfolio/tnv00817-640.webp'),
      path.resolve(__dirname, '../src/assets/images/customer-portfolio/pbi00061-640.webp'),
    ]);
  await page.getByLabel(/^Mô tả ảnh 1/).fill('Ảnh tốt nghiệp của lớp');
  await page.getByLabel('Chú thích ảnh 1', { exact: true }).fill('Lưu lại những ngày thanh xuân.');
  await page.getByLabel(/^Mô tả ảnh 2/).fill('Khoảnh khắc bên bạn bè');
  await page.getByRole('button', { name: 'Thêm mục vào lịch trình buổi chụp mẫu' }).click();
  await page.getByLabel('Mốc thời gian 1').fill('08:00 – 09:00');
  await page.getByLabel('Hoạt động 1').fill('Tập trung và chuẩn bị');
  await page
    .getByLabel('Mô tả lịch trình 1')
    .fill('Ekip gặp lớp, thống nhất lịch trình và chuẩn bị trang phục.');
  await page.getByRole('button', { name: 'Thêm mục vào quy trình dịch vụ' }).click();
  await page.getByLabel('Tên bước 1').fill('Tư vấn và thống nhất concept');
  await page.getByLabel('Mô tả bước 1').fill('Studio lắng nghe ý tưởng và gửi báo giá phù hợp.');
  await page
    .getByLabel('Ghi chú báo giá')
    .fill('Giá tham khảo theo thành viên, studio xác nhận lại khi tư vấn.');
  await page.getByLabel('Khoản chưa bao gồm (mỗi dòng một khoản)').fill('Vé vào địa điểm chụp');
  await page.getByRole('button', { name: 'Thêm mục vào chi phí phát sinh' }).click();
  await page.getByLabel('Tên chi phí 1').fill('Di chuyển ngoại thành');
  await page.getByLabel('Mức phí 1').fill('Theo địa điểm');
  await page.getByLabel('Điều kiện áp dụng 1').fill('Studio xác nhận trước khi chốt lịch.');
  await page.getByLabel('Lưu ý chuẩn bị').fill('Chuẩn bị trang phục cá nhân và nước uống.');
  await page.getByLabel('Chính sách đặt cọc').fill('Đặt cọc theo báo giá được thống nhất.');
  await page
    .getByLabel('Chính sách đổi/hủy lịch')
    .fill('Liên hệ studio để thống nhất phương án đổi lịch.');
  await page.getByRole('button', { name: 'Lưu nội dung' }).click();
  await expect(
    page.getByText('Đã lưu. Nội dung mới đã hiển thị trên trang khách hàng.'),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Mô tả ảnh 1/)).toHaveValue('Ảnh tốt nghiệp của lớp');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: path.join(audit, '01-admin-editor.png'), fullPage: true });
  // Establish same-document history after reload so popstate is exercised.
  await page.getByRole('link', { name: 'Về danh sách gói' }).click();
  await page
    .getByRole('link', { name: `Nội dung chi tiết gói ${pkg.name}` })
    .filter({ visible: true })
    .click();
  await expect(page.getByLabel(/^Mô tả ảnh 1/)).toHaveValue('Ảnh tốt nghiệp của lớp');
  // Browser back must offer to preserve unsaved edits and restore the current URL on cancel.
  await page.getByLabel('Đối tượng phù hợp').click();
  await page.getByLabel('Đối tượng phù hợp').fill('Thay đổi chưa lưu');
  await expect(page.getByText('Có thay đổi chưa lưu')).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/settings/packages/${pkg._id}/content$`));
  await expect(page.getByLabel('Đối tượng phù hợp')).toHaveValue('Thay đổi chưa lưu');

  const guestContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:4011',
    viewport: { width: 1440, height: 960 },
  });
  const guest = await guestContext.newPage();
  try {
    await guest.goto('/pricing');
    await guest
      .getByRole('article')
      .filter({ has: guest.getByRole('heading', { name: pkg.name }) })
      .getByRole('link', { name: 'Xem chi tiết' })
      .click();
    await expect(guest).toHaveURL(new RegExp(`/pricing/${pkg._id}$`));
    await expect(guest.getByRole('heading', { level: 1, name: pkg.name })).toBeVisible();
    await expect(guest.getByText('Album ảnh chung của lớp')).toBeVisible();
    const photo = guest.getByRole('button', { name: 'Xem ảnh 1: Ảnh tốt nghiệp của lớp' });
    await photo.click();
    await expect(guest.getByRole('dialog')).toBeVisible();
    await guest.keyboard.press('ArrowRight');
    await expect(
      guest.getByRole('dialog').getByRole('img', { name: 'Khoảnh khắc bên bạn bè' }),
    ).toBeVisible();
    await guest.keyboard.press('Escape');
    await expect(photo).toBeFocused();
    await guest.locator('.package-detail__cover img').evaluate((image) => image.decode());
    await guest.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await guest.screenshot({ path: path.join(audit, '02-customer-desktop.png'), fullPage: true });
    await guest.setViewportSize({ width: 390, height: 844 });
    await guest.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await guest.screenshot({ path: path.join(audit, '03-customer-mobile.png'), fullPage: true });
    expect(
      await guest.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await guest.getByRole('link', { name: 'Đặt gói này' }).click();
    await expect(guest).toHaveURL(/\/login$/);
    const registered = await request.post(`${api}/auth/register`, {
      data: {
        name: 'Khách gói E2E',
        username: 'package.content.client',
        password: 'E2eClient123!',
      },
    });
    expect(registered.ok()).toBe(true);
    await guest.getByLabel('Tên đăng nhập').fill('package.content.client');
    await guest.getByLabel('Mật khẩu').fill('E2eClient123!');
    await guest.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(guest).toHaveURL(
      new RegExp(`/account/bookings/new\\?source=pricing&package=${pkg._id}$`),
    );
    await expect(
      guest
        .getByRole('article')
        .filter({ has: guest.getByRole('heading', { name: pkg.name }) })
        .getByRole('button', { name: 'Đang chọn', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  } finally {
    await guestContext.close();
    // Remove test media through the API, even if a later browser assertion fails.
    const login = await (
      await request.post(`${api}/auth/login`, {
        data: { username: 'phase1.admin', password: 'E2eAdmin123!' },
      })
    ).json();
    const latest = await (await request.get(`${api}/public/packages/${pkg._id}`)).json();
    await request.put(`${api}/packages/${pkg._id}/content`, {
      headers: { Authorization: `Bearer ${login.data.token}` },
      multipart: { content: JSON.stringify({ version: latest.data.detailsVersion, details: {} }) },
    });
  }
});
