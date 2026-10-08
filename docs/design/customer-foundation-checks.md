# Customer foundation — checks

Ngày kiểm: 2026-10-06, Asia/Bangkok (UTC+07). Thư mục chạy: `C:\Users\Admin\studio-manage\frontend`. Runtime: Node v24.18.0, npm 11.16.0.

**Trạng thái: command checks của bản sửa cuối đã pass.** Lần 1 kiểm toàn suite trước khi root sửa chiều cao CTA và hành vi disabled Slot; lần 2 kiểm đúng các thay đổi ấy bằng focused regression, check và build. Browser evidence được ghi riêng, không suy ra từ command checks.

## Lần 1 — trước sửa CTA/Slot

| Lệnh | Kết quả thực tế |
|---|---|
| `npm run check` | PASS, exit 0. ESLint 0 errors/8 warnings giống baseline; `tsc --noEmit` và toàn matched Prettier files pass. |
| `npm run test` | PASS, exit 0. 8 files/26 tests; Vitest 2.1.9, duration 39.02s. |
| `npm run build` | PASS, exit 0. Vite 5.4.21; 3.979 modules transformed; Vite build 25.27s. |

Check bắt đầu 15:01:57; tests bắt đầu 15:02:05; build bắt đầu 15:03:09. Vitest/Vite chạy ngoài sandbox ngay vì lỗi quyền esbuild đã được xác nhận ở [baseline checks](customer-baseline-checks.md); không sửa config hay format source để chạy checks.

26 tests gồm 17 tests baseline và 9 behavior tests mới:

| File | Số tests |
|---|---|
| `src/components/customer/CustomerScope.test.tsx` | 6 |
| `src/components/customer/CustomerControls.test.tsx` | 3 |
| `src/pages/ClientRegisterPage.test.tsx` | 3 |
| `src/pages/NewBookingPage.test.tsx` | 3 |
| `src/config/navigation.test.ts` | 4 |
| `src/components/Layout/Sidebar.test.tsx` | 2 |
| `src/components/Layout/Breadcrumbs.test.tsx` | 2 |
| `src/utils/returnTo.test.ts` | 3 |

Scope tests kiểm auth bootstrap boundary dưới html.dark, giữ theme preference, một toast container với appearance được giữ qua navigation và các route/gate classifier cases. Controls tests kiểm refs, error descriptions, disabled link/native submit. Auth/gates trong unit tests là mocks; không coi đây là E2E chứng minh toàn router hoặc server permissions.

Đối chiếu [162 baseline hashes](customer-baseline-hashes.json) lúc 15:01:58 và 15:04:05: 158 recorded files nguyên hash; chỉ 4 existing paths khác theo phạm vi đã chốt:

- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/tailwind.config.js`
- `frontend/src/pages/ClientRegisterPage.tsx`

Staff default `ui/*`, `index.css`, theme/auth context, staff Layout/Sidebar, Login, Profile, booking/rental shared pages và services nằm trong nhóm unchanged. Đây là bằng chứng mã nguồn; CSS cascade/staff appearance còn cần browser evidence riêng.

Warnings vẫn như baseline: 8 ESLint warnings, npm unknown config `msvs_version`/`network-timeout`, React Router future flags, Browserslist caniuse-lite cũ 6 tháng và circular chunk `vendor-charts -> vendor-react -> vendor-charts`. Không sửa các cảnh báo có sẵn trong đợt này.

## Lần 2 — bản sửa cuối

Root đã sửa `customer.css`, `CustomerButton.tsx`, `CustomerControls.test.tsx`: CTA không còn tăng thêm 2px bởi border; disabled Slot child không thể ưu tiên capture handlers, `aria-disabled=false` hoặc `tabIndex=0` hơn disabled contract. Các thay đổi/concerns mới là lý do repeat.

| Lệnh | Kết quả thực tế |
|---|---|
| `npm run check` | **PASS**, exit 0; ESLint 0 errors/8 baseline warnings, TypeScript và toàn matched Prettier files pass. |
| `npm run test -- src/components/customer/CustomerControls.test.tsx src/components/customer/CustomerScope.test.tsx src/pages/ClientRegisterPage.test.tsx src/utils/returnTo.test.ts` | **PASS**, exit 0; 4 files/15 tests, duration 28.24s. |
| `npm run build` | **PASS**, exit 0; Vite 5.4.21, 3.979 modules transformed, Vite build 26.32s. |

Check bắt đầu 15:06:16, focused tests 15:06:19, build 15:07:39. Đã giữ assertions register payload/return target và disabled child capture/ARIA/tabIndex; không xoá cases để tránh failure. Toàn 26 tests pass ở lần 1 vẫn là evidence trước sửa; không chạy lại toàn suite sau lần 2 vì delta chỉ nằm ở customer controls/CSS và pilot consumers liên quan đã được kiểm targeted.

Hash comparison lúc 15:06:17 và 15:08:38 vẫn chỉ 4 existing paths thay đổi như trên; 158 baseline files khác nguyên hash. Ba files sửa cuối nguyên hash suốt lần 2:

| File | SHA-256 |
|---|---|
| `src/styles/customer.css` | `a02f436a67862e4f5dfb0ea932b416b30b744f6ce2a83208bd15a85d133c0765` |
| `src/components/customer/CustomerButton.tsx` | `0dc30cdf05180edd8f65be522034b65e1a8fee6f9bb50398cdd9b979f1b00a6a` |
| `src/components/customer/CustomerControls.test.tsx` | `84d95bfb1150381a544991f3f8efc307d7fe806042b3cdd4cb9737e4b43f0d6b` |

Không có command/test assertion failure ở cả hai lần. Build warnings vẫn là các warnings có sẵn đã ghi trên; không sửa config/dependencies.

## Giới hạn

- Không chạy E2E hoặc destructive setup/teardown; không drop/seed/update DB demo.
- Không sửa UI source/config, plan/todo hoặc QA trong bước validation này. Build cập nhật `dist`.
- Browser runtime/computed metrics, registration với API mock, staff screenshots và viewports do root ghi riêng; tài liệu này chỉ ghi command/source-hash evidence.
- Chưa nghiệm thu toàn customer UI hoặc các module calendar/login/photos/sticky đang deferred.
