# Customer UI baseline — checks

Ngày kiểm: 2026-10-06, Asia/Bangkok (UTC+07). Đây là kết quả trước batch UI foundation, trên working tree đã có thay đổi. Không reset, sửa UI source/config hay format lại files có sẵn.

## Kết quả đã chạy

Thư mục chạy: `C:\Users\Admin\studio-manage\frontend`. Runtime: Node v24.18.0, npm 11.16.0.

| Lệnh | Kết quả thực tế | Ghi chú |
|---|---|---|
| `npm run check` | **PASS**, exit 0 | ESLint: 0 errors, 8 warnings; `tsc --noEmit` pass; Prettier: tất cả matched files đúng format. |
| `npm run test` trong sandbox | **Không khởi động được**, exit 1 | esbuild bị từ chối quyền đọc thư mục cha trước khi collect/run tests; không phải assertion failure. |
| `npm run test` ngoài sandbox, cùng source/config | **PASS**, exit 0 | 6 test files, 17 tests; Vitest 2.1.9, duration 157.04s. |
| `npm run build` trong sandbox | **Không hoàn tất**, exit 1 | TypeScript pass; Vite không đọc được config do cùng esbuild access issue. |
| `npm run build` ngoài sandbox, cùng source/config | **PASS**, exit 0 | Vite 5.4.21, 3.973 modules transformed, Vite build 25.00s; chạy sau capture UI baseline. |
| `npm run test:e2e` | **Chưa chạy** | Chỉ kiểm prerequisite đọc; chưa khởi destructive setup/teardown. |

Vitest pass: ClientRegisterPage (3), NewBookingPage (3), navigation (4), Breadcrumbs (2), Sidebar (2), returnTo (3). Đây là behavior regression hiện có, không chứng minh visual hoặc responsive đạt DESIGN.

Lỗi startup test sandbox nguyên văn; build gặp cùng lỗi directory với `vite.config.ts`:

```text
Cannot read directory "../..": Access is denied.
Could not resolve "C:\\Users\\Admin\\studio-manage\\frontend\\vitest.config.ts"
```

Các warning có sẵn:

| File | Dòng | Warning |
|---|---|---|
| `src/components/ui/badge.tsx` | 34:17 | react-refresh/only-export-components |
| `src/components/ui/button.tsx` | 50:18 | react-refresh/only-export-components |
| `src/context/AuthContext.tsx` | 104:14 | react-refresh/only-export-components |
| `src/context/ThemeContext.tsx` | 77:14 | react-refresh/only-export-components |
| `src/pages/BookingWorkflowListPage.tsx` | 60:6 | useCallback dependency `reloadKey` không cần thiết |
| `src/pages/CustomersPage.tsx` | 61:6 | useEffect thiếu dependency `buildParams` |
| `src/pages/FinancePage.tsx` | 110:6 | useEffect thiếu dependency `buildListParams` |
| `src/pages/SchedulesPage.tsx` | 460:6 | useEffect thiếu dependency `buildFilterParams` |

Vitest in React Router future-flag warnings cho `v7_startTransition` và `v7_relativeSplatPath`. npm in cảnh báo unknown user config `msvs_version` và `network-timeout`. Không sửa các cảnh báo này trong baseline UI.

Build in thêm cảnh báo Browserslist `caniuse-lite` cũ 6 tháng và circular chunk `vendor-charts -> vendor-react -> vendor-charts`. Không sửa dependencies/chunk config trong baseline UI. `dist` được cập nhật bởi lệnh build, không phải UI source edit; screenshot baseline đã được chụp trước đó.

Đợt build bắt đầu trong sandbox lúc 14:51:33, retry ngoài sandbox lúc 14:52:19. Đối chiếu [customer-baseline-hashes.json](customer-baseline-hashes.json) lúc 14:52:03 và 14:53:39: cả 162 recorded files nguyên hash, 0 changed/missing. Vì vậy check/test/build này là baseline trước foundation source edits.

## Demo và E2E prerequisites — chỉ đọc

- TCP localhost: 4001/5002/27029/27017 truy cập được; 4011/5012 chưa mở khi kiểm. `GET http://127.0.0.1:5002/api/health` trả HTTP 200, body `{"status":"ok"}`. TCP/health không chứng minh customer journey đã pass.
- Chrome có tại `C:\Program Files\Google\Chrome\Application\chrome.exe`, phù hợp Playwright `channel: 'chrome'`.
- `frontend/node_modules`, root `node_modules`, `backend/node_modules` tồn tại; ts-node preload và Vite path trong Playwright config resolve được.
- Resolver `e2e/test-env.cjs` hiện chọn `localhost:27017`, DB đích `/studio_phase1_e2e`, không có query `replicaSet`. Read-only Mongo `hello`: `setName=null`, `isWritablePrimary=true`; server này là standalone, chưa đủ cho workflow transactions.
- Read-only Mongo `hello` tại `127.0.0.1:27029`: `setName=rs0`, `isWritablePrimary=true`. DB demo `studio_project_demo` được giữ nguyên; chỉ đọc topology, không drop/seed/update/insert.
- Khi chạy workflow/rental E2E sau này, đặt `MONGO_TEST_URI` explicit tới replica set local phù hợp. Harness bắt buộc đổi DB thành `studio_phase1_e2e`; setup/teardown **drop DB test này**. Không chạy nhiều harness song song và không dùng DB chứa fixtures cần giữ. Chưa chạy E2E trong bước baseline checks này.
- Harness bật portal/workflow/rental và tự khởi API 5012/Vite 4011; chưa có evidence flag-off matrix, visual diff, calendar native/mobile keyboard hoặc kiểm ownership bổ sung.

Ảnh/route/state/viewport baseline được root ghi riêng. Check, unit tests và production build đã pass như trên; E2E vẫn chưa chạy. Không dùng kết quả này để khẳng định toàn customer UI, staff appearance hoặc responsive đã được nghiệm thu.
